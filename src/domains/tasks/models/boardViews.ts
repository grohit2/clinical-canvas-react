import { GROUP_COLORS } from '../core/constants';
import { PRIORITY_TONES } from '../core/statuses';
import type { TaskBoardRow, TaskBoardSection } from './types';

export interface PatientEntry {
  id: string;
  name: string;
}

export type BoardViewMode = 'ward' | 'patient' | 'doctor' | 'place' | 'day' | 'priority' | 'type';

export const BOARD_VIEW_OPTIONS: Array<{ id: BoardViewMode; label: string }> = [
  { id: 'ward', label: 'Ward' },
  { id: 'patient', label: 'Patient' },
  { id: 'doctor', label: 'Doctor' },
  { id: 'place', label: 'Place' },
  { id: 'day', label: 'Day' },
  { id: 'priority', label: 'Priority' },
  { id: 'type', label: 'Type' },
];

const DAY_SORT_INDEX: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

const PRIORITY_SORT_INDEX: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

function sanitizeLabel(value: string | null | undefined, fallback = 'Unassigned'): string {
  const next = value?.trim();
  return next && next.length > 0 ? next : fallback;
}

export function buildViewSections(rows: TaskBoardRow[], viewMode: BoardViewMode): TaskBoardSection[] {
  const grouped = new Map<string, TaskBoardRow[]>();

  for (const row of rows) {
    const key =
      viewMode === 'ward'
        ? sanitizeLabel(row.sectionTitle, 'General Ward')
        : viewMode === 'patient'
          ? sanitizeLabel(row.patientName, 'Unassigned Patient')
          : viewMode === 'doctor'
            ? sanitizeLabel(row.doctor.name, 'Unassigned Doctor')
            : viewMode === 'place'
              ? sanitizeLabel(row.placeText, 'Unassigned Place')
              : viewMode === 'day'
                ? sanitizeLabel(row.scheduleDay, 'Unscheduled')
                : viewMode === 'priority'
                  ? sanitizeLabel(row.priorityLabel, 'Medium')
                  : sanitizeLabel(row.taskType, 'Task');

    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  const entries = [...grouped.entries()];
  entries.sort(([left], [right]) => {
    if (viewMode === 'day') {
      return (DAY_SORT_INDEX[left] ?? Number.MAX_SAFE_INTEGER) - (DAY_SORT_INDEX[right] ?? Number.MAX_SAFE_INTEGER);
    }

    if (viewMode === 'priority') {
      return (PRIORITY_SORT_INDEX[left] ?? Number.MAX_SAFE_INTEGER) - (PRIORITY_SORT_INDEX[right] ?? Number.MAX_SAFE_INTEGER);
    }

    return left.localeCompare(right);
  });

  return entries.map(([title, sectionRows], index) => {
    const color =
      viewMode === 'priority'
        ? (PRIORITY_TONES[title]?.bg ?? GROUP_COLORS[index % GROUP_COLORS.length])
        : GROUP_COLORS[index % GROUP_COLORS.length];

    return {
      id: `${viewMode}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${index}`,
      title,
      color,
      rows: sectionRows,
      urgentCount: sectionRows.filter((row) => row.urgent).length,
      total: sectionRows.length,
    };
  });
}

/**
 * Creates a section for each patient, even when the patient currently has no tasks.
 * Pinned patients sort to the top.
 */
export function buildPatientViewSections(
  rows: TaskBoardRow[],
  patients: readonly PatientEntry[],
  pinnedPatientIds: readonly string[],
): TaskBoardSection[] {
  const pinnedSet = new Set(pinnedPatientIds);

  const nameToId = new Map<string, string>();
  for (const patient of patients) {
    const key = patient.name.trim().toLowerCase();
    if (!nameToId.has(key)) {
      nameToId.set(key, patient.id);
    }
  }

  const bucketById = new Map<string, TaskBoardRow[]>();
  const unmatched: TaskBoardRow[] = [];

  for (const row of rows) {
    const resolvedId = row.source.patientId || nameToId.get(row.patientName.trim().toLowerCase()) || null;

    if (resolvedId) {
      const bucket = bucketById.get(resolvedId) ?? [];
      bucket.push(row);
      bucketById.set(resolvedId, bucket);
    } else {
      unmatched.push(row);
    }
  }

  const sortedPatients = [...patients].sort((left, right) => {
    const leftPinned = pinnedSet.has(left.id);
    const rightPinned = pinnedSet.has(right.id);

    if (leftPinned !== rightPinned) {
      return leftPinned ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });

  const sections: TaskBoardSection[] = [];

  sortedPatients.forEach((patient, index) => {
    const sectionRows = bucketById.get(patient.id) ?? [];
    const isPinned = pinnedSet.has(patient.id);

    sections.push({
      id: `patient_${patient.id}`,
      title: isPinned ? `Pinned: ${patient.name}` : patient.name,
      color: isPinned ? '#3b82f6' : GROUP_COLORS[index % GROUP_COLORS.length],
      rows: sectionRows,
      urgentCount: sectionRows.filter((row) => row.urgent).length,
      total: sectionRows.length,
    });
  });

  if (unmatched.length > 0) {
    const unmatchedGrouped = new Map<string, TaskBoardRow[]>();

    for (const row of unmatched) {
      const key = row.patientName || 'Unassigned Patient';
      const bucket = unmatchedGrouped.get(key) ?? [];
      bucket.push(row);
      unmatchedGrouped.set(key, bucket);
    }

    [...unmatchedGrouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([name, sectionRows], index) => {
        sections.push({
          id: `patient_unmatched_${index}`,
          title: name,
          color: GROUP_COLORS[(sections.length + index) % GROUP_COLORS.length],
          rows: sectionRows,
          urgentCount: sectionRows.filter((row) => row.urgent).length,
          total: sectionRows.length,
        });
      });
  }

  return sections;
}
