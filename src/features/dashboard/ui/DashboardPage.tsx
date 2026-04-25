import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { KPITile } from "@/components/dashboard/KPITile";
import { MindfulnessTile } from "@/components/dashboard/MindfulnessTile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { paths } from "@/app/navigation";
import { usePatients } from "@entities/patient";

type StageEntry = {
  stage: string;
  count: number;
  variant: "default" | "urgent" | "stable" | "caution";
};

type UpcomingItem = {
  id: string;
  name: string;
  procedure?: string;
  when: Date;
};

// Stage label mapping
const STAGE_LABEL_MAP: Record<string, string> = {
  onboarding: "Onboarding",
  preop: "Pre-Op",
  intraop: "Intra-Op",
  postop: "Post-Op",
  "discharge-init": "Discharge Init",
  discharge: "Discharge",
};

// Normalize stage key for consistent matching
function normalizeStageKey(stage: string): string {
  const key = (stage || "").toLowerCase();
  if (key === "pre-op") return "preop";
  if (key === "intra-op" || key === "surgery") return "intraop";
  if (key === "post-op") return "postop";
  return key;
}

// Get variant color based on stage
function getStageVariant(compact: string): StageEntry["variant"] {
  if (compact === "intraop") return "urgent";
  if (compact === "preop") return "caution";
  if (compact === "postop" || compact === "discharge") return "stable";
  return "default";
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: patients = [], isLoading } = usePatients();

  // Compute KPI metrics from patients data
  const kpiData = useMemo(() => {
    const totalPatients = patients.length;
    const urgentAlerts = patients.filter((p: any) => p.isUrgent).length;
    // Tasks due would need a separate query - for now show 0 or use placeholder
    const tasksDue = 0; // TODO: Add useTasks hook if needed
    return { totalPatients, tasksDue, urgentAlerts };
  }, [patients]);

  // Compute stage distribution heat map
  const stageHeatMap = useMemo((): StageEntry[] => {
    const stageCounts: Record<string, number> = {};
    patients.forEach((p: any) => {
      const stage = p.currentState || "Unknown";
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });

    return Object.entries(stageCounts).map(([stage, count]) => {
      const compact = normalizeStageKey(stage);
      const variant = getStageVariant(compact);
      const label = STAGE_LABEL_MAP[compact] || stage || "Unknown";
      return { stage: label, count, variant };
    });
  }, [patients]);

  // Compute upcoming procedures (from today, IST timezone)
  const upcoming = useMemo((): UpcomingItem[] => {
    const offsetMs = 330 * 60 * 1000; // IST +5:30
    const nowMs = Date.now();
    const ist = new Date(nowMs + offsetMs);
    const istMidnightUtcMs =
      Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) -
      offsetMs;

    return patients
      .map((p: any) => ({ p, sd: p.surgeryDate as string | undefined }))
      .filter((x) => x.sd)
      .map(({ p, sd }) => ({ p, when: new Date(sd!) }))
      .filter(({ when }) => when.getTime() >= istMidnightUtcMs)
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, 10)
      .map(({ p, when }) => ({
        id: p.id,
        name: p.name,
        procedure: p.procedureName,
        when,
      }));
  }, [patients]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Dashboard" notificationCount={5} />

      <div className="p-4 space-y-6">
        {/* Date */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Today's Overview</h2>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 gap-4">
          <KPITile
            title="Total Patients"
            value={isLoading ? "..." : kpiData.totalPatients}
            icon={Users}
            trend={{ value: 5, isPositive: true }}
            onClick={() => navigate(paths.patients())}
          />
          <KPITile
            title="Tasks Due"
            value={kpiData.tasksDue}
            icon={Clock}
            variant="caution"
            onClick={() => navigate(paths.tasksDue())}
          />
          <KPITile
            title="Urgent Alerts"
            value={isLoading ? "..." : kpiData.urgentAlerts}
            icon={AlertTriangle}
            variant="urgent"
            onClick={() => navigate(paths.urgentAlerts())}
          />
          <MindfulnessTile />
        </div>

        {/* Stage Heat Map */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Patient Distribution</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          {isLoading ? (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {stageHeatMap.map((stage) => (
                <div
                  key={stage.stage}
                  className="text-center p-2 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() =>
                    navigate(
                      `/patients?stage=${stage.stage.toLowerCase().replace("-", "")}`
                    )
                  }
                >
                  <div
                    className={`text-xl font-bold mb-1 ${
                      stage.variant === "urgent"
                        ? "text-urgent"
                        : stage.variant === "stable"
                          ? "text-stable"
                          : stage.variant === "caution"
                            ? "text-caution"
                            : "text-medical"
                    }`}
                  >
                    {stage.count}
                  </div>
                  <div className="text-xs text-muted-foreground break-words leading-tight">
                    {stage.stage}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Procedures (IST) */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Upcoming Procedures</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/procedures")}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-muted animate-pulse"
                />
              ))
            ) : upcoming.length === 0 ? (
              <div className="p-3 rounded border text-sm text-muted-foreground text-center">
                No procedures scheduled from today
              </div>
            ) : (
              upcoming.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => navigate(paths.patient(it.id))}
                  className="w-full flex items-center justify-between p-3 rounded-lg border gap-4 hover:bg-muted/30 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {it.procedure || "—"}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Calendar className="h-3 w-3" />
                      {new Intl.DateTimeFormat("en-IN", {
                        timeZone: "Asia/Kolkata",
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      }).format(it.when)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
