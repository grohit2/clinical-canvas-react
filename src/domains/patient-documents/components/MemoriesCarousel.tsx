// Horizontal scrolling category cards - styled like Google Photos "Memories"
import React from "react";
import type { DocCategory, FolderSummary } from "../core/types";
import { CATEGORY_CONFIG } from "../core/CategoryConfig";
import { cn } from "@/lib/utils";

interface MemoriesCarouselProps {
  summaries: FolderSummary[];
  onOpenCategory: (category: DocCategory) => void;
  className?: string;
}

export function MemoriesCarousel({
  summaries,
  onOpenCategory,
  className,
}: MemoriesCarouselProps) {
  const nonEmpty = summaries.filter((s) => s.count > 0);
  if (nonEmpty.length === 0) return null;

  return (
    <div className={cn("py-4", className)}>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
        {nonEmpty.map((summary) => {
          const config = CATEGORY_CONFIG[summary.category];
          const Icon = config.icon;

          return (
            <button
              key={summary.category}
              onClick={() => onOpenCategory(summary.category)}
              className="flex-shrink-0 snap-start group"
            >
              <div
                className={cn(
                  "relative w-28 h-40 rounded-2xl overflow-hidden",
                  "bg-gradient-to-br shadow-sm",
                  config.bgFrom,
                  config.bgTo
                )}
              >
                {/* Icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <Icon className="h-16 w-16 text-white" />
                </div>

                {/* Bottom label */}
                <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/50 to-transparent">
                  <p className="text-white text-xs font-semibold leading-tight">
                    {config.shortLabel}
                  </p>
                  <p className="text-white/70 text-[10px] mt-0.5">
                    {summary.count} {summary.count === 1 ? "item" : "items"}
                  </p>
                </div>

                {/* Ring on hover */}
                <div className="absolute inset-0 rounded-2xl ring-0 group-hover:ring-2 ring-white/60 transition-all" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
