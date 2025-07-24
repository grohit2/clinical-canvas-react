import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPITileProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "urgent" | "stable" | "caution";
  className?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: "border-border",
  urgent: "border-urgent bg-urgent/5",
  stable: "border-stable bg-stable/5",
  caution: "border-caution bg-caution/5",
};

export function KPITile({
  title,
  value,
  icon: Icon,
  trend,
  variant = "default",
  className,
  onClick,
}: KPITileProps) {
  return (
    <Card
      className={cn(
        "p-6 transition-all hover:shadow-md",
        onClick && "cursor-pointer hover:scale-105",
        variantStyles[variant],
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-sm font-medium mt-1",
                trend.isPositive ? "text-stable" : "text-urgent",
              )}
            >
              {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div
          className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            variant === "urgent" && "bg-urgent text-urgent-foreground",
            variant === "stable" && "bg-stable text-stable-foreground",
            variant === "caution" && "bg-caution text-caution-foreground",
            variant === "default" && "bg-medical text-medical-foreground",
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}
