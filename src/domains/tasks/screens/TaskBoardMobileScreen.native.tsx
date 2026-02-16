import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Circle, Plus, RotateCcw, Trash2 } from 'lucide-react-native';
import { useCreateTask } from '../api/useCreateTask';
import { useMyActionsToday } from '../api/useMyActivity';
import { useTasks } from '../api/useTasks';
import { useUndo } from '../api/useUndo';
import { useDeleteTask, useUpdateTask } from '../api/useUpdateTask';
import { buildPatientLookup } from '../board/patientLookup';
import { buildAuditRows, buildTaskBoardModel } from '../board/selectors';
import type { ActivityLike, TaskBoardFilter, TaskBoardRow, TaskBoardTab } from '../board/types';
import { TASK_BOARD_FILTERS } from '../board/constants';
import { getActiveActorId } from '../local-ledger/utils/device';
import { TaskBottomNavNative } from '../components/TaskBottomNav.native';

interface TaskBoardMobileScreenProps {
  patients?: unknown[];
}

function statusText(status: TaskBoardRow['status']): string {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return 'Scheduled';
}

function TaskRowItem({
  row,
  onSelect,
  selected,
}: {
  row: TaskBoardRow;
  onSelect: (row: TaskBoardRow) => void;
  selected: boolean;
}) {
  const updateTask = useUpdateTask(row.id);
  const deleteTask = useDeleteTask(row.id);

  const completed = row.status === 'completed';

  return (
    <Pressable style={[styles.row, selected && styles.rowSelected]} onPress={() => onSelect(row)}>
      <Pressable
        onPress={() => updateTask.mutate({ status: completed ? 'pending' : 'completed' })}
        hitSlop={8}
        style={styles.iconCell}
      >
        {completed ? <CheckCircle2 size={18} color="#16a34a" /> : <Circle size={18} color="#64748b" />}
      </Pressable>

      <View style={styles.taskCell}>
        <Text style={[styles.taskTitle, completed && styles.taskTitleDone]} numberOfLines={1}>
          {row.title}
        </Text>
        <Text style={styles.taskSubtext} numberOfLines={1}>
          {row.patientName}
        </Text>
      </View>

      <View style={styles.personCell}>
        <View style={[styles.avatarCircle, { backgroundColor: row.doctor.color }]}>
          <Text style={styles.avatarText}>{row.doctor.initials}</Text>
        </View>
      </View>

      <View style={styles.personCell}>
        <View style={[styles.avatarCircle, { backgroundColor: row.nurse.color }]}>
          <Text style={styles.avatarText}>{row.nurse.initials}</Text>
        </View>
      </View>

      <View style={styles.statusCell}>
        <Text style={styles.statusText}>{statusText(row.status)}</Text>
      </View>

      <Pressable
        style={styles.deleteCell}
        onPress={() => deleteTask.mutate()}
        disabled={deleteTask.isPending}
      >
        <Trash2 size={15} color="#ef4444" />
      </Pressable>
    </Pressable>
  );
}

