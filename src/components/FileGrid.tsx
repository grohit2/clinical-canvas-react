import React, { useEffect, useState } from "react";
import {
  listFiles,
  FilesListItem,
  detachNoteFile,
  detachMedFile,
  detachTaskFile,
  detachDocument,
  deleteFiles,
  DocType,
  DocumentsCategory,
} from "../lib/filesApi";
import { toast } from "@/components/ui/sonner";

type Props = {
  patientId: string;
  kind: "doc" | "note" | "med" | "task";
  docType?: DocType;
  refId?: string;
  detachable?: boolean;
  docCategory?: DocumentsCategory; // required if detachable && kind==='doc'
  onDetached?: (key: string) => void;
  refreshToken?: number;
};

export const FileGrid: React.FC<Props> = ({ patientId, kind, docType, refId, detachable, docCategory, onDetached, refreshToken }) => {
  const [items, setItems] = useState<FilesListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  async function load(next?: string | null) {
    const res = await listFiles(patientId, {
      scope: "optimized",
      kind,
      docType,
      refId,
      cursor: next ?? undefined,
      limit: 30,
      presign: true,
    });
    setItems((prev) => [...prev, ...res.items]);
    setCursor(res.nextCursor ?? null);
  }

  useEffect(() => {
    setItems([]);
    setCursor(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, kind, docType, refId, refreshToken]);

  async function detach(key: string) {
    try {
      if (kind === "note" && refId) await detachNoteFile(patientId, refId, key);
      else if (kind === "med" && refId) await detachMedFile(patientId, refId, key);
      else if (kind === "task" && refId) await detachTaskFile(patientId, refId, key);
      else if (kind === "doc" && docCategory) await detachDocument(patientId, { category: docCategory, key });
      else return;

      // Best-effort: remove the underlying object too (subfolders supported)
      try {
        await deleteFiles(patientId, [key], { invalidate: true });
      } catch (e) {
        console.warn("s3 delete warning", e);
      }
      setItems((prev) => prev.filter((i) => i.key !== key));
      onDetached?.(key);
      toast("Removed attachment");
    } catch (e) {
      console.error("detach failed", e);
      
      // For now, during development without backend, still remove from UI
      if (process.env.NODE_ENV === 'development') {
        setItems((prev) => prev.filter((i) => i.key !== key));
        onDetached?.(key);
        toast("Removed attachment (development mode)");
      } else {
        toast("Failed to remove attachment");
      }
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div className="relative aspect-square overflow-hidden rounded border" key={it.key}>
            {it.cdnUrl || it.url ? (
              <img src={it.cdnUrl ?? it.url ?? ""} alt={it.filename || ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs p-1 block break-all">{it.filename || it.key}</span>
            )}
            {detachable && (
              <button
                className="absolute top-1 right-1 bg-black/60 text-white rounded px-1 text-xs"
                title="Remove"
                onClick={() => detach(it.key)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {cursor && (
        <div className="mt-3">
          <button className="text-sm underline" onClick={() => load(cursor)}>Load more</button>
        </div>
      )}
    </div>
  );
};

export default FileGrid;
