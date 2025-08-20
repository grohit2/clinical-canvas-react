// src/components/ImageUploader.tsx
import React, { useRef } from "react";
import { useUploader, UploadContext } from "../hooks/useUploader";
import { Button } from "@/components/ui/button";

type Props = {
  mrn: string;
  ctx: UploadContext;
  currentUserId?: string;
  disabled?: boolean;
  onDone?: (key: string) => void;
};

export const ImageUploader: React.FC<Props> = ({ mrn, ctx, currentUserId, disabled, onDone }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, progress, busy, error } = useUploader(mrn, currentUserId);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { key } = await upload(file, ctx);
      onDone?.(key);
    } catch {}
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        style={{ display: "none" }}
        onChange={onPick}
        capture="environment"
      />

      <Button disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
        {busy ? `Uploading ${progress}%` : "Add photo"}
      </Button>

      {!!error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
};

export default ImageUploader;

