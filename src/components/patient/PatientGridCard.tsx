import { useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { Card } from "@/components/ui/card";
import type { Patient } from "@/types/api";

interface PatientGridCardProps {
  patient: Patient;
  onClick?: () => void;
}

export function PatientGridCard({ patient, onClick }: PatientGridCardProps) {
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const labsUrl = `http://115.241.194.20/LIS/Reports/Patient_Report.aspx?prno=${patient.mrn}`;

  const getCardColorClass = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'icu':
      case 'critical':
        return 'ring-2 ring-urgent';
      case 'post-op':
      case 'recovery':
        return 'ring-2 ring-caution';
      case 'discharge':
      case 'stable':
        return 'ring-2 ring-stable';
      default:
        return 'ring-2 ring-medical';
    }
  };

  const startPress = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    setIsPressing(true);
    pressTimer.current = setTimeout(() => {
      setIsPressing(false);
      window.open(labsUrl, "_blank");
    }, 600);
  };

  const cancelPress = () => {
    setIsPressing(false);
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
      onContextMenu={(e) => e.preventDefault()}
      className={`p-3 hover:shadow-sm transition-all cursor-pointer select-none ${
        isPressing ? "scale-95 ring-2 ring-primary" : getCardColorClass(patient.currentState)
      } h-[160px] flex flex-col`}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-sm truncate">{patient.name}</span>
      </div>

      <div className="mt-1 text-xs space-y-1 flex-1">
        {patient.diagnosis && (
          <p className="line-clamp-2 leading-snug">{patient.diagnosis}</p>
        )}
      </div>

    </Card>
  );
}