import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { DocumentItem } from '../../core/types';
import { formatGeoTagSummary, parseGeoTagFromName } from '../geotag';
import { BackupBadge } from './BackupBadge.native';

function formatCapturedAt(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
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
  const sourceUri =
    document.localThumbUri || document.thumbUrl || document.localUri || document.fileUrl;

  const parsedGeo = parseGeoTagFromName(document.name);
  const geo = document.geo || parsedGeo;
  const geoSummary =
    geo && 'capturedAt' in geo
      ? formatGeoTagSummary({
          latitude: geo.latitude,
          longitude: geo.longitude,
          capturedAtIso: geo.capturedAt || new Date().toISOString(),
          locationLabel: 'locationLabel' in geo ? geo.locationLabel : geo.address,
        })
      : parsedGeo
        ? formatGeoTagSummary(parsedGeo)
        : null;

  const capturedAtLabel = formatCapturedAt(document.geo?.capturedAt || parsedGeo?.capturedAtIso);

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

      {geo && geoSummary ? (
        <View style={styles.geoTagWrap}>
          <Text style={styles.geoTagText} numberOfLines={1}>
            {geoSummary}
          </Text>
          {'address' in geo && geo.address ? (
            <Text style={styles.geoTagSubText} numberOfLines={1}>
              {geo.address}
            </Text>
          ) : null}
          {capturedAtLabel ? (
            <Text style={styles.geoTagSubText} numberOfLines={1}>
              {capturedAtLabel}
            </Text>
          ) : null}
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
  geoTagWrap: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 2,
  },
  geoTagText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
  },
  geoTagSubText: {
    color: '#cbd5e1',
    fontSize: 10,
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
