import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Patient } from "@/types/api";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface PatientGridCardProps {
  patient: Patient;
  onClick?: () => void;
}

function getPriorityColor(patient: Patient) {
  const state = patient.currentState?.toLowerCase();
  if (state === "critical" || state === "icu") return "bg-red-500";
  if (patient.isUrgent) return "bg-orange-500";
  return "bg-blue-500";
}

function abbreviateStatus(status?: string) {
  if (!status) return "";
  const clean = status.replace(/[^a-zA-Z]/g, " ");
  const first = clean.trim().split(" ")[0];
  return first.slice(0, 3).toLowerCase();
}

function getDoctorLastName(name?: string) {
  if (!name) return "";
  return name.replace(/^Dr\.\s+/i, "").split(" ").pop() || "";
}

function formatDateShort(date?: string) {
  if (!date) return "";
  try {
    return format(new Date(date), "MMM d");
  } catch {
    return "";
  }
}

export function PatientGridCard({ patient, onClick }: PatientGridCardProps) {
  const vitals: any = (patient as any).vitals || {};
  const bp = typeof vitals.bp === "string" ? vitals.bp.split("/")[0] : "--";
  const hr = vitals.hr ?? "--";
  const temp = vitals.temp ?? "--";

  return (
    <Card
      onClick={onClick}
      className="relative aspect-square p-2 hover:shadow-sm transition-shadow cursor-pointer"
    >
      <span
        className={`absolute left-1 top-1 h-2 w-2 rounded-full ${getPriorityColor(
          patient
        )}`}
      />
      {patient.updateCounter && patient.updateCounter > 5 && (
        <AlertTriangle className="absolute right-1 top-1 h-4 w-4 text-destructive" />
      )}
      <div className="flex h-full flex-col text-xs">
        <span className="font-bold truncate">{patient.name}</span>
        {patient.age !== undefined && <span>{patient.age}y</span>}
        {patient.diagnosis && (
          <span className="line-clamp-2">{patient.diagnosis}</span>
        )}
        {patient.currentState && (
          <Badge variant="secondary" className="w-min px-1 py-0 mt-1">
            {abbreviateStatus(patient.currentState)}
          </Badge>
        )}
        {patient.assignedDoctor && (
          <span>{getDoctorLastName(patient.assignedDoctor)}</span>
        )}
        {patient.lastUpdated && <span>{formatDateShort(patient.lastUpdated)}</span>}
        <div className="mt-auto flex justify-between">
          <span>{bp}</span>
          <span>{hr}</span>
          <span>{temp}°</span>
        </div>
      </div>
    </Card>
  );
}

