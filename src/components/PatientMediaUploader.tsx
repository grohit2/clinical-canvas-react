import React, { useState, useEffect } from "react";
import { mediaService } from "@/services/mediaService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PatientMediaUploader({ mrn }: { mrn: string }) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const list = await mediaService.listImages(mrn);
    setItems(list);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mrn]);

  const uploadAll = async () => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const { upload, s3_key } = await mediaService.presignUpload(mrn, file);
        const form = new FormData();
        Object.entries(upload.fields).forEach(([k, v]) => form.append(k, v as string));
        // Some backends expect key inside fields; set explicitly as well
        form.append("key", s3_key);
        form.append("file", file);
        const res = await fetch(upload.url, { method: "POST", body: form });
        if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
        await mediaService.finalize(mrn, s3_key, file.type, file.size);
      }
      await load();
      setFiles(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6 border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base sm:text-lg">Patient Files</h3>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="block w-full text-sm"
        />
        <Button disabled={busy || !files?.length} onClick={uploadAll}>
          {busy ? "Uploading..." : "Upload"}
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((it) => (
          <ImageThumb key={it.id} item={it} />
        ))}
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground col-span-full text-center py-6">
            No files yet
          </div>
        )}
      </div>
    </Card>
  );
}

function ImageThumb({ item }: { item: any }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    const key = item.variants?.thumb_512 ?? item.s3_key;
    mediaService.viewUrl(key).then(({ url }) => setUrl(url));
  }, [item]);
  if (!url) return <div className="aspect-square bg-muted rounded-lg animate-pulse" />;
  return (
    <div className="aspect-square overflow-hidden rounded-lg border">
      <img src={url} alt="" className="w-full h-full object-cover" />
    </div>
  );
}