import { useState, useEffect, useMemo, useCallback } from "react";
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
import { TaskCard } from "@/components/task/TaskCard";
import { taskService } from "@/services";
import { useAuth } from "@/context/AuthContext";

// Mock data
const mockTasks: Task[] = [
  {
    taskId: "task1",
    patientId: "27e8d1ad",
    title: "Review CBC results",
    type: "lab",
    due: "2025-07-19T15:00:00Z",
    assigneeId: "doctor1",
    status: "open",
    priority: "high",
    recurring: false,
  },
  {
    taskId: "task2",
    patientId: "3b9f2c1e",
    title: "Administer medication",
    type: "medication",
    due: "2025-07-19T16:30:00Z",
    assigneeId: "nurse1",
    status: "in-progress",
    priority: "urgent",
    recurring: true,
  },
  {
    taskId: "task3",
    patientId: "8c4d5e2f",
    title: "Pre-op assessment",
    type: "assessment",
    due: "2025-07-20T09:00:00Z",
    assigneeId: "doctor2",
    status: "open",
    priority: "medium",
    recurring: false,
  },
];

const kanbanColumns = [
  { id: "open", title: "To Do", color: "bg-muted" },
  { id: "in-progress", title: "In Progress", color: "bg-caution/20" },
  { id: "done", title: "Done", color: "bg-stable/20" },
];

const mockPatients = [
  { id: "P001", name: "John Smith" },
  { id: "P002", name: "Sarah Johnson" },
  { id: "P003", name: "Michael Brown" },
  { id: "P004", name: "Emily Davis" },
  { id: "P005", name: "Robert Wilson" },
];

const mockStaff = [
  { id: "S001", name: "Dr. Sarah Wilson" },
  { id: "S002", name: "Dr. Michael Chen" },
  { id: "S003", name: "Nurse Lisa Johnson" },
  { id: "S004", name: "Dr. Robert Patel" },
  { id: "S005", name: "Nurse Maria Garcia" },
];

export default function Tasks() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | "my-tasks">("all");
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setIsLoading(true);
        const tasksData = await taskService.getTasks();
        setTasks(tasksData);
      } catch (error) {
        console.error("Failed to load tasks:", error);
        setTasks(mockTasks);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, []);

  // Memoized handlers
  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: Task["status"]) => {
      try {
        await taskService.updateTaskStatus(taskId, newStatus);
        setTasks((prev) =>
          prev.map((task) =>
            task.taskId === taskId ? { ...task, status: newStatus } : task,
          ),
        );
      } catch (error) {
        console.error("Failed to update task status:", error);
      }
    },
    [],
  );

  const handleAddTask = useCallback(async (newTask: Omit<Task, "taskId">) => {
    try {
      const createdTask = await taskService.createTask(newTask);
      setTasks((prevTasks) => [...prevTasks, createdTask]);
      setShowAddTaskForm(false);
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  }, []);

  // Memoized filtered tasks
  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;

    // Use actual current user ID instead of hardcoded string
    const currentUserId = currentUser?.doctor?.id || currentUser?.id;
    return tasks.filter((task) => task.assigneeId === currentUserId);
  }, [tasks, filter, currentUser]);

  // Memoized grouped tasks by status
  const groupedTasks = useMemo(() => {
    return kanbanColumns.reduce(
      (acc, column) => {
        acc[column.id] = filteredTasks.filter(
          (task) => task.status === column.id,
        );
        return acc;
      },
      {} as Record<string, Task[]>,
    );
  }, [filteredTasks]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Tasks" />

      <div className="p-4 space-y-4">
        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All Tasks
            </Button>
            <Button
              variant={filter === "my-tasks" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("my-tasks")}
            >
              My Tasks
            </Button>
          </div>

          <Button size="sm" onClick={() => setShowAddTaskForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanColumns.map((column) => (
            <div key={column.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">{column.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  {groupedTasks[column.id]?.length || 0}
                </Badge>
              </div>

              <div
                className={`min-h-[200px] p-3 rounded-lg ${column.color} space-y-2`}
              >
                {groupedTasks[column.id]?.map((task) => (
                  <TaskCard
                    key={task.taskId}
                    task={task}
                    onStatusChange={handleStatusChange}
                  />
                ))}

                {(!groupedTasks[column.id] ||
                  groupedTasks[column.id].length === 0) && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {filteredTasks.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-caution">
              {groupedTasks["in-progress"]?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-stable">
              {groupedTasks["done"]?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-urgent">
              {filteredTasks.filter((t) => t.priority === "urgent").length}
            </div>
            <div className="text-sm text-muted-foreground">Urgent</div>
          </Card>
        </div>
      </div>

      <AddTaskForm
        open={showAddTaskForm}
        onOpenChange={setShowAddTaskForm}
        onAddTask={handleAddTask}
        patients={mockPatients}
        staff={mockStaff}
      />

      <BottomBar />
    </div>
  );
}
