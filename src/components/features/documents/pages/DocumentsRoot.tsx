import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { paths } from "@/app/navigation";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { FolderOpen, Camera, FileText, Activity, Scissors, ClipboardList, Stethoscope, FileCheck } from "lucide-react";
import { fetchProfile, getFolderSummaries, CATEGORY_KEYS } from "../api/documents.client";
import { FolderSummary, DocCategory } from "../api/documents.types";

const ICON: Record<DocCategory, React.ComponentType<{ className?: string }>> = {
  preop_pics: Camera,
  lab_reports: FileText,
  radiology: Activity,
  intraop_pics: Scissors,
  ot_notes: ClipboardList,
  postop_pics: Stethoscope,
  discharge_pics: FileCheck,
};

const TITLE: Record<DocCategory, string> = {
  preop_pics: "Pre-operative",
  lab_reports: "Lab Reports",
  radiology: "Radiology",
  intraop_pics: "Intra-operative",
  ot_notes: "OT Notes",
  postop_pics: "Post-operative",
  discharge_pics: "Discharge",
};

export default function DocumentsRoot() {
  const { id: uid } = useParams();
  const [summaries, setSummaries] = React.useState<FolderSummary[] | null>(null);

  React.useEffect(() => {
    let alive = true;
    if (!uid) return;
    fetchProfile(uid).then((p) => alive && setSummaries(getFolderSummaries(p)));
    return () => { alive = false; };
  }, [uid]);

  const total = React.useMemo(
    () => (summaries ?? []).reduce((acc, s) => acc + s.count, 0),
    [summaries]
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header title="Documents" showBack />
      <main className="p-4">
        <h2 className="text-[#0d141c] text-[22px] font-bold tracking-[-0.015em] pb-3">
          All Documents
        </h2>

        {!summaries ? (
          <SkeletonGrid />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            {CATEGORY_KEYS.map((cat) => {
              const sum = summaries.find((s) => s.category === cat)!;
              const Icon = ICON[cat];
              return (
                <Link
                  key={cat}
                  to={uid ? paths.docsCategory(uid, cat) : "#"}
                  className="flex flex-col gap-3 rounded-lg border border-[#cedbe9] bg-white p-4 hover:shadow-sm transition-shadow"
                >
                  <Icon className="h-6 w-6 text-[#0d141c]" />
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[#0d141c] text-base font-bold leading-tight">
                      {TITLE[cat]}
                    </h3>
                    <p className="text-[#47739e] text-sm leading-normal">
                      {sum.count} {sum.count === 1 ? "Document" : "Documents"}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {sum.lastUpdatedAt ? `Updated ${prettyDate(sum.lastUpdatedAt)}` : "—"}
                    </p>
                  </div>
                </Link>
              );
            })}

            {/* Overall */}
            <div className="flex flex-col gap-3 rounded-lg border border-[#cedbe9] bg-white p-4">
              <FolderOpen className="h-6 w-6 text-[#0d141c]" />
              <div className="flex flex-col gap-1">
                <h3 className="text-[#0d141c] text-base font-bold">Total</h3>
                <p className="text-[#47739e] text-sm leading-normal">{total} Documents</p>
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomBar />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i} className="h-28 animate-pulse bg-gray-200/60" />
      ))}
    </div>
  );
}

function prettyDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
