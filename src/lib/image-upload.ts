import imageCompression from 'browser-image-compression';
import api from './api';

export async function uploadImage(file: File): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });

  const { uploadUrl, fileUrl } = await api.uploads.getPresignedUrl(
    compressed.name,
    compressed.type
  );

  await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': compressed.type,
    },
    body: compressed,
  });

  return fileUrl;
}
