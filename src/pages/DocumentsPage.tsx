// app/pages/DocumentsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
// import { Card } from "@/components/ui/card"; // not used in simplified view
import {
  getDocuments,
  DocumentsProfile,
  DocumentsCategory,
} from "../lib/filesApi";
import DocumentGrid from "../components/DocumentGrid";
import PhotoUploader from "../components/PhotoUploader";
import CategorySelector from "../components/CategorySelector";
import {
  Camera,
  FileText,
  Stethoscope,
  Scissors,
  ClipboardList,
  Activity,
  FileCheck,
  FolderOpen,
  Plus,
} from "lucide-react";

// Helper function to get documents for a specific category
function getCategoryDocuments(docs: DocumentsProfile, category: DocumentsCategory) {
  switch (category) {
    case 'preop_pics': return docs.preopPics || [];
    case 'lab_reports': return docs.labReports || [];
    case 'radiology': return docs.radiology || [];
    case 'intraop_pics': return docs.intraopPics || [];
    case 'ot_notes': return docs.otNotes || [];
    case 'postop_pics': return docs.postopPics || [];
    case 'discharge_pics': return docs.dischargePics || [];
    default: return [];
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   CATEGORY CONFIG (icons, labels, colors)
   ────────────────────────────────────────────────────────────────────────── */
const CATEGORY_CONFIG: Record<
  DocumentsCategory | "all",
  {
    title: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string; // tailwind text-* color for pill
    bgFrom?: string; // gradient bg start (for icon chip)
    bgTo?: string; // gradient bg end
  }
> = {
  preop_pics: {
    title: "Pre-operative",
    shortLabel: "Pre-op",
    icon: Camera,
    color: "text-blue-600",
    bgFrom: "from-blue-500",
    bgTo: "to-blue-600",
  },
  lab_reports: {
    title: "Lab Reports",
    shortLabel: "Labs",
    icon: FileText,
    color: "text-green-600",
    bgFrom: "from-green-500",
    bgTo: "to-green-600",
  },
  radiology: {
    title: "Radiology",
    shortLabel: "Radio",
    icon: Activity,
    color: "text-purple-600",
    bgFrom: "from-purple-500",
    bgTo: "to-purple-600",
  },
  intraop_pics: {
    title: "Intra-operative",
    shortLabel: "Intra",
    icon: Scissors,
    color: "text-red-600",
    bgFrom: "from-red-500",
    bgTo: "to-red-600",
  },
  ot_notes: {
    title: "OT Notes",
    shortLabel: "Notes",
    icon: ClipboardList,
    color: "text-orange-600",
    bgFrom: "from-orange-500",
    bgTo: "to-orange-600",
  },
  postop_pics: {
    title: "Post-operative",
    shortLabel: "Post",
    icon: Stethoscope,
    color: "text-teal-600",
    bgFrom: "from-teal-500",
    bgTo: "to-teal-600",
  },
  discharge_pics: {
    title: "Discharge",
    shortLabel: "Disc",
    icon: FileCheck,
    color: "text-indigo-600",
    bgFrom: "from-indigo-500",
    bgTo: "to-indigo-600",
  },
  all: {
    title: "All Documents",
    shortLabel: "All",
    icon: FolderOpen,
    color: "text-gray-600",
    bgFrom: "from-gray-500",
    bgTo: "to-gray-600",
  },
};

const CATEGORY_KEYS: DocumentsCategory[] = [
  "preop_pics",
  "lab_reports",
  "radiology",
  "intraop_pics",
  "ot_notes",
  "postop_pics",
  "discharge_pics",
];

// Simplified version - unused types and helpers removed

// Simplified page: only the "All Documents" section with category counts

/* ──────────────────────────────────────────────────────────────────────────
   PAGE
   ────────────────────────────────────────────────────────────────────────── */
export default function DocumentsPage() {
  const { id: uid, category: categoryParam } = useParams();
  const navigate = useNavigate();

  const [docs, setDocs] = useState<DocumentsProfile | null>(null);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState<DocumentsCategory | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // No filters/sorting/upload controls in the simplified view

  async function refresh() {
    if (!uid) return;
    console.time('🏥 Documents API Call');
    try {
      const res = await getDocuments(uid);
      console.timeEnd('🏥 Documents API Call');
      console.log('📊 Documents loaded:', {
        categories: Object.keys(res).filter(k => Array.isArray(res[k])),
        totalDocs: Object.values(res).reduce((acc, val) => 
          Array.isArray(val) ? acc + val.length : acc, 0
        )
      });
      setDocs(res);
    } catch (error) {
      console.timeEnd('🏥 Documents API Call');
      console.error('❌ Failed to load documents:', error);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  /* Counts per category */
  const counts = useMemo(() => {
    if (!docs)
      return {
        preop_pics: 0,
        lab_reports: 0,
        radiology: 0,
        intraop_pics: 0,
        ot_notes: 0,
        postop_pics: 0,
        discharge_pics: 0,
      } as Record<DocumentsCategory, number>;
    return {
      preop_pics: docs.preopPics?.length ?? 0,
      lab_reports: docs.labReports?.length ?? 0,
      radiology: docs.radiology?.length ?? 0,
      intraop_pics: docs.intraopPics?.length ?? 0,
      ot_notes: docs.otNotes?.length ?? 0,
      postop_pics: docs.postopPics?.length ?? 0,
      discharge_pics: docs.dischargePics?.length ?? 0,
    } as Record<DocumentsCategory, number>;
  }, [docs]);

  const total = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);

  // Simplified view doesn't compute per-file lists here

  // Determine if we're in category view or main view
  const isInCategoryView = uid && isValidCategory(categoryParam) && docs;
  const currentCategory = categoryParam as DocumentsCategory;
  const categoryDocuments = isInCategoryView ? getCategoryDocuments(docs, currentCategory) : [];

  // Keyboard navigation for lightbox
  React.useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft' && lightboxIndex! > 0) setLightboxIndex(i => (i! - 1));
      if (e.key === 'ArrowRight' && lightboxIndex! < categoryDocuments.length - 1) setLightboxIndex(i => (i! + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, categoryDocuments.length]);

  const swipeRef = React.useRef<{x:number,y:number}|null>(null);
  const movedRef = React.useRef(false);
  function onPointerDown(e: React.PointerEvent) { swipeRef.current = { x: e.clientX, y: e.clientY }; }
  function onPointerUp(e: React.PointerEvent) {
    if (swipeRef.current == null) return;
    const dx = e.clientX - swipeRef.current.x;
    const dy = e.clientY - swipeRef.current.y;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    swipeRef.current = null;
    if (absX > 3 || absY > 3) movedRef.current = true;
    if (absX > 40 && absX > absY) {
      if (dx < 0 && lightboxIndex! < categoryDocuments.length - 1) setLightboxIndex(i => (i! + 1));
      else if (dx > 0 && lightboxIndex! > 0) setLightboxIndex(i => (i! - 1));
    }
  }

  // Zoom/Pan state for lightbox
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState<{x:number,y:number}>({ x: 0, y: 0 });
  const lastPan = React.useRef<{ x: number; y: number } | null>(null);
  const activePointers = React.useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = React.useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = React.useRef<number>(0);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  React.useEffect(() => {
    // Reset zoom when switching image or closing
    setScale(1);
    setOffset({ x: 0, y: 0 });
    lastPan.current = null;
    activePointers.current.clear();
    pinchStart.current = null;
  }, [lightboxIndex]);

  function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
  const MIN_SCALE = 1;
  const MAX_SCALE = 4;

  function onLightboxWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return; // pinch gesture or ctrl+wheel
    e.preventDefault();
    setScale((s) => clamp(s + (e.deltaY > 0 ? -0.1 : 0.1), MIN_SCALE, MAX_SCALE));
  }

  function onLbPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.current.size === 1) {
      // Start pan if zoomed
      lastPan.current = { x: e.clientX, y: e.clientY };
    } else if (activePointers.current.size === 2) {
      // Start pinch
      const pts = Array.from(activePointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinchStart.current = { dist: Math.hypot(dx, dy), scale };
      lastPan.current = null; // disable pan while pinching
    }
  }

  function onLbPointerMove(e: React.PointerEvent) {
    if (!activePointers.current.has(e.pointerId)) return;
    const prev = activePointers.current.get(e.pointerId)!;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2 && pinchStart.current) {
      const pts = Array.from(activePointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy) || 1;
      const nextScale = clamp(pinchStart.current.scale * (dist / (pinchStart.current.dist || 1)), MIN_SCALE, MAX_SCALE);
      setScale(nextScale);
      return;
    }

    if (scale > 1 && lastPan.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
      lastPan.current = { x: e.clientX, y: e.clientY };
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) movedRef.current = true;
    }
  }

  function onLbPointerUp(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchStart.current = null;
    if (activePointers.current.size === 0) lastPan.current = null;
  }

  function onLightboxDoubleClick() {
    setScale((s) => (s === 1 ? 2 : 1));
    if (scale === 1) setOffset({ x: 0, y: 0 });
  }

  function onLightboxClick(e: React.MouseEvent) {
    // double‑tap support on touch devices
    const now = Date.now();
    const delta = now - lastTap.current;
    lastTap.current = now;
    if (delta < 300) {
      onLightboxDoubleClick();
      return;
    }
    // Suppress close if there was a drag/pan
    if (movedRef.current) { movedRef.current = false; return; }
    // Close when clicking backdrop (not the image or controls)
    const path: EventTarget[] = (e as any).nativeEvent?.composedPath?.() || [];
    if (imgRef.current && path.includes(imgRef.current)) return;
    setLightboxIndex(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Dynamic Header based on view */}
      {isInCategoryView ? (
        <Header 
          title={CATEGORY_CONFIG[currentCategory].title} 
          showBack 
          onBack={() => navigate(`/patients/${uid}/docs`)} 
        />
      ) : (
        <Header title="Documents" showBack onBack={() => navigate(-1)} />
      )}

      <main className="p-4">
        {!isInCategoryView ? (
          /* Main Documents Overview */
          <>
            <h2 className="text-[#0d141c] text-[22px] font-bold tracking-[-0.015em] pb-3 pt-1">
              All Documents
            </h2>
            <CategoriesOverview
              counts={counts}
              total={total}
              onOpenCategory={(k) => {
                if (!uid) return;
                navigate(`/patients/${uid}/docs/${k}`);
              }}
            />
          </>
        ) : (
          /* Category Gallery View */
          <div className="space-y-6">
            {/* Category Header with Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-3 rounded-full bg-gradient-to-r ${CATEGORY_CONFIG[currentCategory].bgFrom} ${CATEGORY_CONFIG[currentCategory].bgTo}`}>
                {React.createElement(CATEGORY_CONFIG[currentCategory].icon, { 
                  className: "h-6 w-6 text-white" 
                })}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[#0d141c] mb-1">
                  {CATEGORY_CONFIG[currentCategory].title}
                </h1>
                <p className="text-sm text-gray-600">
                  {categoryDocuments.length} {categoryDocuments.length === 1 ? 'document' : 'documents'}
                </p>
              </div>
              <PhotoUploader
                patientId={uid}
                category={currentCategory}
                onUploadComplete={() => refresh()}
              />
            </div>

            {/* Gallery Grid */}
            {categoryDocuments.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoryDocuments.map((doc, index) => (
                  <div 
                    key={doc.key} 
                    className="relative group aspect-square bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200"
                    onClick={() => doc.cdnUrl && setLightboxIndex(index)}
                  >
                    {doc.cdnUrl ? (
                      <>
                        {/* Loading skeleton */}
                        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                          <div className="text-xs text-gray-400">Loading...</div>
                        </div>
                        <img 
                          src={doc.cdnUrl} 
                          alt={doc.caption || `${CATEGORY_CONFIG[currentCategory].title} ${index + 1}`}
                          className="w-full h-full object-cover relative z-10 cursor-pointer" 
                          loading="lazy"
                          decoding="async"
                          onLoad={(e) => {
                            console.log('✅ Gallery image loaded:', doc.key);
                            const skeleton = e.currentTarget.previousElementSibling;
                            if (skeleton) skeleton.style.display = 'none';
                          }}
                          onError={(e) => {
                            console.warn('❌ Gallery image failed:', doc.key);
                            const img = e.currentTarget as HTMLImageElement;
                            img.style.display = 'none';
                            const parent = img.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="flex items-center justify-center h-full bg-gray-100 text-xs p-2 text-center"><span>Image unavailable</span></div>`;
                            }
                          }}
                        />
                        
                        {/* Overlay with image info */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-end">
                          <div className="w-full p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                            {doc.caption && (
                              <p className="text-sm font-medium truncate mb-1">{doc.caption}</p>
                            )}
                            <p className="text-xs opacity-80">
                              {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Unknown date'}
                            </p>
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                          title="Remove image"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Use the detach function from DocumentGrid
                            const detachFunction = async () => {
                              try {
                                const { detachDocument } = await import("../lib/filesApi");
                                const patientId = doc.key.split('/')[1];
                                await detachDocument(patientId, { category: currentCategory, key: doc.key });
                                refresh();
                                const { toast } = await import("@/components/ui/sonner");
                                toast("Image removed");
                              } catch (error) {
                                console.error("Remove failed", error);
                                const { toast } = await import("@/components/ui/sonner");
                                toast("Failed to remove image");
                              }
                            };
                            detachFunction();
                          }}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-100 text-sm text-gray-500">
                        <span>No image</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-12">
                <div className={`mx-auto w-16 h-16 rounded-full bg-gradient-to-r ${CATEGORY_CONFIG[currentCategory].bgFrom} ${CATEGORY_CONFIG[currentCategory].bgTo} flex items-center justify-center mb-4`}>
                  {React.createElement(CATEGORY_CONFIG[currentCategory].icon, { 
                    className: "h-8 w-8 text-white" 
                  })}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No {CATEGORY_CONFIG[currentCategory].title.toLowerCase()} yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Start by uploading your first document to this category
                </p>
                <PhotoUploader
                  patientId={uid}
                  category={currentCategory}
                  onUploadComplete={() => refresh()}
                  className="inline-block"
                />
              </div>
            )}
          </div>
        )}
      </main>

      <BottomBar />

      {/* Lightbox overlay */}
      {isInCategoryView && lightboxIndex !== null && categoryDocuments[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 text-white"
          role="dialog"
          aria-modal="true"
          onClick={onLightboxClick}
          onPointerDown={(e) => { onPointerDown(e); onLbPointerDown(e); }}
          onPointerMove={onLbPointerMove}
          onPointerUp={(e) => { onPointerUp(e); onLbPointerUp(e); }}
          onWheel={onLightboxWheel}
          style={{ touchAction: 'none' }}
        >
          <button
            aria-label="Close"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-3 right-3 p-2 rounded-md bg-white/10 hover:bg-white/20"
          >
            ×
          </button>

          <button
            disabled={lightboxIndex === 0}
            onClick={(e) => { e.stopPropagation(); if (lightboxIndex! > 0) setLightboxIndex(lightboxIndex - 1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30"
            aria-label="Previous"
          >
            ‹
          </button>

          <button
            disabled={lightboxIndex === categoryDocuments.length - 1}
            onClick={(e) => { e.stopPropagation(); if (lightboxIndex! < categoryDocuments.length - 1) setLightboxIndex(lightboxIndex + 1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30"
            aria-label="Next"
          >
            ›
          </button>

          <div className="absolute inset-0 flex items-center justify-center overflow-hidden select-none">
            {categoryDocuments[lightboxIndex].cdnUrl ? (
              <img
                src={categoryDocuments[lightboxIndex].cdnUrl!}
                alt={categoryDocuments[lightboxIndex].caption || 'Document'}
                className="max-h-[90vh] max-w-[90vw] object-contain"
                draggable={false}
                onDoubleClick={onLightboxDoubleClick}
                ref={imgRef}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: activePointers.current.size ? 'none' : 'transform 120ms ease',
                }}
              />
            ) : (
              <div className="text-sm opacity-80">Preview not available</div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button for Quick Upload */}
      {uid && !categoryParam && (
        <button
          onClick={() => setShowCategorySelector(true)}
          className="fixed bottom-24 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors z-40"
          title="Add Photo"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Category Selector Modal */}
      <CategorySelector
        isOpen={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        onSelectCategory={(category) => {
          setSelectedUploadCategory(category);
          // Navigate to the category page for upload
          navigate(`/patients/${uid}/docs/${category}`);
        }}
      />

      {/* Hidden PhotoUploader for category-based uploads */}
      {selectedUploadCategory && uid && (
        <div className="hidden">
          <PhotoUploader
            patientId={uid}
            category={selectedUploadCategory}
            onUploadComplete={() => {
              refresh();
              setSelectedUploadCategory(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   COMPONENTS
   ────────────────────────────────────────────────────────────────────────── */

// Unused components removed for cleaner simplified version

function CategoriesOverview({
  counts,
  total,
  onOpenCategory,
}: {
  counts: Record<DocumentsCategory, number>;
  total: number;
  onOpenCategory: (k: DocumentsCategory) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3">
      {CATEGORY_KEYS.map((k) => {
        const cfg = CATEGORY_CONFIG[k];
        const Icon = cfg.icon;
        return (
          <button
            key={k}
            onClick={() => onOpenCategory(k)}
            className="text-left flex flex-1 gap-3 rounded-lg border border-[#cedbe9] bg-slate-50 p-4 flex-col hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label={`Open ${cfg.title}`}
          >
            <div className="text-[#0d141c]">
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-[#0d141c] text-base font-bold leading-tight">
                {cfg.title}
              </h4>
              <p className="text-[#47739e] text-sm leading-normal">
                {counts[k]} {counts[k] === 1 ? "Document" : "Documents"}
              </p>
            </div>
          </button>
        );
      })}
      {/* Optional overall tile */}
      <div className="flex flex-1 gap-3 rounded-lg border border-[#cedbe9] bg-slate-50 p-4 flex-col">
        <div className="text-[#0d141c]">
          <FolderOpen className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-[#0d141c] text-base font-bold leading-tight">All</h4>
          <p className="text-[#47739e] text-sm leading-normal">
            {total} {total === 1 ? "Document" : "Documents"}
          </p>
        </div>
      </div>
    </div>
  );
}

  // (Helpers removed; simplified page doesn't need them)

function isValidCategory(x: unknown): x is DocumentsCategory {
  return (
    x === "preop_pics" ||
    x === "lab_reports" ||
    x === "radiology" ||
    x === "intraop_pics" ||
    x === "ot_notes" ||
    x === "postop_pics" ||
    x === "discharge_pics"
  );
}
