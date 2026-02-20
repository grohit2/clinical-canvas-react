import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { DocumentItem } from '../../core/types';
import { BackupBadge } from './BackupBadge.native';

export function DocumentCard({
  document,
  selectionMode,
  selected,
  onPress,
  onLongPress,
}: {
  document: DocumentItem;
  selectionMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const sourceUri =
    document.localThumbUri || document.thumbUrl || document.localUri || document.fileUrl;

  return (
    <Pressable
      style={[styles.card, selected ? styles.selected : undefined]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {document.isImage && sourceUri ? (
        <Image source={{ uri: sourceUri }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={styles.fileFallback}>
          <Text style={styles.fileName} numberOfLines={3}>
            {document.name}
          </Text>
        </View>
      )}

      <View style={styles.badgeWrap}>
        <BackupBadge backupState={document.backupState} offlineState={document.offlineState} />
      </View>

      {selectionMode ? (
        <View style={[styles.checkbox, selected ? styles.checkboxSelected : undefined]}>
          <Text style={styles.checkText}>{selected ? '✓' : ''}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    aspectRatio: 1,
  },
  selected: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fileFallback: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  fileName: {
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
    fontWeight: '600',
  },
  badgeWrap: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
  },
  checkbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  checkText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
});
