import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { KPITile } from "@/components/dashboard/KPITile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/navigation";
import api from "@/lib/api";
import { MindfulnessTile } from "@/components/dashboard/MindfulnessTile";

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

export default function Dashboard() {
  const navigate = useNavigate();

  // Helpers to compute from a patients array
  const computeStageHeatMap = (patients: any[]): StageEntry[] => {
    const stageCounts: Record<string, number> = {};
    patients.forEach((p: any) => {
      const stage = p.currentState || "Unknown";
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });
    const stages: StageEntry[] = Object.entries(stageCounts).map(([stage, count]) => {
      const key = (stage || '').toLowerCase();
      const compact =
        key === 'pre-op' ? 'preop' :
        key === 'intra-op' || key === 'surgery' ? 'intraop' :
        key === 'post-op' ? 'postop' : key;
      const variant =
        compact === 'intraop' ? 'urgent' :
        compact === 'preop' ? 'caution' :
        compact === 'postop' || compact === 'discharge' ? 'stable' : 'default';
      const labelMap: Record<string,string> = {
        onboarding: 'Onboarding', preop: 'Pre-Op', intraop: 'Intra-Op', postop: 'Post-Op', 'discharge-init': 'Discharge Init', discharge: 'Discharge'
      };
      const label = labelMap[compact] || (stage || 'Unknown');
      return { stage: label, count, variant };
    });
    return stages;
  };

  const computeUpcoming = (patients: any[]): UpcomingItem[] => {
    // Upcoming procedures based on surgeryDate (from today, IST)
    const offsetMs = 330 * 60 * 1000; // IST +5:30
    const nowMs = Date.now();
    const ist = new Date(nowMs + offsetMs);
    const istMidnightUtcMs = Date.UTC(
      ist.getUTCFullYear(),
      ist.getUTCMonth(),
      ist.getUTCDate()
    ) - offsetMs;
    return (patients as any[])
      .map((p) => ({ p, sd: (p as any).surgeryDate as string | undefined }))
      .filter((x) => x.sd)
      .map(({ p, sd }) => ({ p, when: new Date(sd!) }))
      .filter(({ when }) => when.getTime() >= istMidnightUtcMs)
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, 10)
      .map(({ p, when }) => ({
        id: (p as any).id,
        name: (p as any).name,
        procedure: (p as any).procedureName,
        when,
      }));
  };

  // Seed initial state from cache synchronously for instant render
  let cachedPatients: any[] | null = null;
  let cachedTasksDue = 0;
  try {
    const raw = localStorage.getItem('patientsCache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        cachedPatients = parsed.items;
      }
    }
    const t = localStorage.getItem('tasksDueCache');
    if (t) cachedTasksDue = Number(t) || 0;
  } catch {}

  const [kpiData, setKpiData] = useState({
    totalPatients: cachedPatients?.length || 0,
    tasksDue: cachedTasksDue || 0,
    urgentAlerts: cachedPatients ? cachedPatients.filter((p: any) => p.isUrgent).length : 0,
  });
  const [stageHeatMap, setStageHeatMap] = useState<StageEntry[]>(cachedPatients ? computeStageHeatMap(cachedPatients) : []);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>(cachedPatients ? computeUpcoming(cachedPatients) : []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Try to reuse cache from Patients page
        let patients: any[] | null = null;
        let fromCache = false;
        try {
          const raw = localStorage.getItem('patientsCache');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.items)) {
              patients = parsed.items;
              fromCache = true;
            }
          }
        } catch {}
        if (!patients) {
          patients = await api.patients.list();
        }
        const tasksArrays = await Promise.all(
          patients.map((p) => api.tasks.list(p.id).catch(() => []))
        );
        const allTasks = tasksArrays.flat();

        const totalPatients = patients.length;
        let tasksDue = 0;
        if (!fromCache) {
          const tasksArrays = await Promise.all(
            (patients as any[]).map((p: any) => api.tasks.list(p.id).catch(() => []))
          );
          const allTasks = tasksArrays.flat();
          tasksDue = allTasks.filter((t) => t.status !== "done").length;
          try { localStorage.setItem('tasksDueCache', String(tasksDue)); } catch {}
        } else {
          try {
            const cached = localStorage.getItem('tasksDueCache');
            if (cached) tasksDue = Number(cached) || 0;
          } catch { tasksDue = 0; }
        }
        const urgentAlerts = patients.filter((p) => p.isUrgent).length;
        setKpiData({
          totalPatients,
          tasksDue,
          urgentAlerts,
        });

        const stages: StageEntry[] = computeStageHeatMap(patients);

        setStageHeatMap(stages);

        // Upcoming procedures based on surgeryDate (from today, IST)
        const offsetMs = 330 * 60 * 1000; // IST +5:30
        const nowMs = Date.now();
        const ist = new Date(nowMs + offsetMs);
        const istMidnightUtcMs = Date.UTC(
          ist.getUTCFullYear(),
          ist.getUTCMonth(),
          ist.getUTCDate()
        ) - offsetMs;

        const toIstTime = (d: Date) =>
          new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
          }).format(d);

        setUpcoming(computeUpcoming(patients));
      } catch (err) {
        console.error(err);
      }
    };

    fetchDashboardData();
    const id = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Dashboard" 
        notificationCount={5}
      />
      
      <div className="p-4 space-y-6">
        {/* Date */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Today's Overview</h2>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 gap-4">
          <KPITile
            title="Total Patients"
            value={kpiData.totalPatients}
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
            value={kpiData.urgentAlerts}
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
          <div className="grid grid-cols-5 gap-2">
            {stageHeatMap.map((stage) => (
              <div
                key={stage.stage}
                className="text-center p-2 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() =>
                  navigate(`/patients?stage=${stage.stage.toLowerCase().replace('-', '')}`)
                }
              >
                <div
                  className={`text-xl font-bold mb-1 ${
                    stage.variant === 'urgent'
                      ? 'text-urgent'
                      : stage.variant === 'stable'
                      ? 'text-stable'
                      : stage.variant === 'caution'
                      ? 'text-caution'
                      : 'text-medical'
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
        </Card>

        {/* Upcoming Procedures (IST) */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Upcoming Procedures</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/procedures')}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {upcoming.length === 0 && (
              <div className="p-3 rounded border text-sm text-muted-foreground text-center">
                No procedures scheduled from today
              </div>
            )}
            {upcoming.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => navigate(paths.patient(it.id))}
                className="w-full flex items-center justify-between p-3 rounded-lg border gap-4 hover:bg-muted/30 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {it.procedure || '—'}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Calendar className="h-3 w-3" />
                    {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year:'numeric', month:'short', day:'2-digit' }).format(it.when)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <BottomBar />
    </div>
  );
}
