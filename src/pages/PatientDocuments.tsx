// PatientDocuments.tsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BottomBar } from "@/components/layout/BottomBar";
import { getDocuments } from "@/lib/filesApi";
import ImageUploader from "@/components/ImageUploader";
import FileGrid from "@/components/FileGrid";
import { categoryToDocType } from "@/lib/support";
import api from "@/lib/api";
import {
  Search,
  Plus,
  Camera,
  FileDown,
  Image as ImageIcon,
  FileText,
  ChevronLeft,
  EllipsisVertical,
  FileImage,
  ClipboardList,
  Stethoscope,
  FileSignature,
  ClipboardCheck,
  FileArchive,
} from "lucide-react";

// =====================
// Types
// =====================

type Stack = {
  id: string;
  name: string;
  icon: React.ReactNode;
  checked?: boolean;
  count?: number;
};

type DocCard = {
  id: string;
  title: string;
  date: string;
  thumbnailUrl?: string;
  stackId?: string;
  size?: number;
  uploadedBy?: string;
  originalUrl?: string;                 /* ★ */
};

// =====================
// Constants
// =====================

/* ★ Use doc collection keys (camelCase) as canonical IDs */
const CATEGORY_TITLES: Record<string, string> = {
  preopPics: "Pre-op Pics",
  labReports: "Lab Reports",
  radiology: "Radiology",
  intraopPics: "Intra-op Pics",
  otNotes: "OT Notes",
  postopPics: "Post-op Pics",
  dischargePics: "Discharge Docs",
};

/* ★ Icons keyed by doc collection keys (camelCase) */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  preopPics: <FileImage className="w-5 h-5" />,
  labReports: <ClipboardList className="w-5 h-5" />,
  radiology: <Stethoscope className="w-5 h-5" />,
  intraopPics: <FileImage className="w-5 h-5" />,
  otNotes: <FileSignature className="w-5 h-5" />,
  postopPics: <ClipboardCheck className="w-5 h-5" />,
  dischargePics: <FileArchive className="w-5 h-5" />,
};

// If you receive snake_case from somewhere else, map it here
/* ★ Optional helper if other parts still pass snake_case */
const SNAKE_TO_CAMEL: Record<string, string> = {
  preop_pics: "preopPics",
  lab_reports: "labReports",
  radiology: "radiology",
  intraop_pics: "intraopPics",
  ot_notes: "otNotes",
  postop_pics: "postopPics",
  discharge_pics: "dischargePics",
};

// =====================
// Style helpers
// =====================

const circleRing =
  "relative flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/60 shadow-inner shadow-black/40";

const chip =
  "px-2 py-0.5 text-[11px] rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300";

// =====================
// UI Components
// =====================

