import * as React from "react";

/**
 * Use onFiles to pipe files into your existing upload flow (presign + PUT).
 * Works on Android/iOS/desktop; supports drag & drop.
 */
export function MobileGalleryPicker({
  onFiles,
  accept = "image/*",
  multiple = true,
}: {
  onFiles: (files: File[]) => Promise<void> | void;
  accept?: string;
  multiple?: boolean;
}) {
  const galleryRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);

  async function handle(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    await onFiles(files);
    // clear value so same selection can be picked twice
    if (galleryRef.current) galleryRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  return (
    <div
      className="rounded-md border-2 border-dashed border-gray-200 bg-gray-50/60 p-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        await handle(e.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="h-9 rounded-md bg-white px-3 text-sm font-medium border border-gray-200 hover:bg-gray-50"
          onClick={() => galleryRef.current?.click()}
        >
          Choose from Gallery
        </button>
        <button
          type="button"
          className="h-9 rounded-md bg-[#0d141c] text-white px-3 text-sm font-medium hover:opacity-90"
          onClick={() => cameraRef.current?.click()}
        >
          Take Photo
        </button>
        <span className="text-xs text-gray-500">or drag & drop images here</span>
      </div>

      {/* Hidden inputs */}
      <input
        ref={galleryRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept={accept}
        multiple={false}
        capture="environment"
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}
