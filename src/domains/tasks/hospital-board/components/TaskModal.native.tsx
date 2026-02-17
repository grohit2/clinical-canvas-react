import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useUpdateTask } from '../../api/useUpdateTask';
import type { TaskBoardRow } from '../../board/types';
import {
  DAYS,
  DOCTORS,
  NURSES,
  PLACES,
  PRIORITY_TONES,
  RECURRENCE,
  TASK_STATUS_TONES,
  TASK_TYPES,
  mapBoardPriorityToTaskPriority,
  mapBoardStatusToTaskStatus,
  mapTaskPriorityToBoardPriority,
  mapTaskStatusToBoardStatus,
  toIsoFromBoardSchedule,
} from '../constants';

const STATUS_OPTIONS = Object.keys(TASK_STATUS_TONES).filter(Boolean);
const PRIORITY_OPTIONS = Object.keys(PRIORITY_TONES).filter(Boolean);

export interface TaskModalNativeProps {
  row: TaskBoardRow;
  visible: boolean;
  onClose: () => void;
}

export function TaskModalNative(props: TaskModalNativeProps) {
  const { row, visible, onClose } = props;
  const updateTask = useUpdateTask(row.id);

  const [draft, setDraft] = useState(() => ({
    title: row.title,
    description: row.source.description ?? '',
    patientName: row.patientName,
    doctorName: row.source.doctorName ?? row.doctor.name,
    nurseName: row.source.nurseName ?? row.nurse.name,
    boardStatusLabel: mapTaskStatusToBoardStatus(row.status, row.source.boardStatusLabel),
    priorityLabel: mapTaskPriorityToBoardPriority(row.priority),
    scheduleTime: row.scheduleTime,
    scheduleDay: row.scheduleDay,
    recurrence: row.recurrence,
    placeText: row.placeText,
    taskType: row.taskType,
    notes: row.source.description ?? '',
  }));

  useEffect(() => {
    setDraft({
      title: row.title,
      description: row.source.description ?? '',
      patientName: row.patientName,
      doctorName: row.source.doctorName ?? row.doctor.name,
      nurseName: row.source.nurseName ?? row.nurse.name,
      boardStatusLabel: mapTaskStatusToBoardStatus(row.status, row.source.boardStatusLabel),
      priorityLabel: mapTaskPriorityToBoardPriority(row.priority),
      scheduleTime: row.scheduleTime,
      scheduleDay: row.scheduleDay,
      recurrence: row.recurrence,
      placeText: row.placeText,
      taskType: row.taskType,
      notes: row.source.description ?? '',
    });
  }, [row]);

  const save = async () => {
    const safeDay = DAYS.includes(draft.scheduleDay) ? draft.scheduleDay : 'Monday';
    const safeTime = /^\d{2}:\d{2}$/.test(draft.scheduleTime) ? draft.scheduleTime : '09:00';
    const dueDate = toIsoFromBoardSchedule(safeDay, safeTime);

    await updateTask.mutateAsync({
      title: draft.title.trim() || row.title,
      description: draft.notes,
      dueDate,
      status: mapBoardStatusToTaskStatus(draft.boardStatusLabel),
      priority: mapBoardPriorityToTaskPriority(draft.priorityLabel),
      patientName: draft.patientName,
      doctorName: draft.doctorName,
      nurseName: draft.nurseName,
      taskType: draft.taskType,
      placeText: draft.placeText,
      recurrence: draft.recurrence,
      scheduleDay: safeDay,
      scheduleTime: safeTime,
      boardStatusLabel: draft.boardStatusLabel,
      assigneeName: draft.nurseName,
    });

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Task Details</Text>
            <Pressable style={styles.close} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Field label="Task">
              <TextInput
                value={draft.title}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, title: value }))}
                style={styles.input}
                placeholder="Task"
                placeholderTextColor="#94a3b8"
              />
            </Field>

            <Field label="Patient">
              <TextInput
                value={draft.patientName}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, patientName: value }))}
                style={styles.input}
                placeholder="Patient"
                placeholderTextColor="#94a3b8"
              />
            </Field>

            <Field label="Status">
              <OptionRow
                options={STATUS_OPTIONS}
                active={draft.boardStatusLabel}
                onSelect={(value) => setDraft((prev) => ({ ...prev, boardStatusLabel: value }))}
              />
            </Field>

            <Field label="Priority">
              <OptionRow
                options={PRIORITY_OPTIONS}
                active={draft.priorityLabel}
                onSelect={(value) => setDraft((prev) => ({ ...prev, priorityLabel: value }))}
              />
            </Field>

            <Field label="Doctor">
              <OptionRow
                options={DOCTORS.map((doctor) => doctor.name)}
                active={draft.doctorName}
                onSelect={(value) => setDraft((prev) => ({ ...prev, doctorName: value }))}
              />
            </Field>

            <Field label="Nurse">
              <OptionRow
                options={NURSES.map((nurse) => nurse.name)}
                active={draft.nurseName}
                onSelect={(value) => setDraft((prev) => ({ ...prev, nurseName: value }))}
              />
            </Field>

            <Field label="Time (HH:mm)">
              <TextInput
                value={draft.scheduleTime}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, scheduleTime: value }))}
                style={styles.input}
                placeholder="08:00"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>

            <Field label="Day">
              <OptionRow
                options={DAYS}
                active={draft.scheduleDay}
                onSelect={(value) => setDraft((prev) => ({ ...prev, scheduleDay: value }))}
              />
            </Field>

            <Field label="Recurrence">
              <OptionRow
                options={RECURRENCE}
                active={draft.recurrence}
                onSelect={(value) => setDraft((prev) => ({ ...prev, recurrence: value }))}
              />
            </Field>

            <Field label="Place">
              <OptionRow
                options={PLACES}
                active={draft.placeText}
                onSelect={(value) => setDraft((prev) => ({ ...prev, placeText: value }))}
              />
            </Field>

            <Field label="Type">
              <OptionRow
                options={TASK_TYPES}
                active={draft.taskType}
                onSelect={(value) => setDraft((prev) => ({ ...prev, taskType: value }))}
              />
            </Field>

            <Field label="Notes">
              <TextInput
                value={draft.notes}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, notes: value }))}
                style={[styles.input, styles.multiline]}
                multiline
                textAlignVertical="top"
                placeholder="Notes"
                placeholderTextColor="#94a3b8"
              />
            </Field>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, updateTask.isPending && styles.saveButtonDisabled]}
              onPress={() => void save()}
              disabled={updateTask.isPending}
            >
              <Text style={styles.saveText}>{updateTask.isPending ? 'Saving...' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function OptionRow({
  options,
  active,
  onSelect,
}: {
  options: string[];
  active: string;
  onSelect: (value: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
      {options.map((option) => {
        const isActive = option === active;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.optionChip, isActive && styles.optionChipActive]}
          >
            <Text style={[styles.optionText, isActive && styles.optionTextActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
  },
  card: {
    width: '100%',
    maxHeight: '92%',
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  closeText: {
    fontSize: 20,
    color: '#94a3b8',
    lineHeight: 20,
  },
  body: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  field: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontSize: 14,
  },
  multiline: {
    minHeight: 86,
  },
  optionRow: {
    gap: 8,
  },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  optionChipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  optionText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  optionTextActive: {
    color: '#1d4ed8',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  cancelText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
  },
  saveButton: {
    borderRadius: 10,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '800',
  },
});

export default TaskModalNative;
