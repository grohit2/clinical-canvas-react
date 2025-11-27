import { ArrowLeft, Search, Plus, Bell, User } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showSearch?: boolean;
  showAdd?: boolean;
  onBack?: () => void;
  onAdd?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  notificationCount?: number;
  onNotificationClick?: () => void;

  /** NEW: hide the title completely (for patient detail Figma) */
  hideTitle?: boolean;

  /** NEW: control whether the bell is shown at all */
  showBell?: boolean;

  /** Optional className passthrough */
  className?: string;
}

export function Header({
  title,
  showBack = false,
  showSearch = false,
  showAdd = false,
  onBack,
  onAdd,
  searchValue = "",
  onSearchChange,
  notificationCount = 0,
  onNotificationClick,
  hideTitle = false,
  showBell = true,
  className = "",
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className={`h-14 border-b bg-card flex items-center justify-between px-4 ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        {!hideTitle && (
          <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {showSearch && (
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        )}

        {showAdd && title === "Patients" && (
          <Button onClick={onAdd} size="sm" className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Add Patient</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}

        {showBell && (
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={onNotificationClick} aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            {notificationCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-urgent text-urgent-foreground text-xs">
                {notificationCount > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} aria-label="Profile">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
