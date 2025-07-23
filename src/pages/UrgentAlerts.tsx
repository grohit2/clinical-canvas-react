import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, User, Clock, Timer } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

// Mock urgent alerts data (tasks due within 10 minutes)
const mockUrgentAlerts = [
  {
    id: '1',
    patientId: '2a1b3c4d',
    patientName: 'John Smith',
    taskType: 'Critical Medication Administration',
    dueTime: '2025-07-23T14:05:00Z',
    priority: 'critical',
    description: 'Administer time-sensitive cardiac medication'
  },
  {
    id: '2',
    patientId: '9d6e7f3g',
    patientName: 'Sarah Miller',
    taskType: 'Vital Signs Check',
    dueTime: '2025-07-23T14:08:00Z',
    priority: 'urgent',
    description: 'Monitor post-operative vital signs'
  }
];

export default function UrgentAlerts() {
  const { currentDoctor } = useAuth();
  const navigate = useNavigate();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'urgent': return 'text-urgent';
      default: return 'text-caution';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'urgent': return 'urgent';
      default: return 'caution';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getTimeRemaining = (dueTime: string) => {
    const now = new Date();
    const due = new Date(dueTime);
    const diff = due.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes <= 0) {
      return 'OVERDUE';
    }
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Urgent Alerts" 
        notificationCount={mockUrgentAlerts.length}
      />
      
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-urgent">Critical Tasks</h2>
            <p className="text-sm text-muted-foreground">
              {mockUrgentAlerts.length} tasks due within 10 minutes
            </p>
          </div>
          <Badge variant="destructive" className="animate-pulse">
            <AlertTriangle className="h-3 w-3 mr-1" />
            URGENT
          </Badge>
        </div>

        <div className="space-y-3">
          {mockUrgentAlerts.map((alert) => (
            <Card key={alert.id} className="p-4 border-urgent/20 bg-urgent/5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{alert.patientName}</span>
                    <Badge variant={getPriorityBadge(alert.priority) as any} className="text-xs">
                      {alert.priority}
                    </Badge>
                  </div>
                  <h3 className="font-semibold mb-1 text-urgent">{alert.taskType}</h3>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="flex items-center gap-1 text-sm">
                    <Timer className="h-3 w-3" />
                    {formatTime(alert.dueTime)}
                  </div>
                  <div className={`text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                    {getTimeRemaining(alert.dueTime)}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => navigate(`/patients/${alert.patientId}`)}>
                  Handle Now
                </Button>
                <Button variant="outline" size="sm">
                  Delegate
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/')}
        >
          Back to Dashboard
        </Button>
      </div>

      <BottomBar />
    </div>
  );
}