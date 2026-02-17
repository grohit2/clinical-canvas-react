import type { TaskPriority, TaskStatus } from '../core/types';

export type MutableEntityType = 'task' | 'patient';
export type OpType = 'create' | 'update' | 'delete' | 'undo' | 'automation';

export interface TaskEntity {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  patientId: string | null;
  patientName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  departmentId: string | null;
  doctorName: string | null;
  nurseName: string | null;
  taskType: string | null;
  placeText: string | null;
  recurrence: string | null;
  scheduleDay: string | null;
  scheduleTime: string | null;
  boardStatusLabel: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  version: number;
  updatedBy: string | null;
  deletedAt: string | null;
  sortOrder: number;
  origin: 'manual' | 'automation';
  originKey: string | null;
}

export interface TaskOpRow {
  opId: string;
  opGroupId: string | null;
  entityType: MutableEntityType;
  entityId: string;
  opType: OpType;
  actorId: string | null;
  deviceId: string;
  baseVersion: number;
  resultVersion: number;
  patchJson: string;
  inversePatchJson: string;
  revertsOpId: string | null;
  causedByOpId: string | null;
  reason: string | null;
  createdAt: string;
  createdDayLocal: string;
}

export interface OutboxOpRow {
  opId: string;
  status: 'pending' | 'acked' | 'failed';
}

export interface AutomationRunRow {
  id: string;
  ruleId: string;
  triggerOpId: string;
  status: 'completed' | 'skipped';
  opsCreated: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface TaskLedgerState {
  schemaVersion: 1;
  tasks: Record<string, TaskEntity>;
  ops: TaskOpRow[];
  outboxOps: OutboxOpRow[];
  automationRuns: AutomationRunRow[];
}

export type TaskPatch = Partial<
  Pick<
    TaskEntity,
    | 'id'
    | 'title'
    | 'description'
    | 'priority'
    | 'status'
    | 'dueDate'
    | 'patientId'
    | 'patientName'
    | 'assigneeId'
    | 'assigneeName'
    | 'departmentId'
    | 'doctorName'
    | 'nurseName'
    | 'taskType'
    | 'placeText'
    | 'recurrence'
    | 'scheduleDay'
    | 'scheduleTime'
    | 'boardStatusLabel'
    | 'completedAt'
    | 'deletedAt'
    | 'updatedAt'
    | 'createdAt'
    | 'sortOrder'
    | 'origin'
    | 'originKey'
    | 'version'
    | 'updatedBy'
  >
>;

export interface TaskCreateInput {
  id: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  departmentId?: string | null;
  doctorName?: string | null;
  nurseName?: string | null;
  taskType?: string | null;
  placeText?: string | null;
  recurrence?: string | null;
  scheduleDay?: string | null;
  scheduleTime?: string | null;
  boardStatusLabel?: string | null;
  completedAt?: string | null;
  sortOrder?: number;
  origin?: 'manual' | 'automation';
  originKey?: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string | null;
  deletedAt?: string | null;
}
