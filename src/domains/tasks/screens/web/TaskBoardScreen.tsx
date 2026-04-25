import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  Home,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageShell } from '@shared/components/layout/PageShell';
import { TASK_BOARD_FILTERS } from '../../core/constants';
import { isCompletedToday, isDueToday, isUrgent } from '../../core/filters';
import type { TaskPriority, TaskStatus } from '../../core/types';
import { useCreateTask } from '../../hooks/useCreateTask';
import { useMyActionsToday } from '../../hooks/useMyActivity';
import { useTasks } from '../../hooks/useTasks';
import { useUndo } from '../../hooks/useUndo';
import { useDeleteTask, useUpdateTask } from '../../hooks/useUpdateTask';
import { getActiveActorId } from '../../local-ledger/utils/device';
import { buildAuditRows, buildTaskBoardModel } from '../../models/boardModel';
import { buildPatientLookup } from '../../models/patientLookup';
import type { ActivityLike, TaskBoardFilter, TaskBoardRow, TaskBoardTab } from '../../models/types';
import { TaskBottomNav } from '../../components/web/TaskBottomNav';
import { usePatients } from '../../../patient-list/api/usePatients';

function statusLabel(status: TaskBoardRow['status']): string {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return 'Scheduled';
}

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

function toIsoOrUndefined(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function TaskDetailModal({
  row,
  onClose,
}: {
  row: TaskBoardRow;
  onClose: () => void;
}) {
  const updateTask = useUpdateTask(row.id);
  const [draft, setDraft] = useState({
    title: row.source.title,
    description: row.source.description ?? '',
    patientName: row.source.patientName ?? '',
    assigneeName: row.source.assigneeName ?? '',
    departmentId: row.source.departmentId ?? '',
    status: row.source.status,
    priority: row.source.priority,
    dueDateLocal: toDateTimeLocal(row.source.dueDate),
  });

  useEffect(() => {
    setDraft({
      title: row.source.title,
      description: row.source.description ?? '',
      patientName: row.source.patientName ?? '',
      assigneeName: row.source.assigneeName ?? '',
      departmentId: row.source.departmentId ?? '',
      status: row.source.status,
      priority: row.source.priority,
      dueDateLocal: toDateTimeLocal(row.source.dueDate),
    });
  }, [row]);

  const save = async () => {
    await updateTask.mutateAsync({
      title: draft.title.trim() || row.source.title,
      description: draft.description,
      patientName: draft.patientName.trim() || undefined,
      assigneeName: draft.assigneeName.trim() || undefined,
      departmentId: draft.departmentId.trim() || undefined,
      status: draft.status as TaskStatus,
      priority: draft.priority as TaskPriority,
      dueDate: toIsoOrUndefined(draft.dueDateLocal),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900">Task Details</h2>
            <p className="text-xs text-slate-500">Ledger-backed task update</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close task details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</span>
            <input
              aria-label="Task title"
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</span>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, status: event.target.value as TaskStatus }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            >
              <option value="pending">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Priority</span>
            <select
              value={draft.priority}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</span>
            <input
              type="datetime-local"
              value={draft.dueDateLocal}
              onChange={(event) => setDraft((prev) => ({ ...prev, dueDateLocal: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Department</span>
            <input
              value={draft.departmentId}
              onChange={(event) => setDraft((prev) => ({ ...prev, departmentId: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Patient Name</span>
            <input
              value={draft.patientName}
              onChange={(event) => setDraft((prev) => ({ ...prev, patientName: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Assignee</span>
            <input
              value={draft.assigneeName}
              onChange={(event) => setDraft((prev) => ({ ...prev, assigneeName: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 md:col-span-2">
            Assigned board avatars: {row.doctor.name} / {row.nurse.name}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={updateTask.isPending}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {updateTask.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BoardRow({
  row,
  selected,
  onSelect,
}: {
  row: TaskBoardRow;
  selected: boolean;
  onSelect: (row: TaskBoardRow) => void;
}) {
  const updateTask = useUpdateTask(row.id);
  const deleteTask = useDeleteTask(row.id);
  const completed = row.status === 'completed';

  return (
    <tr className={selected ? 'bg-blue-50' : 'bg-white'} onClick={() => onSelect(row)}>
      <td className="border-b border-slate-100 px-2 py-2">
        <button
          type="button"
          className="rounded"
          onClick={(event) => {
            event.stopPropagation();
            updateTask.mutate({ status: completed ? 'pending' : 'completed' });
          }}
          aria-label={`Toggle ${row.title}`}
        >
          {completed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-slate-500" />}
        </button>
      </td>
      <td className="border-b border-slate-100 px-2 py-2">
        <div className="min-w-[220px]">
          <div className={`truncate text-sm font-semibold ${completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
            {row.title}
          </div>
          <div className="truncate text-xs text-slate-500">{row.patientName}</div>
        </div>
      </td>
      <td className="border-b border-slate-100 px-2 py-2 text-center">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: row.doctor.color }}
          title={row.doctor.name}
        >
          {row.doctor.initials}
        </span>
      </td>
      <td className="border-b border-slate-100 px-2 py-2 text-center">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: row.nurse.color }}
          title={row.nurse.name}
        >
          {row.nurse.initials}
        </span>
      </td>
      <td className="border-b border-slate-100 px-2 py-2 text-center text-xs font-semibold text-slate-700">
        {statusLabel(row.status)}
      </td>
      <td className="border-b border-slate-100 px-2 py-2 text-center">
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-rose-50"
          onClick={(event) => {
            event.stopPropagation();
            deleteTask.mutate();
          }}
          disabled={deleteTask.isPending}
          aria-label={`Delete ${row.title}`}
        >
          <Trash2 className="h-4 w-4 text-rose-600" />
        </button>
      </td>
    </tr>
  );
}

type TaskPreset = 'all' | 'due-today' | 'urgent' | 'completed-today';

function toTaskPreset(value: string | null): TaskPreset {
  if (value === 'due-today' || value === 'urgent' || value === 'completed-today') {
    return value;
  }

  return 'all';
}

export function TaskBoardScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const actorId = getActiveActorId() ?? 'anon';
  const preset = toTaskPreset(searchParams.get('preset'));

  const { data: tasks = [], isLoading } = useTasks();
  const { data: patients = [] } = usePatients();
  const { data: activityRows = [] } = useMyActionsToday(actorId);

  const createTask = useCreateTask();
  const undo = useUndo();

  const [activeTab, setActiveTab] = useState<TaskBoardTab>('board');
  const [activeFilter, setActiveFilter] = useState<TaskBoardFilter>('all');
  const [activeDetailRow, setActiveDetailRow] = useState<TaskBoardRow | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  useEffect(() => {
    if (preset === 'urgent') {
      setActiveFilter('urgent');
      return;
    }

    if (preset === 'completed-today') {
      setActiveFilter('completed');
      return;
    }

    if (preset === 'due-today') {
      setActiveFilter('scheduled');
      return;
    }

    setActiveFilter('all');
  }, [preset]);

  const presetTasks = useMemo(() => {
    if (preset === 'due-today') {
      return tasks.filter(isDueToday);
    }

    if (preset === 'urgent') {
      return tasks.filter(isUrgent);
    }

    if (preset === 'completed-today') {
      return tasks.filter(isCompletedToday);
    }

    return tasks;
  }, [preset, tasks]);

  const patientLookup = useMemo(() => buildPatientLookup(patients as unknown[]), [patients]);
  const model = useMemo(
    () => buildTaskBoardModel(presetTasks, patientLookup, { filter: activeFilter }),
    [presetTasks, patientLookup, activeFilter],
  );

  const auditRows = useMemo(() => {
    const taskById = Object.fromEntries(model.allRows.map((row) => [row.id, { title: row.title }]));
    return buildAuditRows(activityRows as ActivityLike[], taskById);
  }, [activityRows, model.allRows]);

  const navTabs = useMemo(
    () => [
      { id: 'back' as const, label: 'Back', icon: <ArrowLeft className="h-4 w-4" /> },
      { id: 'home' as const, label: 'Home', icon: <Home className="h-4 w-4" /> },
      { id: 'board' as const, label: 'Task Board', icon: <ClipboardList className="h-4 w-4" /> },
      {
        id: 'reminders' as const,
        label: 'Reminders',
        icon: <Bell className="h-4 w-4" />,
        badge: model.remindersToday.length || undefined,
      },
      {
        id: 'audit' as const,
        label: 'Audit Log',
        icon: <FileText className="h-4 w-4" />,
        dot: auditRows.length > 0,
      },
    ],
    [auditRows.length, model.remindersToday.length],
  );

  const handleCreate = async () => {
    const title = titleInput.trim();
    if (!title || createTask.isPending) {
      return;
    }

    await createTask.mutateAsync({
      title,
      dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    setTitleInput('');
  };

  const handleBottomTabChange = (tab: TaskBoardTab) => {
    if (tab === 'back') {
      navigate(-1);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <PageShell showBottomBar={false} contentClassName="bg-slate-100">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-900 to-indigo-950 px-4 pb-4 pt-4 shadow-md">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-2xl">🏥</div>
                <h1 className="text-4xl font-black tracking-tight text-white">Task Board</h1>
              </div>
              <p className="mt-1 text-sm text-blue-100">Local ledger powered workflows</p>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
              onClick={() => undo.mutate()}
              disabled={undo.isPending}
            >
              <RotateCcw className="h-4 w-4" /> Undo
            </button>
          </div>

          {activeTab === 'home' ? (
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-4xl font-black text-blue-300">{model.metrics.total}</div>
                <div className="text-sm font-semibold text-slate-200">Total</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-4xl font-black text-rose-300">{model.metrics.urgent}</div>
                <div className="text-sm font-semibold text-slate-200">Urgent</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-4xl font-black text-amber-300">{model.metrics.active}</div>
                <div className="text-sm font-semibold text-slate-200">Active</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-4xl font-black text-emerald-300">{model.metrics.done}</div>
                <div className="text-sm font-semibold text-slate-200">Done</div>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto mt-3 w-full max-w-6xl px-3">
        {activeTab === 'board' ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
              <input
                className="min-w-[240px] flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Add a task"
                value={titleInput}
                onChange={(event) => setTitleInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleCreate();
                  }
                }}
              />
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"
                onClick={() => void handleCreate()}
                disabled={createTask.isPending}
                aria-label="Create task"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-3 shadow-sm">
              {TASK_BOARD_FILTERS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                    activeFilter === chip.id
                      ? 'border-blue-600 bg-blue-100 text-blue-700'
                      : 'border-slate-300 bg-white text-slate-600'
                  }`}
                  onClick={() => setActiveFilter(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
                Loading tasks...
              </div>
            ) : null}

            {!isLoading && model.sections.length === 0 ? (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                <div className="text-2xl font-bold text-slate-600">No tasks yet</div>
                <div className="mt-1 text-sm text-slate-500">Create one using the input above.</div>
              </div>
            ) : null}

            {!isLoading
              ? model.sections.map((section) => (
                  <article key={section.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <h2 className="text-2xl font-black" style={{ color: section.color }}>
                        {section.title}
                      </h2>
                      <span className="text-sm font-semibold text-slate-400">{section.total} tasks</span>
                      {section.urgentCount > 0 ? (
                        <span className="ml-auto rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                          {section.urgentCount} urgent
                        </span>
                      ) : null}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                            <th className="px-2 py-2">Done</th>
                            <th className="px-2 py-2">Task</th>
                            <th className="px-2 py-2 text-center">Doctor</th>
                            <th className="px-2 py-2 text-center">Nurse</th>
                            <th className="px-2 py-2 text-center">Status</th>
                            <th className="px-2 py-2 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((row) => (
                            <BoardRow
                              key={row.id}
                              row={row}
                              selected={row.id === selectedRowId}
                              onSelect={(next) => {
                                setSelectedRowId(next.id);
                                setActiveDetailRow(next);
                              }}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                ))
              : null}
          </section>
        ) : null}

        {activeTab === 'home' ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black text-blue-900">Home Summary</h2>
            <p className="mt-2 text-sm text-slate-700">Total tasks: {model.metrics.total}</p>
            <p className="text-sm text-slate-700">Urgent tasks: {model.metrics.urgent}</p>
            <p className="text-sm text-slate-700">Active tasks: {model.metrics.active}</p>
            <p className="text-sm text-slate-700">Scheduled tasks: {model.metrics.scheduled}</p>
            <p className="text-sm text-slate-700">Completed tasks: {model.metrics.done}</p>
          </section>
        ) : null}

        {activeTab === 'reminders' ? (
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black text-blue-900">Today</h2>
            {model.remindersToday.length === 0 ? (
              <p className="text-sm text-slate-500">No reminders for today.</p>
            ) : (
              model.remindersToday.map((row) => (
                <p key={`today_${row.id}`} className="text-sm text-slate-700">
                  {row.dueLabel} · {row.title}
                </p>
              ))
            )}

            <h2 className="pt-1 text-lg font-black text-blue-900">Upcoming</h2>
            {model.remindersUpcoming.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming reminders.</p>
            ) : (
              model.remindersUpcoming.map((row) => (
                <p key={`up_${row.id}`} className="text-sm text-slate-700">
                  {row.dueLabel} · {row.title}
                </p>
              ))
            )}
          </section>
        ) : null}

        {activeTab === 'audit' ? (
          <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black text-blue-900">Audit Activity</h2>
            {auditRows.length === 0 ? <p className="text-sm text-slate-500">No activity yet.</p> : null}
            {auditRows.map((row) => (
              <article key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-900">{row.title}</p>
                <p className="text-xs text-slate-600">{row.detail}</p>
                <p className="text-xs text-slate-400">{new Date(row.at).toLocaleString()}</p>
              </article>
            ))}
          </section>
        ) : null}
      </main>
      {activeDetailRow ? <TaskDetailModal row={activeDetailRow} onClose={() => setActiveDetailRow(null)} /> : null}

      <TaskBottomNav tabs={navTabs} activeTab={activeTab} onTabChange={handleBottomTabChange} />
    </PageShell>
  );
}

export default TaskBoardScreen;
