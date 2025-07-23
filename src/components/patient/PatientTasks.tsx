import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Task } from "@/types/models";
import { Clock, User, Calendar, Flag, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock tasks data
const mockTasks: Task[] = [
  {
    taskId: 'task1',
    patientId: '27e8d1ad',
    title: 'Review CBC results',
    type: 'lab',
    due: '2025-07-19T15:00:00Z',
    assigneeId: 'doctor1',
    status: 'open',
    priority: 'high',
    recurring: false
  },
  {
    taskId: 'task2',
    patientId: '3b9f2c1e',
    title: 'Administer medication',
    type: 'medication',
    due: '2025-07-19T16:30:00Z',
    assigneeId: 'nurse1',
    status: 'in-progress',
    priority: 'urgent',
    recurring: true
  },
  {
    taskId: 'task3',
    patientId: '27e8d1ad',
    title: 'Pre-op assessment',
    type: 'assessment',
    due: '2025-07-20T09:00:00Z',
    assigneeId: 'doctor2',
    status: 'open',
    priority: 'medium',
    recurring: false
  },
  {
    taskId: 'task4',
    patientId: '27e8d1ad',
    title: 'Post-surgery check',
    type: 'assessment',
    due: '2025-07-19T12:00:00Z',
    assigneeId: 'doctor1',
    status: 'done',
    priority: 'high',
    recurring: false
  }
];

interface PatientTasksProps {
  patientId: string;
}

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
}

function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-urgent';
      case 'high': return 'text-caution';
      case 'medium': return 'text-medical';
      case 'low': return 'text-muted-foreground';
    }
  };

  const getTypeIcon = (type: Task['type']) => {
    switch (type) {
      case 'lab': return '🧪';
      case 'medication': return '💊';
      case 'procedure': return '🏥';
      case 'assessment': return '📋';
      case 'discharge': return '🚪';
    }
  };

  const formatDueTime = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) return 'Overdue';
    if (diffHours < 1) return 'Due now';
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  return (
    <Card className="p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTypeIcon(task.type)}</span>
          <Flag className={cn("h-3 w-3", getPriorityColor(task.priority))} />
          {task.status === 'done' && (
            <CheckCircle2 className="h-3 w-3 text-green-600" />
          )}
        </div>
        <Badge variant="outline" className="text-xs">
          {task.status === 'done' ? 'Completed' : formatDueTime(task.due)}
        </Badge>
      </div>

      <h4 className="font-medium text-sm mb-2">{task.title}</h4>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span>{task.assigneeId}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{new Date(task.due).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-xs">
            {task.assigneeId.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex gap-1">
          {task.status !== 'done' && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={() => onStatusChange(task.taskId, 'done')}
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function PatientTasks({ patientId }: PatientTasksProps) {
  const [tasks, setTasks] = useState(mockTasks);

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(task => 
      task.taskId === taskId ? { ...task, status: newStatus } : task
    ));
  };

  // Filter tasks for the specific patient
  const patientTasks = tasks.filter(task => task.patientId === patientId);
  const pendingTasks = patientTasks.filter(task => task.status !== 'done');
  const completedTasks = patientTasks.filter(task => task.status === 'done');

  return (
    <div className="space-y-4">
      {/* Pending Tasks */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Pending Tasks ({pendingTasks.length})</h4>
        {pendingTasks.length > 0 ? (
          <div className="space-y-3">
            {pendingTasks.map(task => (
              <TaskCard
                key={task.taskId}
                task={task}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-lg border border-dashed">
            No pending tasks for this patient
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Completed Tasks ({completedTasks.length})</h4>
          <div className="space-y-3">
            {completedTasks.map(task => (
              <TaskCard
                key={task.taskId}
                task={task}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}