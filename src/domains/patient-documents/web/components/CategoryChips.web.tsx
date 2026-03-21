// Category chips/tabs for filtering documents
import React from 'react';
import type { DocCategory } from '../../core/types';
import { DOC_CATEGORIES } from '../../core/categories';
import { CATEGORY_CONFIG } from '../categoryConfig.web';
import { cn } from '@/lib/utils';

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
    <div className={cn('flex gap-2 overflow-x-auto pb-2 scrollbar-hide', className)}>
      {categories.map((category) => {
        const config = CATEGORY_CONFIG[category];
        const isSelected = selectedCategory === category;
        const count = category === 'all'
          ? counts
            ? Object.values(counts).reduce((a, b) => a + b, 0)
            : undefined
          : counts?.[category];

        return (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            aria-pressed={isSelected}
            className={cn(
              'flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all',
              isSelected
                ? `border-transparent bg-gradient-to-r ${config.bgFrom} ${config.bgTo} text-white shadow-sm`
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <config.icon className="h-4 w-4" />
            <span>{config.shortLabel}</span>
            {count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-bold',
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
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
