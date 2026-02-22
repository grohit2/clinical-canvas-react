import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { CloudOff } from 'lucide-react-native';
import type { DocumentItem } from '../../core/types';
import { BackupBadge } from './BackupBadge.native';

function toGeoLabel(document: DocumentItem): string | null {
  const geo = document.geo;
  if (!geo) return null;
  if (geo.address?.trim()) return geo.address.trim();
  return `${geo.latitude.toFixed(5)}, ${geo.longitude.toFixed(5)}`;
}

function resolveCardImage(document: DocumentItem): string | undefined {
  // Geo-tagged photos already render a live label in card UI; prefer untinted sources first.
  if (document.geo) {
    return document.localUri || document.fileUrl || document.thumbUrl || document.localThumbUri;
  }
  return document.localThumbUri || document.thumbUrl || document.localUri || document.fileUrl;
}

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
  const sourceUri = resolveCardImage(document);
  const geoLabel = toGeoLabel(document);
  const showNotBackedUp = document.isImage && document.backupState !== 'backed_up';

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

      {geoLabel ? (
        <View style={styles.geoOverlay}>
          <Text style={styles.geoText} numberOfLines={2}>
            {geoLabel}
          </Text>
        </View>
      ) : null}

      {showNotBackedUp && !selectionMode ? (
        <View style={styles.offlineBadge}>
          <CloudOff size={12} color="#ffffff" />
        </View>
      ) : null}

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
  geoOverlay: {
    position: 'absolute',
    left: 6,
    right: 36,
    top: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.38)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  geoText: {
    color: '#f8fafc',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
  badgeWrap: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
  },
  offlineBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.62)',
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
