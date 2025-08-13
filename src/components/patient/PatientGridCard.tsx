import { useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
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

  const startPress = (e: ReactMouseEvent | ReactTouchEvent) => {
    // Prevent text selection / context menu from interfering with long‑press
    if ("preventDefault" in e) e.preventDefault();
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
      className={`aspect-square p-2 hover:shadow-sm transition-all cursor-pointer select-none ${
        isPressing ? "scale-95 ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex h-full flex-col justify-between text-xs space-y-1">
        <div className="space-y-1">
          <span className="font-bold truncate">{patient.name}</span>
          <span className="text-muted-foreground">MRN: {patient.mrn}</span>
          {patient.diagnosis && (
            <span className="line-clamp-2">{patient.diagnosis}</span>
          )}
          {patient.comorbidities?.length ? (
            <span className="line-clamp-2">{patient.comorbidities.join(", ")}</span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}