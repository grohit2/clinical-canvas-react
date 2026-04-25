import type { Patient } from "@/types/api";
import { Card } from "@shared/components/ui/card";
import { PatientTasks } from "@entities/patient/ui";

type ZoneProps = { patient?: Patient };

export function BlueZone({ patient }: ZoneProps) {
  return (
    <Card className="p-4 space-y-3">
      <p className="text-xs uppercase text-muted-foreground tracking-wide">Tasks & Workflow</p>
      <PatientTasks patientId={patient?.id} />
    </Card>
  );
}
