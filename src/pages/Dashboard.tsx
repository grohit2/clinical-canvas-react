import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { KPITile } from "@/components/dashboard/KPITile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  dashboardService,
  KPIData,
  UpcomingProcedure,
  StageHeatMapItem,
} from "@/services";

export default function Dashboard() {
  const navigate = useNavigate();
  const [kpiData, setKpiData] = useState<KPIData>({
    totalPatients: 0,
    tasksDue: 0,
    urgentAlerts: 0,
    completedToday: 0,
  });
  const [upcomingProcedures, setUpcomingProcedures] = useState<
    UpcomingProcedure[]
  >([]);
  const [stageHeatMap, setStageHeatMap] = useState<StageHeatMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const [kpi, procedures, heatMap] = await Promise.all([
          dashboardService.getKPIData(),
          dashboardService.getUpcomingProcedures(),
          dashboardService.getStageHeatMap(),
        ]);

        setKpiData(kpi);
        setUpcomingProcedures(procedures);
        setStageHeatMap(heatMap);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Dashboard" notificationCount={5} />

      <div className="p-4 space-y-6">
        {/* Date and Shift Selector */}
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
          <Badge variant="outline" className="px-3 py-1">
            Day Shift
          </Badge>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 gap-4">
          <KPITile
            title="Total Patients"
            value={isLoading ? "..." : kpiData.totalPatients}
            icon={Users}
            trend={{ value: 5, isPositive: true }}
            onClick={() => navigate("/patients")}
          />
          <KPITile
            title="Tasks Due"
            value={isLoading ? "..." : kpiData.tasksDue}
            icon={Clock}
            variant="caution"
            onClick={() => navigate("/tasks-due")}
          />
          <KPITile
            title="Urgent Alerts"
            value={isLoading ? "..." : kpiData.urgentAlerts}
            icon={AlertTriangle}
            variant="urgent"
            onClick={() => navigate("/urgent-alerts")}
          />
          <KPITile
            title="Completed Today"
            value={isLoading ? "..." : kpiData.completedToday}
            icon={CheckCircle}
            variant="stable"
            trend={{ value: 12, isPositive: true }}
            onClick={() => navigate("/completed-today")}
          />
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
                  navigate(
                    `/patients?stage=${stage.stage.toLowerCase().replace("-", "")}`,
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
        </Card>

        {/* Upcoming Procedures */}
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
            {upcomingProcedures.map((procedure) => (
              <div
                key={procedure.id}
                className="flex items-center justify-between p-3 rounded-lg border gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {procedure.patient}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {procedure.procedure}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Calendar className="h-3 w-3" />
                    {procedure.time}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {procedure.surgeon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <BottomBar />
    </div>
  );
}