function TopBar({ title, onBack, trailing }: { title: string; onBack?: () => void; trailing?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-20 backdrop-blur bg-zinc-950/70">
      <div className="flex items-center gap-2 p-3">
        {onBack ? (
          <button onClick={onBack} className="p-2 rounded-full hover:bg-zinc-800">
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <div className="text-lg font-medium">{title}</div>
        <div className="ml-auto" />
        {trailing}
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, patientName }: { value: string; onChange: (v: string) => void; patientName?: string }) {
  return (
    <div className="px-3 pb-3">
      <div className="flex items-center gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 px-3 py-2">
        <Search className="w-4 h-4 text-zinc-400" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search your documents"
          className="bg-transparent outline-none w-full text-sm placeholder:text-zinc-500"
        />
        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-600/30">
          <span className="text-[11px] text-emerald-300 font-medium">
            {patientName?.charAt(0)?.toUpperCase() || 'P'}
          </span>
        </div>
      </div>
    </div>
  );
}

function StackPill({ stack, onClick }: { stack: Stack; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors"
    >
      <div className={`${circleRing} w-14 h-14`}>
        <div className="w-10 h-10 rounded-full bg-zinc-800/60 border border-zinc-700 flex items-center justify-center">
          {stack.icon}
        </div>
      </div>
      <div className="text-[12px] text-zinc-300 text-center leading-tight">
        {stack.name}
        {stack.count !== undefined && stack.count > 0 && (
          <div className="text-[10px] text-zinc-500 mt-0.5">{stack.count} docs</div>
        )}
      </div>
    </button>
  );
}

function StacksGrid({ stacks, onStackPress }: { 
  stacks: Stack[]; 
  onStackPress?: (s: Stack) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-3 px-3">
      {stacks.map((s) => (
        <StackPill key={s.id} stack={s} onClick={() => onStackPress?.(s)} />
      ))}
    </div>
  );
}

/* ★ DocRow now accepts onOpen to open the viewer */
function DocRow({ doc, onOpen }: { doc: DocCard; onOpen?: () => void }) {
  return (
    <div className="px-3">
      <div className="py-3 border-b border-zinc-800">
        <div className="text-xs text-zinc-400 mb-2">{doc.date} · 1 doc</div>
        <div className="flex items-center gap-3">
          <button
            className="w-28 h-20 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer" /* ★ */
            onClick={onOpen} /* ★ */
            aria-label="Open image" /* ★ */
          >
            {doc.thumbnailUrl ? (
              <img src={doc.thumbnailUrl} alt="thumb" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-zinc-500">
                <FileText className="w-8 h-8" />
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{doc.title}</div>
            <div className="text-xs text-zinc-400 mb-2">
              {doc.uploadedBy && `By ${doc.uploadedBy} • `}
              {doc.size && `${Math.round(doc.size / 1024)} KB`}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <button className={chip} onClick={onOpen}>Open</button> {/* ★ */}
              <span className={chip}>Share</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ★ Lightweight full-screen Image Viewer */
function ImageViewer({
  items,
  index,
  onClose,
  setIndex,
}: {
  items: DocCard[];
  index: number;
  onClose: () => void;
  setIndex: (i: number) => void;
}) {
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      >
        <div className="flex items-center justify-between p-3">
          <button onClick={onClose} className="px-3 py-1 rounded-md bg-zinc-800 border border-zinc-700">Close</button>
          <div className="text-sm text-zinc-300">
            {items[index]?.title || "Document"}
          </div>
          <div className="w-[64px]" />
        </div>
        <div className="flex-1 flex items-center justify-center p-3">
          {/* Use originalUrl if available, else fallback to thumbnail */}
          <img
            src={items[index]?.originalUrl || items[index]?.thumbnailUrl || ""}
            alt="document"
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <div className="flex items-center justify-between p-3">
          <button
            disabled={!hasPrev}
            onClick={() => hasPrev && setIndex(index - 1)}
            className={`px-3 py-1 rounded-md border ${hasPrev ? "bg-zinc-800 border-zinc-700" : "bg-zinc-900 border-zinc-800 text-zinc-600"}`}
          >
            Prev
          </button>
          <div className="text-xs text-zinc-400">{index + 1} / {items.length}</div>
          <button
            disabled={!hasNext}
            onClick={() => hasNext && setIndex(index + 1)}
            className={`px-3 py-1 rounded-md border ${hasNext ? "bg-zinc-800 border-zinc-700" : "bg-zinc-900 border-zinc-800 text-zinc-600"}`}
          >
            Next
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function BottomNav({ tab, setTab }: { tab: "home" | "docs"; setTab: (t: "home" | "docs") => void }) {
  return (
    <div className="sticky bottom-0 z-20 bg-zinc-950/80 backdrop-blur border-t border-zinc-800">
      <div className="grid grid-cols-2">
        <button
          onClick={() => setTab("home")}
          className={`py-3 text-sm ${tab === "home" ? "text-white" : "text-zinc-400"}`}
        >
          Home
        </button>
        <button
          onClick={() => setTab("docs")}
          className={`py-3 text-sm ${tab === "docs" ? "text-white" : "text-zinc-400"}`}
        >
          All documents
        </button>
      </div>
    </div>
  );
}

function SpeedDial({ open, onToggle, onAction }: { 
  open: boolean; 
  onToggle: () => void; 
  onAction: (key: string) => void 
}) {
  return (
    <div className="fixed right-5 bottom-20">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-3 space-y-3"
          >
            <button
              onClick={() => onAction("pdf")}
              className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 shadow"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 grid place-items-center">
                <FileDown className="w-5 h-5" />
              </div>
              <span className="text-sm">Import PDF file</span>
            </button>
            <button
              onClick={() => onAction("gallery")}
              className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 shadow"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 grid place-items-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <span className="text-sm">Import from Gallery</span>
            </button>
            <button
              onClick={() => onAction("camera")}
              className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 shadow"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 grid place-items-center">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-sm">Take a photo</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={onToggle} 
        className="w-14 h-14 rounded-full grid place-items-center bg-emerald-600 text-black shadow-xl"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

// =====================
// Main Component
// =====================

export default function PatientDocuments() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [tab, setTab] = useState<"home" | "docs">("home");
  const [query, setQuery] = useState("");
  const [dialOpen, setDialOpen] = useState(false);

  /* ★ selectedStack is now camelCase doc key (e.g., 'preopPics') */
  const [selectedStack, setSelectedStack] = useState<string | null>(null);
  const [docs, setDocs] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);

  /* ★ Viewer state */
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  async function refresh() {
    if (!id) return;
    try {
      const [patientData, documents] = await Promise.all([
        api.patients.get(id),
        getDocuments(id)
      ]);
      setPatient(patientData);
      setDocs(documents);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }

  const debounceRef = useRef<number | null>(null);
  function debouncedRefresh(delay = 200) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      refresh();
    }, delay);
  }

  useEffect(() => {
    refresh();
  }, [id]);

  /* ★ Build stacks using camelCase IDs that match docs keys */
  const stacks: Stack[] = useMemo(() => {
    if (!docs) return [];
    return [
      { id: "preopPics",     name: CATEGORY_TITLES["preopPics"],     icon: CATEGORY_ICONS["preopPics"],     count: docs.preopPics?.length ?? 0 },
      { id: "labReports",    name: CATEGORY_TITLES["labReports"],    icon: CATEGORY_ICONS["labReports"],    count: docs.labReports?.length ?? 0 },
      { id: "radiology",     name: CATEGORY_TITLES["radiology"],     icon: CATEGORY_ICONS["radiology"],     count: docs.radiology?.length ?? 0 },
      { id: "intraopPics",   name: CATEGORY_TITLES["intraopPics"],   icon: CATEGORY_ICONS["intraopPics"],   count: docs.intraopPics?.length ?? 0 },
      { id: "otNotes",       name: CATEGORY_TITLES["otNotes"],       icon: CATEGORY_ICONS["otNotes"],       count: docs.otNotes?.length ?? 0 },
      { id: "postopPics",    name: CATEGORY_TITLES["postopPics"],    icon: CATEGORY_ICONS["postopPics"],    count: docs.postopPics?.length ?? 0 },
      { id: "dischargePics", name: CATEGORY_TITLES["dischargePics"], icon: CATEGORY_ICONS["dischargePics"], count: docs.dischargePics?.length ?? 0 },
    ];
  }, [docs]);

  const allDocuments: DocCard[] = useMemo(() => {
    if (!docs) return [];
    
    const allDocs: DocCard[] = [];
    Object.entries(docs).forEach(([category, documents]: [string, any]) => {
      if (Array.isArray(documents)) {
        documents.forEach((doc: any, index: number) => {
          allDocs.push({
            id: `${category}-${index}`,
            title: doc.caption || `${CATEGORY_TITLES[category] || category} Document`,
            date: new Date(doc.uploadedAt).toLocaleDateString(),
            thumbnailUrl: doc.thumbUrl,
            stackId: category,                  /* ★ keep camelCase */
            size: doc.size,
            uploadedBy: doc.uploadedBy,
            originalUrl: doc.url || doc.publicUrl || doc.thumbUrl, /* ★ */
          });
        });
      }
    });
    
    // Sort by uploadedAt descending (use original date, not the locale string)
    /* ★ Use uploadedAt timestamps if present, else fallback */
    return allDocs.sort((a, b) => {
      const ad = new Date(a.date).getTime();
      const bd = new Date(b.date).getTime();
      return bd - ad;
    });
  }, [docs]);

  const filteredDocs = useMemo(() => {
    let filtered = allDocuments;
    
    // Filter by selected stack (already camelCase)
    if (selectedStack && tab === "docs") {
      filtered = filtered.filter(doc => doc.stackId === selectedStack);
    }
    
    // Filter by search query
    const q = query.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(doc => doc.title.toLowerCase().includes(q));
    }
    
    return filtered;
  }, [allDocuments, selectedStack, tab, query]);

  const handleStackPress = (stack: Stack) => {
    setSelectedStack(stack.id); /* ★ id is camelCase now */
    setTab("docs");
  };

  const handleSpeedDial = async (action: string) => {
    if (!patient) return;
    if (action === "camera" || action === "gallery") {
      console.log(`Upload ${action} for patient:`, patient.mrn);
    }
    setDialOpen(false);
  };

  const getTitle = () => {
    if (tab === "home") return "Your Stacks";
    if (selectedStack) {
      const stack = stacks.find(s => s.id === selectedStack);
      return stack?.name || "Documents";
    }
    return "All documents";
  };

  const handleBack = () => {
    if (tab === "docs" && selectedStack) {
      setSelectedStack(null);
      setTab("home");
    } else {
      navigate(`/patients/${id}`);
    }
  };

  if (!docs || !patient) {
    return (
      <div className="w-full h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  /* ★ Local copy for viewer items (current filtered list) */
  const viewerItems = filteredDocs;

  return (
    <div className="w-full h-screen bg-zinc-950 text-zinc-100 overflow-hidden relative">
      <TopBar
        title={getTitle()}
        onBack={handleBack}
        trailing={
          <button className="p-2 rounded-full hover:bg-zinc-800">
            <EllipsisVertical className="w-5 h-5" />
          </button>
        }
      />

      <SearchBar value={query} onChange={setQuery} patientName={patient.name} />

      {tab === "home" ? (
        <div className="pb-28 space-y-4">
          <StacksGrid stacks={stacks} onStackPress={handleStackPress} />
        </div>
      ) : (
        <div className="pb-28">
          {filteredDocs.map((d, i) => (
            <DocRow
              key={d.id}
              doc={d}
              onOpen={() => {                /* ★ */
                setViewerIndex(i);          /* ★ */
                setViewerOpen(true);        /* ★ */
              }}                            /* ★ */
            />
          ))}
          {filteredDocs.length === 0 && (
            <div className="px-3 py-12 text-center text-zinc-400">No documents found.</div>
          )}
        </div>
      )}

      <BottomNav tab={tab} setTab={(newTab) => {
        setTab(newTab);
        if (newTab === "home") {
          setSelectedStack(null);
        }
      }} />

      <SpeedDial 
        open={dialOpen} 
        onToggle={() => setDialOpen((v) => !v)} 
        onAction={handleSpeedDial} 
      />

      {/* ★ Image Viewer */}
      {viewerOpen && (
        <ImageViewer
          items={viewerItems}
          index={viewerIndex}
          onClose={() => setViewerOpen(false)}
          setIndex={setViewerIndex}
        />
      )}

      <BottomBar />
    </div>
  );
}
