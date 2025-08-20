import React, { useEffect, useState } from "react";
import { listFiles, FilesListItem, detachNoteFile, detachMedFile, detachTaskFile, detachDocument } from "../lib/filesApi";
import { toast } from "@/components/ui/sonner";

type Props = {
  mrn: string;
  kind: "doc" | "note" | "med" | "task";
  docType?: string;
  refId?: string;
  detachable?: boolean;
  docCategory?: string; // required if detachable && kind==='doc'
  onDetached?: (key: string) => void;
  refreshToken?: number;
};

export const FileGrid: React.FC<Props> = ({ mrn, kind, docType, refId, detachable, docCategory, onDetached, refreshToken }) => {
  const [items, setItems] = useState<FilesListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  async function load(next?: string | null) {
    const res = await listFiles({ mrn, scope: "optimized", kind, docType: docType as any, refId, presign: true, cursor: next ?? undefined, limit: 30 });
    setItems((prev) => [...prev, ...res.items]);
    setCursor(res.nextCursor ?? null);
  }

  useEffect(() => {
    setItems([]);
    setCursor(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mrn, kind, docType, refId, refreshToken]);

  async function detach(key: string) {
    try {
      if (kind === "note" && refId) await detachNoteFile(mrn, refId, key);
      else if (kind === "med" && refId) await detachMedFile(mrn, refId, key);
      else if (kind === "task" && refId) await detachTaskFile(mrn, refId, key);
      else if (kind === "doc" && docCategory) await detachDocument(mrn, { category: docCategory as any, key });
      else return;
      setItems((prev) => prev.filter((i) => i.key !== key));
      onDetached?.(key);
      toast("Removed attachment");
    } catch (e) {
      console.error("detach failed", e);
      toast("Failed to remove attachment");
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div className="relative aspect-square overflow-hidden rounded border" key={it.key}>
            {it.url ? (
              <img src={it.url} alt="" className="w-full h-full object-cover" />
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
