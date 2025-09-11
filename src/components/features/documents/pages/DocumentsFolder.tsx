import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Plus } from "lucide-react";
import { fetchProfile, getItemsForCategory } from "../api/documents.client";
import { DocItem, DocCategory } from "../api/documents.types";
import { Lightbox } from "../components/Lightbox";
import ImageUploader from "@/components/ImageUploader";              // keep your existing uploader
import { categoryToDocType } from "@/lib/support";                   // keep your mapping
import { MobileGalleryPicker } from "../components/MobileGalleryPicker";

type SortOrder = "desc" | "asc";

export default function DocumentsFolder() {
  const { id: uid, category } = useParams<{ id: string; category: DocCategory }>();
  const navigate = useNavigate();

  const [items, setItems] = React.useState<DocItem[]>([]);
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc"); // Newest first
  const [lightIdx, setLightIdx] = React.useState<number | null>(null);
  const uploaderRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let alive = true;
    if (!uid || !category) return;
    fetchProfile(uid).then((p) => {
      if (!alive) return;
      const arr = getItemsForCategory(p, category);
      setItems(sortByDate(arr, "desc"));
    });
    return () => { alive = false; };
  }, [uid, category]);

  function sortByDate(arr: DocItem[], order: SortOrder) {
    const next = [...arr].sort((a, b) => {
      const ta = new Date(a.uploadedAt).getTime();
      const tb = new Date(b.uploadedAt).getTime();
      return order === "desc" ? tb - ta : ta - tb;
    });
    return next;
  }

  function toggleOrder() {
    setSortOrder((o) => {
      const next = o === "desc" ? "asc" : "desc";
      setItems((prev) => sortByDate(prev, next));
      return next;
    });
  }

  async function refresh() {
    if (!uid || !category) return;
    const p = await fetchProfile(uid);
    setItems(sortByDate(getItemsForCategory(p, category), sortOrder));
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header
        title="Documents"
        showBack
        onBack={() => navigate(`/patients/${uid}/docs`)}
      />

      <main className="p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-[#0d141c] text-[22px] font-bold tracking-[-0.015em]">
            {titleFor(category)}
          </h2>

          {/* Update button jumps to uploader */}
          <Button
            className="h-9"
            onClick={() => uploaderRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
          >
            <Plus className="h-4 w-4 mr-1" />
            Update
          </Button>
        </div>

        {/* Sort controls (date only, per request) */}
        <div className="flex items-center justify-between py-2">
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            <span>Sort by date</span>
          </div>
          <div>
            <Button size="sm" variant="ghost" className="h-8" onClick={toggleOrder}>
              {sortOrder === "desc" ? "Newest" : "Oldest"}
            </Button>
          </div>
        </div>

        {/* Grid */}
        {!items.length ? (
          <Empty />
        ) : (
          <Grid
            items={items}
            onOpen={(idx) => setLightIdx(idx)}
          />
        )}

        {/* Upload area (Update) */}
        <section ref={uploaderRef} className="mt-6">
          <h3 className="text-[#0d141c] text-lg font-bold tracking-[-0.015em] mb-2">
            Upload
          </h3>
          <Card className="border-2 border-dashed border-[#cedbe9] bg-white/70 backdrop-blur-sm">
            <div className="p-4 space-y-3">
              {/* Mobile-friendly gallery/camera picker — call your API inside onFiles */}
              <MobileGalleryPicker
                onFiles={async (_files) => {
                  // OPTIONAL: Implement a direct upload path if you want.
                  // If you rely on ImageUploader below, you can omit this
                  // and let users click its Browse button.
                }}
              />

              {/* Your existing uploader wired to this folder */}
              {uid && category && (
                <div className="rounded-md border border-gray-200 bg-gray-50/50 p-3">
                  <ImageUploader
                    patientId={uid}
                    ctx={{ kind: "doc", docType: categoryToDocType(category), category }}
                    onDone={() => refresh()}
                  />
                </div>
              )}
            </div>
          </Card>
        </section>
      </main>

      <BottomBar />

      {/* Lightbox */}
      {lightIdx !== null && (
        <Lightbox
          items={items.filter((x) => x.isImage)}
          // Map grid index to image-only index
          index={imageIndexFor(items, lightIdx)}
          onClose={() => setLightIdx(null)}
          onPrev={() =>
            setLightIdx((i) => {
              if (i === null) return i;
              const imgOnly = items.filter((x) => x.isImage);
              const current = imgOnly[imageIndexFor(items, i)];
              const curIdx = imgOnly.findIndex((x) => x.id === current.id);
              return gridIndexFor(items, imgOnly[Math.max(0, curIdx - 1)]?.id);
            })
          }
          onNext={() =>
            setLightIdx((i) => {
              if (i === null) return i;
              const imgOnly = items.filter((x) => x.isImage);
              const current = imgOnly[imageIndexFor(items, i)];
              const curIdx = imgOnly.findIndex((x) => x.id === current.id);
              return gridIndexFor(items, imgOnly[Math.min(imgOnly.length - 1, curIdx + 1)]?.id);
            })
          }
        />
      )}
    </div>
  );
}

