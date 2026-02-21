import { StyleSheet, View } from 'react-native';
import type { DocCategory, FolderSummary } from '../../core/types';
import { AlbumCard } from './AlbumCard.native';

export function AlbumGrid({
  summaries,
  coverMap,
  onOpen,
}: {
  summaries: FolderSummary[];
  coverMap: Map<DocCategory, string[]>;
  onOpen: (category: DocCategory) => void;
}) {
  const rows: FolderSummary[][] = [];
  for (let i = 0; i < summaries.length; i += 2) {
    rows.push(summaries.slice(i, i + 2));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row, index) => (
        <View key={`row-${index}`} style={styles.row}>
          {row.map((summary) => (
            <AlbumCard
              key={summary.category}
              summary={summary}
              coverUris={coverMap.get(summary.category) || []}
              onPress={onOpen}
            />
          ))}
          {row.length === 1 ? <View style={styles.spacer} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  spacer: {
    flex: 1,
  },
});
