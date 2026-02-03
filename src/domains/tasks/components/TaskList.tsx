// TaskList - List container with empty state

import React from 'react';
import { View, Text, FlatList } from 'react-native';
import type { Task } from '../core/types';
import { TaskCard } from './TaskCard';
// TODO: Update imports after shared migration
// import { Skeleton } from '@/shared/ui/Skeleton';

interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  onTaskPress?: (task: Task) => void;
  onTaskComplete?: (task: Task) => void;
  showPatient?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
}

export function TaskList({
  tasks,
  loading = false,
  onTaskPress,
  onTaskComplete,
  showPatient = false,
  compact = false,
  emptyMessage = 'No tasks found',
  emptyIcon,
  ListHeaderComponent,
}: TaskListProps) {
  if (loading) {
    return (
      <View style={{ padding: 16 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              height: compact ? 60 : 80,
              backgroundColor: '#f3f4f6',
              borderRadius: 8,
              marginBottom: 8,
            }}
          />
        ))}
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={{ padding: 32, alignItems: 'center' }}>
        {emptyIcon}
        <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(task) => task.id}
      renderItem={({ item }) => (
        <TaskCard
          task={item}
          onPress={onTaskPress}
          onComplete={onTaskComplete}
          showPatient={showPatient}
          compact={compact}
        />
      )}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={ListHeaderComponent}
      showsVerticalScrollIndicator={false}
    />
  );
}
