import { Header } from "@shared/components/layout/Header";
import { BottomBar } from "@shared/components/layout/BottomBar";
import { Card } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { AlertTriangle, Clock, User, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { paths } from "@app/navigation";

// Mock urgent alerts data - tasks due within 10 minutes
const mockUrgentAlerts = [
  {
    id: '1',
    patientName: 'John Smith',
    patientId: '3b9f2c1e',
    title: 'Critical medication due',
    description: 'Cardiac medication administration overdue',
    dueTime: '14:45',
    minutesLeft: 5,
    priority: 'urgent' as const,
    type: 'medication'
  },
  {
    id: '2',
    patientName: 'Jane Doe',
    patientId: '27e8d1ad',
    title: 'Post-op vitals check',
    description: 'Vitals monitoring required after surgery',
    dueTime: '15:30',
    minutesLeft: 8,
    priority: 'urgent' as const,
    type: 'assessment'
  },
  {
    id: '3',
    patientName: 'Maria Garcia',
    patientId: '8c4d5e2f',
    title: 'Pain assessment overdue',
    description: 'Patient reported increased pain levels',
    dueTime: '14:50',
    minutesLeft: 3,
    priority: 'urgent' as const,
    type: 'assessment'
  }
];

export function UrgentAlertsPage() {
  const navigate = useNavigate();

  const getMinutesColor = (minutes: number) => {
    if (minutes <= 2) return 'text-urgent';
    if (minutes <= 5) return 'text-caution';
    return 'text-medical';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'medication': return <Activity className="h-4 w-4" />;
      case 'assessment': return <User className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Urgent Alerts"
        showBack
        onBack={() => navigate(paths.root())}
        notificationCount={3}
      />

      <div className="p-4 space-y-4">
        {/* Alert Summary */}
        <Card className="p-4 border-l-4 border-urgent bg-urgent/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-urgent" />
            <div>
              <h2 className="text-lg font-semibold text-urgent">Critical Tasks</h2>
              <p className="text-sm text-muted-foreground">
                {mockUrgentAlerts.length} tasks require immediate attention (≤10 min)
              </p>
            </div>
          </div>
        </Card>

        {/* Urgent Alerts List */}
        <div className="space-y-3">
          {mockUrgentAlerts.map((alert) => (
            <Card key={alert.id} className="p-4 border-l-4 border-urgent bg-urgent/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(alert.type)}
                    <h3 className="font-medium text-urgent">{alert.title}</h3>
                    <Badge variant="destructive" className="text-xs">
                      URGENT
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {alert.description}
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Patient: <span className="font-medium">{alert.patientName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Due: {alert.dueTime}</span>
                    </div>
                    <div className={`font-medium ${getMinutesColor(alert.minutesLeft)}`}>
                      {alert.minutesLeft} min left
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => navigate(paths.patient(alert.patientId))}
                  >
                    Take Action
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                  >
                    Acknowledge
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {mockUrgentAlerts.length === 0 && (
          <Card className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No urgent alerts</h3>
            <p className="text-muted-foreground">All critical tasks are on schedule.</p>
          </Card>
        )}
      </div>

      <BottomBar />
    </div>
  );
}

export default UrgentAlertsPage;
