import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, ExternalLink, CheckCircle } from "lucide-react";
import { paths } from "@/app/navigation";
import api from "@/lib/api";
import { WorkflowPageLayout } from "./WorkflowPageLayout";

const DISCHARGE_CHECKLIST = [
  { id: "summary", label: "Discharge Summary Completed" },
  { id: "instructions", label: "Patient Instructions Given" },
  { id: "prescriptions", label: "Prescriptions Provided" },
  { id: "followup", label: "Follow-up Appointment Scheduled" },
  { id: "wound-care", label: "Wound Care Instructions" },
  { id: "diet", label: "Diet Instructions" },
  { id: "activity", label: "Activity Restrictions Explained" },
  { id: "warning-signs", label: "Warning Signs Discussed" },
  { id: "emergency", label: "Emergency Contact Numbers Given" },
  { id: "medications", label: "Medication Reconciliation Done" },
];

export function DischargePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: patient } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.patients.get(id!),
    enabled: !!id,
  });

  return (
    <WorkflowPageLayout title="Discharge" stepId="discharge">
      <div className="space-y-4">
        {/* Discharge Status */}
        <Card className="p-4 border-emerald-200 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-emerald-800">
                Ready for Discharge
              </h2>
              <p className="text-sm text-emerald-600">
                Complete the checklist below to finalize discharge
              </p>
            </div>
          </div>
        </Card>

        {/* Discharge Checklist */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Discharge Checklist
          </h2>
          <div className="space-y-2">
            {DISCHARGE_CHECKLIST.map((item) => (
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

        {/* Discharge Summary */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Discharge Summary
          </h2>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => id && navigate(paths.dischargeSummary(id))}
            >
              <FileText className="h-4 w-4 mr-2" />
              <span>Edit Discharge Summary</span>
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>

            <div>
              <Label htmlFor="diagnosis-final">Final Diagnosis</Label>
              <Textarea
                id="diagnosis-final"
                defaultValue={patient?.diagnosis ?? ""}
                placeholder="Enter final diagnosis..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="procedures">Procedures Performed</Label>
              <Textarea
                id="procedures"
                defaultValue={patient?.procedureName ?? ""}
                placeholder="List procedures performed during admission..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="condition">Condition at Discharge</Label>
              <Textarea
                id="condition"
                placeholder="Stable, improved, etc..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* Discharge Instructions */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Discharge Instructions
          </h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="medications-dc">Medications to Continue</Label>
              <Textarea
                id="medications-dc"
                placeholder="List discharge medications with doses and frequency..."
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="diet-dc">Diet Instructions</Label>
              <Textarea
                id="diet-dc"
                placeholder="Dietary recommendations..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="activity-dc">Activity Restrictions</Label>
              <Textarea
                id="activity-dc"
                placeholder="Activity limitations and recommendations..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="wound-dc">Wound Care</Label>
              <Textarea
                id="wound-dc"
                placeholder="Wound care instructions..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="warning-dc">Warning Signs to Watch For</Label>
              <Textarea
                id="warning-dc"
                placeholder="When to seek immediate medical attention..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* Follow-up */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Follow-up Plan
          </h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="followup-date">Follow-up Date</Label>
              <input
                id="followup-date"
                type="date"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div>
              <Label htmlFor="followup-with">Follow-up With</Label>
              <Textarea
                id="followup-with"
                defaultValue={patient?.assignedDoctor ?? ""}
                placeholder="Doctor name / department..."
                className="mt-1"
                rows={1}
              />
            </div>
            <div>
              <Label htmlFor="followup-notes">Additional Notes</Label>
              <Textarea
                id="followup-notes"
                placeholder="Any additional follow-up instructions..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Emergency Contact Information
          </h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Hospital:</span>{" "}
              <span className="font-medium">+91-XXX-XXX-XXXX</span>
            </p>
            <p>
              <span className="text-muted-foreground">Emergency:</span>{" "}
              <span className="font-medium">108</span>
            </p>
            <p>
              <span className="text-muted-foreground">Doctor:</span>{" "}
              <span className="font-medium">
                {patient?.assignedDoctor ?? "Contact hospital"}
              </span>
            </p>
          </div>
        </Card>

        {/* Complete Discharge Button */}
        <Button className="w-full" size="lg">
          <CheckCircle className="h-4 w-4 mr-2" />
          Complete Discharge
        </Button>
      </div>
    </WorkflowPageLayout>
  );
}
