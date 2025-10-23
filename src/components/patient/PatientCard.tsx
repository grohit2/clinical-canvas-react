import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageChip } from "./StageChip";
import { UpdateRing } from "./UpdateRing";
import { QRCodeGenerator } from "@/components/qr/QRCodeGenerator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Patient } from "@/types/api";
import { MoreVertical, FileText, Pin } from "lucide-react";
import { isPinned, togglePin } from "@/lib/pinnedPatients";

interface PatientCardProps {
  patient: Patient;
  onClick?: () => void;
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
  const [showQR, setShowQR] = useState(false);
  const [pinned, setPinned] = useState(() => isPinned(patient.id));

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

  const handleTogglePin = () => {
    const newPinned = togglePin(patient.id);
    setPinned(newPinned);
  };

  // ---- swipe-to-open Labs (unchanged) ----
  const labsUrl = patient.latestMrn
    ? `http://115.241.194.20/LIS/Reports/Patient_Report.aspx?prno=${patient.latestMrn}`
    : '';
  const touchStartX = useRef<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (diff > 5) { // Only start swiping if moved more than 5px
        setIsSwiping(true);
        setTranslateX(Math.min(diff, 80));
      }
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (diff > 50 && labsUrl) {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = labsUrl;
        return;
      }
    }
    // Reset swipe state after a short delay to allow click events
    setTimeout(() => {
      setTranslateX(0);
      setIsSwiping(false);
    }, 100);
    touchStartX.current = null;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if user is swiping or if click is on action buttons
    if (isSwiping || translateX > 0) {
      return;
    }
    
    // Check if click target is an action button or inside one
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }
    
    onClick?.();
  };

  // ---- color mapping (as-is) ----
  const getStageVariant = (stage: string) => {
    switch (stage.toLowerCase()) {
      case "icu":
      case "critical":
        return "urgent";
      case "post-op":
      case "postop":
      case "recovery":
        return "caution";
      case "discharge":
      case "stable":
        return "stable";
      default:
        return "default";
    }
  };
  const getCardColorClass = (stage: string) => {
    switch (stage.toLowerCase()) {
      case "icu":
      case "critical":
        return "border-l-4 border-l-urgent";
      case "post-op":
      case "postop":
      case "recovery":
        return "border-l-4 border-l-caution";
      case "discharge":
      case "stable":
        return "border-l-4 border-l-stable";
      default:
        return "border-l-4 border-l-medical";
    }
  };

  // Days since surgery (date-only diff)
  const daysSinceSurgery = (() => {
    const sd = (patient as any).surgeryDate as string | undefined;
    if (!sd) return 0;
    const d = new Date(sd);
    if (isNaN(d.getTime())) return 0;
    const now = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  })();

  const comorbidities = (patient.comorbidities ?? [])
    .flatMap((item) =>
      String(item)
        .split(/\s*\+\s*|\s*,\s*/)
        .map((token) => token.trim())
        .filter(Boolean)
    )
    .map((token) => token.toUpperCase());

  return (
    <div
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* swipe underlay */}
      <div className="absolute inset-0 flex items-center justify-end pr-4 bg-primary text-primary-foreground rounded-xl">
        Labs
      </div>

      <Card
        className={`rounded-xl border border-neutral-200/80 bg-white shadow-sm pt-3 px-3 pb-0 cursor-pointer ${getCardColorClass(
          patient.currentState
        )}`}
        onClick={handleCardClick}
        style={{
          transform: `translateX(-${translateX}px)`,
          transition: isSwiping ? "none" : "transform 0.2s ease-out",
        }}
      >
        {/* ===== Row 1: ring + name/MRN + stage + kebab + qr ===== */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <UpdateRing count={patient.updateCounter} size="sm" />
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3
                  className="font-bold text-base text-neutral-900 truncate"
                  title={patient.name}
                >
                  {patient.name}
                </h3>
              </div>
              <p className="text-xs text-neutral-500">
                MRN: {patient.latestMrn ?? ''}
                {schemeLabel && (
                  <>
                    {' • '}
                    <span className="text-emerald-600 font-semibold">{schemeLabel}</span>
                  </>
                )}
                {showRoomWithMrn && roomNumber ? ` • R# ${roomNumber}` : ''}
              </p>
            </div>
          </div>

        <div className="flex items-center gap-1.5">
            {daysSinceSurgery > 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[10px] font-semibold">
                D+{daysSinceSurgery}
              </span>
            )}
            <StageChip
              stage={patient.currentState}
              variant={getStageVariant(patient.currentState)}
              size="sm"
            />
            {pinned && (
              <Pin className="h-4 w-4 text-blue-500 fill-current" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="More"
                >
                  <MoreVertical className="h-4 w-4 text-neutral-400" />
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
        </div>

        {/* ===== Row 2: diagnosis line ===== */}
        <div className="mt-3 text-xs text-neutral-700">
          <div className="flex items-start">
            <FileText className="h-4 w-4 text-neutral-400 mr-2 shrink-0" />
            <span className="truncate">{patient.diagnosis}</span>
          </div>
        </div>

        {/* ===== Optional QR section ===== */}
        {showQR && (
          <div className="mt-3 p-3 bg-neutral-50 rounded-lg flex flex-col items-center gap-2">
            <QRCodeGenerator value={patient.qrCode || patient.id} size={120} />
            <p className="text-[11px] text-neutral-500 text-center">Scan for patient details</p>
          </div>
        )}

        {/* ===== Comorbidities ===== */}
        <div className="mt-3 -mx-3 px-3 py-2 border-t border-neutral-200/80 bg-neutral-50 rounded-b-xl">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">Comorbidities</p>
          {comorbidities.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
            {comorbidities.map((condition) => (
              <Badge
                key={condition}
                variant="outline"
                className="text-[11px] font-medium px-2 py-0.5 bg-blue-50 border-blue-200 text-blue-700"
              >
                {condition}
              </Badge>
            ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-neutral-400">Not recorded</p>
          )}
        </div>
      </Card>
    </div>
  );
}
