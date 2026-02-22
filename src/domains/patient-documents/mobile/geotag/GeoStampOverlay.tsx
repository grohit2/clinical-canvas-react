import { StyleSheet, Text, View } from 'react-native';

export function GeoStampOverlay({
  address,
  latitude,
  longitude,
  capturedAtIso,
}: {
  address?: string;
  latitude: number;
  longitude: number;
  capturedAtIso?: string;
}) {
  const title = address?.trim() || 'Location captured';
  const coords = `Lat ${latitude.toFixed(6)}, Long ${longitude.toFixed(6)}`;

  let dateLine = '';
  if (capturedAtIso) {
    const parsed = new Date(capturedAtIso);
    dateLine = Number.isNaN(parsed.getTime()) ? capturedAtIso : parsed.toLocaleString();
  }

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.title} numberOfLines={1}>
        GeoTag: {title}
      </Text>
      <Text style={styles.sub} numberOfLines={1}>
        {coords}
      </Text>
      {dateLine ? (
        <Text style={styles.subMuted} numberOfLines={1}>
          {dateLine}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  sub: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  subMuted: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
});
