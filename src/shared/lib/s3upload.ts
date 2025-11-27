// src/lib/s3upload.ts
export async function putToS3Presigned(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    
    // Only send signed headers, exclude unsigned metadata headers
    Object.entries(headers || {}).forEach(([k, v]) => {
      if (!k.startsWith('x-amz-meta-')) {
        xhr.setRequestHeader(k, v);
      }
    });

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 PUT failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("S3 PUT network error"));
    xhr.send(file);
  });
}

