import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Activity, Pill } from "lucide-react";
import api from "@/lib/api";
import { PatientMeds, PatientTasks } from "@entities/patient/ui";
import { WorkflowPageLayout } from "./WorkflowPageLayout";

const POST_OP_ORDERS = [
  { id: "vitals", label: "Monitor Vitals Q4H" },
  { id: "io", label: "Strict I/O Charting" },
  { id: "mobility", label: "Early Mobilization When Able" },
  { id: "diet", label: "Diet as Tolerated / NPO" },
  { id: "wound", label: "Wound Care / Dressing" },
  { id: "drain", label: "Drain Output Monitoring" },
  { id: "anticoagulation", label: "DVT Prophylaxis" },
  { id: "pain", label: "Pain Management Protocol" },
];

export function PostOpPage() {
  const { id } = useParams<{ id: string }>();

  const { data: patient } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.patients.get(id!),
    enabled: !!id,
  });

  // Calculate days since surgery
  const surgeryDate = (patient as any)?.surgeryDate;
  let daysSinceSurgery: number | null = null;
  if (surgeryDate) {
    const d = new Date(surgeryDate);
    const now = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    daysSinceSurgery = Math.floor(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return (
    <WorkflowPageLayout title="Post-Op Care" stepId="post-op">
      <div className="space-y-4">
        {/* Post-Op Summary */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Post-Operative Summary
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Procedure:</span>
              <p className="font-medium">{patient?.procedureName ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Surgery Date:</span>
              <p className="font-medium">
                {surgeryDate
                  ? new Date(surgeryDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Post-Op Day:</span>
              <p className="font-medium">
                {daysSinceSurgery !== null ? (
                  <span className="inline-flex items-center gap-1">
                    POD {daysSinceSurgery}
                    {daysSinceSurgery > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                        D+{daysSinceSurgery}
                      </span>
                    )}
                  </span>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Current Stage:</span>
              <p className="font-medium capitalize">
                {patient?.currentState ?? "—"}
              </p>
            </div>
          </div>
        </Card>

        {/* Vitals Monitoring */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">
              Current Vitals
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="bp-post">BP</Label>
              <Input id="bp-post" placeholder="—" className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="pulse-post">Pulse</Label>
              <Input id="pulse-post" placeholder="—" className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="temp-post">Temp</Label>
              <Input id="temp-post" placeholder="—" className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="spo2-post">SpO2</Label>
              <Input id="spo2-post" placeholder="—" className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="rr-post">RR</Label>
              <Input id="rr-post" placeholder="—" className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="pain-score">Pain (0-10)</Label>
              <Input id="pain-score" placeholder="—" className="mt-1 h-8" />
            </div>
          </div>
        </Card>

        {/* Post-Op Orders */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Post-Op Orders
          </h2>
          <div className="space-y-2">
            {POST_OP_ORDERS.map((item) => (
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

        {/* Medications */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">
              Current Medications
            </h2>
          </div>
          {id && <PatientMeds patientId={id} />}
        </Card>

        {/* Tasks */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Pending Tasks
          </h2>
          {id && <PatientTasks patientId={id} />}
        </Card>

        {/* Recovery Notes */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Recovery Notes
          </h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="progress">Progress Notes</Label>
              <Textarea
                id="progress"
                placeholder="Document patient's recovery progress..."
                className="mt-1"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="concerns">Concerns / Issues</Label>
              <Textarea
                id="concerns"
                placeholder="Any concerns or complications to monitor..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        </Card>
      </div>
    </WorkflowPageLayout>
  );
}
