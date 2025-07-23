import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, User, Calendar } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

// Mock tasks due data
const mockTasksDue = [
  {
    id: '1',
    patientId: '2a1b3c4d',
    patientName: 'John Smith',
    taskType: 'Pre-op Assessment',
    dueTime: '2025-07-23T15:30:00Z',
    priority: 'high',
    description: 'Complete pre-operative assessment and clearance'
  },
  {
    id: '2',
    patientId: '3b9f2c1e',
    patientName: 'Maria Garcia',
    taskType: 'Medication Review',
    dueTime: '2025-07-23T16:00:00Z',
    priority: 'medium',
    description: 'Review current medications and adjust dosages'
  },
  {
    id: '3',
    patientId: '7c8d9e0f',
    patientName: 'David Johnson',
    taskType: 'Discharge Planning',
    dueTime: '2025-07-23T14:00:00Z',
    priority: 'high',
    description: 'Prepare discharge instructions and follow-up appointments'
  }
];

export default function TasksDue() {
  const { currentDoctor } = useAuth();
  const navigate = useNavigate();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-urgent';
      case 'medium': return 'text-caution';
      case 'low': return 'text-stable';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'urgent';
      case 'medium': return 'caution';
      case 'low': return 'stable';
      default: return 'default';
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
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Tasks Due" 
        notificationCount={3}
        showBack
        onBack={() => navigate('/')}
      />
      
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Your Pending Tasks</h2>
            <p className="text-sm text-muted-foreground">
              {mockTasksDue.length} tasks requiring attention
            </p>
          </div>
          <Badge variant="outline" className="bg-caution/10 text-caution border-caution/20">
            <Clock className="h-3 w-3 mr-1" />
            Due Today
          </Badge>
        </div>

        <div className="space-y-3">
          {mockTasksDue.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{task.patientName}</span>
                    <Badge variant={getPriorityBadge(task.priority) as any} className="text-xs">
                      {task.priority}
                    </Badge>
                  </div>
                  <h3 className="font-semibold mb-1">{task.taskType}</h3>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3" />
                    {formatTime(task.dueTime)}
                  </div>
                  <div className={`text-xs ${getPriorityColor(task.priority)}`}>
                    {getTimeRemaining(task.dueTime)} remaining
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" onClick={() => navigate(`/patients/${task.patientId}`)}>
                  View Patient
                </Button>
                <Button variant="outline" size="sm">
                  Mark Complete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <BottomBar />
    </div>
  );
}