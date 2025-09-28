import { useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const activeScheme = (() => {
    const schemeCandidates = [
      patient.scheme,
      patient.mrnHistory?.find((entry) => entry.mrn === patient.latestMrn)?.scheme,
      patient.mrnHistory?.[0]?.scheme,
    ];
    const resolved = schemeCandidates.find((value): value is string => Boolean(value));
    return resolved ? resolved.toUpperCase() : undefined;
  })();
  const roomNumber = patient.roomNumber?.trim();
  const showRoomWithMrn = roomNumber && activeScheme ? ['EHS', 'PAID'].includes(activeScheme) : false;
  const schemeLabel = activeScheme;

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
  const comorbidities = (patient.comorbidities ?? [])
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item && item.length > 0));

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
      } min-h-[160px] flex flex-col`}
    >
      {/* content */}
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{patient.name}</span>
            {pinned && (
              <Pin className="h-3 w-3 text-blue-500 fill-current" />
            )}
          </div>
          {(patient.latestMrn || showRoomWithMrn || schemeLabel) && (
            <p className="text-[10px] text-neutral-500 mt-0.5 truncate">
              {patient.latestMrn ?? ''}
              {schemeLabel && (
                <>
                  {' • '}
                  <span className="text-emerald-600 font-semibold">{schemeLabel}</span>
                </>
              )}
              {showRoomWithMrn && roomNumber ? ` • R# ${roomNumber}` : ''}
            </p>
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
        <div className="pt-1">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">Comorbidities</p>
          {comorbidities.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {comorbidities.map((condition) => (
                <Badge
                  key={condition}
                  variant="outline"
                  className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 border-blue-200 text-blue-700"
                >
                  {condition}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-neutral-400">Not recorded</p>
          )}
        </div>
      </div>

    </Card>
  );
}
