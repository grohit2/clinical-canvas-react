import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Note } from "@/types/api";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listFiles } from "@/lib/filesApi";
import { MoreVertical, Image as ImageIcon, FileText } from "lucide-react";

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

export function PatientNotes({ patientId }: PatientNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [previews, setPreviews] = useState<Record<string, { urls: string[]; total: number }>>({});
  const [filter, setFilter] = useState<"all" | Note["category"]>("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.notes.list(patientId, 50);
        if (mounted) setNotes(res.items || []);
      } catch {
        if (mounted) setNotes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
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
              .map((i) => i.cdnUrl || "")
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

  const filtered = useMemo(
    () => (filter === "all" ? notes : notes.filter((n) => n.category === filter)),
    [filter, notes]
  );

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

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

      {filtered.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-lg border border-dashed">
          No clinical notes for this patient
        </div>
      ) : (
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
