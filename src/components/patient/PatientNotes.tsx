import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DischargeSummaryVersion, Note } from "@/types/api";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listFiles } from "@/lib/filesApi";
import { MoreVertical, Image as ImageIcon, FileText, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SECTION_DEFINITIONS, adaptSections } from "@/features/discharge-summary/discharge.sections";

interface PatientNotesProps {
  patientId: string;
}

function badgeTone(label?: string) {
  const key = (label || "").toLowerCase();
  if (key.includes("doctor")) return "bg-blue-100 text-blue-800";
  if (key.includes("nurse")) return "bg-green-100 text-green-800";
  if (key.includes("therap")) return "bg-purple-100 text-purple-800";
  return "bg-muted text-foreground";
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  } catch {
    return value;
  }
}

function formatDate(value?: string | null) {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  } catch {
    return value;
  }
}

export function PatientNotes({ patientId }: PatientNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [previews, setPreviews] = useState<Record<string, { urls: string[]; total: number }>>({});
  const [filter, setFilter] = useState<"all" | Note["category"]>("all");
  const [notesLoading, setNotesLoading] = useState(true);
  const [dischargeSummary, setDischargeSummary] = useState<DischargeSummaryVersion | null>(null);
  const [dischargeLoading, setDischargeLoading] = useState(true);
  const [dischargeError, setDischargeError] = useState<string | null>(null);
  const [dischargeExpanded, setDischargeExpanded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setNotesLoading(true);
      try {
        const res = await api.notes.list(patientId, 50);
        if (mounted) setNotes(res.items || []);
      } catch {
        if (mounted) setNotes([]);
      } finally {
        if (mounted) setNotesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [patientId]);

  useEffect(() => {
    let canceled = false;
    setDischargeLoading(true);
    setDischargeError(null);
    (async () => {
      try {
        const res = await api.discharge.getLatest(patientId);
        if (!canceled) {
          setDischargeSummary(res.latest ?? null);
          setDischargeError(null);
        }
      } catch (error) {
        if (!canceled) {
          setDischargeSummary(null);
          setDischargeError(error instanceof Error ? error.message : "Unable to load discharge summary.");
        }
      } finally {
        if (!canceled) setDischargeLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [patientId]);

  useEffect(() => {
    let canceled = false;
    if (notes.length === 0) {
      setPreviews({});
      return;
    }
    (async () => {
      const pairs = await Promise.all(
        notes.map(async (n) => {
          try {
            const l = await listFiles(patientId, {
              kind: "note",
              refId: n.noteId,
              scope: "optimized",
            });
            const urls = (l.items || [])
              .map((i) => i.cdnUrl ?? i.url ?? "")
              .filter(Boolean)
              .slice(0, 3);
            const total = l.items?.length ?? 0;
            return [n.noteId, { urls, total }] as const;
          } catch {
            return [n.noteId, { urls: [], total: 0 }] as const;
          }
        })
      );
      if (!canceled) setPreviews(Object.fromEntries(pairs));
    })();
    return () => {
      canceled = true;
    };
  }, [notes, patientId]);

  useEffect(() => {
    if (!dischargeSummary) setDischargeExpanded(false);
  }, [dischargeSummary]);

  const dischargeSections = useMemo(() => {
    if (!dischargeSummary) return null;
    return adaptSections(dischargeSummary.sections);
  }, [dischargeSummary]);

  const dischargePreview = useMemo(() => {
    if (!dischargeSummary) return "No discharge summary recorded.";
    const candidates = [
      dischargeSummary.summary?.diagnosis?.trim(),
      dischargeSections?.impression?.provisionalDiagnosis?.trim(),
      dischargeSections?.impression?.dischargePlan?.trim(),
      dischargeSections?.presentingComplaint?.chiefComplaints?.trim(),
    ].filter((value): value is string => Boolean(value));
    return candidates[0] || "No discharge summary recorded.";
  }, [dischargeSummary, dischargeSections]);

  const hasDischargeContent = useMemo(() => {
    if (!dischargeSections) return false;
    return SECTION_DEFINITIONS.some((section) =>
      section.fields.some((field) =>
        Boolean(dischargeSections[section.key]?.[field.key]?.trim())
      )
    );
  }, [dischargeSections]);

  const filtered = useMemo(() => {
    if (filter === "all") return notes;
    if (filter === "discharge") return [];
    return notes.filter((n) => n.category === filter);
  }, [filter, notes]);

  const shouldRenderDischargeSection =
    filter === "discharge" || Boolean(dischargeSummary) || dischargeLoading || Boolean(dischargeError);

  const emptyMessage = (() => {
    if (filter === "discharge") {
      return "No discharge summary recorded for this patient.";
    }
    if (filter === "doctorNote") return "No doctor notes for this patient.";
    if (filter === "nurseNote") return "No nurse notes for this patient.";
    if (filter === "pharmacy") return "No pharmacy notes for this patient.";
    return dischargeSummary
      ? "No additional clinical notes for this patient."
      : "No clinical notes for this patient.";
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-800 m-0">Clinical Notes</h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">Filter</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setFilter("all")}>All Notes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("doctorNote")}>Doctor Note</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("nurseNote")}>Nurse Note</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("pharmacy")}>Pharmacy</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("discharge")}>Discharge</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {shouldRenderDischargeSection && (
        dischargeSummary ? (
          <Collapsible open={dischargeExpanded} onOpenChange={setDischargeExpanded}>
            <Card className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <CollapsibleTrigger asChild>
                  <button className="flex flex-1 items-start justify-between gap-3 text-left">
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeTone("discharge")}`}
                        >
                          Discharge Summary
                        </Badge>
                        {dischargeSummary.status && (
                          <Badge variant="outline" className="text-xs font-medium capitalize">
                            {dischargeSummary.status}
                          </Badge>
                        )}
                        {dischargeSummary.updatedAt && (
                          <span className="text-xs text-gray-500">
                            Updated {formatDateTime(dischargeSummary.updatedAt)}
                          </span>
                        )}
                        {dischargeSummary.summary?.dod && (
                          <span className="text-xs text-gray-500">
                            DOD: {formatDate(dischargeSummary.summary.dod)}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm text-gray-800 ${dischargeExpanded ? "" : "line-clamp-2"}`}>
                        {dischargePreview}
                      </p>
                      {(dischargeSummary.authorName || dischargeSummary.authorId) && (
                        <p className="text-xs text-gray-500">
                          Author: {dischargeSummary.authorName || dischargeSummary.authorId}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform duration-200 ${
                        dischargeExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </CollapsibleTrigger>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    navigate(`/patients/${patientId}/discharge-summary`);
                  }}
                >
                  Edit
                </Button>
              </div>
              <CollapsibleContent className="pt-3">
                {hasDischargeContent ? (
                  <div className="space-y-4">
                    {SECTION_DEFINITIONS.map((section) => {
                      const sectionState = dischargeSections?.[section.key];
                      const populatedFields = section.fields.filter((field) =>
                        Boolean(sectionState?.[field.key]?.trim())
                      );
                      if (!populatedFields.length) return null;
                      return (
                        <div key={section.key} className="space-y-2">
                          <h5 className="text-sm font-semibold text-gray-700">{section.title}</h5>
                          <dl className="space-y-2 rounded-md border border-muted/40 bg-muted/20 p-3">
                            {populatedFields.map((field) => (
                              <div key={field.key} className="space-y-0.5">
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  {field.label}
                                </dt>
                                <dd className="text-sm text-gray-800 whitespace-pre-wrap">
                                  {sectionState?.[field.key]}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No structured discharge summary content captured yet.
                  </p>
                )}
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ) : (
          <Card className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-800">Discharge Summary</p>
                <p className="text-sm text-muted-foreground">
                  {dischargeLoading
                    ? "Loading discharge summary…"
                    : dischargeError || "No discharge summary recorded for this patient."}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/patients/${patientId}/discharge-summary`)}
              >
                {dischargeLoading ? "View" : "Open"}
              </Button>
            </div>
          </Card>
        )
      )}

      {filter === "discharge" && dischargeSummary && (
        <p className="text-xs text-muted-foreground">The discharge summary is displayed above.</p>
      )}

      {filter !== "discharge" && notesLoading && (
        <div className="text-sm text-muted-foreground">Loading notes…</div>
      )}

      {filter !== "discharge" && !notesLoading && filtered.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-lg border border-dashed">
          {emptyMessage}
        </div>
      )}

      {!notesLoading && filter !== "discharge" && filtered.length > 0 &&
        filtered.map((note) => {
          const pv = previews[note.noteId] || { urls: [], total: 0 };
          const count = pv.total || pv.urls.length;

          const open = () => navigate(`/patients/${patientId}/notes/${note.noteId}`);

          return (
            <Card
              key={note.noteId}
              className="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={open}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open()}
            >
              <div className="flex items-start space-x-4">
                {/* Left media block */}
                <div className="w-16 flex-shrink-0">
                  {count === 0 && (
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded">
                      <FileText className="h-6 w-6 text-gray-400" />
                    </div>
                  )}

                  {count === 1 && pv.urls[0] && (
                    <div className="relative w-16 h-16 rounded overflow-hidden bg-gray-100">
                      <img src={pv.urls[0]} alt="attachment" className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute left-1 top-1 bg-white/90 rounded p-0.5 shadow">
                        <ImageIcon className="h-3.5 w-3.5 text-gray-500" />
                      </div>
                    </div>
                  )}

                  {count > 1 && (
                    <div className="w-16 h-16 flex flex-col items-center justify-start">
                      <div className="relative h-10 w-12 mb-1">
                        {pv.urls.slice(0, 3).map((src, idx) => {
                          const rotations = [-10, 5, -5] as const;
                          const lefts = [0, 15, 30] as const;
                          return (
                            <img
                              key={`${src}-${idx}`}
                              src={src}
                              alt={`attachment ${idx + 1}`}
                              className="absolute w-8 h-8 rounded border-2 border-white object-cover"
                              style={{
                                transform: `rotate(${rotations[idx] ?? 0}deg)`,
                                left: `${lefts[idx] ?? 0}px`,
                                zIndex: 3 - idx,
                                top: 0,
                              }}
                              loading="lazy"
                            />
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-gray-500">+{count} photos</p>
                    </div>
                  )}
                </div>

                {/* Right content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <Badge
                        variant="secondary"
                        className={`text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full ${badgeTone(
                          note.category
                        )}`}
                      >
                        {note.category || "Note"}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {note.createdAt ? new Date(note.createdAt).toLocaleString() : ""}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-500 hover:text-gray-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => navigate(`/patients/${patientId}/notes/${note.noteId}/edit`)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={async () => {
                            try {
                              await api.notes.remove(patientId, note.noteId).catch(() => {});
                            } finally {
                              setNotes((prev) => prev.filter((n) => n.noteId !== note.noteId));
                            }
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {note.content && <p className="mt-2 text-sm text-gray-800 line-clamp-2">{note.content}</p>}

                  {note.authorId && (
                    <p className="text-sm text-gray-500 mt-2">Author: {note.authorId}</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

export default PatientNotes;
