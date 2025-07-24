import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import { Task } from "@/types/models";
import { Clock, User, Calendar, Flag, CheckCircle, PlayCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/utils/mobile";
import { useToast } from "@/hooks/use-toast";

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: Task["status"]) => void;
}

export const TaskCard = React.memo<TaskCardProps>(
  ({ task, onStatusChange }) => {
    const { toast } = useToast();

    const getPriorityColor = (priority: Task["priority"]) => {
      switch (priority) {
        case "urgent":
          return "text-urgent";
        case "high":
          return "text-caution";
        case "medium":
          return "text-medical";
        case "low":
          return "text-muted-foreground";
      }
    };

    const getTypeIcon = (type: Task["type"]) => {
      switch (type) {
        case "lab":
          return "🧪";
        case "medication":
          return "💊";
        case "procedure":
          return "🏥";
        case "assessment":
          return "📋";
        case "discharge":
          return "🚪";
      }
    };

    const formatDueTime = (dueDate: string) => {
      const due = new Date(dueDate);
      const now = new Date();
      const diffMs = due.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 0) return "Overdue";
      if (diffHours < 1) return "Due now";
      if (diffHours < 24) return `${diffHours}h`;
      return `${Math.floor(diffHours / 24)}d`;
    };

    const handleStatusChange = (newStatus: Task["status"], actionLabel: string) => {
      onStatusChange(task.taskId, newStatus);
      triggerHaptic('selection');
      toast({
        variant: "success",
        title: "Task Updated",
        description: `Task ${actionLabel.toLowerCase()}`,
      });
    };

    // Dynamic swipe actions based on current status
    const getSwipeActions = () => {
      const actions = [];

      if (task.status === "open") {
        actions.push({
          id: "start",
          label: "Start",
          icon: <PlayCircle className="h-4 w-4" />,
          color: "bg-blue-500 hover:bg-blue-600",
          onClick: () => handleStatusChange("in-progress", "Started"),
        });
      }

      if (task.status === "open" || task.status === "in-progress") {
        actions.push({
          id: "complete",
          label: "Complete",
          icon: <CheckCircle className="h-4 w-4" />,
          color: "bg-green-500 hover:bg-green-600",
          onClick: () => handleStatusChange("done", "Completed"),
        });
      }

      if (task.status !== "done" && task.status !== "cancelled") {
        actions.push({
          id: "cancel",
          label: "Cancel",
          icon: <XCircle className="h-4 w-4" />,
          color: "bg-red-500 hover:bg-red-600",
          onClick: () => handleStatusChange("cancelled", "Cancelled"),
        });
      }

      return actions;
    };

    const swipeActions = getSwipeActions();

    return (
      <SwipeableCard 
        actions={swipeActions}
        className="mb-3"
      >
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
              {task.status !== "done" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() =>
                    onStatusChange(
                      task.taskId,
                      task.status === "open" ? "in-progress" : "done",
                    )
                  }
                >
                  {task.status === "open" ? "Start" : "Complete"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </SwipeableCard>
    );
  },
);

TaskCard.displayName = "TaskCard";
