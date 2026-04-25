// Folder card for displaying document category summary
import React from "react";
import type { DocCategory, FolderSummary } from "../model/types";
import { CATEGORY_CONFIG } from "./CategoryConfig";
import { cn } from "@/lib/utils";

interface FolderCardProps {
  summary: FolderSummary;
  onClick?: () => void;
  className?: string;
}

export function FolderCard({ summary, onClick, className }: FolderCardProps) {
  const config = CATEGORY_CONFIG[summary.category];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left flex flex-1 gap-3 rounded-lg border border-gray-200 bg-slate-50 p-4 flex-col",
        "hover:bg-slate-100 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400",
        "transition-all duration-200",
        className
      )}
      aria-label={`Open ${config.title}`}
    >
      <div className={cn("p-2 rounded-full bg-gradient-to-r w-fit", config.bgFrom, config.bgTo)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="text-gray-900 text-base font-bold leading-tight">
          {config.title}
        </h4>
        <p className="text-gray-500 text-sm leading-normal">
          {summary.count} {summary.count === 1 ? "Document" : "Documents"}
        </p>
        {summary.lastUpdatedAt && (
          <p className="text-gray-400 text-xs">
            Updated {new Date(summary.lastUpdatedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </button>
  );
}

interface FolderGridProps {
  summaries: FolderSummary[];
  onOpenFolder: (category: DocCategory) => void;
  className?: string;
}

export function FolderGrid({ summaries, onOpenFolder, className }: FolderGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3",
        className
      )}
    >
      {summaries.map((summary) => (
        <FolderCard
          key={summary.category}
          summary={summary}
          onClick={() => onOpenFolder(summary.category)}
        />
      ))}
    </div>
  );
}
