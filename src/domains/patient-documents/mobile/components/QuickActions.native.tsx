import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CloudDownload, Inbox } from 'lucide-react-native';

export function QuickActions({
  onImportShare,
  onDownloadOffline,
  offlineCount,
  totalCount,
}: {
  onImportShare: () => void;
  onDownloadOffline: () => void;
  offlineCount: number;
  totalCount: number;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.chip} onPress={onImportShare}>
        <Inbox size={16} color="#1e293b" />
        <Text style={styles.chipText}>Import Share</Text>
      </Pressable>

      <Pressable style={styles.chip} onPress={onDownloadOffline}>
        <CloudDownload size={16} color="#1e293b" />
        <Text style={styles.chipText}>
          Download Offline ({offlineCount}/{totalCount})
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 24,
    paddingTop: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
  },
});
