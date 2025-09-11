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
import FileGrid from "../components/FileGrid";
import { categoryToDocType } from "../lib/support";
import {
  Camera,
  FileText,
  Stethoscope,
  Scissors,
  ClipboardList,
  Activity,
  FileCheck,
  FolderOpen,
} from "lucide-react";

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

// Simplified page: only the "All Documents" section with category counts

/* ──────────────────────────────────────────────────────────────────────────
   PAGE
   ────────────────────────────────────────────────────────────────────────── */
export default function DocumentsPage() {
  const { id: uid, category: categoryParam } = useParams();
  const navigate = useNavigate();

  const [docs, setDocs] = useState<DocumentsProfile | null>(null);
  // No filters/sorting/upload controls in the simplified view

  async function refresh() {
    if (!uid) return;
    const res = await getDocuments(uid);
    setDocs(res);
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
        {uid && isValidCategory(categoryParam) && (
          <section className="mt-8">
            <h3 className="text-[#0d141c] text-lg font-bold tracking-[-0.015em] pb-2">
              {CATEGORY_CONFIG[categoryParam as DocumentsCategory].title}
            </h3>
            <FileGrid
              patientId={uid}
              kind="doc"
              docType={categoryToDocType(categoryParam as DocumentsCategory)}
              detachable
              docCategory={categoryParam as DocumentsCategory}
              onDetached={() => refresh()}
            />
          </section>
        )}
      </main>

      <BottomBar />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   COMPONENTS
   ────────────────────────────────────────────────────────────────────────── */

function Pill({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-8 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-medium",
        selected ? "bg-[#0d141c] text-white" : "bg-[#e6edf4] text-[#0d141c]",
      ].join(" ")}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-600 font-medium">No documents found</p>
      <p className="text-xs text-gray-400 mt-1">Upload a file to get started</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-lg bg-gray-200/60 animate-pulse"
        />
      ))}
    </div>
  );
}

function DocumentsGrid({ items }: { items: UnifiedDocItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((it) =>
        it.isImage ? (
          <ImageTile key={it.id} item={it} />
        ) : (
          <DocumentTile key={it.id} item={it} />
        )
      )}
    </div>
  );
}

function ImageTile({ item }: { item: UnifiedDocItem }) {
  const cfg = CATEGORY_CONFIG[item.category];
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group relative flex aspect-square flex-col justify-end overflow-hidden rounded-lg bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(0deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 60%), url("${escapeCssUrl(
          item.thumbUrl || item.url
        )}")`,
      }}
      title={`${cfg.title} • ${prettyDate(item.uploadedAt)}`}
    >
      <span className="sr-only">{item.name}</span>

      {/* category chip */}
      <div className="absolute top-2 left-2">
        <div
          className={[
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white/95 backdrop-blur",
            cfg.color,
          ].join(" ")}
        >
          <cfg.icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{cfg.shortLabel}</span>
        </div>
      </div>

      {/* footer label */}
      <div className="p-3">
        <p className="text-white text-sm font-semibold leading-tight line-clamp-2">
          {item.name}
        </p>
        <p className="text-white/80 text-[11px]">{prettyDate(item.uploadedAt)}</p>
      </div>

      {/* interaction hint */}
      <div className="absolute right-2 bottom-2 h-7 w-7 rounded-full bg-white/25 group-hover:bg-white/35 transition-colors flex items-center justify-center">
        <span className="text-white text-xs">↗</span>
      </div>
    </a>
  );
}

function DocumentTile({ item }: { item: UnifiedDocItem }) {
  const cfg = CATEGORY_CONFIG[item.category];
  const Icon = cfg.icon;
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group relative flex aspect-square flex-col justify-between overflow-hidden rounded-lg border-2 border-gray-100 bg-white shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
      title={`${cfg.title} • ${prettyDate(item.uploadedAt)}`}
    >
      <div className="p-3">
        <div
          className={[
            "inline-flex rounded-md p-2 text-white",
            "bg-gradient-to-r",
            cfg.bgFrom,
            cfg.bgTo,
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="px-3 pb-3">
        <p className="text-gray-800 text-sm font-semibold leading-tight line-clamp-2">
          {item.name}
        </p>
        <p className="text-gray-500 text-[11px]">{prettyDate(item.uploadedAt)}</p>
      </div>

      <div className="absolute right-2 bottom-2 h-7 w-7 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors flex items-center justify-center">
        <span className="text-gray-700 text-xs">↗</span>
      </div>
    </a>
  );
}

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
