import { Header } from "@shared/components/layout/Header";
import { BottomBar } from "@shared/components/layout/BottomBar";
import { Card } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { CheckCircle, Clock, User, Activity, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { paths } from "@app/navigation";

// Mock completed tasks data for today
const mockCompletedTasks = [
  {
    id: '1',
    patientName: 'Jane Doe',
    patientId: '27e8d1ad',
    title: 'Morning vitals check',
    type: 'assessment' as const,
    completedTime: '09:30',
    completedBy: 'Dr. Sarah Wilson'
  },
  {
    id: '2',
    patientName: 'Robert Wilson',
    patientId: '9d6e7f3g',
    title: 'Pre-op medication',
    type: 'medication' as const,
    completedTime: '10:15',
    completedBy: 'Dr. Sarah Wilson'
  },
  {
    id: '3',
    patientName: 'Maria Garcia',
    patientId: '8c4d5e2f',
    title: 'Lab results review',
    type: 'lab' as const,
    completedTime: '11:45',
    completedBy: 'Dr. Sarah Wilson'
  },
  {
    id: '4',
    patientName: 'Sarah Johnson',
    patientId: '1a2b3c4d',
    title: 'Physical therapy assessment',
    type: 'assessment' as const,
    completedTime: '13:20',
    completedBy: 'Dr. Sarah Wilson'
  },
  {
    id: '5',
    patientName: 'David Brown',
    patientId: '5e6f7g8h',
    title: 'Wound dressing change',
    type: 'procedure' as const,
    completedTime: '14:10',
    completedBy: 'Dr. Sarah Wilson'
  }
];

// Current doctor from profile
const currentDoctor = 'Dr. Sarah Wilson';

export function CompletedTodayPage() {
  const navigate = useNavigate();

  // Filter completed tasks for current doctor
  const doctorCompletedTasks = mockCompletedTasks.filter(task => task.completedBy === currentDoctor);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assessment': return <User className="h-4 w-4" />;
      case 'medication': return <Activity className="h-4 w-4" />;
      case 'procedure': return <Calendar className="h-4 w-4" />;
      case 'lab': return <Clock className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assessment': return 'bg-medical/5 text-medical border-medical';
      case 'medication': return 'bg-caution/5 text-caution border-caution';
      case 'procedure': return 'bg-stable/5 text-stable border-stable';
      case 'lab': return 'bg-blue-500/5 text-blue-600 border-blue-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        title="Completed Today"
        showBack
        onBack={() => navigate(paths.root())}
        notificationCount={3}
      />

      <div className="p-4 space-y-4">
        {/* Summary */}
        <Card className="p-4 border-l-4 border-stable bg-stable/5">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-stable" />
            <div>
              <h2 className="text-lg font-semibold">Today's Achievements</h2>
              <p className="text-sm text-muted-foreground">
                {doctorCompletedTasks.length} tasks completed on {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </Card>

        {/* Completed Tasks List */}
        <div className="space-y-3">
          {doctorCompletedTasks.map((task) => (
            <Card key={task.id} className={`p-4 border-l-4 ${getTypeColor(task.type)}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(task.type)}
                    <h3 className="font-medium">{task.title}</h3>
                    <Badge variant="secondary" className="text-xs bg-stable/10 text-stable">
                      Completed
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Patient: <span className="font-medium">{task.patientName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Completed: {task.completedTime}</span>
                    </div>
                    <span>Type: {task.type}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(paths.patient(task.patientId))}
                  >
                    View Patient
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {doctorCompletedTasks.length === 0 && (
          <Card className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No completed tasks</h3>
            <p className="text-muted-foreground">Tasks you complete today will appear here.</p>
          </Card>
        )}
      </div>

      <BottomBar />
    </div>
  );
}

export default CompletedTodayPage;
