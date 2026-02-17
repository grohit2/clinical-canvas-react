import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react-native';
import { useDeleteTask, useUpdateTask } from '../../api/useUpdateTask';
import type { TaskBoardRow, TaskBoardSection } from '../../board/types';
import {
  PersonAvatarCell,
  PriorityCell,
  StatusCell,
  StatusProgressBar,
  TextCell,
} from './TaskCells.native';

const LEFT_COL_WIDTH = 210;
const COLUMNS = [
  { key: 'patient', label: 'Patient', width: 110 },
  { key: 'doctor', label: 'Doctor', width: 72 },
  { key: 'nurse', label: 'Nurse', width: 72 },
  { key: 'status', label: 'Status', width: 106 },
  { key: 'priority', label: 'Priority', width: 98 },
  { key: 'time', label: 'Time', width: 70 },
  { key: 'day', label: 'Day', width: 70 },
  { key: 'recurrence', label: 'Recurring', width: 96 },
  { key: 'place', label: 'Place', width: 100 },
  { key: 'type', label: 'Type', width: 110 },
] as const;

const SCROLL_WIDTH = COLUMNS.reduce((sum, col) => sum + col.width, 0);

export interface TableGroupNativeProps {
  section: TaskBoardSection;
  collapsed: boolean;
  selectedRowId: string | null;
  onToggleCollapsed: () => void;
  onSelectRow: (row: TaskBoardRow) => void;
  onAddTask: (section: TaskBoardSection) => void;
}

