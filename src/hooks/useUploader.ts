// src/hooks/useUploader.ts
import { useState, useCallback } from "react";
import { processImageFile } from "../lib/image";
import { putToS3Presigned } from "../lib/s3upload";
import {
  presignUpload,
  attachNoteFile,
  attachMedFile,
  attachTaskFile,
  PresignUploadRequest,
  DocType,
  DocumentsCategory,
  HttpError,
} from "../lib/filesApi";
import { waitForS3EventMaterialization } from "../lib/docsWaitForEvent";
import { toast } from "@/components/ui/sonner";

type ContextDoc = { kind: "doc"; docType: DocType; category: DocumentsCategory; label?: string };
type ContextNote = { kind: "note"; refId: string; label?: string };
type ContextMed = { kind: "med"; refId: string; label?: string };
type ContextTask = { kind: "task"; refId: string; label?: string };

export type UploadContext = ContextDoc | ContextNote | ContextMed | ContextTask;

export function useUploader(patientId: string, currentUserId?: string) {
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
          mimeType: processed.type as PresignUploadRequest["mimeType"],
          target: "optimized",
          kind: ctx.kind,
          quality: 80,
          maxW: 1600,
          label: ctx.label,
        };
        if (ctx.kind === "doc") body.docType = ctx.docType;
        if (ctx.kind !== "doc") body.refId = ctx.refId;

        // Upload with a retry on 403 (expired/invalid presign)
        let pre = await presignUpload(patientId, body);
        try {
          await putToS3Presigned(pre.uploadUrl, pre.headers, processed, setProgress);
        } catch (err: unknown) {
          const msg = String((err as Error)?.message || "");
          if (msg.includes("403")) {
            toast("Upload URL expired — retrying");
            pre = await presignUpload(patientId, body);
            await putToS3Presigned(pre.uploadUrl, pre.headers, processed, setProgress);
          } else {
            throw err;
          }
        }

        if (ctx.kind === "doc") {
          // S3 event will auto-attach via Lambda - poll until materialized
          const ok = await waitForS3EventMaterialization(patientId, ctx.category, pre.key);
          if (!ok) {
            // Not an error; the event can be slightly delayed. Caller will refresh.
            console.warn("S3 event not materialized within timeout, proceeding anyway");
          }
        } else if (ctx.kind === "note") {
          await attachNoteFile(patientId, ctx.refId, pre.key);
        } else if (ctx.kind === "med") {
          await attachMedFile(patientId, ctx.refId, pre.key);
        } else if (ctx.kind === "task") {
          await attachTaskFile(patientId, ctx.refId, pre.key);
        }

        return { key: pre.key };
      } catch (e: unknown) {
        const err = e as HttpError | Error;
        const body = (err as HttpError).body as { error?: string } | undefined;
        setError(body?.error || err.message || "upload failed");
        throw err;
      } finally {
        setBusy(false);
        setTimeout(() => setProgress(0), 400);
      }
    },
    [patientId, currentUserId]
  );

  return { upload, progress, busy, error };
}
