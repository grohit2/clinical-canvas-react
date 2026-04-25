import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { WorkflowPageLayout } from "./WorkflowPageLayout";

const OT_SAFETY_CHECKLIST = [
  { id: "patient-id", label: "Patient Identity Confirmed", phase: "sign-in" },
  { id: "consent", label: "Consent Confirmed", phase: "sign-in" },
  { id: "site", label: "Site Marked", phase: "sign-in" },
  { id: "anesthesia-check", label: "Anesthesia Safety Check Complete", phase: "sign-in" },
  { id: "allergies", label: "Known Allergies Reviewed", phase: "sign-in" },
  { id: "team-intro", label: "Team Introduction Done", phase: "time-out" },
  { id: "procedure-confirmed", label: "Procedure Confirmed", phase: "time-out" },
  { id: "antibiotics", label: "Antibiotic Prophylaxis Given", phase: "time-out" },
  { id: "imaging-displayed", label: "Essential Imaging Displayed", phase: "time-out" },
  { id: "specimen", label: "Specimen Labeled", phase: "sign-out" },
  { id: "instrument-count", label: "Instrument Count Correct", phase: "sign-out" },
  { id: "recovery-concerns", label: "Recovery Concerns Addressed", phase: "sign-out" },
];

export function OTPage() {
  const { id } = useParams<{ id: string }>();

  const { data: patient } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.patients.get(id!),
    enabled: !!id,
  });

  const signInItems = OT_SAFETY_CHECKLIST.filter((i) => i.phase === "sign-in");
  const timeOutItems = OT_SAFETY_CHECKLIST.filter((i) => i.phase === "time-out");
  const signOutItems = OT_SAFETY_CHECKLIST.filter((i) => i.phase === "sign-out");

  return (
    <WorkflowPageLayout title="Operation Theatre" stepId="ot">
      <div className="space-y-4">
        {/* OT Info */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            OT Information
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Procedure:</span>
              <p className="font-medium">{patient?.procedureName ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Surgeon:</span>
              <p className="font-medium">{patient?.assignedDoctor ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">OT Number:</span>
              <Input placeholder="OT-1" className="mt-1 h-8" />
            </div>
            <div>
              <span className="text-muted-foreground">Anesthesiologist:</span>
              <Input placeholder="Dr. Name" className="mt-1 h-8" />
            </div>
          </div>
        </Card>

        {/* Timing */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">
              Operative Timing
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start-time">Start Time</Label>
              <Input id="start-time" type="time" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="end-time">End Time</Label>
              <Input id="end-time" type="time" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="anesthesia-start">Anesthesia Start</Label>
              <Input id="anesthesia-start" type="time" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="anesthesia-end">Anesthesia End</Label>
              <Input id="anesthesia-end" type="time" className="mt-1" />
            </div>
          </div>
        </Card>

        {/* WHO Surgical Safety Checklist */}
        <Card className="p-4 border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800">
              WHO Surgical Safety Checklist
            </h2>
          </div>

          {/* Sign In */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
              Sign In (Before Anesthesia)
            </h3>
            <div className="space-y-2">
              {signInItems.map((item) => (
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
          </div>

          {/* Time Out */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
              Time Out (Before Incision)
            </h3>
            <div className="space-y-2">
              {timeOutItems.map((item) => (
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
          </div>

          {/* Sign Out */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
              Sign Out (Before Patient Leaves OT)
            </h3>
            <div className="space-y-2">
              {signOutItems.map((item) => (
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
          </div>
        </Card>

        {/* Intra-Op Notes */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Intra-Operative Notes
          </h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="findings">Operative Findings</Label>
              <Textarea
                id="findings"
                placeholder="Describe intra-operative findings..."
                className="mt-1"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="procedure-done">Procedure Performed</Label>
              <Textarea
                id="procedure-done"
                placeholder="Detail the procedure performed..."
                className="mt-1"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="complications">Complications (if any)</Label>
              <Textarea
                id="complications"
                placeholder="Note any intra-op complications..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="blood-loss">Estimated Blood Loss</Label>
              <Input id="blood-loss" placeholder="e.g., 200 mL" className="mt-1" />
            </div>
          </div>
        </Card>
      </div>
    </WorkflowPageLayout>
  );
}
