import { useState, useRef } from "react";
import { presignUpload, attachNoteFile, type FilesListItem } from "@/lib/filesApi";
import { putToS3Presigned } from "@/lib/s3upload";
import { Camera, ImageIcon, X } from "lucide-react";

interface ImageUploadS3Props {
  patientId: string;
  kind: "note" | "med" | "task" | "doc";
  refId: string;
  images: FilesListItem[];
  onImagesChange: (images: FilesListItem[]) => void;
  maxImages?: number;
}

export function ImageUploadS3({
  patientId,
  kind,
  refId,
  images,
  onImagesChange,
  maxImages = 10
}: ImageUploadS3Props) {
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      
      await uploadFile(file);
    }
    setShowAttachmentOptions(false);
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(file.name);
      
      // Get presigned upload URL
      const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/avif";
      const uploadResponse = await presignUpload(patientId, {
        filename: file.name,
        mimeType,
        kind,
        refId,
        needsOptimization: true,
        target: "originals"
      });

      // Upload to S3
      await putToS3Presigned(uploadResponse.uploadUrl, uploadResponse.headers, file);

      // Attach the file to the note/med/task
      if (kind === "note") {
        await attachNoteFile(patientId, refId, uploadResponse.key);
      }
      // TODO: Add attachMedFile and attachTaskFile when needed

      // Add to images list with optimized key for display
      const newImage: FilesListItem = {
        key: uploadResponse.hints.optimizedKey,
        filename: file.name,
        size: file.size,
        lastModified: new Date().toISOString(),
        uid: patientId,
        kind,
        refId,
        cdnUrl: null
      };

      onImagesChange([...images, newImage]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(null);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">Attachments</h3>
      <div className="grid grid-cols-3 gap-4">
        {images.map((image, index) => (
          <div key={image.key} className="relative">
            <img
              src={image.cdnUrl || ''}
              alt={`attachment ${index + 1}`}
              className="rounded-lg w-full h-24 object-cover"
            />
            <button
              type="button"
              className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-0.5 hover:bg-opacity-75"
              onClick={() => removeImage(index)}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        
        {images.length < maxImages && (
          <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            {uploading ? (
              <div className="text-gray-400 text-xs text-center">
                <div className="animate-spin mb-1">⟳</div>
                Uploading...
              </div>
            ) : (
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowAttachmentOptions(true)}
              >
                <Camera size={24} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Attachment options modal */}
      {showAttachmentOptions && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowAttachmentOptions(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-lg p-4 z-50 transform transition-transform">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Add Attachment</h2>
              <button 
                className="text-gray-500"
                onClick={() => setShowAttachmentOptions(false)}
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-2">
              <button 
                className="w-full flex items-center p-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
              >
                <ImageIcon className="mr-3" size={24} />
                <span>Choose from Gallery</span>
              </button>
              <button 
                className="w-full flex items-center p-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg"
                onClick={() => {
                  cameraInputRef.current?.click();
                }}
              >
                <Camera className="mr-3" size={24} />
                <span>Take Photo</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}