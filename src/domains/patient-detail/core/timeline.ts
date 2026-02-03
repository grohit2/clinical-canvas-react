// Timeline - Pure TypeScript (NO React/RN imports)
// Event sorting, grouping, and formatting

import type { TimelineEvent } from './types';

export interface TimelineGroup {
  date: string;
  events: TimelineEvent[];
}

export function sortEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function groupByDate(events: TimelineEvent[]): TimelineGroup[] {
  const sorted = sortEvents(events);
  const groups: Map<string, TimelineEvent[]> = new Map();

  for (const event of sorted) {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    const existing = groups.get(date) || [];
    groups.set(date, [...existing, event]);
  }

  return Array.from(groups.entries()).map(([date, events]) => ({
    date,
    events,
  }));
}

export function formatTimelineEntry(event: TimelineEvent): string {
  const time = new Date(event.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${time} - ${event.title}`;
}
