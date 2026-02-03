// TaskCard - Extracted from inline duplication in TasksPage and PatientTasks

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Task } from '../core/types';
import { PriorityBadge } from './PriorityBadge';
import { isOverdue, isDueToday } from '../core/filters';
// TODO: Update imports after theme migration
// import { useTheme } from '@/theme';

interface TaskCardProps {
  task: Task;
  onPress?: (task: Task) => void;
  onComplete?: (task: Task) => void;
  showPatient?: boolean;
  compact?: boolean;
}

export function TaskCard({
  task,
  onPress,
  onComplete,
  showPatient = false,
  compact = false,
}: TaskCardProps) {
  const overdue = isOverdue(task);
  const dueToday = isDueToday(task);

  const handlePress = () => {
    onPress?.(task);
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    if (dueToday) return 'Today';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          padding: compact ? 12 : 16,
          backgroundColor: '#fff',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: overdue ? '#fca5a5' : '#e5e7eb',
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={{
                fontSize: compact ? 14 : 16,
                fontWeight: '500',
                color: task.status === 'completed' ? '#9ca3af' : '#111827',
                textDecorationLine: task.status === 'completed' ? 'line-through' : 'none',
              }}
              numberOfLines={2}
            >
              {task.title}
            </Text>

            {!compact && task.description && (
              <Text
                style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}
                numberOfLines={2}
              >
                {task.description}
              </Text>
            )}

            {showPatient && task.patientName && (
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Patient: {task.patientName}
              </Text>
            )}
          </View>

          <PriorityBadge priority={task.priority} size={compact ? 'sm' : 'md'} />
        </View>

        {task.dueDate && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text
              style={{
                fontSize: 12,
                color: overdue ? '#dc2626' : dueToday ? '#ea580c' : '#6b7280',
                fontWeight: overdue || dueToday ? '500' : '400',
              }}
            >
              {overdue ? 'Overdue: ' : 'Due: '}
              {formatDueDate(task.dueDate)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
