import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useCreateTask } from '../api/useCreateTask';
import { useMyActionsToday } from '../api/useMyActivity';
import { useTasks } from '../api/useTasks';
import { useUndo } from '../api/useUndo';
import { useDeleteTask, useUpdateTask } from '../api/useUpdateTask';
import { TASK_BOARD_FILTERS } from '../board/constants';
import { buildPatientLookup } from '../board/patientLookup';
import { buildAuditRows, buildTaskBoardModel } from '../board/selectors';
import type { ActivityLike, TaskBoardFilter, TaskBoardRow, TaskBoardTab } from '../board/types';
import { getActiveActorId } from '../local-ledger/utils/device';
import { TaskBottomNav } from '../components/TaskBottomNav';
import { usePatients } from '../../patient-list/api/usePatients';

function statusLabel(status: TaskBoardRow['status']): string {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return 'Scheduled';
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

export function TasksPage() {
  const navigate = useNavigate();
  const actorId = getActiveActorId() ?? 'anon';

  const { data: tasks = [], isLoading } = useTasks();
  const { data: patients = [] } = usePatients();
  const { data: activityRows = [] } = useMyActionsToday(actorId);

  const createTask = useCreateTask();
  const undo = useUndo();

  const [activeTab, setActiveTab] = useState<TaskBoardTab>('board');
  const [activeFilter, setActiveFilter] = useState<TaskBoardFilter>('all');
  const [showViewPanel, setShowViewPanel] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const patientLookup = useMemo(() => buildPatientLookup(patients as unknown[]), [patients]);
  const model = useMemo(
    () => buildTaskBoardModel(tasks, patientLookup, { filter: activeFilter }),
    [tasks, patientLookup, activeFilter],
  );

  const selectedRow = useMemo(
    () => model.allRows.find((row) => row.id === selectedRowId) ?? null,
    [model.allRows, selectedRowId],
  );

  const auditRows = useMemo(() => {
    const taskById = Object.fromEntries(model.allRows.map((row) => [row.id, { title: row.title }]));
    return buildAuditRows(activityRows as ActivityLike[], taskById);
  }, [activityRows, model.allRows]);

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

  return (
    <div className="min-h-screen bg-slate-100 pb-40">
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
                                if (!showViewPanel) {
                                  setShowViewPanel(true);
                                }
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

      {showViewPanel ? (
        <aside className="fixed bottom-28 left-1/2 z-40 w-[min(820px,calc(100%-20px))] -translate-x-1/2 rounded-2xl border border-blue-200 bg-blue-50 p-3 shadow-lg">
          <div className="text-xs font-black text-blue-900">{activeTab.toUpperCase()} · View</div>
          {selectedRow ? (
            <>
              <div className="text-sm text-slate-700">Task: {selectedRow.title}</div>
              <div className="text-sm text-slate-700">Patient: {selectedRow.patientName}</div>
              <div className="text-sm text-slate-700">Doctor: {selectedRow.doctor.name}</div>
              <div className="text-sm text-slate-700">Nurse: {selectedRow.nurse.name}</div>
              <div className="text-sm text-slate-700">Due: {selectedRow.dueLabel}</div>
            </>
          ) : (
            <div className="text-sm text-slate-700">Select a task from the board.</div>
          )}
        </aside>
      ) : null}

      <TaskBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={() => navigate('/patients')}
        onToggleView={() => setShowViewPanel((current) => !current)}
        showViewPanel={showViewPanel}
      />
    </div>
  );
}

export default TasksPage;
