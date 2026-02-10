import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CATEGORY_CONFIG } from '../core/categoryConfig';
import type { DocCategory, FolderSummary } from '../core/types';

function formatUpdatedAt(value?: string): string {
  if (!value) return 'No uploads yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No uploads yet';

  return `Updated ${date.toLocaleDateString()}`;
}

export function FolderCard({
  summary,
  onPress,
}: {
  summary: FolderSummary;
  onPress: (category: DocCategory) => void;
}) {
  const config = CATEGORY_CONFIG[summary.category];
  const Icon = config.icon;

  return (
    <Pressable onPress={() => onPress(summary.category)} style={styles.card}>
      <LinearGradient colors={config.gradient} style={styles.iconWrap}>
        <Icon size={22} color="#ffffff" />
      </LinearGradient>

      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.meta}>{summary.count} document{summary.count === 1 ? '' : 's'}</Text>

      {summary.pendingBackupCount > 0 ? (
        <Text style={styles.pending}>{summary.pendingBackupCount} pending backup</Text>
      ) : (
        <Text style={styles.synced}>All backed up</Text>
      )}

      <Text style={styles.updated}>{formatUpdatedAt(summary.lastUpdatedAt)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  meta: {
    fontSize: 12,
    color: '#64748b',
  },
  pending: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },
  synced: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  updated: {
    marginTop: 2,
    fontSize: 11,
    color: '#94a3b8',
  },
});
