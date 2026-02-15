import type { TaskCreateInput, TaskEntity, TaskLedgerState, TaskPatch } from '../types';

export const TASK_COL_MAP: Record<string, string> = {
  wardId: 'ward_id',
  patientId: 'patient_id',
  requesterId: 'requester_id',
  ownerId: 'owner_id',
  workflowStatus: 'workflow_status',
  businessStatus: 'business_status',
  name: 'name',
  priority: 'priority',
  time: 'time',
  day: 'day',
  recurrence: 'recurrence',
  locationId: 'location_id',
  placeText: 'place_text',
  type: 'type',
  notes: 'notes',
  completedAt: 'completed_at',
  sortOrder: 'sort_order',
  origin: 'origin',
  originKey: 'origin_key',
  version: 'version',
  updatedBy: 'updated_by',
  deletedAt: 'deleted_at',
  updatedAt: 'updated_at',
  id: 'id',
  title: 'title',
  description: 'description',
  status: 'status',
  dueDate: 'due_date',
  patientName: 'patient_name',
  assigneeId: 'assignee_id',
  assigneeName: 'assignee_name',
  departmentId: 'department_id',
  createdAt: 'created_at',
};

function normalizePatch(patch: TaskPatch): TaskPatch {
  const output: TaskPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in TASK_COL_MAP)) {
      continue;
    }
    if (value === undefined) {
      continue;
    }
    (output as Record<string, unknown>)[key] = value;
  }
  return output;
}

export function insertTask(state: TaskLedgerState, input: TaskCreateInput): TaskEntity {
  const existing = state.tasks[input.id];
  if (existing && !existing.deletedAt) {
    throw new Error(`Task already exists: ${input.id}`);
  }

  const row: TaskEntity = {
    id: input.id,
    title: input.title,
    description: input.description ?? '',
    priority: input.priority ?? 'medium',
    status: input.status ?? 'pending',
    dueDate: input.dueDate ?? null,
    patientId: input.patientId ?? null,
    patientName: input.patientName ?? null,
    assigneeId: input.assigneeId ?? null,
    assigneeName: input.assigneeName ?? null,
    departmentId: input.departmentId ?? null,
    completedAt: input.completedAt ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    version: 1,
    updatedBy: input.updatedBy ?? null,
    deletedAt: input.deletedAt ?? null,
    sortOrder: input.sortOrder ?? 0,
    origin: input.origin ?? 'manual',
    originKey: input.originKey ?? null,
  };

  state.tasks[input.id] = row;
  return row;
}

export function updateTask(
  state: TaskLedgerState,
  params: {
    id: string;
    baseVersion: number;
    patch: TaskPatch;
    actorId?: string | null;
    updatedAt: string;
  },
): TaskEntity {
  const current = state.tasks[params.id];
  if (!current || current.deletedAt) {
    throw new Error('Version conflict or task not found');
  }

  if (current.version !== params.baseVersion) {
    throw new Error('Version conflict or task not found');
  }

  const cleanPatch = normalizePatch(params.patch);
  const nextVersion = params.baseVersion + 1;

  const updated: TaskEntity = {
    ...current,
    ...cleanPatch,
    version: nextVersion,
    updatedBy: params.actorId ?? null,
    updatedAt: params.updatedAt,
  };

  state.tasks[params.id] = updated;
  return updated;
}
