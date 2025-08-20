// src/hooks/useUploader.ts
import { useState, useCallback } from "react";
import { processImageFile } from "../lib/image";
import { putToS3Presigned } from "../lib/s3upload";
import {
  presignUpload,
  attachDocument,
  attachNoteFile,
  attachMedFile,
  attachTaskFile,
  PresignUploadRequest,
  DocType,
  HttpError,
} from "../lib/filesApi";
import { toast } from "@/components/ui/sonner";

type ContextDoc = { kind: "doc"; docType: DocType; category: string; label?: string };
type ContextNote = { kind: "note"; refId: string; label?: string };
type ContextMed = { kind: "med"; refId: string; label?: string };
type ContextTask = { kind: "task"; refId: string; label?: string };

export type UploadContext = ContextDoc | ContextNote | ContextMed | ContextTask;

export function useUploader(mrn: string, currentUserId?: string) {
  const [progress, setProgress] = useState<number>(0);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, ctx: UploadContext) => {
      setBusy(true);
      setError(null);
      setProgress(0);
      try {
        const processed = await processImageFile(file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 2000,
          initialQuality: 0.8,
        });

        const body: PresignUploadRequest = {
          filename: processed.name,
          mimeType: processed.type as any,
          target: "optimized",
          kind: ctx.kind,
          quality: 80,
          maxW: 1600,
          label: ctx.label,
        };
        if (ctx.kind === "doc") body.docType = ctx.docType;
        if (ctx.kind !== "doc") body.refId = ctx.refId;

        // Upload with a retry on 403 (expired/invalid presign)
        let pre = await presignUpload(mrn, body);
        try {
          await putToS3Presigned(pre.uploadUrl, pre.headers, processed, setProgress);
        } catch (err: any) {
          const msg = String(err?.message || "");
          if (msg.includes("403")) {
            toast("Upload URL expired — retrying");
            pre = await presignUpload(mrn, body);
            await putToS3Presigned(pre.uploadUrl, pre.headers, processed, setProgress);
          } else {
            throw err;
          }
        }

        if (ctx.kind === "doc") {
          try {
            await attachDocument(mrn, {
              category: ctx.category as any,
              key: pre.key,
              uploadedBy: currentUserId,
              mimeType: processed.type,
              size: processed.size,
            });
          } catch (e: any) {
            const he = e as HttpError;
            const msg = String(he?.message || "");
            if (he?.status === 409 || msg.includes("409") || msg.toLowerCase().includes("conflict")) {
              // simple backoff then retry once
              toast("Attach conflict — retrying");
              await new Promise((r) => setTimeout(r, 250));
              await attachDocument(mrn, {
                category: ctx.category as any,
                key: pre.key,
                uploadedBy: currentUserId,
                mimeType: processed.type,
                size: processed.size,
              });
            } else {
              throw e;
            }
          }
        } else if (ctx.kind === "note") {
          await attachNoteFile(mrn, ctx.refId, pre.key);
        } else if (ctx.kind === "med") {
          await attachMedFile(mrn, ctx.refId, pre.key);
        } else if (ctx.kind === "task") {
          await attachTaskFile(mrn, ctx.refId, pre.key);
        }

        return { key: pre.key };
      } catch (e: any) {
        setError(e?.error || e?.message || "upload failed");
        throw e;
      } finally {
        setBusy(false);
        setTimeout(() => setProgress(0), 400);
      }
    },
    [mrn, currentUserId]
  );

  return { upload, progress, busy, error };
}