/* ───────────── components ───────────── */

function Empty() {
  return (
    <div className="py-12 text-center text-gray-500 text-sm">
      No documents in this folder yet.
    </div>
  );
}

function Grid({
  items,
  onOpen,
}: {
  items: DocItem[];
  onOpen: (idx: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((it, idx) =>
        it.isImage ? (
          <button
            key={it.id}
            onClick={() => onOpen(idx)}
            className="group relative overflow-hidden rounded-lg border-2 border-gray-100 bg-white hover:shadow-md hover:border-blue-200 transition-all"
            title={new Date(it.uploadedAt).toLocaleString()}
          >
            <img
              src={it.thumbUrl || it.fileUrl}
              alt={it.name}
              className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 p-2 text-white bg-gradient-to-t from-black/70 via-transparent to-transparent">
              <div className="text-xs font-medium opacity-90 truncate">{it.name}</div>
              <div className="text-[10px] opacity-75">{prettyDate(it.uploadedAt)}</div>
            </div>
          </button>
        ) : (
          <a
            key={it.id}
            href={it.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative flex aspect-square flex-col justify-between overflow-hidden rounded-lg border-2 border-gray-100 bg-white hover:border-blue-200 hover:shadow-md transition-all"
            title={new Date(it.uploadedAt).toLocaleString()}
          >
            <div className="p-3">
              <div className="inline-flex rounded-md p-2 text-white bg-gradient-to-r from-gray-500 to-gray-600">
                {/* generic doc icon via emoji to keep it simple here */}
                📄
              </div>
            </div>
            <div className="px-3 pb-3">
              <p className="text-gray-800 text-sm font-semibold leading-tight line-clamp-2">{it.name}</p>
              <p className="text-gray-500 text-[11px]">{prettyDate(it.uploadedAt)}</p>
            </div>
          </a>
        )
      )}
    </div>
  );
}

/* ───────────── helpers ───────────── */

function titleFor(cat?: string) {
  switch (cat) {
    case "preop_pics": return "Pre-operative";
    case "lab_reports": return "Lab Reports";
    case "radiology": return "Radiology";
    case "intraop_pics": return "Intra-operative";
    case "ot_notes": return "OT Notes";
    case "postop_pics": return "Post-operative";
    case "discharge_pics": return "Discharge";
    default: return "Folder";
  }
}

function prettyDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Given full grid items, return the index within image-only subset for a grid idx */
function imageIndexFor(all: DocItem[], gridIdx: number) {
  const imgOnly = all.filter((x) => x.isImage);
  const target = all[gridIdx];
  const idx = imgOnly.findIndex((x) => x.id === target.id);
  return Math.max(0, idx);
}

/** Given image id, find its index back in the main grid */
function gridIndexFor(all: DocItem[], imageId?: string) {
  if (!imageId) return 0;
  const idx = all.findIndex((x) => x.id === imageId);
  return Math.max(0, idx);
}
