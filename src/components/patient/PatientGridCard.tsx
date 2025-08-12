import { Card } from "@/components/ui/card";
import type { Patient } from "@/types/api";

interface PatientGridCardProps {
  patient: Patient;
  onClick?: () => void;
}

export function PatientGridCard({ patient, onClick }: PatientGridCardProps) {
  return (
    <Card
      onClick={onClick}
      className="aspect-square p-2 hover:shadow-sm transition-shadow cursor-pointer"
    >
      <div className="flex h-full flex-col text-xs space-y-1">
        <span className="font-bold truncate">{patient.name}</span>
        {patient.diagnosis && (
          <span className="line-clamp-2">{patient.diagnosis}</span>
        )}
        {patient.comorbidities && patient.comorbidities.length > 0 && (
          <span className="line-clamp-2">
            {patient.comorbidities.join(", ")}
          </span>
        )}
      </div>
    </Card>
  );
}

