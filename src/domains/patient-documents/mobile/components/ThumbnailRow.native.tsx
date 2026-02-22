import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { CloudOff } from 'lucide-react-native';
import type { DocumentItem } from '../../core/types';

const GAP = 4;

function resolveThumbnailSource(document: DocumentItem): string | undefined {
  return document.localThumbUri || document.thumbUrl || document.localUri || document.fileUrl;
}

function ThumbnailRowImpl({
  items,
  columns,
  tileSize,
  selectionMode,
  selectedIds,
  onPress,
  onLongPress,
  onToggleDocument,
}: {
  items: DocumentItem[];
  columns: number;
  tileSize: number;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onPress: (doc: DocumentItem) => void;
  onLongPress: (doc: DocumentItem) => void;
  onToggleDocument: (docId: string) => void;
}) {
  return (
    <View style={styles.row}>
      {items.map((document) => {
        const sourceUri = resolveThumbnailSource(document);
        const selected = selectedIds.has(document.id);
        const showNotBackedUp = document.isImage && document.backupState !== 'backed_up';

        return (
          <Pressable
            key={document.id}
            onPress={() => {
              if (selectionMode) {
                onToggleDocument(document.id);
                return;
              }
              onPress(document);
            }}
            onLongPress={() => onLongPress(document)}
            style={[
              styles.tile,
              {
                width: tileSize,
                height: tileSize,
              },
              selected && styles.tileSelected,
            ]}
          >
            {document.isImage && sourceUri ? (
              <Image
                source={{ uri: sourceUri }}
                style={styles.image}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={document.id}
              />
            ) : (
              <View style={styles.fileFallback}>
                <Text style={styles.fileName} numberOfLines={3}>
                  {document.name}
                </Text>
              </View>
            )}

            {showNotBackedUp ? (
              <View style={styles.offlineBadge}>
                <CloudOff size={12} color="#ffffff" />
              </View>
            ) : null}

            {selectionMode ? (
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                <Text style={[styles.checkText, selected && styles.checkTextSelected]}>
                  {selected ? '✓' : ''}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}

      {Array.from({ length: Math.max(columns - items.length, 0) }).map((_, index) => (
        <View
          key={`spacer-${index}`}
          style={[
            styles.tileSpacer,
            {
              width: tileSize,
              height: tileSize,
            },
          ]}
        />
      ))}
    </View>
  );
}

export const ThumbnailRow = memo(ThumbnailRowImpl, (prev, next) => {
  if (prev.selectionMode !== next.selectionMode) return false;
  if (prev.tileSize !== next.tileSize) return false;
  if (prev.columns !== next.columns) return false;
  if (prev.items.length !== next.items.length) return false;

  for (let i = 0; i < prev.items.length; i += 1) {
    if (prev.items[i].id !== next.items[i].id) {
      return false;
    }

    const prevSelected = prev.selectedIds.has(prev.items[i].id);
    const nextSelected = next.selectedIds.has(next.items[i].id);
    if (prevSelected !== nextSelected) {
      return false;
    }
  }

  return true;
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: 6,
  },
  tile: {
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fileFallback: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  fileName: {
    fontSize: 11,
    textAlign: 'center',
    color: '#334155',
    fontWeight: '600',
  },
  offlineBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: 'rgba(255,255,255,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  checkText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '700',
  },
  checkTextSelected: {
    color: '#ffffff',
  },
  tileSpacer: {
    backgroundColor: 'transparent',
  },
});
