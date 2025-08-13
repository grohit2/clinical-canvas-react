import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/types/api";

interface PatientGridCardProps {
  patient: Patient;
  onClick?: () => void;
}

export function PatientGridCard({ patient, onClick }: PatientGridCardProps) {
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const labsUrl = `http://115.241.194.20/LIS/Reports/Patient_Report.aspx?prno=${patient.mrn}`;

  const startPress = () => {
    pressTimer.current = setTimeout(() => {
      window.open(labsUrl, "_blank");
    }, 600);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <Card
      onClick={onClick}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      className="aspect-square p-2 hover:shadow-sm transition-shadow cursor-pointer"
    >
      <div className="flex h-full flex-col justify-between text-xs space-y-1">
        <div className="space-y-1">
          <span className="font-bold truncate">{patient.name}</span>
          <span className="text-muted-foreground">MRN: {patient.mrn}</span>
          {patient.diagnosis && (
            <span className="line-clamp-2">{patient.diagnosis}</span>
          )}
          {patient.comorbidities && patient.comorbidities.length > 0 && (
            <span className="line-clamp-2">
              {patient.comorbidities.join(", ")}
            </span>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            window.open(labsUrl, "_blank");
          }}
        >
          Labs
        </Button>
      </div>
    </Card>
  );
}

