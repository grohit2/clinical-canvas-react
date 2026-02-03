// useTaskFilters - Filter and sort state management for task lists

import { useState, useCallback, useMemo } from 'react';
import type { Task, TaskFilter, TaskSort, TaskSortField, TaskSortOrder } from '../core/types';
import { filterTasks } from '../core/filters';
import { sortTasks } from '../core/sorting';

export interface UseTaskFiltersOptions {
  initialFilter?: TaskFilter;
  initialSort?: TaskSort;
}

export function useTaskFilters(tasks: Task[], options: UseTaskFiltersOptions = {}) {
  const [filter, setFilter] = useState<TaskFilter>(options.initialFilter || {});
  const [sort, setSort] = useState<TaskSort>(
    options.initialSort || { field: 'dueDate', order: 'asc' }
  );

  const updateFilter = useCallback((updates: Partial<TaskFilter>) => {
    setFilter((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearFilter = useCallback(() => {
    setFilter({});
  }, []);

  const updateSort = useCallback((field: TaskSortField, order?: TaskSortOrder) => {
    setSort((prev) => ({
      field,
      order: order ?? (prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'),
    }));
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSort((prev) => ({
      ...prev,
      order: prev.order === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const filteredTasks = useMemo(() => {
    return filterTasks(tasks, filter);
  }, [tasks, filter]);

  const sortedTasks = useMemo(() => {
    return sortTasks(filteredTasks, sort);
  }, [filteredTasks, sort]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filter).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== '';
    });
  }, [filter]);

  return {
    // State
    filter,
    sort,
    hasActiveFilters,

    // Computed
    filteredTasks,
    sortedTasks,
    totalCount: tasks.length,
    filteredCount: filteredTasks.length,

    // Actions
    setFilter,
    updateFilter,
    clearFilter,
    setSort,
    updateSort,
    toggleSortOrder,
  };
}