export function TaskBoardMobileScreen(props: TaskBoardMobileScreenProps) {
  const { patients = [] } = props;
  const router = useRouter();
  const actorId = getActiveActorId() ?? 'anon';

  const { data: tasks = [], isLoading } = useTasks();
  const { data: activityRows = [] } = useMyActionsToday(actorId);

  const createTask = useCreateTask();
  const undo = useUndo();

  const [activeTab, setActiveTab] = useState<TaskBoardTab>('board');
  const [activeFilter, setActiveFilter] = useState<TaskBoardFilter>('all');
  const [showViewPanel, setShowViewPanel] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const patientLookup = useMemo(() => buildPatientLookup(patients), [patients]);
  const model = useMemo(
    () => buildTaskBoardModel(tasks, patientLookup, { filter: activeFilter }),
    [tasks, patientLookup, activeFilter],
  );

  const selectedRow = useMemo(
    () => model.allRows.find((row) => row.id === selectedRowId) ?? null,
    [model.allRows, selectedRowId],
  );

  const auditRows = useMemo(() => {
    const tasksById = Object.fromEntries(model.allRows.map((row) => [row.id, { title: row.title }]));
    return buildAuditRows(activityRows as ActivityLike[], tasksById);
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

  const renderBoard = () => (
    <View style={styles.tabContent}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a task"
          placeholderTextColor="#94a3b8"
          value={titleInput}
          onChangeText={setTitleInput}
          onSubmitEditing={() => void handleCreate()}
        />
        <Pressable style={styles.addButton} onPress={() => void handleCreate()} disabled={createTask.isPending}>
          {createTask.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Plus size={18} color="#fff" />}
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {TASK_BOARD_FILTERS.map((chip) => (
          <Pressable
            key={chip.id}
            style={[styles.filterChip, activeFilter === chip.id && styles.filterChipActive]}
            onPress={() => setActiveFilter(chip.id)}
          >
            <Text style={[styles.filterText, activeFilter === chip.id && styles.filterTextActive]}>
              {chip.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {model.sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptySub}>Create one using the input above.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.sectionsWrap}>
          {model.sections.map((section) => (
            <View key={section.id} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: section.color }]}>{section.title}</Text>
                <Text style={styles.sectionMeta}>{section.total} tasks</Text>
                {section.urgentCount > 0 ? (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentBadgeText}>{section.urgentCount} urgent</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.taskHeaderCell]}>Task</Text>
                <Text style={styles.headerCell}>Doctor</Text>
                <Text style={styles.headerCell}>Nurse</Text>
                <Text style={styles.headerCell}>Status</Text>
                <Text style={[styles.headerCell, styles.actionHeaderCell]}>Action</Text>
              </View>

              {section.rows.map((row) => (
                <TaskRowItem
                  key={row.id}
                  row={row}
                  onSelect={(next) => {
                    setSelectedRowId(next.id);
                    if (!showViewPanel) {
                      setShowViewPanel(true);
                    }
                  }}
                  selected={row.id === selectedRowId}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderHome = () => (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Home Summary</Text>
      <Text style={styles.infoLine}>Total tasks: {model.metrics.total}</Text>
      <Text style={styles.infoLine}>Urgent tasks: {model.metrics.urgent}</Text>
      <Text style={styles.infoLine}>Active tasks: {model.metrics.active}</Text>
      <Text style={styles.infoLine}>Scheduled tasks: {model.metrics.scheduled}</Text>
      <Text style={styles.infoLine}>Completed tasks: {model.metrics.done}</Text>
    </View>
  );

  const renderReminders = () => (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Today</Text>
      {model.remindersToday.length === 0 ? <Text style={styles.infoLine}>No reminders for today.</Text> : null}
      {model.remindersToday.map((row) => (
        <Text key={`today_${row.id}`} style={styles.infoLine}>
          {row.dueLabel} · {row.title}
        </Text>
      ))}

      <Text style={[styles.infoTitle, styles.infoTitleGap]}>Upcoming</Text>
      {model.remindersUpcoming.length === 0 ? <Text style={styles.infoLine}>No upcoming reminders.</Text> : null}
      {model.remindersUpcoming.map((row) => (
        <Text key={`up_${row.id}`} style={styles.infoLine}>
          {row.dueLabel} · {row.title}
        </Text>
      ))}
    </View>
  );

  const renderAudit = () => (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Audit Activity</Text>
      {auditRows.length === 0 ? <Text style={styles.infoLine}>No activity yet.</Text> : null}
      {auditRows.map((row) => (
        <View key={row.id} style={styles.auditItem}>
          <Text style={styles.auditTitle}>{row.title}</Text>
          <Text style={styles.auditDetail}>{row.detail}</Text>
          <Text style={styles.auditMeta}>{new Date(row.at).toLocaleString()}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1a1d2e', '#252942']} style={styles.headerGradient}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Task Board</Text>
            <Text style={styles.headerSubtitle}>Local ledger powered</Text>
          </View>

          <Pressable style={styles.undoButton} onPress={() => undo.mutate()} disabled={undo.isPending}>
            <RotateCcw size={16} color="#334155" />
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#60a5fa' }]}>{model.metrics.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#f43f5e' }]}>{model.metrics.urgent}</Text>
            <Text style={styles.statLabel}>Urgent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{model.metrics.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#34d399' }]}>{model.metrics.done}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </ScrollView>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <View style={styles.contentWrap}>
          {activeTab === 'home' ? renderHome() : null}
          {activeTab === 'board' ? renderBoard() : null}
          {activeTab === 'reminders' ? renderReminders() : null}
          {activeTab === 'audit' ? renderAudit() : null}
        </View>
      )}

      {showViewPanel ? (
        <View style={styles.viewPanel}>
          <Text style={styles.viewPanelTitle}>{activeTab.toUpperCase()} · View</Text>
          {selectedRow ? (
            <>
              <Text style={styles.viewPanelLine}>Task: {selectedRow.title}</Text>
              <Text style={styles.viewPanelLine}>Patient: {selectedRow.patientName}</Text>
              <Text style={styles.viewPanelLine}>Doctor: {selectedRow.doctor.name}</Text>
              <Text style={styles.viewPanelLine}>Nurse: {selectedRow.nurse.name}</Text>
              <Text style={styles.viewPanelLine}>Due: {selectedRow.dueLabel}</Text>
            </>
          ) : (
            <Text style={styles.viewPanelLine}>Select a task from the board.</Text>
          )}
        </View>
      ) : null}

      <TaskBottomNavNative
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={() => router.push('/patients' as never)}
        onToggleView={() => setShowViewPanel((current) => !current)}
        showViewPanel={showViewPanel}
      />
    </SafeAreaView>
  );
}

export default TaskBoardMobileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2f7',
  },
  headerGradient: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#bfdbfe',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  undoText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  statsRow: {
    gap: 10,
    paddingTop: 12,
  },
  statCard: {
    minWidth: 112,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 2,
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 12,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrap: {
    flex: 1,
    paddingBottom: 130,
  },
  tabContent: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  filterRow: {
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  filterText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#1d4ed8',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#475569',
  },
  emptySub: {
    marginTop: 6,
    color: '#94a3b8',
  },
  sectionsWrap: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    gap: 10,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },
  sectionMeta: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
  },
  urgentBadge: {
    marginLeft: 'auto',
    borderRadius: 999,
    backgroundColor: '#e11d48',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  urgentBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerCell: {
    width: 64,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  taskHeaderCell: {
    flex: 1,
    width: undefined,
    textAlign: 'left',
    paddingLeft: 12,
  },
  actionHeaderCell: {
    width: 54,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
  },
  rowSelected: {
    backgroundColor: '#eff6ff',
  },
  iconCell: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCell: {
    flex: 1,
    paddingRight: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  taskSubtext: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748b',
  },
  personCell: {
    width: 64,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  statusCell: {
    width: 64,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '700',
    textAlign: 'center',
  },
  deleteCell: {
    width: 54,
    alignItems: 'center',
  },
  infoCard: {
    margin: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 6,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  infoTitleGap: {
    marginTop: 8,
  },
  infoLine: {
    fontSize: 13,
    color: '#334155',
  },
  auditItem: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 9,
    backgroundColor: '#f8fafc',
    gap: 2,
  },
  auditTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  auditDetail: {
    fontSize: 12,
    color: '#475569',
  },
  auditMeta: {
    fontSize: 11,
    color: '#94a3b8',
  },
  viewPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 102,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe7ff',
    backgroundColor: '#f8fbff',
    padding: 12,
    gap: 4,
  },
  viewPanelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  viewPanelLine: {
    fontSize: 12,
    color: '#334155',
  },
});
