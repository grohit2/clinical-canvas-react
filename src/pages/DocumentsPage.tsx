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

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header title="Documents" showBack onBack={() => navigate(-1)} />

      <main className="p-4">
        {/* All Documents */}
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

        {/* Detail section below for selected category */}
        {uid && isValidCategory(categoryParam) && docs && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#0d141c] text-lg font-bold tracking-[-0.015em]">
                {CATEGORY_CONFIG[categoryParam as DocumentsCategory].title}
              </h3>
              <PhotoUploader
                patientId={uid}
                category={categoryParam as DocumentsCategory}
                onUploadComplete={() => refresh()}
              />
            </div>
            <DocumentGrid
              documents={getCategoryDocuments(docs, categoryParam as DocumentsCategory)}
              detachable
              docCategory={categoryParam as DocumentsCategory}
              onDetached={() => refresh()}
            />
          </section>
        )}
      </main>

      <BottomBar />

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
