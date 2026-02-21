import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Bell,
  ClipboardList,
  Clock3,
  FileText,
  Home,
  Layers3,
  Plus,
  RotateCcw,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateTask } from '../../hooks/useCreateTask';
import { useMyActionsToday } from '../../hooks/useMyActivity';
import { useTasks } from '../../hooks/useTasks';
import { useUndo } from '../../hooks/useUndo';
import { getActiveActorId } from '../../local-ledger/utils/device';
import { buildAuditRows, buildTaskBoardModel } from '../../models/boardModel';
import {
  BOARD_VIEW_OPTIONS,
  buildPatientViewSections,
  buildViewSections,
} from '../../models/boardViews';
import type { BoardViewMode, PatientEntry } from '../../models/boardViews';
import { buildPatientLookup } from '../../models/patientLookup';
import type {
  ActivityLike,
  TaskBoardRow,
  TaskBoardTab,
} from '../../models/types';
import { ensureHospitalDemoSeed } from '../../local-ledger/services/demoSeedService';
import type { TaskNavTabNative } from '../../components/native/TaskBottomNav.native';
import { TaskBottomNavNative } from '../../components/native/TaskBottomNav.native';
import { StatsBarNative } from '../../components/native/StatsBar.native';
import { BottomSheetNative } from '../../components/native/BottomSheet.native';
import { TableGroupNative } from '../../components/native/TableGroup.native';
import { TaskAuditLogViewNative } from '../../components/native/TaskAuditLogView.native';
import { TaskModalNative } from '../../components/native/TaskModal.native';
import {
  PRIORITY_TONES,
  TASK_STATUS_TONES,
  mapTaskPriorityToBoardPriority,
  mapTaskStatusToBoardStatus,
} from '../../core/statuses';

interface TaskBoardScreenNativeProps {
  patients?: unknown[];
  pinnedPatientIds?: string[];
}

const MY_NURSE_NAME = 'RN Sarah M.';

