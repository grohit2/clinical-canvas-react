import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, AlertCircle, User, FileText } from "lucide-react";

interface Notification {
  id: string;
  type: "urgent" | "update" | "assignment" | "report";
  title: string;
  message: string;
  timestamp: string;
  patientName?: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "urgent",
    title: "Urgent: Patient Status Change",
    message: "Patient moved to ICU - requires immediate attention",
    timestamp: "2025-07-19T16:45:00Z",
    patientName: "John Smith",
    read: false,
  },
  {
    id: "2",
    type: "update",
    title: "Lab Results Available",
    message: "New lab results have been uploaded for review",
    timestamp: "2025-07-19T15:30:00Z",
    patientName: "Jane Doe",
    read: false,
  },
  {
    id: "3",
    type: "assignment",
    title: "New Patient Assignment",
    message: "You have been assigned a new patient",
    timestamp: "2025-07-19T14:15:00Z",
    patientName: "Maria Garcia",
    read: true,
  },
  {
    id: "4",
    type: "report",
    title: "Daily Report Generated",
    message: "Your daily patient summary report is ready",
    timestamp: "2025-07-19T12:00:00Z",
    read: true,
  },
];

interface NotificationsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsPopup({
  open,
  onOpenChange,
}: NotificationsPopupProps) {
  const [notifications, setNotifications] = useState(mockNotifications);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true })),
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "urgent":
        return <AlertCircle className="h-4 w-4 text-urgent" />;
      case "update":
        return <FileText className="h-4 w-4 text-primary" />;
      case "assignment":
        return <User className="h-4 w-4 text-blue-500" />;
      case "report":
        return <FileText className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getNotificationBadgeVariant = (type: string) => {
    switch (type) {
      case "urgent":
        return "destructive";
      case "update":
        return "default";
      case "assignment":
        return "secondary";
      case "report":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Notifications</DialogTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-sm"
              >
                Mark all read
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-1 overflow-y-auto max-h-[60vh]">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map((notification, index) => (
              <div key={notification.id}>
                <div
                  className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                    !notification.read ? "bg-accent/50" : ""
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className={`text-sm font-medium ${!notification.read ? "font-semibold" : ""}`}
                        >
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {notification.patientName && (
                            <Badge variant="outline" className="text-xs">
                              {notification.patientName}
                            </Badge>
                          )}
                          <Badge
                            variant={getNotificationBadgeVariant(
                              notification.type,
                            )}
                            className="text-xs"
                          >
                            {notification.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(notification.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {index < notifications.length - 1 && (
                  <Separator className="my-1" />
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
