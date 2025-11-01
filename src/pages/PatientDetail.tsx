import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientTasks } from "@/components/patient/PatientTasks";
import { PatientNotes } from "@/components/patient/PatientNotes";
import { PatientMeds } from "@/components/patient/PatientMeds";
import { Timeline } from "@/components/patient/Timeline";
import { LabsOverviewCard } from "@/components/patient/LabsOverviewCard";
import { MoreVertical, ChevronDown, FolderOpen, Copy, Plus, Pencil } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArcSpeedDial } from "@/components/patient/ArcSpeedDial";
import { paths } from "@/app/navigation";
import { BottomActionPanel } from "@/components/common/panels/BottomActionPanel";
import api from "@/lib/api";
import type { Patient, TimelineEntry, MrnHistoryEntry } from "@/types/api";
import {
  buildStructuredDischargeDocxBlob,
  safeFileName,
} from "@/features/discharge-summary/export/structuredDischargeDocx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MrnEditor } from "@/components/patient/MrnEditor";

const SCHEME_OPTIONS = ['ASP', 'NAM', 'EHS', 'PAID', 'OTHERS'] as const;
type SchemeOption = typeof SCHEME_OPTIONS[number];

const normalizeScheme = (value?: string): SchemeOption => {
  const raw = (value || '').trim().toUpperCase();
  if (SCHEME_OPTIONS.includes(raw as SchemeOption)) {
    return raw as SchemeOption;
  }
  if (["UNKNOWN", "GENERAL", "OTHER", "OTHERS"].includes(raw)) {
    return 'OTHERS';
  }
  return raw ? (raw as SchemeOption) : 'OTHERS';
};

const normalizeMrnHistory = (history?: MrnHistoryEntry[]): MrnHistoryEntry[] | undefined => {
  if (!history) return undefined;
  return history.map((entry) => ({
    ...entry,
    scheme: normalizeScheme(entry.scheme),
  }));
};

const coerceRoomNumber = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return undefined;
};

