import { describe, expect, it } from 'vitest';
import type { Task } from '../core/types';
import { buildAuditRows, buildTaskBoardModel, deriveTaskBoardMetrics } from './selectors';

const BASE_TASK: Task = {
  id: 't1',
  title: 'Vitals check',
  description: '',
  priority: 'medium',
  status: 'pending',
  dueDate: '2026-02-16T10:00:00.000Z',
  patientId: 'p1',
  patientName: undefined,
  assigneeId: 'a1',
  assigneeName: 'Nurse A',
  departmentId: 'A',
  doctorName: 'Dr. Patel',
  nurseName: 'RN Sarah M.',
  taskType: 'Vital Signs',
  placeText: 'Room 101',
  recurrence: 'Daily',
  scheduleDay: 'Monday',
  scheduleTime: '08:00',
  boardStatusLabel: 'In Progress',
  createdAt: '2026-02-16T09:00:00.000Z',
  updatedAt: '2026-02-16T09:00:00.000Z',
  completedAt: undefined,
};

describe('task board selectors', () => {
  it('builds deterministic sections and patient fallback names', () => {
    const second: Task = {
      ...BASE_TASK,
      id: 't2',
      title: 'Medication reconciliation',
      patientId: 'p2',
      priority: 'urgent',
      status: 'in_progress',
      departmentId: 'B',
    };

    const model = buildTaskBoardModel([BASE_TASK, second], { p1: 'John', p2: 'Sarah' }, { filter: 'all' });

    expect(model.allRows).toHaveLength(2);
    expect(model.sections).toHaveLength(2);
    expect(model.allRows.find((row) => row.id === 't1')?.patientName).toBe('John');
    expect(model.allRows.find((row) => row.id === 't2')?.urgent).toBe(true);
    expect(model.allRows.find((row) => row.id === 't1')?.doctor.name).toBe('Dr. Patel');
    expect(model.allRows.find((row) => row.id === 't1')?.scheduleTime).toBe('08:00');
    expect(model.allRows.find((row) => row.id === 't1')?.taskType).toBe('Vital Signs');
  });

  it('filters by status and priority semantics', () => {
    const rows = [
      BASE_TASK,
      { ...BASE_TASK, id: 't2', status: 'completed', priority: 'low' as const },
      {
        ...BASE_TASK,
        id: 't3',
        status: 'in_progress',
        priority: 'high' as const,
        boardStatusLabel: 'Urgent',
      },
    ];

    const scheduled = buildTaskBoardModel(rows, {}, { filter: 'scheduled' });
    const completed = buildTaskBoardModel(rows, {}, { filter: 'completed' });
    const urgent = buildTaskBoardModel(rows, {}, { filter: 'urgent' });

    expect(scheduled.filteredRows.map((row) => row.id)).toEqual(['t1']);
    expect(completed.filteredRows.map((row) => row.id)).toEqual(['t2']);
    expect(urgent.filteredRows.map((row) => row.id)).toEqual(['t3']);
  });

  it('derives metrics and audit rows', () => {
    const tasks: Task[] = [
      BASE_TASK,
      { ...BASE_TASK, id: 't2', status: 'in_progress', priority: 'urgent' },
      { ...BASE_TASK, id: 't3', status: 'completed', priority: 'low' },
    ];

    const metrics = deriveTaskBoardMetrics(tasks);
    expect(metrics).toEqual({ total: 3, urgent: 1, active: 1, scheduled: 1, done: 1 });

    const audit = buildAuditRows(
      [
        {
          opId: 'op_2',
          entityId: 't2',
          opType: 'update',
          patchJson: '{"status":"completed"}',
          reason: null,
          actorId: 'actor_1',
          createdAt: '2026-02-16T10:02:00.000Z',
        },
        {
          opId: 'op_1',
          entityId: 't1',
          opType: 'create',
          patchJson: '{"title":"Vitals check"}',
          reason: 'Created from board',
          actorId: 'actor_1',
          createdAt: '2026-02-16T10:01:00.000Z',
        },
      ],
      {
        t1: { title: 'Vitals check' },
        t2: { title: 'Medication reconciliation' },
      },
    );

    expect(audit[0].id).toBe('op_2');
    expect(audit[0].title).toContain('Medication reconciliation');
    expect(audit[1].detail).toBe('Created from board');
  });
});
