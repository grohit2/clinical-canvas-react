import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Circle, ClipboardList, Plus, RotateCcw, Trash2 } from 'lucide-react-native';
import type { Task } from '@/domains/tasks/core/types';
import { useCreateTask } from '@/domains/tasks/api/useCreateTask';
import { useDeleteTask, useUpdateTask } from '@/domains/tasks/api/useUpdateTask';
import { useTasks } from '@/domains/tasks/api/useTasks';
import { useUndo } from '@/domains/tasks/api/useUndo';

type TasksFilter = 'all' | 'open' | 'completed';

const priorityBadgeStyle: Record<Task['priority'], { bg: string; text: string }> = {
  low: { bg: '#ecfeff', text: '#0e7490' },
  medium: { bg: '#eff6ff', text: '#1d4ed8' },
  high: { bg: '#fff7ed', text: '#c2410c' },
  urgent: { bg: '#fef2f2', text: '#b91c1c' },
};

function TaskRow({ task }: { task: Task }) {
  const updateTask = useUpdateTask(task.id);
  const deleteTask = useDeleteTask(task.id);

  const isCompleted = task.status === 'completed';
  const badge = priorityBadgeStyle[task.priority];

  const toggleComplete = () => {
    updateTask.mutate({
      status: isCompleted ? 'pending' : 'completed',
    });
  };

  return (
    <View style={styles.taskRow}>
      <Pressable onPress={toggleComplete} hitSlop={8} style={styles.taskAction}>
        {isCompleted ? (
          <CheckCircle2 size={20} color="#16a34a" />
        ) : (
          <Circle size={20} color="#64748b" />
        )}
      </Pressable>

      <View style={styles.taskBody}>
        <Text style={[styles.taskTitle, isCompleted && styles.taskTitleDone]} numberOfLines={1}>
          {task.title}
        </Text>
        {task.description ? (
          <Text style={styles.taskSubtitle} numberOfLines={1}>
            {task.description}
          </Text>
        ) : (
          <Text style={styles.taskSubtitle} numberOfLines={1}>
            {task.patientName || task.assigneeName || 'No details'}
          </Text>
        )}
      </View>

      <View style={[styles.priorityBadge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.priorityText, { color: badge.text }]}>
          {task.priority.toUpperCase()}
        </Text>
      </View>

      <Pressable
        onPress={() => deleteTask.mutate()}
        hitSlop={8}
        style={styles.taskDelete}
        disabled={deleteTask.isPending}
      >
        <Trash2 size={16} color="#ef4444" />
      </Pressable>
    </View>
  );
}

export default function TasksScreen() {
  const { data: tasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const undo = useUndo();

  const [title, setTitle] = useState('');
  const [activeFilter, setActiveFilter] = useState<TasksFilter>('open');

  const visibleTasks = useMemo(() => {
    if (activeFilter === 'completed') {
      return tasks.filter((task) => task.status === 'completed');
    }
    if (activeFilter === 'open') {
      return tasks.filter((task) => task.status !== 'completed');
    }
    return tasks;
  }, [activeFilter, tasks]);

  const counts = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'completed').length;
    return {
      all: tasks.length,
      open: tasks.length - completed,
      completed,
    };
  }, [tasks]);

  const addTask = async () => {
    const nextTitle = title.trim();
    if (!nextTitle || createTask.isPending) {
      return;
    }

    await createTask.mutateAsync({ title: nextTitle });
    setTitle('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Pressable
          style={styles.undoButton}
          onPress={() => undo.mutate()}
          disabled={undo.isPending}
        >
          <RotateCcw size={16} color="#334155" />
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a task"
          placeholderTextColor="#94a3b8"
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={() => void addTask()}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={() => void addTask()} disabled={createTask.isPending}>
          {createTask.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Plus size={18} color="#fff" />
          )}
        </Pressable>
      </View>

      <View style={styles.filters}>
        <Pressable
          style={[styles.filterChip, activeFilter === 'open' && styles.filterChipActive]}
          onPress={() => setActiveFilter('open')}
        >
          <Text style={[styles.filterText, activeFilter === 'open' && styles.filterTextActive]}>
            Open ({counts.open})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, activeFilter === 'completed' && styles.filterChipActive]}
          onPress={() => setActiveFilter('completed')}
        >
          <Text style={[styles.filterText, activeFilter === 'completed' && styles.filterTextActive]}>
            Done ({counts.completed})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
            All ({counts.all})
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={visibleTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskRow task={item} />}
          contentContainerStyle={[
            styles.listContent,
            visibleTasks.length === 0 && styles.emptyContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ClipboardList size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No tasks yet</Text>
              <Text style={styles.emptySubtitle}>Create one using the input above.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
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
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
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
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#1d4ed8',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContent: {
    flexGrow: 1,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  taskAction: {
    width: 28,
    alignItems: 'center',
  },
  taskBody: {
    flex: 1,
    marginLeft: 8,
    marginRight: 10,
  },
  taskTitle: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
  },
  taskTitleDone: {
    color: '#64748b',
    textDecorationLine: 'line-through',
  },
  taskSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748b',
  },
  priorityBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  taskDelete: {
    width: 30,
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#4b5563',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});