const normalizePatientRecord = (raw: Patient): Patient => {
  const normalizedHistory = normalizeMrnHistory(raw.mrnHistory);
  const schemeCandidates: Array<string | undefined> = [
    raw.scheme,
    normalizedHistory?.find((entry) => entry.mrn === raw.latestMrn)?.scheme,
    normalizedHistory?.[0]?.scheme,
    (raw as unknown as { registration?: { scheme?: string } }).registration?.scheme,
  ];
  const resolvedScheme = normalizeScheme(schemeCandidates.find(Boolean));
  const roomCandidate = (raw as unknown as {
    roomNumber?: string;
    room_number?: string;
    room?: string;
    registration?: { roomNumber?: string; room_number?: string };
  });
  const resolvedRoom = coerceRoomNumber(
    raw.roomNumber ??
      roomCandidate?.roomNumber ??
      roomCandidate?.room_number ??
      roomCandidate?.room ??
      roomCandidate?.registration?.roomNumber ??
      roomCandidate?.registration?.room_number,
  );

  return {
    ...raw,
    scheme: resolvedScheme,
    roomNumber: resolvedRoom,
    mrnHistory: normalizedHistory,
    procedureName: raw.procedureName ?? (raw as any)?.procedure_name ?? undefined,
  };
};

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState<'overview' | 'notes' | 'meds' | 'tasks'>('overview');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [showMrnEditor, setShowMrnEditor] = useState(false);

  const fetchPatientData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.patients.get(id);
      setPatient(normalizePatientRecord(data));
      const timeline = await api.patients.timeline(id);
      setTimeline(timeline);
    } catch {
      navigate(paths.patients());
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  // Removed auto-update automation for now (state changes gated by checklist)

  // Refetch data when the page becomes visible (e.g., returning from edit)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPatientData();
      }
    };
    
    const handleFocus = () => {
      fetchPatientData();
    };
    
    const handlePageShow = () => {
      fetchPatientData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [id, fetchPatientData]);

  const titleCase = (s?: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

  const stageOptions = [
    "onboarding",
    "preop",
    "intraop",
    "postop",
    "discharge-init",
    "discharge",
  ];

  const deriveScheme = (p?: Patient | null): string | undefined => {
    if (!p) return undefined;
    const schemeCandidates = [
      p.scheme,
      p.mrnHistory?.find((entry) => entry.mrn === p.latestMrn)?.scheme,
      p.mrnHistory?.[0]?.scheme,
    ];
    const resolved = schemeCandidates.find((value): value is string => Boolean(value));
    return resolved ? resolved.toUpperCase() : undefined;
  };

  const handleStageChange = async () => {
    if (!selectedStage || !id) return;
    try {
      await api.patients.changeState(id, { current_state: selectedStage });
      if (patient) {
        setPatient({ ...patient, currentState: selectedStage });
      }
      setShowStageDialog(false);
      setSelectedStage("");
    } catch (err) {
      console.error("Failed to update stage:", err);
    }
  };

  const handleDelete = async () => {
    if (deleteText.toLowerCase() !== "delete" || !id) return;
    try {
      await api.patients.remove(id);
      navigate(paths.patients());
    } catch (err) {
      console.error(err);
    }
  };

  // Compose or fetch the discharge summary payload for export.
  // Replace this stub with your actual summary state/provider.
  async function getDischargeSummaryForExport(_patientId: string) {
    // TODO: integrate with your Discharge Summary editor / API.
    // Minimal fallback to avoid breaking the menu action:
    return {
      diagnosis: patient?.diagnosis || undefined,
      // Add any other fields you store (management, advice, meds, etc.)
    } as any; // Typed as DischargeSummaryData at call-site
  }

  const handleExportDischarge = async () => {
    if (!patient) return;

    // Map your timeline shape into the lite shape expected by the builder
    const tlLite = (timeline || []).map((t: TimelineEntry) => ({
      state: t.state,
      date_in: t.dateIn,
      date_out: t.dateOut ?? undefined,
    }));

    const summary = (await getDischargeSummaryForExport(patient.id)) as any; // DischargeSummaryData

    const blob = await buildStructuredDischargeDocxBlob({
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        sex: patient.sex,
        latestMrn: patient.latestMrn,
        department: patient.department,
        roomNumber: patient.roomNumber || undefined,
        assignedDoctor: patient.assignedDoctor || undefined,
        surgeryDate: (patient as any).surgeryDate || undefined,
        procedureName: (patient as any).procedureName || undefined,
      },
      timeline: tlLite,
      summary,
      // Optional: bulletInvestigations: true,
    });

    const filename = safeFileName(
      `Discharge_${patient.latestMrn ?? patient.id ?? patient.name ?? "Patient"}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const comorbidityTokens = useMemo(
    () =>
      (patient?.comorbidities ?? [])
        .flatMap((item) =>
          String(item)
            .split(/\s*\+\s*|\s*,\s*/)
            .map((token) => token.trim())
            .filter(Boolean)
        )
        .map((token) => token.toUpperCase()),
    [patient?.comorbidities]
  );

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 overflow-x-hidden">
        <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        <BottomBar />
      </div>
    );
  }

  const activeScheme = deriveScheme(patient);
  const roomNumber = patient.roomNumber?.trim();
  const schemeDisplay = activeScheme ? (roomNumber ? `${activeScheme} (R# ${roomNumber})` : activeScheme) : undefined;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 overflow-x-hidden">
      {/* ===== FULL-BLEED WHITE TOP SECTION ===== */}
      <section className="bg-white">
        <div className="px-3 sm:px-4 pt-3 pb-2">
          {/* Row 1: Name + Kebab */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1
                className="
                  text-xl sm:text-[20px] font-bold uppercase tracking-tight
                  whitespace-nowrap truncate
                "
                title={patient.name}
              >
                {patient.name}
              </h1>
              <div className="mt-0.5 text-[13px] text-muted-foreground">
                {patient.age !== undefined ? `${patient.age} yrs` : ""}
                {patient.age !== undefined && patient.sex ? " / " : ""}
                {patient.sex ? titleCase(patient.sex) : ""}
                {(patient.age !== undefined || patient.sex) ? " / " : ""}
                {patient.latestMrn ?? ''}
                {schemeDisplay ? ` / ${schemeDisplay}` : ''}
              </div>
            </div>

            <div className="flex items-start gap-2 shrink-0">

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => navigator.clipboard.writeText(patient.latestMrn ?? '')}
                  >
                    Copy MRN
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportDischarge}>
                    Export Discharge (.docx)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                onClick={() => id && navigate(paths.patientEdit(id))}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

        </div>
      </section>

      {/* ===== TABS ===== */}
      <Tabs value={activeTab} onValueChange={(v: 'overview' | 'notes' | 'meds' | 'tasks') => setActiveTab(v)}>
        <div className="px-3 sm:px-4">
          <TabsList className="grid w-full grid-cols-4 bg-transparent p-0 border-b">
            {(["overview", "notes", "meds", "tasks"] as const).map((val) => (
              <TabsTrigger
                key={val}
                value={val}
                className="
                  relative h-10 px-0 text-sm font-medium rounded-none
                  text-muted-foreground data-[state=active]:text-primary
                  data-[state=active]:shadow-none
                  after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-[1px]
                  after:h-[2px] after:bg-transparent
                  data-[state=active]:after:bg-primary
                "
              >
                {val[0].toUpperCase() + val.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="bg-transparent">
          <div className="px-3 sm:px-4 py-3 space-y-3">
            {/* Diagnosis & Comorbidities (moved from header) */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Primary Diagnosis:
              </p>

              <p className="mt-1 text-[15px] sm:text-base font-semibold uppercase leading-snug text-foreground">
                {patient.diagnosis}
              </p>

              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Comorbidities:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {comorbidityTokens.length ? (
                      comorbidityTokens.map((c) => (
                        <span
                          key={c}
                          className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full px-3 py-1 bg-muted text-foreground hover:bg-muted"
                  onClick={() => {
                    setSelectedStage(patient.currentState || "onboarding");
                    setShowStageDialog(true);
                  }}
                >
                  {patient.currentState || "onboarding"}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
            {/* TID / Intra-Op summary (compact) */}
            <div className="bg-white rounded-lg border border-gray-200 p-2">
              <div className="flex items-start gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground">TID:</span>
                    <span className="font-semibold truncate" title={(patient as any).tidNumber || '—'}>
                      {(patient as any).tidNumber || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    <span className="text-muted-foreground">Surgery Code:</span>
                    <span className="font-medium truncate">{(patient as any).surgeryCode || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    <span className="text-muted-foreground">Surgery Date:</span>
                    <span className="font-medium truncate flex items-center gap-2">
                      { (patient as any).surgeryDate
                        ? new Date((patient as any).surgeryDate).toLocaleDateString()
                        : '—' }
                      {(() => {
                        const sd = (patient as any).surgeryDate as string | undefined;
                        if (!sd) return null;
                        const d = new Date(sd);
                        const now = new Date();
                        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                        return diffDays > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-semibold">
                            D+{diffDays}
                          </span>
                        ) : null;
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    <span className="text-muted-foreground">Procedure:</span>
                    <span className="font-medium truncate">{(patient as any).procedureName || '—'}</span>
                  </div>
                </div>
                <div className="ml-auto flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                    (patient as any).tidStatus === 'DONE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {(patient as any).tidStatus || 'PENDING'}
                  </span>
                  {(patient as any).tidNumber && (
                    <button
                    aria-label="Copy TID and Surgery details"
                      className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-[11px] text-gray-700 flex items-center gap-1"
                      onClick={() => {
                        const tid = (patient as any).tidNumber || '';
                        const surg = (patient as any).surgeryCode || '';
                        const sDate = (patient as any).surgeryDate || '';
                        const proc = (patient as any).procedureName || '';
                        const parts = [`TID: ${tid}`];
                        if (surg) parts.push(`Surgery Code: ${surg}`);
                        if (sDate) parts.push(`Surgery Date: ${new Date(sDate).toLocaleDateString()}`);
                        if (proc) parts.push(`Procedure: ${proc}`);
                        const text = parts.join(' | ');
                        navigator.clipboard.writeText(text).then(() => {
                          toast("Copied to clipboard");
                        });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  )}
                </div>
              </div>
            </div>

            <LabsOverviewCard
              title="Labs Overview"
              mrnHistory={patient?.mrnHistory}
              latestMrn={patient?.latestMrn ?? null}
              activeScheme={activeScheme}
              rightAction={
                <div className="flex items-center gap-2">
                  {id && (
                    <button
                      type="button"
                      aria-label="Add MRN"
                      title="Add MRN"
                      className="p-2 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={() => navigate(paths.mrnAdd(id))}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Edit MRNs"
                    title="Edit MRNs"
                    className="p-2 rounded-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => setShowMrnEditor(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              }
            >
              <div className="space-y-2">
                {patient?.mrnHistory && patient.mrnHistory.length > 0 ? (
                  [...patient.mrnHistory]
                    .sort((a, b) =>
                      a.mrn === patient.latestMrn ? -1 : b.mrn === patient.latestMrn ? 1 : 0
                    )
                    .map((entry) => {
                      const isCurrent = entry.mrn === patient.latestMrn;
                      const dateStr = entry.date
                        ? new Date(entry.date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : null;
                      return (
                        <button
                          key={entry.mrn}
                          type="button"
                          onClick={() =>
                            window.open(
                              `http://115.241.194.20/LIS/Reports/Patient_Report.aspx?prno=${encodeURIComponent(entry.mrn)}`,
                              "_blank"
                            )
                          }
                          className={`w-full rounded-lg border text-left shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                            isCurrent
                              ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {entry.mrn}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                  isCurrent
                                    ? "bg-emerald-600 text-white"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {entry.scheme || "OTHERS"}
                              </span>
                            </div>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-gray-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            {dateStr && <span>{dateStr}</span>}
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                Current
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-muted-foreground text-center">
                    No MRNs yet. Add one to view labs.
                  </div>
                )}
              </div>
            </LabsOverviewCard>

            {/* Edit MRNs Dialog */}
            <Dialog open={showMrnEditor} onOpenChange={setShowMrnEditor}>
              <DialogContent className="sm:max-w-2xl md:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Edit MRNs</DialogTitle>
                </DialogHeader>
                {id && (
                  <MrnEditor
                    patientId={id}
                    initialHistory={patient?.mrnHistory}
                    initialLatestMrn={patient?.latestMrn}
                    onApplied={(updated) => {
                      setPatient(normalizePatientRecord(updated));
                      setShowMrnEditor(false);
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Debug Panel removed */}

            {/* Documents Section */}
            <div>
              <div 
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => id && navigate(paths.docsRoot(id))}
              >
                <div className="flex-shrink-0">
                  <FolderOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base text-foreground">Documents</h3>
                  <p className="text-sm text-muted-foreground">View patient documents and files</p>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            <div>
              {timeline.length > 0 ? (
                <Timeline entries={timeline} currentState={patient.currentState || ""} />
              ) : (
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-muted-foreground text-center text-sm">
                    No timeline data available for this patient
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="bg-transparent">
          <div className="px-3 sm:px-4 pb-4">
            <PatientNotes patientId={patient.id} />
          </div>
        </TabsContent>

        <TabsContent value="meds" className="bg-transparent">
          <div className="px-3 sm:px-4 pb-4">
            <PatientMeds patientId={patient.id} />
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="bg-transparent">
          <div className="px-3 sm:px-4 pb-4">
            <PatientTasks patientId={patient.id} />
          </div>
        </TabsContent>
      </Tabs>

      {/* FAB */}
      <ArcSpeedDial items={[]} onPrimaryClick={() => setActionsOpen(true)} />

      {/* Bottom Action Sheet (grid) */}
      <BottomActionPanel patientId={patient.id} open={actionsOpen} onOpenChange={setActionsOpen} />

      <BottomBar />

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient</DialogTitle>
            <DialogDescription>
              This action cannot be undone. To confirm deletion, type "delete"
              below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Type 'delete' to confirm"
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteText.toLowerCase() !== "delete"}
            >
              Delete Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage selection dialog */}
      <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Patient Stage</DialogTitle>
            <DialogDescription>
              Select the current stage for this patient's care journey.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={selectedStage} onValueChange={setSelectedStage}>
              {stageOptions.map((stage) => (
                <div key={stage} className="flex items-center space-x-2">
                  <RadioGroupItem value={stage} id={stage} />
                  <Label htmlFor={stage} className="capitalize cursor-pointer">
                    {stage}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStageDialog(false);
                setSelectedStage("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStageChange}
              disabled={!selectedStage}
            >
              Update Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
