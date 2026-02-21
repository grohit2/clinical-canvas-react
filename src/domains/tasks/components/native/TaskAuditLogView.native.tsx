import { StyleSheet, Text, View } from 'react-native';
import type { TaskBoardAuditRow } from '../../models/types';

export interface TaskAuditLogViewNativeProps {
  rows: TaskBoardAuditRow[];
}

export function TaskAuditLogViewNative(props: TaskAuditLogViewNativeProps) {
  const { rows } = props;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Audit Activity</Text>
      {rows.length === 0 ? <Text style={styles.empty}>No activity yet.</Text> : null}
      {rows.map((row) => (
        <View key={row.id} style={styles.item}>
          <Text style={styles.itemTitle}>{row.title}</Text>
          <Text style={styles.itemDetail}>{row.detail}</Text>
          <Text style={styles.itemMeta}>{new Date(row.at).toLocaleString()}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#fff',
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  empty: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748b',
  },
  item: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#f8fafc',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemDetail: {
    marginTop: 2,
    fontSize: 12,
    color: '#475569',
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 11,
    color: '#94a3b8',
  },
});

export default TaskAuditLogViewNative;
