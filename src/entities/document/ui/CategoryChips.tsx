// Category chips/tabs for filtering documents
import React from "react";
import type { DocCategory } from "../model/types";
import { DOC_CATEGORIES } from "../model/types";
import { CATEGORY_CONFIG } from "./CategoryConfig";
import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  selectedCategory: DocCategory | "all";
  onSelectCategory: (category: DocCategory | "all") => void;
  counts?: Record<DocCategory, number>;
  showAll?: boolean;
  className?: string;
}

export function CategoryChips({
  selectedCategory,
  onSelectCategory,
  counts,
  showAll = true,
  className,
}: CategoryChipsProps) {
  const categories: (DocCategory | "all")[] = showAll
    ? ["all", ...DOC_CATEGORIES]
    : DOC_CATEGORIES;

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2 scrollbar-hide", className)}>
      {categories.map((category) => {
        const config = CATEGORY_CONFIG[category];
        const isSelected = selectedCategory === category;
        const count = category === "all"
          ? counts
            ? Object.values(counts).reduce((a, b) => a + b, 0)
            : undefined
          : counts?.[category];

        return (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              isSelected
                ? `bg-gradient-to-r ${config.bgFrom} ${config.bgTo} text-white shadow-sm`
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            <config.icon className="h-4 w-4" />
            <span>{config.shortLabel}</span>
            {count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs",
                  isSelected ? "bg-white/20" : "bg-gray-200"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