export function TaskBoardScreenNative(props: TaskBoardScreenNativeProps) {
  const { patients = [], pinnedPatientIds = [] } = props;
  const router = useRouter();
  const queryClient = useQueryClient();
  const actorId = getActiveActorId() ?? 'anon';

  const { data: tasks = [], isLoading } = useTasks();
  const { data: activityRows = [] } = useMyActionsToday(actorId);

  const createTask = useCreateTask();
  const undo = useUndo();

  const [activeTab, setActiveTab] = useState<TaskBoardTab>('board');
  const [activeViewMode, setActiveViewMode] = useState<BoardViewMode>('ward');
  const [activeDetailRow, setActiveDetailRow] = useState<TaskBoardRow | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [collapsedBySection, setCollapsedBySection] = useState<Record<string, boolean>>({});
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await ensureHospitalDemoSeed();
        await queryClient.invalidateQueries({ queryKey: ['tasks'] });
        await queryClient.invalidateQueries({ queryKey: ['ops', 'actor', actorId] });
        await queryClient.invalidateQueries({ queryKey: ['ops', 'count', actorId] });
      } catch (error) {
        console.error('[tasks-demo-seed] failed', error);
      } finally {
        if (active) {
          setIsSeeding(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [actorId, queryClient]);

  const patientLookup = useMemo(() => buildPatientLookup(patients), [patients]);
  const patientEntries = useMemo<PatientEntry[]>(() => {
    const result: PatientEntry[] = [];
    for (const patient of patients) {
      const row = typeof patient === 'object' && patient !== null ? (patient as Record<string, unknown>) : {};
      const id = typeof row.id === 'string' ? row.id.trim() : '';
      const name =
        typeof row.name === 'string'
          ? row.name.trim()
          : typeof row.fullName === 'string'
            ? row.fullName.trim()
            : '';

      if (id && name) {
        result.push({ id, name });
      }
    }
    return result;
  }, [patients]);

  const model = useMemo(
    () => buildTaskBoardModel(tasks, patientLookup, { filter: 'all' }),
    [tasks, patientLookup],
  );

  const boardSections = useMemo(() => {
    if (activeViewMode === 'ward') {
      return model.sections;
    }
    if (activeViewMode === 'patient') {
      return buildPatientViewSections(model.allRows, patientEntries, pinnedPatientIds);
    }
    return buildViewSections(model.allRows, activeViewMode);
  }, [activeViewMode, model.allRows, model.sections, patientEntries, pinnedPatientIds]);

  const auditRows = useMemo(() => {
    const tasksById = Object.fromEntries(model.allRows.map((row) => [row.id, { title: row.title }]));
    return buildAuditRows(activityRows as ActivityLike[], tasksById);
  }, [activityRows, model.allRows]);

  const homeRows = useMemo(
    () =>
      model.allRows
        .filter((row) => {
          const assigned = row.source.nurseName ?? row.source.assigneeName ?? row.nurse.name;
          return assigned === MY_NURSE_NAME;
        })
        .slice(0, 12),
    [model.allRows],
  );
  const reminderQueue = useMemo(
    () => [...model.remindersToday, ...model.remindersUpcoming],
    [model.remindersToday, model.remindersUpcoming],
  );

  const navTabs = useMemo<TaskNavTabNative[]>(
    () => [
      {
        id: 'back',
        label: 'Back',
        icon: <ArrowLeft size={16} color={activeTab === 'back' ? '#ffffff' : '#64748b'} />,
      },
      {
        id: 'home',
        label: 'Home',
        icon: <Home size={16} color={activeTab === 'home' ? '#ffffff' : '#64748b'} />,
      },
      {
        id: 'board',
        label: 'Task Board',
        icon: <ClipboardList size={16} color={activeTab === 'board' ? '#ffffff' : '#64748b'} />,
      },
      {
        id: 'reminders',
        label: 'Reminders',
        icon: <Bell size={16} color={activeTab === 'reminders' ? '#ffffff' : '#64748b'} />,
        badge: model.remindersToday.length || undefined,
      },
      {
        id: 'audit',
        label: 'Audit Log',
        icon: <FileText size={16} color={activeTab === 'audit' ? '#ffffff' : '#64748b'} />,
        dot: auditRows.length > 0,
      },
    ],
    [activeTab, auditRows.length, model.remindersToday.length],
  );

  const handleBottomTabChange = (tab: TaskBoardTab) => {
    if (tab === 'back') {
      router.push('/(tabs)');
      return;
    }

    setActiveTab(tab);
  };

  const headerTitle =
    activeTab === 'home'
      ? 'Task Home'
      : activeTab === 'reminders'
        ? 'Reminders'
        : activeTab === 'audit'
          ? 'Audit Log'
          : 'Hospital Task Board';

  const headerSubtitle =
    activeTab === 'home'
      ? 'Metrics plus tasks assigned to RN Sarah M.'
      : activeTab === 'reminders'
        ? 'Upcoming and high-priority tasks that need attention.'
        : activeTab === 'audit'
          ? 'Every change written to the local task ledger.'
          : 'Local ledger powered';

  const showFab = activeTab === 'home' || activeTab === 'reminders';
  const fabLabel = activeTab === 'reminders' ? 'Add Reminder' : 'Add Task';
  const activeView = BOARD_VIEW_OPTIONS.find((view) => view.id === activeViewMode)?.label ?? 'Ward';

  const addQuickTask = async (overrides?: Partial<Parameters<typeof createTask.mutateAsync>[0]>) => {
    if (createTask.isPending) {
      return;
    }

    const now = new Date();
    const defaultDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const defaultTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    await createTask.mutateAsync({
      title: 'New task',
      dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      departmentId: model.sections[0]?.title ?? 'Ward A — Cardiology',
      boardStatusLabel: 'Scheduled',
      scheduleDay: defaultDay,
      scheduleTime: defaultTime,
      recurrence: 'None',
      taskType: 'Checkup',
      placeText: 'Room 101',
      doctorName: 'Dr. Patel',
      nurseName: 'RN Sarah M.',
      patientName: 'Unassigned Patient',
      ...overrides,
    });
  };

  const handleFabPress = async () => {
    if (activeTab === 'reminders') {
      const now = new Date();
      await addQuickTask({
        title: `Reminder ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        priority: 'high',
      });
      return;
    }

    await addQuickTask();
  };

  const renderBoard = () => (
    <View style={styles.tabContent}>
      <View style={styles.boardActionRow}>
        <Pressable
          style={[styles.boardActionButton, createTask.isPending && styles.boardActionButtonDisabled]}
          onPress={() => void addQuickTask()}
          disabled={createTask.isPending}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.boardActionText}>{createTask.isPending ? 'Adding...' : 'Add Task'}</Text>
        </Pressable>

        <Pressable style={styles.viewButton} onPress={() => setIsViewSheetOpen(true)}>
          <Layers3 size={16} color="#334155" />
          <Text style={styles.viewButtonText}>View: {activeView}</Text>
        </Pressable>
      </View>

      {boardSections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptySub}>Create one using the Add Task button.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.sectionsWrap}>
          {boardSections.map((section) => {
            const collapsed = collapsedBySection[section.id] ?? false;

            return (
              <TableGroupNative
                key={section.id}
                section={section}
                collapsed={collapsed}
                selectedRowId={selectedRowId}
                onToggleCollapsed={() =>
                  setCollapsedBySection((prev) => ({
                    ...prev,
                    [section.id]: !collapsed,
                  }))
                }
                onSelectRow={(row) => {
                  setSelectedRowId(row.id);
                  setActiveDetailRow(row);
                }}
                onAddTask={async (nextSection) => {
                  if (activeViewMode === 'patient') {
                    const patientName = nextSection.title.replace(/^⭐\s*/, '');
                    const patientId = nextSection.id.startsWith('patient_')
                      ? nextSection.id.slice('patient_'.length)
                      : undefined;

                    await addQuickTask({
                      title: 'New task',
                      patientName,
                      patientId: patientId && !patientId.startsWith('unmatched_') ? patientId : undefined,
                    });
                    return;
                  }

                  const targetDepartment =
                    activeViewMode === 'ward'
                      ? nextSection.title
                      : model.sections[0]?.title ?? 'Ward A — Cardiology';
                  await addQuickTask({
                    title: 'New task',
                    departmentId: targetDepartment,
                  });
                }}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const renderHome = () => (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Tasks For Me</Text>
      <Text style={styles.infoSubtle}>{homeRows.length} tasks assigned</Text>
      {homeRows.length === 0 ? <Text style={styles.infoLine}>No tasks assigned.</Text> : null}
      {homeRows.map((row) => {
        const statusLabel = mapTaskStatusToBoardStatus(row.status, row.boardStatusLabel);
        const priorityLabel = mapTaskPriorityToBoardPriority(row.priority);
        const statusTone = TASK_STATUS_TONES[statusLabel] ?? TASK_STATUS_TONES[''];
        const priorityTone = PRIORITY_TONES[priorityLabel] ?? PRIORITY_TONES[''];

        return (
          <View key={`home_${row.id}`} style={styles.queueRow}>
            <View style={styles.queueMain}>
              <Text style={styles.queueTitle} numberOfLines={1}>
                {row.title}
              </Text>
              <Text style={styles.queueMeta} numberOfLines={1}>
                {row.patientName} · {row.scheduleTime} · {row.scheduleDay}
              </Text>
            </View>

            <View style={styles.queueTagRow}>
              <View style={[styles.tagBadge, { backgroundColor: priorityTone.bg }]}>
                <Text style={[styles.tagBadgeText, { color: priorityTone.text }]}>{priorityLabel}</Text>
              </View>
              <View style={[styles.tagBadge, { backgroundColor: statusTone.bg }]}>
                <Text style={[styles.tagBadgeText, { color: statusTone.text }]}>{statusLabel}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderReminders = () => (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Reminder Queue</Text>
      <Text style={styles.infoSubtle}>{reminderQueue.length} items</Text>
      {reminderQueue.length === 0 ? <Text style={styles.infoLine}>No reminders yet.</Text> : null}

      {reminderQueue.map((row) => {
        const statusLabel = mapTaskStatusToBoardStatus(row.status, row.boardStatusLabel);
        const priorityLabel = mapTaskPriorityToBoardPriority(row.priority);
        const statusTone = TASK_STATUS_TONES[statusLabel] ?? TASK_STATUS_TONES[''];
        const priorityTone = PRIORITY_TONES[priorityLabel] ?? PRIORITY_TONES[''];

        return (
          <View key={`reminder_${row.id}`} style={styles.queueRow}>
            <View style={styles.queueMain}>
              <Text style={styles.queueTitle} numberOfLines={1}>
                {row.title}
              </Text>
              <Text style={styles.queueMeta} numberOfLines={1}>
                {row.scheduleDay} · {row.scheduleTime} · {row.placeText}
              </Text>
            </View>

            <View style={styles.queueTagRow}>
              <View style={[styles.tagBadge, { backgroundColor: priorityTone.bg }]}>
                <Text style={[styles.tagBadgeText, { color: priorityTone.text }]}>{priorityLabel}</Text>
              </View>
              <View style={[styles.tagBadge, { backgroundColor: statusTone.bg }]}>
                <Text style={[styles.tagBadgeText, { color: statusTone.text }]}>{statusLabel}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );

  const busy = isLoading || isSeeding;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1a1d2e', '#252942']} style={styles.headerGradient}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          </View>

          <Pressable style={styles.undoButton} onPress={() => undo.mutate()} disabled={undo.isPending}>
            <RotateCcw size={16} color="#334155" />
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        </View>

        {activeTab === 'home' ? <StatsBarNative metrics={model.metrics} /> : null}
      </LinearGradient>

      {busy ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <View style={[styles.contentWrap, !showFab && styles.contentWrapNoFab]}>
          {activeTab === 'home' ? renderHome() : null}
          {activeTab === 'board' ? renderBoard() : null}
          {activeTab === 'reminders' ? renderReminders() : null}
          {activeTab === 'audit' ? <TaskAuditLogViewNative rows={auditRows} /> : null}
        </View>
      )}

      {showFab ? (
        <Pressable
          style={[styles.fabButton, createTask.isPending && styles.fabButtonDisabled]}
          onPress={() => void handleFabPress()}
          disabled={createTask.isPending}
        >
          {activeTab === 'reminders' ? <Clock3 size={18} color="#ffffff" /> : <Plus size={18} color="#ffffff" />}
          <Text style={styles.fabText}>{fabLabel}</Text>
        </Pressable>
      ) : null}

      {activeDetailRow ? (
        <TaskModalNative
          row={activeDetailRow}
          visible={Boolean(activeDetailRow)}
          onClose={() => setActiveDetailRow(null)}
        />
      ) : null}

      <BottomSheetNative visible={isViewSheetOpen} title="Task Board Views" onClose={() => setIsViewSheetOpen(false)}>
        <View style={styles.viewSheetList}>
          {BOARD_VIEW_OPTIONS.map((view) => {
            const active = activeViewMode === view.id;

            return (
              <Pressable
                key={view.id}
                style={[styles.viewSheetItem, active && styles.viewSheetItemActive]}
                onPress={() => {
                  setActiveViewMode(view.id);
                  setIsViewSheetOpen(false);
                }}
              >
                <Text style={[styles.viewSheetItemText, active && styles.viewSheetItemTextActive]}>
                  {view.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheetNative>

      <TaskBottomNavNative tabs={navTabs} activeTab={activeTab} onTabChange={handleBottomTabChange} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2f7',
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#cbd5e1',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  undoText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '700',
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
  contentWrapNoFab: {
    paddingBottom: 92,
  },
  tabContent: {
    flex: 1,
  },
  boardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  boardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  boardActionButtonDisabled: {
    opacity: 0.7,
  },
  boardActionText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '800',
  },
  viewButton: {
    flex: 1,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  viewButtonText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
  },
  viewSheetList: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    gap: 8,
  },
  viewSheetItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#ffffff',
  },
  viewSheetItemActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#dbeafe',
  },
  viewSheetItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '700',
  },
  viewSheetItemTextActive: {
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
    paddingHorizontal: 2,
    paddingBottom: 30,
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
  infoSubtle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoLine: {
    fontSize: 13,
    color: '#334155',
  },
  queueRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
  },
  queueMain: {
    gap: 1,
  },
  queueTitle: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700',
  },
  queueMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  queueTagRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  tagBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  fabButton: {
    position: 'absolute',
    right: 14,
    bottom: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  fabButtonDisabled: {
    opacity: 0.7,
  },
  fabText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '800',
  },
});

export default TaskBoardScreenNative;