export function TableGroupNative(props: TableGroupNativeProps) {
  const { section, collapsed, selectedRowId, onToggleCollapsed, onSelectRow, onAddTask } = props;

  return (
    <View style={styles.groupWrap}>
      <View style={styles.groupHeaderRow}>
        <Pressable style={styles.chevronButton} onPress={onToggleCollapsed}>
          <Text style={[styles.chevron, collapsed && styles.chevronCollapsed]}>▾</Text>
        </Pressable>

        <Text style={[styles.groupTitle, { color: section.color }]} numberOfLines={1}>
          {section.title}
        </Text>

        <Text style={styles.groupMeta}>{section.total} tasks</Text>

        {section.urgentCount > 0 ? (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>{section.urgentCount} urgent</Text>
          </View>
        ) : null}
      </View>

      {collapsed ? (
        <View style={styles.collapsedBarWrap}>
          <StatusProgressBar labels={section.rows.map((row) => row.boardStatusLabel)} />
        </View>
      ) : (
        <View style={styles.tableShell}>
          <View style={styles.tableRow}>
            <View style={styles.leftColumn}>
              <View style={styles.leftHeaderRow}>
                <View style={[styles.groupColorStrip, { backgroundColor: section.color }]} />
                <View style={styles.fakeCheck} />
                <Text style={styles.leftHeaderText}>Task</Text>
              </View>

              {section.rows.map((row, rowIndex) => (
                <TaskNameRow
                  key={row.id}
                  row={row}
                  selected={selectedRowId === row.id}
                  sectionColor={section.color}
                  isLast={rowIndex === section.rows.length - 1}
                  onSelect={onSelectRow}
                />
              ))}

              <Pressable style={styles.addRow} onPress={() => onAddTask(section)}>
                <View style={[styles.groupColorStrip, styles.addColorStrip, { backgroundColor: section.color }]} />
                <View style={styles.fakeCheck} />
                <Text style={styles.addText}>+ Add task</Text>
              </Pressable>

              <View style={styles.leftProgressFooter}>
                <View style={[styles.groupColorStrip, styles.addColorStrip, { backgroundColor: section.color }]} />
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.rightScroller}
              contentContainerStyle={styles.rightScrollerContent}
            >
              <View style={{ width: SCROLL_WIDTH }}>
                <View style={styles.rightHeaderRow}>
                  {COLUMNS.map((column) => (
                    <View key={column.key} style={[styles.headerCell, { width: column.width, minWidth: column.width }]}> 
                      <Text style={styles.headerCellText}>{column.label}</Text>
                    </View>
                  ))}
                </View>

                {section.rows.map((row, rowIndex) => (
                  <TaskDataRow
                    key={row.id}
                    row={row}
                    selected={selectedRowId === row.id}
                    isLast={rowIndex === section.rows.length - 1}
                    onSelect={onSelectRow}
                  />
                ))}

                <View style={styles.addMirrorRow} />

                <View style={styles.progressFooterRow}>
                  {COLUMNS.map((column) => (
                    <View
                      key={column.key}
                      style={[styles.footerCell, { width: column.width, minWidth: column.width }]}
                    >
                      {column.key === 'status' ? (
                        <StatusProgressBar labels={section.rows.map((row) => row.boardStatusLabel)} />
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

function TaskNameRow({
  row,
  selected,
  sectionColor,
  isLast,
  onSelect,
}: {
  row: TaskBoardRow;
  selected: boolean;
  sectionColor: string;
  isLast: boolean;
  onSelect: (row: TaskBoardRow) => void;
}) {
  const updateTask = useUpdateTask(row.id);
  const deleteTask = useDeleteTask(row.id);
  const completed = row.status === 'completed';

  return (
    <View style={[styles.leftDataRow, !isLast && styles.withBottomBorder, selected && styles.rowSelected]}> 
      <View style={[styles.groupColorStrip, { backgroundColor: sectionColor, opacity: 0.5 }]} />

      <Pressable
        style={styles.checkWrap}
        onPress={() => updateTask.mutate({ status: completed ? 'pending' : 'completed' })}
      >
        {completed ? <CheckCircle2 size={15} color="#00c875" /> : <Circle size={15} color="#94a3b8" />}
      </Pressable>

      <Pressable style={styles.nameButton} onPress={() => onSelect(row)}>
        <Text style={[styles.taskName, completed && styles.taskNameDone]} numberOfLines={1}>
          {row.title}
        </Text>
      </Pressable>

      <Pressable style={styles.deleteBtn} onPress={() => deleteTask.mutate()}>
        <Trash2 size={14} color="#ef4444" />
      </Pressable>
    </View>
  );
}

function TaskDataRow({
  row,
  selected,
  isLast,
  onSelect,
}: {
  row: TaskBoardRow;
  selected: boolean;
  isLast: boolean;
  onSelect: (row: TaskBoardRow) => void;
}) {
  return (
    <Pressable
      style={[styles.rightDataRow, !isLast && styles.withBottomBorder, selected && styles.rowSelected]}
      onPress={() => onSelect(row)}
    >
      <TextCell value={row.patientName} width={110} color="#1f2937" fontWeight="600" align="left" />
      <PersonAvatarCell person={row.doctor} width={72} />
      <PersonAvatarCell person={row.nurse} width={72} />
      <StatusCell status={row.status} boardStatusLabel={row.boardStatusLabel} width={106} />
      <PriorityCell priority={row.priority} width={98} />
      <TextCell value={row.scheduleTime} width={70} />
      <TextCell value={row.scheduleDay.slice(0, 3)} width={70} />
      <TextCell value={row.recurrence === 'None' ? '—' : row.recurrence} width={96} color="#579bfc" />
      <TextCell value={row.placeText} width={100} />
      <TextCell value={row.taskType} width={110} color="#7c5cbf" fontWeight="600" align="left" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groupWrap: {
    marginBottom: 14,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  chevronButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 14,
    color: '#64748b',
    transform: [{ rotate: '90deg' }],
  },
  chevronCollapsed: {
    transform: [{ rotate: '0deg' }],
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  groupMeta: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  urgentBadge: {
    marginLeft: 'auto',
    borderRadius: 999,
    backgroundColor: '#df2f4a',
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  urgentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  collapsedBarWrap: {
    marginHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#fff',
    padding: 10,
  },
  tableShell: {
    marginHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
  },
  leftColumn: {
    width: LEFT_COL_WIDTH,
    minWidth: LEFT_COL_WIDTH,
    borderRightWidth: 1,
    borderRightColor: '#e0e3eb',
    backgroundColor: '#fff',
  },
  leftHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    backgroundColor: '#f5f6f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e3eb',
  },
  groupColorStrip: {
    width: 6,
    height: '100%',
  },
  addColorStrip: {
    opacity: 0.2,
  },
  fakeCheck: {
    width: 22,
  },
  leftHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#676879',
  },
  leftDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  withBottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f7',
  },
  rowSelected: {
    backgroundColor: '#eff6ff',
  },
  checkWrap: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameButton: {
    flex: 1,
    paddingRight: 6,
  },
  taskName: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  taskNameDone: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  deleteBtn: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f7',
  },
  addText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
  },
  leftProgressFooter: {
    height: 34,
    backgroundColor: '#f5f6f8',
    borderTopWidth: 1,
    borderTopColor: '#e0e3eb',
  },
  rightScroller: {
    flex: 1,
  },
  rightScrollerContent: {
    minWidth: SCROLL_WIDTH,
  },
  rightHeaderRow: {
    flexDirection: 'row',
    height: 36,
    backgroundColor: '#f5f6f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e3eb',
  },
  headerCell: {
    borderLeftWidth: 1,
    borderLeftColor: '#eef0f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCellText: {
    fontSize: 12,
    color: '#676879',
    fontWeight: '700',
  },
  rightDataRow: {
    flexDirection: 'row',
    height: 40,
  },
  addMirrorRow: {
    height: 40,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f7',
  },
  progressFooterRow: {
    flexDirection: 'row',
    height: 34,
    backgroundColor: '#f5f6f8',
    borderTopWidth: 1,
    borderTopColor: '#e0e3eb',
  },
  footerCell: {
    borderLeftWidth: 1,
    borderLeftColor: '#eef0f4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});

export default TableGroupNative;
