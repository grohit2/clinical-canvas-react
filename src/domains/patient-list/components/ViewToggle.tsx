import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  mode: "list" | "grid";
  onChange: (mode: "list" | "grid") => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-md bg-muted p-1">
      <button
        type="button"
        aria-label="List view"
        onClick={() => onChange("list")}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded",
          mode === "list" && "bg-background shadow"
        )}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Grid view"
        onClick={() => onChange("grid")}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded",
          mode === "grid" && "bg-background shadow"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}

