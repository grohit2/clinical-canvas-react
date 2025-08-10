import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { patientService } from "@/services/patientService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile } from "@/stores/useProfile";
import PatientMediaUploader from "@/components/PatientMediaUploader";
import PatientGallery from "@/components/patient/PatientGallery";
import { Timeline } from "@/components/patient/Timeline";

import type { PatientMeta, PatientDemographics, TimelineEntry, Note } from "@/types/models";

type LocState = { patient?: PatientMeta };

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation() as { state?: LocState };
  const qc = useQueryClient();
  const profile = useProfile();
  const [activeTab, setActiveTab] = useState<string>("overview");

  const initialFromState = location.state?.patient;
  const list = qc.getQueryData<PatientMeta[]>(["patients"]);
  const initialFromCache = list?.find((p) => p.id === id);

  const { data: patient } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => patientService.getPatientById(id!),
    initialData: initialFromState ?? initialFromCache,
    initialDataUpdatedAt: qc.getQueryState(["patients"])?.dataUpdatedAt,
    staleTime: 30_000,
  });

  const mrn = patient?.mrn ?? id!;

  // Lazy extras
  const { data: demographics } = useQuery<PatientDemographics>({
    queryKey: ["patient-demographics", mrn],
    queryFn: () => patientService.getPatientDemographics(mrn),
    enabled: !!mrn && activeTab === "overview",
    staleTime: 60_000,
  });

  const { data: timeline = [] } = useQuery<TimelineEntry[]>({
    queryKey: ["patient-timeline", mrn],
    queryFn: () => patientService.getPatientTimeline(mrn),
    enabled: !!mrn && activeTab === "journey",
    staleTime: 60_000,
  });

  // Notes
  const {
    data: notes = [],
    refetch: refetchNotes,
    isFetching: notesLoading,
  } = useQuery<Note[]>({
    queryKey: ["patient-notes", mrn],
    queryFn: () => patientService.listPatientNotes(mrn),
    enabled: !!mrn && activeTab === "notes",
    staleTime: 30_000,
  });

  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState<Note["category"]>("doctorNote");
  const addNote = useMutation({
    mutationFn: async () => {
      if (!profile?.userId) throw new Error("Missing author");
      return patientService.createPatientNote(mrn, {
        content: noteContent.trim(),
        category: noteCategory,
        authorId: profile.userId,
      });
    },
    onSuccess: async () => {
      setNoteContent("");
      await qc.invalidateQueries({ queryKey: ["patient-notes", mrn] });
      if (activeTab === "notes") {
        refetchNotes();
      }
    },
  });

  // Collapsible header using IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const compactRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const compact = compactRef.current;
    if (!sentinel || !compact) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          compact.classList.add("opacity-0", "pointer-events-none");
          compact.classList.remove("opacity-100");
        } else {
          compact.classList.remove("opacity-0", "pointer-events-none");
          compact.classList.add("opacity-100");
        }
      },
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  if (!patient) return <div className="p-4">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Compact sticky bar */}
      <div
        ref={compactRef}
        className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b transition-opacity duration-200 opacity-0"
      >
        <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="truncate">
            <div className="text-sm text-muted-foreground">{patient.mrn}</div>
            <div className="font-semibold truncate">{patient.name}</div>
          </div>
          <div className="text-xs text-muted-foreground">{patient.department}</div>
        </div>
      </div>

      {/* Hero header (approx 33vh) */}
      <div className="relative">
        <div ref={sentinelRef} className="h-[33vh] min-h-[200px] bg-gradient-to-br from-primary/10 to-background flex items-end">
          <div className="max-w-screen-xl mx-auto w-full px-4 pb-4">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <div className="text-muted-foreground">MRN {patient.mrn}</div>
                <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">{patient.name}</h1>
                <div className="text-sm text-muted-foreground">{patient.pathway} · {patient.currentState}</div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>{patient.department}</div>
                <div>{patient.assignedDoctor}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-screen-xl mx-auto px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto p-1 rounded-lg bg-muted/50 mt-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="journey">Journey</TabsTrigger>
            <TabsTrigger value="meds">Meds</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="font-semibold mb-2">Demographics</div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-muted-foreground">Age</div>
                <div>{demographics?.age ?? "—"}</div>
                <div className="text-muted-foreground">Gender</div>
                <div>{demographics?.gender ?? "—"}</div>
                <div className="text-muted-foreground">Room</div>
                <div>{demographics?.room ?? "—"}</div>
                <div className="text-muted-foreground">Admission</div>
                <div>{demographics?.admissionDate ? new Date(demographics.admissionDate).toLocaleDateString() : "—"}</div>
                <div className="text-muted-foreground">LOS</div>
                <div>{demographics?.lengthOfStay ?? "—"}</div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="font-semibold mb-2">Next milestone</div>
              <div className="text-sm">
                {demographics?.nextMilestone ? (
                  <>
                    <div>{demographics.nextMilestone}</div>
                    <div className="text-muted-foreground">{demographics.nextMilestoneTime}</div>
                  </>
                ) : (
                  <div className="text-muted-foreground">—</div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="journey" className="mt-6">
            <Timeline entries={timeline} currentState={patient.currentState} />
          </TabsContent>

          <TabsContent value="notes" className="mt-6 grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="font-semibold mb-2">Add a note</div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground self-center">Category</div>
                  <Select value={noteCategory} onValueChange={(v) => setNoteCategory(v as Note["category"])}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doctorNote">Doctor</SelectItem>
                      <SelectItem value="nurseNote">Nurse</SelectItem>
                      <SelectItem value="pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="discharge">Discharge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write a note..."
                  className="min-h-[100px]"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => addNote.mutate()}
                    disabled={!noteContent.trim() || addNote.isPending}
                  >
                    {addNote.isPending ? "Saving..." : "Add Note"}
                  </Button>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="font-semibold mb-2">Recent notes</div>
              <div className="space-y-3 text-sm">
                {notesLoading ? (
                  <div className="text-muted-foreground">Loading…</div>
                ) : notes.length === 0 ? (
                  <div className="text-muted-foreground">No notes yet</div>
                ) : (
                  notes
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((n) => (
                      <div key={n.noteId} className="border-b last:border-b-0 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{n.category}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-1 whitespace-pre-wrap">{n.content}</div>
                      </div>
                    ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="meds" className="mt-6">
            <Card className="p-4 text-sm text-muted-foreground">Meds list coming soon</Card>
          </TabsContent>

          <TabsContent value="images" className="mt-6">
            <PatientMediaUploader mrn={patient.mrn} />
            <div className="mt-4">
              <PatientGallery mrn={patient.mrn} />
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <Card className="p-4 text-sm text-muted-foreground">Tasks tab placeholder</Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

