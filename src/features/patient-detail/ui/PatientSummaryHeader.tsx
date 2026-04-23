import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pin, FileText, PencilLine, Workflow } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { StageChip } from "@entities/patient/ui";
import { useToast } from "@shared/hooks/use-toast";
import { paths } from "@app/navigation";
import { pinPatient, unpinPatient, isPinned } from "@shared/lib/pinnedPatients";

type PatientSummaryHeaderProps = {
  id: string;
  name?: string;
  mrn?: string;
  scheme?: string;
  stage?: string;
  pathway?: string;
};

export function PatientSummaryHeader({ id, name, mrn, scheme, stage, pathway }: PatientSummaryHeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pinned, setPinned] = useState(() => isPinned(id));

  const schemeLabel = scheme ? scheme.toUpperCase() : "—";
  const stageLabel = useMemo(() => {
    if (!stage) return "—";
    const key = stage.toLowerCase();
    const map: Record<string, string> = {
      onboarding: "Onboarding",
      preop: "Pre-Op",
      intraop: "OT",
      postop: "Post-Op",
      "discharge-init": "Discharge Init",
      discharge: "Discharge",
    };
    return map[key] || stage;
  }, [stage]);

  const handlePinToggle = () => {
    if (pinned) {
      unpinPatient(id);
      setPinned(false);
      toast({ description: "Removed from My Patients" });
    } else {
      pinPatient(id);
      setPinned(true);
      toast({ description: "Pinned to My Patients" });
    }
  };

  return (
    <div className="rounded-lg border p-4 bg-white shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{name || "Patient"}</h1>
          <p className="text-sm text-muted-foreground">
            MRN: {mrn || "—"} • Scheme: {schemeLabel} • Pathway: {pathway || "—"}
          </p>
          <div className="mt-2">
            <StageChip stage={stage || "onboarding"} />
          </div>
        </div>
        <Button
          variant={pinned ? "secondary" : "outline"}
          size="sm"
          onClick={handlePinToggle}
          className="gap-2"
        >
          <Pin className="h-4 w-4" />
          {pinned ? "Unpin" : "Pin"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => navigate(paths.patientDocs(id))}
        >
          <FileText className="h-4 w-4" />
          Documents
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => navigate(paths.patientEdit(id))}
        >
          <PencilLine className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => navigate(paths.urgentAlerts())}
        >
          <Workflow className="h-4 w-4" />
          Workflow
        </Button>
      </div>
    </div>
  );
}
