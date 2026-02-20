import React, { useRef, useState } from 'react';
import { Camera, Upload } from 'lucide-react';
import { createDocumentsApi } from '@/domains/patient-documents/api';
import {
  type DocCategory,
  waitForS3EventMaterialization,
} from '@/domains/patient-documents';
import { toast } from '@/components/ui/sonner';

type Props = {
  patientId: string;
  category: DocCategory;
  onUploadComplete: () => void;
  className?: string;
};

const documentsApi = createDocumentsApi(import.meta.env.VITE_API_BASE_URL || '/api');

export const PhotoUploader: React.FC<Props> = ({
  patientId,
  category,
  onUploadComplete,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => uploadFile(file));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

      const presignResponse = await documentsApi.presignUpload(patientId, {
        filename: file.name,
        mimeType,
        category,
        needsOptimization: true,
        quality: 80,
        maxW: 1600,
        label: file.name.replace(/\.[^/.]+$/, ''),
      });

      setUploadProgress(25);

      const uploadResponse = await fetch(presignResponse.uploadUrl, {
        method: presignResponse.method,
        headers: presignResponse.headers,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      setUploadProgress(90);

      const ok = await waitForS3EventMaterialization(
        (uid) => documentsApi.getDocuments(uid),
        patientId,
        category,
        presignResponse.key
      );

      if (!ok) {
        console.warn('S3 event not materialized within timeout, proceeding anyway');
      }

      setUploadProgress(100);
      toast(`Successfully uploaded ${file.name}`);
      onUploadComplete();
    } catch (error: unknown) {
      console.error('Upload failed:', error);
      toast(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {!isUploading ? (
        <div className="flex gap-2">
          <button
            onClick={triggerFileInput}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
            title="Upload from gallery or take photo"
          >
            <Camera className="h-4 w-4" />
            <span>Add Photo</span>
          </button>

          <button
            onClick={triggerFileInput}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
            title="Upload files"
          >
            <Upload className="h-4 w-4" />
            <span>Upload</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
