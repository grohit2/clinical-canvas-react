import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { formatUpdatedAt } from '../../core/utils';
import type { DocCategory, FolderSummary } from '../../core/types';
import { CATEGORY_CONFIG } from '../categoryConfig.native';

function CoverMosaic({
  category,
  uris,
}: {
  category: DocCategory;
  uris: string[];
}) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  if (!uris.length) {
    return (
      <LinearGradient colors={config.gradient} style={styles.gradientPlaceholder}>
        <Icon size={32} color="rgba(255,255,255,0.85)" />
      </LinearGradient>
    );
  }

  if (uris.length === 1) {
    return <Image source={{ uri: uris[0] }} style={styles.singleCover} contentFit="cover" />;
  }

  if (uris.length === 2) {
    return (
      <View style={styles.twoCols}>
        {uris.map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.halfTile} contentFit="cover" />
        ))}
      </View>
    );
  }

  if (uris.length === 3) {
    return (
      <View style={styles.threeWrap}>
        <Image source={{ uri: uris[0] }} style={styles.threeLarge} contentFit="cover" />
        <View style={styles.threeStack}>
          <Image source={{ uri: uris[1] }} style={styles.threeSmall} contentFit="cover" />
          <Image source={{ uri: uris[2] }} style={styles.threeSmall} contentFit="cover" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fourGrid}>
      {uris.slice(0, 4).map((uri) => (
        <Image key={uri} source={{ uri }} style={styles.gridTile} contentFit="cover" />
      ))}
    </View>
  );
}

export function AlbumCard({
  summary,
  coverUris,
  onPress,
}: {
  summary: FolderSummary;
  coverUris: string[];
  onPress: (category: DocCategory) => void;
}) {
  const config = CATEGORY_CONFIG[summary.category];

  return (
    <Pressable style={styles.card} onPress={() => onPress(summary.category)}>
      <View style={styles.coverWrap}>
        <CoverMosaic category={summary.category} uris={coverUris} />
      </View>

      <View style={styles.infoStrip}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {config.title}
          </Text>
          <Text style={styles.count}>{summary.count}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.updatedText} numberOfLines={1}>
            {formatUpdatedAt(summary.lastUpdatedAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    aspectRatio: 3 / 4,
  },
  coverWrap: {
    height: '65%',
    backgroundColor: '#f1f5f9',
  },
  gradientPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleCover: {
    width: '100%',
    height: '100%',
  },
  twoCols: {
    flex: 1,
    flexDirection: 'row',
    gap: 1,
  },
  halfTile: {
    flex: 1,
    height: '100%',
  },
  threeWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 1,
  },
  threeLarge: {
    width: '66.5%',
    height: '100%',
  },
  threeStack: {
    flex: 1,
    gap: 1,
  },
  threeSmall: {
    flex: 1,
    width: '100%',
  },
  fourGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  gridTile: {
    width: '49.5%',
    height: '49.5%',
  },
  infoStrip: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  count: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  updatedText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
});
