import type { Task } from '../core/types';
import {
  DOCTORS,
  GROUP_COLORS,
  NURSES,
  initialsFromName,
  mapTaskPriorityToBoardPriority,
  mapTaskStatusToBoardStatus,
} from '../hospital-board/constants';
import type {
  ActivityLike,
  BuildTaskBoardOptions,
  PatientLookup,
  TaskBoardAuditRow,
  TaskBoardMetrics,
  TaskBoardModel,
  TaskBoardPerson,
  TaskBoardRow,
  TaskBoardSection,
} from './types';

function hashString(value: string): number {
  let out = 0;
  for (let i = 0; i < value.length; i += 1) {
    out = (out * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(out);
}

function resolveSectionTitle(task: Task): string {
  if (task.departmentId && task.departmentId.trim().length > 0) {
    return task.departmentId.trim();
  }
  return 'General Ward';
}

function toDueLabel(dueDate: string | undefined): string {
  if (!dueDate) {
    return '--';
  }

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) {
    return '--';
  }

  return due.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveDoctor(task: Task): TaskBoardPerson {
  const requested = task.doctorName?.trim() ?? '';
  const exact = DOCTORS.find((doctor) => doctor.name === requested);

  if (exact) {
    return {
      name: exact.name,
      initials: exact.initials,
      color: exact.color,
    };
  }

  const fallback = DOCTORS[hashString(`${task.id}:doctor`) % DOCTORS.length];
  const name = requested.length > 0 ? requested : fallback.name;

  return {
    name,
    initials: requested.length > 0 ? initialsFromName(requested) : fallback.initials,
    color: fallback.color,
  };
}

function resolveNurse(task: Task): TaskBoardPerson {
  const requested = task.nurseName?.trim() ?? task.assigneeName?.trim() ?? '';
  const exact = NURSES.find((nurse) => nurse.name === requested);

  if (exact) {
    return {
      name: exact.name,
      initials: exact.initials,
      color: exact.color,
    };
  }

  const fallback = NURSES[hashString(`${task.id}:nurse`) % NURSES.length];
  const name = requested.length > 0 ? requested : fallback.name;

  return {
    name,
    initials: requested.length > 0 ? initialsFromName(requested) : fallback.initials,
    color: fallback.color,
  };
}

function inferScheduleTime(task: Task): string {
  if (task.scheduleTime && task.scheduleTime.length > 0) {
    return task.scheduleTime;
  }

  if (!task.dueDate) {
    return '--:--';
  }

  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) {
    return '--:--';
  }

  return due.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function inferScheduleDay(task: Task): string {
  if (task.scheduleDay && task.scheduleDay.length > 0) {
    return task.scheduleDay;
  }

  if (!task.dueDate) {
    return '--';
  }

  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) {
    return '--';
  }

  return due.toLocaleDateString('en-US', { weekday: 'long' });
}

function isUrgent(task: Task): boolean {
  if (task.priority === 'urgent') {
    return true;
  }

  return task.boardStatusLabel === 'Urgent';
}

function statusRank(status: Task['status']): number {
  switch (status) {
    case 'in_progress':
      return 0;
    case 'pending':
      return 1;
    case 'completed':
      return 2;
    case 'cancelled':
      return 3;
    default:
      return 99;
  }
}

function priorityRank(priority: Task['priority']): number {
  switch (priority) {
    case 'urgent':
      return 0;
    case 'high':
      return 1;
    case 'medium':
      return 2;
    case 'low':
      return 3;
    default:
      return 99;
  }
}

function dueTime(value: string | null): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }
  const at = new Date(value).getTime();
  return Number.isNaN(at) ? Number.MAX_SAFE_INTEGER : at;
}

function mapTaskToRow(task: Task, patientLookup: PatientLookup): TaskBoardRow {
  const patientNameFromLookup = task.patientId ? patientLookup[task.patientId] : undefined;
  const patientName = task.patientName || patientNameFromLookup || 'Unassigned Patient';

  const doctor = resolveDoctor(task);
  const nurse = resolveNurse(task);

  const sectionTitle = resolveSectionTitle(task);
  const sectionId = sectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const boardStatusLabel = mapTaskStatusToBoardStatus(task.status, task.boardStatusLabel);

  return {
    id: task.id,
    title: task.title,
    patientName,
    doctor,
    nurse,
    status: task.status,
    priority: task.priority,
    boardStatusLabel,
    priorityLabel: mapTaskPriorityToBoardPriority(task.priority),
    dueDate: task.dueDate ?? null,
    dueLabel: toDueLabel(task.dueDate),
    scheduleTime: inferScheduleTime(task),
    scheduleDay: inferScheduleDay(task),
    recurrence: task.recurrence ?? 'None',
    placeText: task.placeText ?? '—',
    taskType: task.taskType ?? 'Task',
    sectionId,
    sectionTitle,
    urgent: isUrgent(task),
    source: task,
  };
}

function applyFilter(rows: TaskBoardRow[], filter: BuildTaskBoardOptions['filter']): TaskBoardRow[] {
  switch (filter) {
    case 'urgent':
      return rows.filter((row) => row.urgent);
    case 'in_progress':
      return rows.filter((row) => row.status === 'in_progress');
    case 'scheduled':
      return rows.filter((row) => row.status === 'pending');
    case 'completed':
      return rows.filter((row) => row.status === 'completed');
    case 'all':
    default:
      return rows;
  }
}

