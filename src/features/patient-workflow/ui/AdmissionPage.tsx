import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { WorkflowPageLayout } from "./WorkflowPageLayout";

export function AdmissionPage() {
  const { id } = useParams<{ id: string }>();

  const { data: patient } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.patients.get(id!),
    enabled: !!id,
  });

  return (
    <WorkflowPageLayout title="Admission" stepId="admission">
      <div className="space-y-4">
        {/* Patient Summary Card */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Patient Information
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>
              <p className="font-medium">{patient?.name ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Age/Sex:</span>
              <p className="font-medium">
                {patient?.age ?? "—"} / {patient?.sex ?? "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">MRN:</span>
              <p className="font-medium">{patient?.latestMrn ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Scheme:</span>
              <p className="font-medium">{patient?.scheme ?? "—"}</p>
            </div>
          </div>
        </Card>

        {/* Admission Notes */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Admission Notes
          </h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="chief-complaint">Chief Complaint</Label>
              <Textarea
                id="chief-complaint"
                placeholder="Enter the patient's chief complaint..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="history">History of Present Illness</Label>
              <Textarea
                id="history"
                placeholder="Enter history of present illness..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
        </Card>

        {/* Baseline Vitals */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Baseline Vitals
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bp">Blood Pressure</Label>
              <Input id="bp" placeholder="120/80" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="pulse">Pulse Rate</Label>
              <Input id="pulse" placeholder="72 bpm" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="temp">Temperature</Label>
              <Input id="temp" placeholder="98.6 F" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="spo2">SpO2</Label>
              <Input id="spo2" placeholder="98%" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="rr">Respiratory Rate</Label>
              <Input id="rr" placeholder="16/min" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="weight">Weight</Label>
              <Input id="weight" placeholder="70 kg" className="mt-1" />
            </div>
          </div>
        </Card>

        {/* Problem List */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Problem List / Active Issues
          </h2>
          <Textarea
            placeholder="List active problems and diagnoses..."
            rows={4}
          />
        </Card>

        {/* Diagnosis */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Working Diagnosis
          </h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="diagnosis">Primary Diagnosis</Label>
              <Input
                id="diagnosis"
                defaultValue={patient?.diagnosis ?? ""}
                placeholder="Enter primary diagnosis..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="comorbidities">Comorbidities</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {patient?.comorbidities?.map((c, i) => (
                  <span
                    key={i}
                    className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  >
                    {c}
                  </span>
                )) ?? (
                  <span className="text-sm text-muted-foreground">None recorded</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </WorkflowPageLayout>
  );
}
