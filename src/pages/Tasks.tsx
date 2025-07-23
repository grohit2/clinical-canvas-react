import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Task } from "@/types/models";
import { Clock, User, Calendar, Flag, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddTaskForm } from "@/components/task/AddTaskForm";

// Mock data
const mockTasks: Task[] = [
  {
    taskId: 'task1',
    patientId: '27e8d1ad',
    title: 'Review CBC results',
    type: 'lab',
    due: '2025-07-19T15:00:00Z',
    assigneeId: 'doctor1',
    assigneeRole: 'doctor',
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
    assigneeRole: 'nurse',
    status: 'in-progress',
    priority: 'urgent',
    recurring: true
  },
  {
    taskId: 'task3',
    patientId: '8c4d5e2f',
    title: 'Pre-op assessment',
    type: 'assessment',
    due: '2025-07-20T09:00:00Z',
    assigneeId: 'doctor2',
    assigneeRole: 'doctor',
    status: 'open',
    priority: 'medium',
    recurring: false
  }
];

const kanbanColumns = [
  { id: 'open', title: 'To Do', color: 'bg-muted' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-caution/20' },
  { id: 'done', title: 'Done', color: 'bg-stable/20' }
];

const mockPatients = [
  { id: 'P001', name: 'John Smith' },
  { id: 'P002', name: 'Sarah Johnson' },
  { id: 'P003', name: 'Michael Brown' },
  { id: 'P004', name: 'Emily Davis' },
  { id: 'P005', name: 'Robert Wilson' }
];

const mockStaff = [
  { id: 'S001', name: 'Dr. Sarah Wilson' },
  { id: 'S002', name: 'Dr. Michael Chen' },
  { id: 'S003', name: 'Nurse Lisa Johnson' },
  { id: 'S004', name: 'Dr. Robert Patel' },
  { id: 'S005', name: 'Nurse Maria Garcia' }
];

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
    <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTypeIcon(task.type)}</span>
          <Flag className={cn("h-3 w-3", getPriorityColor(task.priority))} />
        </div>
        <Badge variant="outline" className="text-xs">
          {formatDueTime(task.due)}
        </Badge>
      </div>

      <h4 className="font-medium text-sm mb-2">{task.title}</h4>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span>Patient #{task.patientId.slice(-4)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{new Date(task.due).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
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
              onClick={() => onStatusChange(task.taskId, 
                task.status === 'open' ? 'in-progress' : 'done'
              )}
            >
              {task.status === 'open' ? 'Start' : 'Complete'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState(mockTasks);
  const [filter, setFilter] = useState<'all' | 'my-tasks'>('all');
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(task => 
      task.taskId === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const handleAddTask = (newTask: Omit<Task, 'taskId'>) => {
    const taskWithId = {
      ...newTask,
      taskId: `task_${Date.now()}`
    };
    setTasks(prevTasks => [...prevTasks, taskWithId]);
  };

  const filteredTasks = tasks.filter(task => 
    filter === 'all' || task.assigneeId === 'current-user'
  );

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <Header 
        title="Tasks" 
        notificationCount={4}
      />
      
      <div className="p-4 space-y-4 max-w-full overflow-x-hidden">
        {/* Header with Add Task Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Task Management</h2>
          <Button onClick={() => setShowAddTaskForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Tasks
          </Button>
          <Button
            variant={filter === 'my-tasks' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('my-tasks')}
          >
            My Tasks
          </Button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-full">
          {kanbanColumns.map(column => {
            const columnTasks = filteredTasks.filter(task => task.status === column.id);
            
            return (
              <div key={column.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{column.title}</h3>
                  <Badge variant="secondary">
                    {columnTasks.length}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {columnTasks.map(task => (
                    <TaskCard
                      key={task.taskId}
                      task={task}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
                
                {columnTasks.length === 0 && (
                  <div className={cn(
                    "rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground",
                    column.color
                  )}>
                    No tasks
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AddTaskForm
        open={showAddTaskForm}
        onOpenChange={setShowAddTaskForm}
        onSubmit={handleAddTask}
        patients={mockPatients}
        staff={mockStaff}
      />

      <BottomBar />
    </div>
  );
}