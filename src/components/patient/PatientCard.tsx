import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageChip } from "./StageChip";
import { UpdateRing } from "./UpdateRing";
import { QRCodeGenerator } from "@/components/qr/QRCodeGenerator";
import type { Patient } from "@/types/api";
import { Clock, QrCode, MoreVertical, FileText } from "lucide-react";

interface PatientCardProps {
  patient: Patient;
  onClick?: () => void;
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
  const [showQR, setShowQR] = useState(false);

  // ---- swipe-to-open Labs (unchanged) ----
  const labsUrl = `http://115.241.194.20/LIS/Reports/Patient_Report.aspx?prno=${patient.mrn}`;
  const touchStartX = useRef<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
    setIsSwiping(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (diff > 0) setTranslateX(Math.min(diff, 80));
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (diff > 50) {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = labsUrl;
        return;
      }
    }
    setTranslateX(0);
    setIsSwiping(false);
  };

  // ---- color mapping (as-is) ----
  const getStageVariant = (stage: string) => {
    switch (stage.toLowerCase()) {
      case "icu":
      case "critical":
        return "urgent";
      case "post-op":
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
      case "recovery":
        return "border-l-4 border-l-caution";
      case "discharge":
      case "stable":
        return "border-l-4 border-l-stable";
      default:
        return "border-l-4 border-l-medical";
    }
  };

  const formatAgo = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const h = Math.floor(diffMs / (1000 * 60 * 60));
    if (h < 1) return "Just now";
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  // ---- vitals (optional, safe if missing) ----
  const vitals = (patient as any)?.vitals || {};
  const HR: string = vitals.hr != null ? String(vitals.hr) : "-";
  const BP: string =
    vitals.bp != null
      ? String(vitals.bp)
      : vitals.systolic && vitals.diastolic
      ? `${vitals.systolic}/${vitals.diastolic}`
      : "-";
  const SPO2: string = vitals.spo2 != null ? `${vitals.spo2}%` : "-";
  const TEMP: string =
    vitals.temp != null ? `${vitals.temp}°` : vitals.temperature ? `${vitals.temperature}°` : "-";
  const lastChecked: string = formatAgo(vitals.updatedAt || patient.lastUpdated);

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
        className={`rounded-xl border border-neutral-200/80 bg-white shadow-sm p-3 ${getCardColorClass(
          patient.currentState
        )}`}
        onClick={onClick}
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
              <p className="text-xs text-neutral-500">MRN: {patient.mrn}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <StageChip
              stage={patient.currentState}
              variant={getStageVariant(patient.currentState)}
              size="sm"
            />
            <button
              className="p-1 rounded hover:bg-muted"
              onClick={(e) => e.stopPropagation()}
              aria-label="More"
            >
              <MoreVertical className="h-4 w-4 text-neutral-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQR((s) => !s);
              }}
              className="p-1 rounded hover:bg-muted"
              aria-label="Show QR"
            >
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </button>
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
            <QRCodeGenerator value={(patient as any).qrCode || patient.mrn} size={120} />
            <p className="text-[11px] text-neutral-500 text-center">Scan for patient details</p>
          </div>
        )}

        {/* ===== Footer vitals strip ===== */}
        <div className="mt-3 bg-neutral-50 px-3 py-2 border-t border-neutral-200/80 rounded-b-xl -mx-3">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-4 gap-2 text-center flex-grow">
              <div className="text-xs">
                <p className="text-[10px] text-neutral-500">HR</p>
                <p className="font-semibold text-success-700">{HR}</p>
              </div>
              <div className="text-xs">
                <p className="text-[10px] text-neutral-500">BP</p>
                <p className="font-semibold text-success-700">{BP}</p>
              </div>
              <div className="text-xs">
                <p className="text-[10px] text-neutral-500">SpO2</p>
                <p className="font-semibold text-success-700">{SPO2}</p>
              </div>
              <div className="text-xs">
                <p className="text-[10px] text-neutral-500">Temp</p>
                <p className="font-semibold text-success-700">{TEMP}</p>
              </div>
            </div>
            <div className="text-right pl-2">
              <p className="text-[10px] text-neutral-500 font-medium whitespace-nowrap">
                Last checked
              </p>
              <p className="text-xs text-neutral-600 font-semibold flex items-center justify-end gap-1">
                <Clock className="h-3 w-3" />
                {lastChecked}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
