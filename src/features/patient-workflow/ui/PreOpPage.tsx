import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { LabsOverviewCard } from "@entities/patient/ui";
import { WorkflowPageLayout } from "./WorkflowPageLayout";

const PRE_OP_CHECKLIST = [
  { id: "consent", label: "Informed Consent Signed" },
  { id: "npo", label: "NPO Status Confirmed (>8 hrs)" },
  { id: "labs", label: "Pre-op Labs Reviewed" },
  { id: "ecg", label: "ECG Done (if indicated)" },
  { id: "imaging", label: "Imaging Reviewed" },
  { id: "anesthesia", label: "Anesthesia Clearance" },
  { id: "blood", label: "Blood Products Arranged (if needed)" },
  { id: "antibiotics", label: "Prophylactic Antibiotics Ordered" },
  { id: "site-marked", label: "Surgical Site Marked" },
  { id: "patient-id", label: "Patient ID Band Verified" },
];

export function PreOpPage() {
  const { id } = useParams<{ id: string }>();

  const { data: patient } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.patients.get(id!),
    enabled: !!id,
  });

  return (
    <WorkflowPageLayout title="Pre-Op Assessment" stepId="pre-op">
      <div className="space-y-4">
        {/* Pre-Op Checklist */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Pre-Op Checklist
          </h2>
          <div className="space-y-3">
            {PRE_OP_CHECKLIST.map((item) => (
              <div key={item.id} className="flex items-center space-x-3">
                <Checkbox id={item.id} />
                <Label
                  htmlFor={item.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </Card>

        {/* Labs Overview */}
        <LabsOverviewCard
          title="Pre-Op Labs"
          mrnHistory={patient?.mrnHistory}
          latestMrn={patient?.latestMrn ?? null}
          activeScheme={patient?.scheme}
        >
          <div className="text-sm text-muted-foreground text-center py-4">
            {patient?.mrnHistory?.length ? (
              <p>Click on MRN above to view lab results</p>
            ) : (
              <p>No MRN linked. Add MRN to view labs.</p>
            )}
          </div>
        </LabsOverviewCard>

        {/* Consents */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Consent Documents
          </h2>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="#" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Surgical Consent Form</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="#" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Anesthesia Consent Form</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="#" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Blood Transfusion Consent</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            </Button>
          </div>
        </Card>

        {/* Anesthesia Assessment */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Anesthesia Assessment
          </h2>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground">ASA Grade:</span>
                <p className="font-medium">—</p>
              </div>
              <div>
                <span className="text-muted-foreground">Airway:</span>
                <p className="font-medium">—</p>
              </div>
              <div>
                <span className="text-muted-foreground">NPO Since:</span>
                <p className="font-medium">—</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium">—</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Procedure Details */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Planned Procedure
          </h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Procedure:</span>
              <p className="font-medium">{patient?.procedureName ?? "Not specified"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Surgery Code:</span>
              <p className="font-medium">{(patient as any)?.surgeryCode ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Scheduled Date:</span>
              <p className="font-medium">
                {(patient as any)?.surgeryDate
                  ? new Date((patient as any).surgeryDate).toLocaleDateString()
                  : "Not scheduled"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Surgeon:</span>
              <p className="font-medium">{patient?.assignedDoctor ?? "Not assigned"}</p>
            </div>
          </div>
        </Card>
      </div>
    </WorkflowPageLayout>
  );
}
