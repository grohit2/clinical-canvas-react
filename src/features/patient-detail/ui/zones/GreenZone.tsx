import type { Patient } from "@/types/api";
import { Card } from "@shared/components/ui/card";
import { PatientNotes } from "@entities/patient/ui";

type ZoneProps = { patient?: Patient };

export function GreenZone({ patient }: ZoneProps) {
  return (
    <Card className="p-4 space-y-3">
      <p className="text-xs uppercase text-muted-foreground tracking-wide">Discharge & Referrals</p>
      <PatientNotes patientId={patient?.id} />
    </Card>
  );
}
