import React, { useEffect, useRef, useState } from "react";
import { DocEntry, DocumentsCategory } from "../lib/filesApi";

type Props = {
  documents: DocEntry[];
  detachable?: boolean;
  docCategory?: DocumentsCategory;
  onDetached?: (key: string) => void;
};

export const DocumentGrid: React.FC<Props> = ({ 
  documents, 
  detachable, 
  docCategory, 
  onDetached 
}) => {
  console.log('📋 DocumentGrid render:', {
    category: docCategory,
    documentCount: documents?.length || 0,
    documents: documents?.map(d => ({
      key: d.key,
      cdnUrl: d.cdnUrl,
      hasCdnUrl: !!d.cdnUrl
    }))
  });
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const canPrev = lightboxIndex !== null && lightboxIndex > 0;
  const canNext = lightboxIndex !== null && lightboxIndex < documents.length - 1;

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft" && canPrev) setLightboxIndex(i => (i === null ? i : i - 1));
      if (e.key === "ArrowRight" && canNext) setLightboxIndex(i => (i === null ? i : i + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, canPrev, canNext]);

  const swipeRef = useRef<{x:number,y:number}|null>(null);
  function onPointerDown(e: React.PointerEvent) {
    swipeRef.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: React.PointerEvent) {
    if (swipeRef.current == null) return;
    const dx = e.clientX - swipeRef.current.x;
    const dy = e.clientY - swipeRef.current.y;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    swipeRef.current = null;
    if (absX > 40 && absX > absY) {
      if (dx < 0 && canNext) setLightboxIndex(i => (i === null ? i : i + 1));
      else if (dx > 0 && canPrev) setLightboxIndex(i => (i === null ? i : i - 1));
    }
  }

  async function detach(key: string) {
    try {
      if (!docCategory) return;
      
      // Import detachDocument dynamically to avoid circular imports
      const { detachDocument } = await import("../lib/filesApi");
      
      // Get patient ID from the key (assumes format: patients/{uid}/...)
      const patientId = key.split('/')[1];
      if (!patientId) {
        console.error('Could not extract patient ID from key:', key);
        return;
      }
      
      console.log('Detaching document:', { patientId, category: docCategory, key });
      await detachDocument(patientId, { category: docCategory, key });
      
      onDetached?.(key);
      
      // Import toast dynamically
      const { toast } = await import("@/components/ui/sonner");
      toast("Removed attachment");
    } catch (e) {
      console.error("detach failed", e);
      
      // Check if it's a "key not found in category" error
      const isKeyNotFoundError = e && typeof e === 'object' && 
        ('error' in e && e.error === 'key not found in category');
      
      if (isKeyNotFoundError) {
        onDetached?.(key);
        const { toast } = await import("@/components/ui/sonner");
        toast("File removed (was already detached)");
      } else {
        const { toast } = await import("@/components/ui/sonner");
        toast("Failed to remove attachment");
      }
    }
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No documents found in this category
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {documents.map((doc, idx) => (
          <div className="relative aspect-square overflow-hidden rounded border cursor-zoom-in" key={doc.key}
               onClick={() => doc.cdnUrl && setLightboxIndex(idx)}>
          {doc.cdnUrl ? (
            <div className="relative w-full h-full">
              {/* Loading skeleton */}
              <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                <div className="text-xs text-gray-400">Loading...</div>
              </div>
              <img 
                src={doc.cdnUrl} 
                alt={doc.caption || "Document"} 
                className="w-full h-full object-cover transition-opacity duration-200 relative z-10" 
                loading="lazy"
                decoding="async"
                onLoad={(e) => {
                  console.log('✅ DocumentGrid: CDN image loaded successfully', {
                    key: doc.key,
                    cdnUrl: doc.cdnUrl,
                    category: docCategory
                  });
                  // Hide loading skeleton
                  const skeleton = e.currentTarget.previousElementSibling;
                  if (skeleton) skeleton.style.display = 'none';
                }}
                onError={(e) => {
                  console.error('❌ DocumentGrid: CDN image load failed', {
                    key: doc.key,
                    cdnUrl: doc.cdnUrl,
                    category: docCategory
                  });
                  const img = e.currentTarget as HTMLImageElement;
                  // Show placeholder
                  img.style.display = 'none';
                  const parent = img.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="flex items-center justify-center h-full bg-gray-100 text-xs p-2 text-center"><span>Document unavailable</span></div>`;
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 text-xs p-2 text-center">
              <span className="break-all">Document</span>
            </div>
          )}
          {detachable && (
            <button
              className="absolute top-1 right-1 bg-black/60 text-white rounded px-1 text-xs"
              title="Remove"
              onClick={(e) => { e.stopPropagation(); detach(doc.key); }}
            >
              ×
            </button>
          )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && documents[lightboxIndex] && (
        <div className="fixed inset-0 z-[100] bg-black/90 text-white" role="dialog" aria-modal="true"
             onClick={(e) => { if (e.target === e.currentTarget) setLightboxIndex(null); }}
             onPointerDown={onPointerDown}
             onPointerUp={onPointerUp}
        >
          <button
            aria-label="Close"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-3 right-3 p-2 rounded-md bg-white/10 hover:bg-white/20"
          >
            ×
          </button>

          <button
            disabled={!canPrev}
            onClick={(e) => { e.stopPropagation(); if (canPrev) setLightboxIndex(lightboxIndex - 1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30"
            aria-label="Previous"
          >
            ‹
          </button>

          <button
            disabled={!canNext}
            onClick={(e) => { e.stopPropagation(); if (canNext) setLightboxIndex(lightboxIndex + 1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30"
            aria-label="Next"
          >
            ›
          </button>

          <div className="absolute inset-0 flex items-center justify-center overflow-hidden select-none">
            {documents[lightboxIndex].cdnUrl ? (
              <img
                src={documents[lightboxIndex].cdnUrl!}
                alt={documents[lightboxIndex].caption || 'Document'}
                className="max-h-[90vh] max-w-[90vw] object-contain"
                draggable={false}
              />
            ) : (
              <div className="text-sm opacity-80">Preview not available</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentGrid;
