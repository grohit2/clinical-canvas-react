import React, { useEffect, useState } from "react";
import {
  listFiles,
  FilesListItem,
  detachNoteFile,
  detachMedFile,
  detachTaskFile,
  detachDocument,
  deleteFiles,
  DocType,
  DocumentsCategory,
} from "../lib/filesApi";
import { toast } from "@/components/ui/sonner";

// CDN Configuration
const CDN_DOMAIN = import.meta.env.VITE_CDN_DOMAIN || "https://d3f4j5k6l7m8n9.cloudfront.net";

// Generate CDN URL from S3 key
function generateCdnUrl(s3Key: string): string {
  // For now, let's try to improve the existing S3 URLs with optimizations
  // This is a fallback until proper CDN is configured
  if (!s3Key) return "";
  
  // If it's already a full URL, return as-is
  if (s3Key.startsWith('http')) return s3Key;
  
  // Remove any bucket prefix if present
  const cleanKey = s3Key.replace(/^[^\/]+\//, '');
  return `${CDN_DOMAIN}/${cleanKey}`;
}

type Props = {
  patientId: string;
  kind: "doc" | "note" | "med" | "task";
  docType?: DocType;
  refId?: string;
  detachable?: boolean;
  docCategory?: DocumentsCategory; // required if detachable && kind==='doc'
  onDetached?: (key: string) => void;
  refreshToken?: number;
};

export const FileGrid: React.FC<Props> = ({ patientId, kind, docType, refId, detachable, docCategory, onDetached, refreshToken }) => {
  const [items, setItems] = useState<FilesListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  async function load(next?: string | null) {
    console.time('📁 FileGrid Load');
    const res = await listFiles(patientId, {
      scope: "optimized", // Use optimized images for faster loading
      kind,
      docType,
      refId,
      cursor: next ?? undefined,
      limit: 30,
      presign: true, // This should provide CDN URLs
    });
    console.timeEnd('📁 FileGrid Load');
    
    // Debug: Log actual URLs received from API
    res.items.forEach(item => {
      console.log('🔍 File item:', {
        filename: item.filename,
        key: item.key,
        url: item.url,
        cdnUrl: item.cdnUrl,
        hasUrl: !!item.url,
        hasCdnUrl: !!item.cdnUrl
      });
    });
    
    // Generate CDN URLs if not provided by backend (now enabled with real CDN domain)
    const enhancedItems = res.items.map(item => {
      // Backend should now provide cdnUrl, but add fallback for safety
      if (!item.cdnUrl && item.key && CDN_DOMAIN) {
        const cdnUrl = generateCdnUrl(item.key);
        return { ...item, cdnUrl };
      }
      return item;
    });
    
    // Log CDN vs S3 URL usage for debugging
    const cdnCount = enhancedItems.filter(item => item.cdnUrl).length;
    const totalCount = enhancedItems.length;
    console.log(`🚀 CDN URLs: ${cdnCount}/${totalCount} (${((cdnCount/totalCount)*100).toFixed(1)}%)`);
    
    setItems((prev) => [...prev, ...enhancedItems]);
    setCursor(res.nextCursor ?? null);
  }

  useEffect(() => {
    setItems([]);
    setCursor(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, kind, docType, refId, refreshToken]);

  // Preload first few CDN images for better performance
  useEffect(() => {
    if (items.length > 0) {
      const criticalImages = items.slice(0, 6); // Preload first 6 images
      criticalImages.forEach(item => {
        if (item.cdnUrl) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = item.cdnUrl;
          document.head.appendChild(link);
          
          // Clean up preload links after 10 seconds
          setTimeout(() => {
            if (document.head.contains(link)) {
              document.head.removeChild(link);
            }
          }, 10000);
        }
      });
    }
  }, [items]);

  async function detach(key: string) {
    try {
      if (kind === "note" && refId) await detachNoteFile(patientId, refId, key);
      else if (kind === "med" && refId) await detachMedFile(patientId, refId, key);
      else if (kind === "task" && refId) await detachTaskFile(patientId, refId, key);
      else if (kind === "doc" && docCategory) {
        console.log('Detaching document:', { patientId, category: docCategory, key });
        await detachDocument(patientId, { category: docCategory, key });
      }
      else return;

      // Best-effort: remove the underlying object too (subfolders supported)
      try {
        await deleteFiles(patientId, [key], { invalidate: true });
      } catch (e) {
        console.warn("s3 delete warning", e);
      }
      setItems((prev) => prev.filter((i) => i.key !== key));
      onDetached?.(key);
      toast("Removed attachment");
    } catch (e) {
      console.error("detach failed", e);
      
      // Check if it's a "key not found in category" error - this usually means the file
      // was already removed or uploaded to a different category. Remove from UI.
      const isKeyNotFoundError = e && typeof e === 'object' && 
        ('error' in e && e.error === 'key not found in category');
      
      // For development or key not found errors, still remove from UI
      if (import.meta.env.DEV || isKeyNotFoundError) {
        setItems((prev) => prev.filter((i) => i.key !== key));
        onDetached?.(key);
        if (isKeyNotFoundError) {
          toast("File removed (was already detached)");
        } else {
          toast("Removed attachment (development mode)");
        }
      } else {
        toast("Failed to remove attachment");
      }
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div className="relative aspect-square overflow-hidden rounded border" key={it.key}>
            {it.cdnUrl || it.url ? (
              <div className="relative w-full h-full">
                {/* Loading skeleton */}
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                  <div className="text-xs text-gray-400">Loading...</div>
                </div>
                <img 
                  src={it.cdnUrl ?? it.url ?? ""} 
                  alt={it.filename || ""} 
                  className="w-full h-full object-cover transition-opacity duration-200 relative z-10" 
                  loading="lazy"
                  decoding="async"
                  onLoad={(e) => {
                    console.log('✅ Image loaded:', it.cdnUrl ? 'CDN' : 'S3', it.filename);
                    // Hide loading skeleton
                    const skeleton = e.currentTarget.previousElementSibling;
                    if (skeleton) skeleton.style.display = 'none';
                  }}
                  onError={(e) => {
                    console.warn('❌ Image load failed:', it.filename);
                    const img = e.currentTarget as HTMLImageElement;
                    
                    // Try multiple fallback strategies
                    if (it.cdnUrl && img.src === it.cdnUrl && it.url) {
                      console.log('🔄 Fallback: CDN → S3 URL');
                      img.src = it.url;
                    } else if (img.src === it.url && it.key) {
                      console.log('🔄 Fallback: S3 → Placeholder');
                      // Show placeholder or filename
                      img.style.display = 'none';
                      const parent = img.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="flex items-center justify-center h-full bg-gray-100 text-xs p-2 text-center"><span>${it.filename || 'Image unavailable'}</span></div>`;
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50 text-xs p-2 text-center">
                <span className="break-all">{it.filename || it.key}</span>
              </div>
            )}
            {detachable && (
              <button
                className="absolute top-1 right-1 bg-black/60 text-white rounded px-1 text-xs"
                title="Remove"
                onClick={() => detach(it.key)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {cursor && (
        <div className="mt-3">
          <button className="text-sm underline" onClick={() => load(cursor)}>Load more</button>
        </div>
      )}
    </div>
  );
};

export default FileGrid;
