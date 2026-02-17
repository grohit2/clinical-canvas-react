import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PRIORITY_TONES,
  TASK_STATUS_TONES,
  initialsFromName,
  mapTaskPriorityToBoardPriority,
  mapTaskStatusToBoardStatus,
} from '../constants';
import type { TaskBoardPerson } from '../../board/types';
import type { TaskPriority, TaskStatus } from '../../core/types';

export function PersonAvatarCell({
  person,
  width,
  onPress,
}: {
  person: TaskBoardPerson;
  width: number;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.baseCell, styles.personCell, { width, minWidth: width }]}
      disabled={!onPress}
    >
      <View style={[styles.avatar, { backgroundColor: person.color }]}> 
        <Text style={styles.avatarText}>{person.initials || initialsFromName(person.name)}</Text>
      </View>
    </Pressable>
  );
}

export function StatusCell({
  status,
  boardStatusLabel,
  width,
  onPress,
}: {
  status: TaskStatus;
  boardStatusLabel?: string | null;
  width: number;
  onPress?: () => void;
}) {
  const label = mapTaskStatusToBoardStatus(status, boardStatusLabel);
  const tone = TASK_STATUS_TONES[label] ?? TASK_STATUS_TONES[''];

  return (
    <Pressable
      onPress={onPress}
      style={[styles.baseCell, { width, minWidth: width, backgroundColor: tone.bg }]}
      disabled={!onPress}
    >
      <Text style={[styles.statusText, { color: tone.text }]} numberOfLines={1}>
        {label || '—'}
      </Text>
    </Pressable>
  );
}

export function PriorityCell({
  priority,
  width,
  onPress,
}: {
  priority: TaskPriority;
  width: number;
  onPress?: () => void;
}) {
  const label = mapTaskPriorityToBoardPriority(priority);
  const tone = PRIORITY_TONES[label] ?? PRIORITY_TONES[''];

  return (
    <Pressable
      onPress={onPress}
      style={[styles.baseCell, styles.priorityCell, { width, minWidth: width, backgroundColor: tone.bg }]}
      disabled={!onPress}
    >
      {tone.icon ? <Text style={[styles.priorityIcon, { color: tone.text }]}>{tone.icon}</Text> : null}
      <Text style={[styles.statusText, { color: tone.text }]} numberOfLines={1}>
        {label || '—'}
      </Text>
    </Pressable>
  );
}

export function TextCell({
  value,
  width,
  color = '#475569',
  fontWeight = '500',
  align = 'center',
  onPress,
}: {
  value: string;
  width: number;
  color?: string;
  fontWeight?: '400' | '500' | '600' | '700' | '800';
  align?: 'left' | 'center';
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.baseCell,
        {
          width,
          minWidth: width,
          justifyContent: align === 'left' ? 'flex-start' : 'center',
          paddingHorizontal: align === 'left' ? 10 : 6,
        },
      ]}
      disabled={!onPress}
    >
      <Text
        style={{ fontSize: 12, color, fontWeight }}
        numberOfLines={1}
      >
        {value || '—'}
      </Text>
    </Pressable>
  );
}

export function StatusProgressBar({
  labels,
}: {
  labels: string[];
}) {
  if (labels.length === 0) {
    return <View style={styles.progressEmpty} />;
  }

  const counts = new Map<string, number>();
  labels.forEach((label) => {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return (
    <View style={styles.progressWrap}>
      {[...counts.entries()].map(([label, count]) => {
        const tone = TASK_STATUS_TONES[label] ?? TASK_STATUS_TONES[''];
        return (
          <View
            key={label}
            style={{
              flex: count,
              backgroundColor: tone.bg,
              height: '100%',
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  baseCell: {
    height: 40,
    borderLeftWidth: 1,
    borderLeftColor: '#eef0f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personCell: {
    backgroundColor: '#fff',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priorityCell: {
    flexDirection: 'row',
    gap: 3,
  },
  priorityIcon: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressWrap: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    width: '100%',
  },
  progressEmpty: {
    height: 6,
    borderRadius: 4,
    width: '100%',
    backgroundColor: '#e5e7eb',
  },
});

export default {
  PersonAvatarCell,
  StatusCell,
  PriorityCell,
  TextCell,
  StatusProgressBar,
};
