import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, User, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/navigation";

// Mock task data for the current doctor
const mockTasksDue = [
  {
    id: '1',
    patientName: 'Jane Doe',
    patientId: '27e8d1ad',
    title: 'Post-op vitals check',
    type: 'assessment' as const,
    priority: 'high' as const,
    dueTime: '15:30',
    assignedDoctor: 'Dr. Sarah Wilson'
  },
  {
    id: '2',
    patientName: 'Robert Wilson',
    patientId: '9d6e7f3g',
    title: 'Pre-operative assessment',
    type: 'assessment' as const,
    priority: 'medium' as const,
    dueTime: '16:00',
    assignedDoctor: 'Dr. Sarah Wilson'
  },
  {
    id: '3',
    patientName: 'John Smith',
    patientId: '3b9f2c1e',
    title: 'Medication administration',
    type: 'medication' as const,
    priority: 'urgent' as const,
    dueTime: '14:45',
    assignedDoctor: 'Dr. Johnson'
  },
  {
    id: '4',
    patientName: 'Sarah Johnson',
    patientId: '1a2b3c4d',
    title: 'Discharge planning',
    type: 'discharge' as const,
    priority: 'medium' as const,
    dueTime: '17:00',
    assignedDoctor: 'Dr. Johnson'
  }
];

// Current doctor from profile
const currentDoctor = 'Dr. Sarah Wilson';

export default function TasksDue() {
  const navigate = useNavigate();

  // Filter tasks for current doctor
  const doctorTasks = mockTasksDue.filter(task => task.assignedDoctor === currentDoctor);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-urgent border-urgent bg-urgent/5';
      case 'high': return 'text-caution border-caution bg-caution/5';
      case 'medium': return 'text-medical border-medical bg-medical/5';
      default: return 'text-muted-foreground border-border';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assessment': return <User className="h-4 w-4" />;
      case 'medication': return <AlertCircle className="h-4 w-4" />;
      case 'discharge': return <Calendar className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Tasks Due" 
        showBack
        onBack={() => navigate(paths.root())}
        notificationCount={3}
      />
      
      <div className="p-4 space-y-4">
        {/* Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Your Pending Tasks</h2>
              <p className="text-sm text-muted-foreground">
                {doctorTasks.length} tasks requiring attention
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-caution" />
              <span className="text-sm font-medium">Due Today</span>
            </div>
          </div>
        </Card>

        {/* Tasks List */}
        <div className="space-y-3">
          {doctorTasks.map((task) => (
            <Card key={task.id} className={`p-4 border-l-4 ${getPriorityColor(task.priority)}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(task.type)}
                    <h3 className="font-medium">{task.title}</h3>
                    <Badge variant={task.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Patient: {task.patientName}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Due: {task.dueTime}</span>
                    <span>Type: {task.type}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    size="sm"
                    onClick={() => navigate(paths.patient(task.patientId))}
                  >
                    View Patient
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                  >
                    Mark Done
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {doctorTasks.length === 0 && (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No pending tasks for today.</p>
          </Card>
        )}
      </div>

      <BottomBar />
    </div>
  );
}