function applySort(rows: TaskBoardRow[], sortMode: BuildTaskBoardOptions['sortMode']): TaskBoardRow[] {
  const copy = [...rows];

  if (sortMode === 'priority') {
    return copy.sort((a, b) => {
      const p = priorityRank(a.priority) - priorityRank(b.priority);
      if (p !== 0) {
        return p;
      }
      return dueTime(a.dueDate) - dueTime(b.dueDate);
    });
  }

  if (sortMode === 'time') {
    return copy.sort((a, b) => {
      const t = dueTime(a.dueDate) - dueTime(b.dueDate);
      if (t !== 0) {
        return t;
      }
      return a.title.localeCompare(b.title);
    });
  }

  return copy.sort((a, b) => {
    const s = statusRank(a.status) - statusRank(b.status);
    if (s !== 0) {
      return s;
    }
    return dueTime(a.dueDate) - dueTime(b.dueDate);
  });
}

function buildSections(rows: TaskBoardRow[], sectionOrder: Map<string, number>): TaskBoardSection[] {
  const grouped = new Map<string, TaskBoardRow[]>();

  for (const row of rows) {
    const arr = grouped.get(row.sectionId) ?? [];
    arr.push(row);
    grouped.set(row.sectionId, arr);
  }

  const sections: TaskBoardSection[] = [];
  const keys = [...grouped.keys()].sort(
    (a, b) => (sectionOrder.get(a) ?? Number.MAX_SAFE_INTEGER) - (sectionOrder.get(b) ?? Number.MAX_SAFE_INTEGER),
  );

  keys.forEach((key, index) => {
    const sectionRows = grouped.get(key) ?? [];
    sections.push({
      id: key,
      title: sectionRows[0]?.sectionTitle ?? 'General Ward',
      color: GROUP_COLORS[index % GROUP_COLORS.length],
      rows: sectionRows,
      urgentCount: sectionRows.filter((row) => row.urgent).length,
      total: sectionRows.length,
    });
  });

  return sections;
}

export function deriveTaskBoardMetrics(tasks: Task[]): TaskBoardMetrics {
  return {
    total: tasks.length,
    urgent: tasks.filter((task) => isUrgent(task)).length,
    active: tasks.filter((task) => task.status === 'in_progress').length,
    scheduled: tasks.filter((task) => task.status === 'pending').length,
    done: tasks.filter((task) => task.status === 'completed').length,
  };
}

function isSameDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function splitReminders(rows: TaskBoardRow[], now: Date) {
  const today: TaskBoardRow[] = [];
  const upcoming: TaskBoardRow[] = [];

  for (const row of rows) {
    if (!row.dueDate) {
      continue;
    }
    const due = new Date(row.dueDate);
    if (Number.isNaN(due.getTime()) || row.status === 'completed') {
      continue;
    }
    if (isSameDay(due, now)) {
      today.push(row);
    } else if (due.getTime() > now.getTime()) {
      upcoming.push(row);
    }
  }

  today.sort((a, b) => dueTime(a.dueDate) - dueTime(b.dueDate));
  upcoming.sort((a, b) => dueTime(a.dueDate) - dueTime(b.dueDate));

  return {
    remindersToday: today,
    remindersUpcoming: upcoming.slice(0, 12),
  };
}

export function buildTaskBoardModel(
  tasks: Task[],
  patientLookup: PatientLookup,
  options: BuildTaskBoardOptions,
): TaskBoardModel {
  const allRows = tasks.map((task) => mapTaskToRow(task, patientLookup));
  const sectionOrder = new Map<string, number>();

  allRows.forEach((row, idx) => {
    if (!sectionOrder.has(row.sectionId)) {
      sectionOrder.set(row.sectionId, idx);
    }
  });

  const filteredRows = applySort(applyFilter(allRows, options.filter), options.sortMode ?? 'default');
  const sections = buildSections(filteredRows, sectionOrder);
  const metrics = deriveTaskBoardMetrics(tasks);
  const { remindersToday, remindersUpcoming } = splitReminders(allRows, options.now ?? new Date());

  return {
    allRows,
    filteredRows,
    sections,
    metrics,
    remindersToday,
    remindersUpcoming,
  };
}

function compactPatch(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed);
    if (entries.length === 0) {
      return 'No field changes';
    }
    return entries
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(' | ');
  } catch {
    return 'Invalid patch payload';
  }
}

export function buildAuditRows(
  ops: ActivityLike[],
  tasksById: Record<string, { title?: string }>,
): TaskBoardAuditRow[] {
  return [...ops]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((op, index) => {
      const title = tasksById[op.entityId]?.title || `Task ${op.entityId}`;
      return {
        id: op.opId ?? `${op.entityId}_${op.createdAt}_${index}`,
        title: `${op.opType.toUpperCase()} · ${title}`,
        detail: op.reason || compactPatch(op.patchJson),
        at: op.createdAt,
        opType: op.opType,
        actorId: op.actorId,
      };
    });
}

// Patient-centric board view
export interface PatientEntry {
  id: string;
  name: string;
}

/**
 * Creates a TableGroupNative-compatible section for every patient,
 * even those with zero tasks. Pinned patients sort to the top.
 *
 * Match order:
 *  1. task.source.patientId === patient.id
 *  2. task.patientName === patient.name (fallback for demo-seed data)
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
    const resolvedId =
      row.source.patientId || nameToId.get(row.patientName.trim().toLowerCase()) || null;

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
      title: isPinned ? `⭐ ${patient.name}` : patient.name,
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
