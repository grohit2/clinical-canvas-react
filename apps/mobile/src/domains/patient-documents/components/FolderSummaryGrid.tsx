import { StyleSheet, View } from 'react-native';
import type { DocCategory, FolderSummary } from '../core/types';
import { FolderCard } from './FolderCard';

export function FolderSummaryGrid({
  summaries,
  onOpen,
}: {
  summaries: FolderSummary[];
  onOpen: (category: DocCategory) => void;
}) {
  const rows: FolderSummary[][] = [];
  for (let i = 0; i < summaries.length; i += 2) {
    rows.push(summaries.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, index) => (
        <View key={`row-${index}`} style={styles.row}>
          {row.map((summary) => (
            <FolderCard key={summary.category} summary={summary} onPress={onOpen} />
          ))}
          {row.length === 1 ? <View style={styles.spacer} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  spacer: {
    flex: 1,
  },
});
