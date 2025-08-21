import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientTasks } from "@/components/patient/PatientTasks";
import { PatientNotes } from "@/components/patient/PatientNotes";
import { PatientMeds } from "@/components/patient/PatientMeds";
import { ListTodo, FileText, Pill, MoreVertical, ChevronDown } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Land on Notes like Figma
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "meds" | "tasks">("notes");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const handleDelete = async () => {
    if (deleteText.toLowerCase() !== "delete") return;
    if (!id) return;
    try {
      await api.patients.remove(id);
      navigate("/patients");
    } catch (err) {
      console.error(err);
    }
  };

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
      {/* === TOP CARD (matches screenshot) === */}
      <div className="p-4">
        <Card className="p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm bg-white">
          {/* Row 1: Name (left) | MRN (right) | kebab */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold leading-snug uppercase text-foreground break-words">
                {patient.name}
              </h1>
              {(patient.age !== undefined || patient.sex) && (
                <div className="mt-1 text-sm text-muted-foreground">
                  <span>
                    {patient.age !== undefined ? `${patient.age} Yrs` : ""}
                    {patient.age !== undefined && patient.sex ? " / " : ""}
                    {patient.sex ? titleCase(patient.sex) : ""}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 shrink-0">
              <div className="text-right">
                <div className="text-[11px] leading-none text-muted-foreground mb-1">MRN</div>
                <div className="text-sm font-medium text-foreground">{patient.mrn}</div>
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
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(patient.mrn)}>
                    Copy MRN
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/patients/${id}/edit`)}>
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
          <div className="mt-3 rounded-lg border border-gray-200 p-4">
            {/* Row: Primary Diagnosis (left) | Stage: (right) */}
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">Primary Diagnosis:</p>
              <p className="text-sm text-muted-foreground">Stage:</p>
            </div>

            <p className="mt-1 text-base font-semibold uppercase leading-snug text-foreground">
              {patient.diagnosis}
            </p>

            <div className="mt-3 flex items-center justify-between gap-4">
              {/* Comorbidities */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground mb-1">Comorbidities:</p>
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

              {/* Stage pill */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full px-3 py-1 bg-muted text-foreground hover:bg-muted"
                onClick={() => navigate(`/patients/${id}/edit`)}
              >
                {patient.currentState || "onboarding"}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* === TABS (underline style) === */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="px-4">
          <TabsList className="w-full flex gap-6 bg-transparent px-0 border-b">
            {(["overview", "notes", "meds", "tasks"] as const).map((val) => (
              <TabsTrigger
                key={val}
                value={val}
                className="
                  relative rounded-none px-0 py-3 text-sm font-medium
                  text-muted-foreground data-[state=active]:text-primary data-[state=active]:shadow-none
                  data-[state=active]:after:content-[''] data-[state=active]:after:absolute
                  data-[state=active]:after:left-0 data-[state=active]:after:right-0
                  data-[state=active]:after:-bottom-[1px] data-[state=active]:after:h-[2px]
                  data-[state=active]:after:bg-primary
                "
              >
                {val[0].toUpperCase() + val.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="bg-transparent">
          <div className="p-4 text-sm text-muted-foreground">
            Overview content…
          </div>
        </TabsContent>

        <TabsContent value="notes" className="bg-transparent">
          <div className="px-4 pb-4">
            <PatientNotes patientId={patient.mrn} />
          </div>
        </TabsContent>

        <TabsContent value="meds" className="bg-transparent">
          <div className="px-4 pb-4">
            <PatientMeds patientId={patient.mrn} />
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="bg-transparent">
          <div className="px-4 pb-4">
            <PatientTasks patientId={patient.mrn} />
          </div>
        </TabsContent>
      </Tabs>

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
          </DialogHeader>
          <DialogDescription>
            This action cannot be undone. To confirm deletion, type "delete" below.
          </DialogDescription>
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
    </div>
  );
}
