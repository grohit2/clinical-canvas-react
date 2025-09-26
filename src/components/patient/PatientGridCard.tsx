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
  const [isPressing, setIsPressing] = useState(false);
  const [pinned, setPinned] = useState(() => isPinned(patient.id));
  const pressStartAt = useRef<number | null>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const moved = useRef(false);
  const LONG_PRESS_MS = 600;
  const MOVE_TOLERANCE = 12; // px
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
    setIsPressing(true);
    moved.current = false;
    pressStartAt.current = Date.now();
    if ('touches' in e && e.touches && e.touches[0]) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    } else if ('clientX' in e) {
      startX.current = (e as MouseEvent).clientX;
      startY.current = (e as MouseEvent).clientY;
    }
  };

  const trackMove = (e: MouseEvent | TouchEvent) => {
    if (startX.current == null || startY.current == null) return;
    let x = 0, y = 0;
    if ('touches' in e && e.touches && e.touches[0]) {
      x = e.touches[0].clientX; y = e.touches[0].clientY;
    } else if ('clientX' in e) {
      x = (e as MouseEvent).clientX; y = (e as MouseEvent).clientY;
    }
    const dx = Math.abs(x - startX.current);
    const dy = Math.abs(y - startY.current);
    if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) moved.current = true;
  };

  const endPress = (e: MouseEvent | TouchEvent) => {
    const started = pressStartAt.current;
    pressStartAt.current = null;
    setIsPressing(false);
    if (!started) return;
    const duration = Date.now() - started;
    if (duration >= LONG_PRESS_MS && !moved.current && labsUrl) {
      // Trigger navigation within user gesture (mouseup/touchend) for iOS reliability
      e.preventDefault?.();
      e.stopPropagation?.();
      window.location.href = labsUrl;
      return;
    }
    // else: short tap; let onClick handler fire naturally
  };

  const cardRef = useRef<HTMLDivElement | null>(null);

  return (
    <Card
      ref={cardRef}
      onClick={onClick}
      onMouseDown={startPress}
      onMouseMove={trackMove}
      onMouseUp={endPress}
      onMouseLeave={() => { setIsPressing(false); pressStartAt.current = null; }}
      onTouchStart={startPress}
      onTouchMove={trackMove}
      onTouchEnd={endPress}
      onContextMenu={(e) => e.preventDefault()}
      className={`group p-3 hover:shadow-sm transition-all cursor-pointer select-none ${
        isPressing ? "scale-95 ring-2 ring-primary" : getCardColorClass(patient.currentState)
      } h-[160px] flex flex-col`}
    >
      {/* content */}
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
