// src/lib/image.ts
import imageCompression, { Options as ImageCompressionOptions } from "browser-image-compression";

export type CompressOptions = {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  initialQuality?: number;
  fileType?: "image/avif" | "image/webp" | "image/jpeg";
  useWebWorker?: boolean;
  preserveExif?: boolean;
};

export function supportsAvif(): boolean {
  const canvas = document.createElement("canvas");
  if (!canvas.toDataURL) return false;
  try {
    return canvas.toDataURL("image/avif").indexOf("data:image/avif") === 0;
  } catch {
    return false;
  }
}

export function supportsWebP(): boolean {
  const canvas = document.createElement("canvas");
  if (!canvas.toDataURL) return false;
  try {
    return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  } catch {
    return false;
  }
}

export function getExtension(mime: string): string {
  if (mime === "image/avif") return "avif";
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "bin";
}

export function replaceExtension(name: string, ext: string) {
  return name.replace(/\.[a-z0-9]+$/i, "") + "." + ext;
}

export async function heicToPngIfNeeded(file: File): Promise<File> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");

  if (!isHeic) return file;

  const heic2any = await import("heic2any");
  const result = await heic2any.default({
    blob: file,
    toType: "image/png",
    quality: 1,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  return new File([blob], replaceExtension(file.name, "png"), {
    type: "image/png",
    lastModified: file.lastModified,
  });
}

export async function compressToPreferred(file: File, opts: CompressOptions = {}): Promise<File> {
  const defaultOptions: CompressOptions = {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2000,
    initialQuality: 0.8,
    useWebWorker: true,
    fileType: "image/avif",
    preserveExif: false,
  };
  const options = { ...defaultOptions, ...opts };

  if (!supportsAvif()) {
    options.fileType = supportsWebP() ? "image/webp" : "image/jpeg";
  }

  const compressedBlob = await imageCompression(file, options as ImageCompressionOptions);
  const outName = replaceExtension(file.name, getExtension(options.fileType!));
  return new File([compressedBlob], outName, { type: options.fileType!, lastModified: Date.now() });
}

export async function processImageFile(file: File, opts: CompressOptions = {}): Promise<File> {
  const step1 = await heicToPngIfNeeded(file);
  const step2 = await compressToPreferred(step1, opts);
  return step2;
}

