import { useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Patient } from "@/types/api";
import { MoreVertical, Pin } from "lucide-react";
import { isPinned, togglePin } from "@/lib/pinnedPatients";

interface PatientGridCardProps {
  patient: Patient;
  onClick?: () => void;
}

export function PatientGridCard({ patient, onClick }: PatientGridCardProps) {
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const [pinned, setPinned] = useState(() => isPinned(patient.id));
  const labsUrl = patient.latestMrn
    ? `http://115.241.194.20/LIS/Reports/Patient_Report.aspx?prno=${patient.latestMrn}`
    : '';

  const handleTogglePin = (e: MouseEvent) => {
    e.stopPropagation();
    const newPinned = togglePin(patient.id);
    setPinned(newPinned);
  };

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
      if (labsUrl) {
        window.open(labsUrl, "_blank");
      }
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
      className={`group p-3 hover:shadow-sm transition-all cursor-pointer select-none ${
        isPressing ? "scale-95 ring-2 ring-primary" : getCardColorClass(patient.currentState)
      } h-[160px] flex flex-col`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{patient.name}</span>
          {pinned && (
            <Pin className="h-3 w-3 text-blue-500 fill-current" />
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
              aria-label="More"
            >
              <MoreVertical className="h-3 w-3 text-neutral-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleTogglePin}>
              <Pin className="mr-2 h-4 w-4" />
              {pinned ? "Unpin" : "Pin for me"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="text-xs space-y-1 flex-1">
        {patient.diagnosis && (
          <p className="line-clamp-2 leading-snug">{patient.diagnosis}</p>
        )}
      </div>

    </Card>
  );
}