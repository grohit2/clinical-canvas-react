import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BottomBar } from "@/components/layout/BottomBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StageChip } from "@/components/patient/StageChip";
import { PatientTasks } from "@/components/patient/PatientTasks";
import { PatientNotes } from "@/components/patient/PatientNotes";
import { PatientMeds } from "@/components/patient/PatientMeds";
import {
  QrCode,
  Copy,
  ListTodo,
  FileText,
  Pill,
  Pencil,
  User,
  UserCheck,
  ArrowLeft,
  MoreVertical,
  Bell,
  Cake,
  Route,
  FolderOpen,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArcSpeedDial } from "@/components/patient/ArcSpeedDial";
import api from "@/lib/api";
import type { Patient, TimelineEntry } from "@/types/api";

/* ----------------------------- helpers/utils ----------------------------- */

type TabKey = "overview" | "notes" | "meds" | "tasks";

function getGenderIcon(sex?: string) {
  return sex?.toLowerCase() === "female" ? UserCheck : User;
}

function formatTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function getStateColors(state: string) {
  const s = state?.toLowerCase();
  if (["preop", "pre-op"].includes(s))
    return { dot: "bg-emerald-50 border-emerald-200", text: "text-emerald-800" };
  if (["op", "surgery", "operative"].includes(s))
    return { dot: "bg-orange-50 border-orange-200", text: "text-orange-800" };
  if (["postop", "post-op", "recovery"].includes(s))
    return { dot: "bg-purple-50 border-purple-200", text: "text-purple-800" };
  if (s === "onboarding")
    return { dot: "bg-indigo-50 border-indigo-200", text: "text-indigo-800" };
  if (s === "discharge")
    return { dot: "bg-rose-50 border-rose-200", text: "text-rose-800" };
  return { dot: "bg-gray-50 border-gray-200", text: "text-gray-800" };
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

/* ------------------------------- component ------------------------------- */

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  // Robust, scroll-container-safe collapse using an IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isCompactHeader, setIsCompactHeader] = useState(false);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => setIsCompactHeader(!entry.isIntersecting),
      { root: null, threshold: 0 }
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, []);

  // Fetch patient + timeline
  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    (async () => {
      try {
        const p = await api.patients.get(id);
        if (cancelled) return;
        setPatient(p);
        const t = await api.patients.timeline(id);
        if (!cancelled) setTimeline(t);
      } catch (e) {
        console.error(e);
        navigate("/patients");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const dobText = useMemo(() => {
    if (!patient?.dob) return "—";
    const d = new Date(patient.dob);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  }, [patient?.dob]);

  const ageText = useMemo(() => {
    if (typeof patient?.age === "number") return `${patient.age} years old`;
    return "";
  }, [patient?.age]);

  const onDelete = useCallback(async () => {
    if (deleteText.toLowerCase() !== "delete" || !id) return;
    try {
      await api.patients.remove(id);
      navigate("/patients");
    } catch (e) {
      console.error(e);
    }
  }, [deleteText, id, navigate]);

  if (!patient) {
    return (
      <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
        <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 max-w-md mx-auto bg-white">
      {/* Sticky Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="p-4">
          <div className="flex justify-between items-center">
            <button className="flex items-center" onClick={() => navigate("/patients")}>
              <ArrowLeft className="h-6 w-6" />
            </button>

            {/* Compact title when scrolled */}
            <div
              className={`text-center transition-opacity duration-300 ${
                isCompactHeader ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <h1 className="text-xl font-medium text-gray-800">
                {patient.name.length > 20 ? `${patient.name.slice(0, 20)}…` : patient.name}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button onClick={() => navigate(`/patients/${id}/edit`)}>
                <Pencil className="h-6 w-6" />
              </button>
              <div className="relative">
                <button>
                  <Bell className="h-6 w-6" />
                  <span className="absolute -top-1 -right-1 flex justify-center items-center w-5 h-5 bg-red-500 text-white text-xs rounded-full">
                    2
                  </span>
                </button>
              </div>
              <button onClick={() => setShowDeleteDialog(true)}>
                <MoreVertical className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Smoothly collapsible header details:
              grid-rows-[1fr]->grid-rows-[0fr] + overflow-hidden avoids max-h jank */}
          <div
            className={`mt-4 transition-all duration-300 grid ${
              isCompactHeader ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{patient.name}</h2>
                  <div className="flex items-center">
                    <p className="text-sm text-gray-500 mt-1">MRN: {patient.mrn}</p>
                    <button
                      className="ml-2 text-gray-500 hover:text-gray-700"
                      onClick={() => copyToClipboard(patient.mrn)}
                      title="Copy MRN"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button className="text-gray-500 hover:text-gray-700">
                  <QrCode className="h-6 w-6" />
                </button>
              </div>

              {/* Badges */}
              <div className="flex items-center space-x-2 mt-4">
                {patient.pathway && (
                  <Badge variant="secondary" className="bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1 rounded-full">
                    {patient.pathway}
                  </Badge>
                )}
                <StageChip stage={patient.currentState || ""} variant="caution" size="sm" />
              </div>

              {/* Patient Info */}
              <div className="mt-4 text-sm text-gray-600 space-y-2">
                {/* Personal Details Row */}
                <div className="flex items-center flex-wrap gap-x-6 gap-y-2">
                  {patient.sex && (
                    <div className="flex items-center">
                      {(() => {
                        const Icon = getGenderIcon(patient.sex);
                        return <Icon className="h-4 w-4 mr-2" />;
                      })()}
                      <span className="font-medium text-gray-800 capitalize">{patient.sex}</span>
                    </div>
                  )}
                  
                  {dobText && dobText !== "—" && (
                    <div className="flex items-center">
                      <Cake className="h-4 w-4 mr-2" />
                      <span className="font-medium text-gray-800">{dobText}</span>
                    </div>
                  )}
                  
                  {ageText && (
                    <div className="flex items-center">
                      <span className="font-medium text-gray-800">{ageText}</span>
                    </div>
                  )}
                </div>

                {/* Diagnosis Section */}
                {(patient.diagnosis || (patient.comorbidities?.length ?? 0) > 0) && (
                  <div className="mt-2">
                    {patient.diagnosis && (
                      <p className="text-gray-800 font-medium">{patient.diagnosis}</p>
                    )}
                    {patient.comorbidities && patient.comorbidities.length > 0 && (
                      <p className="text-gray-500">{patient.comorbidities.join(", ")}</p>
                    )}
                  </div>
                )}

                {/* Additional Info Section */}
                {(patient.assignedDoctor || patient.lastUpdated) && (
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    {patient.assignedDoctor && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-800 w-28">Assigned Doctor:</span>
                        <span>{patient.assignedDoctor}</span>
                      </div>
                    )}
                    {patient.lastUpdated && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-800 w-28">Last Updated:</span>
                        <span>{new Date(patient.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* The sentinel sits just under the expandable block.
            When it scrolls off-screen (covered by sticky header), we compact. */}
        <div ref={sentinelRef} className="h-1" />
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-6">
          {(["overview", "notes", "meds", "tasks"] as TabKey[]).map((tab) => (
            <button
              key={tab}
              className={`py-3 text-sm font-medium ${
                activeTab === tab ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <main className="p-6">
        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Current State */}
            <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-xl font-medium text-gray-900">Current State</h3>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 capitalize">
                      {patient.currentState}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {patient.currentState === "onboarding"
                        ? "Patient has been added to the system"
                        : patient.currentState === "preop" || patient.currentState === "pre-op"
                        ? "Patient is in pre-operative stage"
                        : patient.currentState === "op" || patient.currentState === "surgery"
                        ? "Patient is in operating room"
                        : patient.currentState === "postop" || patient.currentState === "post-op"
                        ? "Patient is in recovery"
                        : patient.currentState === "discharge"
                        ? "Patient is ready for discharge"
                        : `Patient is in ${patient.currentState} stage`}
                    </p>
                  </div>
                  <StageChip stage={patient.currentState || ""} variant="caution" size="md" />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate(`/patients/${id}/journey`)}
                    className="flex items-center justify-center p-4 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Route className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">View Journey</span>
                  </button>

                  <button
                    onClick={() => {/* TODO: navigate to documents */}}
                    className="flex items-center justify-center p-4 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <FolderOpen className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Documents</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {timeline.length > 0 && (
              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-xl font-medium text-gray-900">Recent Activity</h3>
                </div>

                <div className="p-4">
                  {timeline.slice(0, 3).map((entry) => {
                    const colors = getStateColors(entry.state);
                    const date = new Date(entry.dateIn);
                    return (
                      <div
                        key={entry.timelineId}
                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${colors.dot} border mr-3`} />
                          <div>
                            <h4 className={`font-medium capitalize ${colors.text}`}>{entry.state}</h4>
                            <p className="text-sm text-gray-500">{date.toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">{formatTime(entry.dateIn)}</p>
                      </div>
                    );
                  })}

                  {timeline.length > 3 && (
                    <button
                      onClick={() => navigate(`/patients/${id}/journey`)}
                      className="w-full mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View all {timeline.length} entries →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {activeTab === "notes" && (
          <section className="bg-white rounded-lg p-4 border border-gray-200 min-h-[400px]">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Clinical Notes</h3>
            <PatientNotes patientId={patient.mrn} />
          </section>
        )}

        {/* Meds */}
        {activeTab === "meds" && (
          <section className="bg-white rounded-lg p-4 border border-gray-200 min-h-[400px]">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Medications</h3>
            <PatientMeds patientId={patient.mrn} />
          </section>
        )}

        {/* Tasks */}
        {activeTab === "tasks" && (
          <section className="bg-white rounded-lg p-4 border border-gray-200 min-h-[400px]">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Patient Tasks</h3>
            <PatientTasks patientId={patient.mrn} />
          </section>
        )}
      </main>

      <ArcSpeedDial
        items={[
          { key: "note", label: "Add note", Icon: FileText, onClick: () => navigate(`/patients/${id}/add-note`) },
          { key: "task", label: "Add task", Icon: ListTodo, onClick: () => navigate(`/patients/${id}/add-task`) },
          { key: "med",  label: "Add medication", Icon: Pill, onClick: () => navigate(`/patients/${id}/add-med`) },
        ]}
      />

      <BottomBar />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient</DialogTitle>
            <DialogDescription>
              This is a critical action that cannot be undone. To confirm deletion, type <b>delete</b> below and click submit.
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
              onClick={onDelete}
              disabled={deleteText.toLowerCase() !== "delete"}
            >
              Delete Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
