import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { DocumentItem } from '../core/types';
import { DocumentCard } from './DocumentCard.native';

function resolveColumns(width: number): 2 | 3 | 4 {
  if (width >= 1100) return 4;
  if (width >= 700) return 3;
  return 2;
}

export function DocumentGrid({
  documents,
  selectionMode,
  selectedIds,
  onPressDocument,
  onToggleDocument,
  onRefresh,
  refreshing,
}: {
  documents: DocumentItem[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  onPressDocument: (doc: DocumentItem, index: number) => void;
  onToggleDocument: (docId: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const { width } = useWindowDimensions();
  const numColumns = resolveColumns(width);

  if (!documents.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No documents yet</Text>
        <Text style={styles.emptySubtitle}>Capture from camera or import from gallery.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={documents}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      key={numColumns}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      onRefresh={onRefresh}
      refreshing={!!refreshing}
      renderItem={({ item, index }) => {
        const selected = selectedIds.has(item.id);
        return (
          <View style={styles.itemWrap}>
            <DocumentCard
              document={item}
              selectionMode={selectionMode}
              selected={selected}
              onPress={() => {
                if (selectionMode) {
                  onToggleDocument(item.id);
                } else {
                  onPressDocument(item, index);
                }
              }}
              onLongPress={() => onToggleDocument(item.id)}
            />
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 8,
  },
  row: {
    gap: 10,
    marginBottom: 10,
  },
  itemWrap: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
