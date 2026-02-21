import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FolderOpen } from 'lucide-react-native';
import { formatUpdatedAt } from '../../core/utils';

export function AllDocumentsBanner({
  totalCount,
  recentThumbs,
  lastUpdatedAt,
  onPress,
}: {
  totalCount: number;
  recentThumbs: string[];
  lastUpdatedAt?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.topMosaic}>
        {recentThumbs.length ? (
          recentThumbs.slice(0, 5).map((uri, index) => (
            <Image
              key={`${uri}-${index}`}
              source={{ uri }}
              style={styles.topTile}
              contentFit="cover"
            />
          ))
        ) : (
          <LinearGradient colors={['#64748b', '#334155']} style={styles.placeholder}>
            <FolderOpen size={26} color="rgba(255,255,255,0.8)" />
            <Text style={styles.placeholderText}>All Documents</Text>
          </LinearGradient>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>All Documents</Text>
          <Text style={styles.count}>{totalCount} items</Text>
        </View>
        <Text style={styles.updatedText}>{formatUpdatedAt(lastUpdatedAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    marginBottom: 14,
  },
  topMosaic: {
    height: 120,
    flexDirection: 'row',
    gap: 1,
    backgroundColor: '#e2e8f0',
  },
  topTile: {
    flex: 1,
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  info: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  count: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  updatedText: {
    color: '#64748b',
    fontSize: 12,
  },
});
