import { Home, Users, CheckSquare } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navigationItems = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/patients", icon: Users, label: "Patients" },
  { path: "/tasks", icon: CheckSquare, label: "Tasks" },
];

export function BottomBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-around px-4">
      {navigationItems.map(({ path, icon: Icon, label }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors",
              isActive
                ? "text-medical bg-medical-muted"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )
          }
        >
          <Icon className="h-5 w-5" />
          <span className="text-xs font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
