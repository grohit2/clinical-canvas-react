import React, { useState, useRef } from "react";
import { Camera, Upload, X } from "lucide-react";
import { 
  presignUpload, 
  attachDocument, 
  DocumentsCategory, 
  PresignUploadRequest 
} from "../lib/filesApi";
import { toast } from "@/components/ui/sonner";

type Props = {
  patientId: string;
  category: DocumentsCategory;
  onUploadComplete: () => void;
  className?: string;
};

const CATEGORY_TO_DOCTYPE: Record<DocumentsCategory, string> = {
  preop_pics: "preop",
  lab_reports: "lab", 
  radiology: "radiology",
  intraop_pics: "intraop",
  ot_notes: "otnotes",
  postop_pics: "postop",
  discharge_pics: "discharge",
};

export const PhotoUploader: React.FC<Props> = ({ 
  patientId, 
  category, 
  onUploadComplete, 
  className = "" 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => uploadFile(file));
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log('📤 Starting upload:', {
        filename: file.name,
        size: file.size,
        type: file.type,
        category
      });

      // Step 1: Get pre-signed upload URL
      const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/avif";
      
      const uploadRequest: PresignUploadRequest = {
        filename: file.name,
        mimeType,
        target: "optimized",
        kind: "doc",
        docType: CATEGORY_TO_DOCTYPE[category] as any,
        needsOptimization: true,
        quality: 80,
        maxW: 1600,
        label: file.name.replace(/\.[^/.]+$/, "") // Remove extension
      };

      console.log('🔄 Getting pre-signed URL...');
      const presignResponse = await presignUpload(patientId, uploadRequest);
      console.log('✅ Pre-signed URL obtained:', presignResponse.key);

      setUploadProgress(25);

      // Step 2: Upload file to S3
      console.log('🔄 Uploading to S3...');
      const uploadResponse = await fetch(presignResponse.uploadUrl, {
        method: presignResponse.method,
        headers: presignResponse.headers,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      console.log('✅ File uploaded to S3');
      setUploadProgress(75);

      // Step 3: Attach document to patient record
      console.log('🔄 Attaching document...');
      const attachResponse = await attachDocument(patientId, {
        category,
        key: presignResponse.key,
        uploadedBy: "user", // You might want to get actual user info
        caption: uploadRequest.label,
        mimeType: file.type,
        size: file.size,
      });

      console.log('✅ Document attached successfully');
      setUploadProgress(100);

      toast(`Successfully uploaded ${file.name}`);
      onUploadComplete();

    } catch (error) {
      console.error('❌ Upload failed:', error);
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
          {/* Camera/Gallery Button */}
          <button
            onClick={triggerFileInput}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
            title="Upload from gallery or take photo"
          >
            <Camera className="h-4 w-4" />
            <span>Add Photo</span>
          </button>

          {/* Upload Files Button (alternative) */}
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