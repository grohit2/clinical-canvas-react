import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, User, Clock, Calendar } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

// Mock completed tasks data for today
const mockCompletedTasks = [
  {
    id: '1',
    patientId: '2a1b3c4d',
    patientName: 'John Smith',
    taskType: 'Pre-op Assessment',
    completedTime: '2025-07-23T10:30:00Z',
    completedBy: 'Dr. Sarah Wilson',
    description: 'Completed pre-operative assessment and clearance'
  },
  {
    id: '2',
    patientId: '3b9f2c1e',
    patientName: 'Maria Garcia',
    taskType: 'Wound Care',
    completedTime: '2025-07-23T11:15:00Z',
    completedBy: 'Dr. Sarah Wilson',
    description: 'Post-operative wound care and dressing change'
  },
  {
    id: '3',
    patientId: '7c8d9e0f',
    patientName: 'David Johnson',
    taskType: 'Medication Review',
    completedTime: '2025-07-23T12:00:00Z',
    completedBy: 'Dr. Sarah Wilson',
    description: 'Reviewed and adjusted pain medication dosage'
  },
  {
    id: '4',
    patientId: '9d6e7f3g',
    patientName: 'Sarah Miller',
    taskType: 'Vital Signs Check',
    completedTime: '2025-07-23T13:30:00Z',
    completedBy: 'Dr. Sarah Wilson',
    description: 'Routine vital signs monitoring - stable'
  }
];

export default function CompletedToday() {
  const { currentDoctor } = useAuth();
  const navigate = useNavigate();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getTaskTypeColor = (taskType: string) => {
    switch (taskType.toLowerCase()) {
      case 'pre-op assessment': return 'text-caution';
      case 'wound care': return 'text-medical';
      case 'medication review': return 'text-stable';
      case 'vital signs check': return 'text-stable';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Completed Today" 
        notificationCount={0}
        showBack
        onBack={() => navigate('/')}
      />
      
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stable">Today's Completed Tasks</h2>
            <p className="text-sm text-muted-foreground">
              {mockCompletedTasks.length} tasks completed on {new Date().toLocaleDateString()}
            </p>
          </div>
          <Badge variant="outline" className="bg-stable/10 text-stable border-stable/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        </div>

        <div className="space-y-3">
          {mockCompletedTasks.map((task) => (
            <Card key={task.id} className="p-4 border-stable/20 bg-stable/5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{task.patientName}</span>
                    <Badge variant="outline" className="text-xs bg-stable/10 text-stable border-stable/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Done
                    </Badge>
                  </div>
                  <h3 className={`font-semibold mb-1 ${getTaskTypeColor(task.taskType)}`}>
                    {task.taskType}
                  </h3>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3" />
                    {formatTime(task.completedTime)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    by {task.completedBy}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${task.patientId}`)}>
                  View Patient
                </Button>
                <Button variant="ghost" size="sm">
                  View Details
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