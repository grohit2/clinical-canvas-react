import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientTasks } from "@/components/patient/PatientTasks";
import { PatientNotes } from "@/components/patient/PatientNotes";
import { PatientMeds } from "@/components/patient/PatientMeds";
import { Timeline } from "@/components/patient/Timeline";
import { ListTodo, FileText, Pill, MoreVertical, ChevronDown, FolderOpen } from "lucide-react";
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
import api from "@/lib/api";
import type { Patient, TimelineEntry } from "@/types/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState<"overview" | "notes" | "meds" | "tasks">("notes");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState("");

  useEffect(() => {
    if (!id) return;
    api.patients
      .get(id)
      .then((data) => {
        setPatient(data);
        return api.patients.timeline(id);
      })
      .then(setTimeline)
      .catch(() => navigate("/patients"));
  }, [id, navigate]);

  const titleCase = (s?: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

  const stageOptions = [
    "onboarding",
    "assessment", 
    "treatment",
    "recovery",
    "discharge",
    "follow-up"
  ];

  const handleStageChange = async () => {
    if (!selectedStage || !id) return;
    try {
      await api.patients.update(id, { currentState: selectedStage });
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
      navigate("/patients");
    } catch (err) {
      console.error(err);
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 overflow-x-hidden">
        <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 overflow-x-hidden">
      {/* ===== FULL-BLEED WHITE TOP SECTION ===== */}
      <section className="bg-white">
        <div className="px-3 sm:px-4 pt-3 pb-2">
          {/* Row 1: Name (single line, 75% max) + MRN + Kebab */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1
                className="
                  text-xl sm:text-[20px] font-bold uppercase tracking-tight
                  whitespace-nowrap truncate
                  max-w-[75%]
                "
                title={patient.name}
              >
                {patient.name}
              </h1>
              {(patient.age !== undefined || patient.sex) && (
                <div className="mt-0.5 text-[13px] text-muted-foreground">
                  {patient.age !== undefined ? `${patient.age} yrs` : ""}
                  {patient.age !== undefined && patient.sex ? " / " : ""}
                  {patient.sex ? titleCase(patient.sex) : ""}
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 shrink-0">
              <div className="text-right">
                <div className="text-[11px] leading-none text-muted-foreground mb-1">
                  MRN
                </div>
                <div className="text-sm font-medium text-foreground">
                  {patient.mrn}
                </div>
              </div>

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
                    onClick={() => navigator.clipboard.writeText(patient.mrn)}
                  >
                    Copy MRN
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate(`/patients/${id}/edit`)}
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

          {/* Inner diagnosis sub-card */}
          <div className="mt-3 rounded-xl border border-gray-200 p-3 sm:p-4">
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
                  {patient.comorbidities?.length ? (
                    patient.comorbidities.map((c) => (
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

              {/* Stage pill only (no 'Stage:' label) */}
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
        </div>
      </section>

      {/* ===== TABS ===== */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
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
          <div className="px-3 sm:px-4 py-4 space-y-6">
            {/* Documents Section */}
            <div>
              <div 
                className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => navigate(`/patients/${id}/documents`)}
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
                <div className="p-4 bg-white rounded-lg border border-gray-200">
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
            <PatientNotes patientId={patient.mrn} />
          </div>
        </TabsContent>

        <TabsContent value="meds" className="bg-transparent">
          <div className="px-3 sm:px-4 pb-4">
            <PatientMeds patientId={patient.mrn} />
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="bg-transparent">
          <div className="px-3 sm:px-4 pb-4">
            <PatientTasks patientId={patient.mrn} />
          </div>
        </TabsContent>
      </Tabs>

      {/* FAB */}
      <ArcSpeedDial
        items={[
          {
            key: "note",
            label: "Add note",
            Icon: FileText,
            onClick: () => navigate(`/patients/${id}/add-note`),
          },
          {
            key: "task",
            label: "Add task",
            Icon: ListTodo,
            onClick: () => navigate(`/patients/${id}/add-task`),
          },
          {
            key: "med",
            label: "Add medication",
            Icon: Pill,
            onClick: () => navigate(`/patients/${id}/add-med`),
          },
        ]}
      />

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
