import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera } from 'lucide-react-native';
import type { YearSummary } from '../../core/groupByDate';

const CARD_WIDTH = 172;
const CARD_HEIGHT = 214;
const CARD_GAP = 12;

function resolveGradient(summary: YearSummary, currentYear: number): string[] {
  if (summary.year === currentYear) {
    return ['#4a7fb5', '#87CEEB', '#B0C4DE'];
  }
  return summary.dominantGradient;
}

export function YearCardsStrip({
  years,
  currentYear,
  onYearPress,
  onCurrentYearAction,
}: {
  years: YearSummary[];
  currentYear: number;
  onYearPress: (year: number) => void;
  onCurrentYearAction?: () => void;
}) {
  if (!years.length) return null;

  return (
    <View style={styles.wrap}>
      <FlatList
        horizontal
        data={years}
        keyExtractor={(item) => `${item.year}`}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.content}
        renderItem={({ item, index }) => {
          const isCaptureCard = index === 0;
          return (
            <Pressable
              onPress={() => {
                if (isCaptureCard && onCurrentYearAction) {
                  onCurrentYearAction();
                  return;
                }
                onYearPress(item.year);
              }}
              style={styles.cardPressable}
            >
              <LinearGradient
                colors={resolveGradient(item, currentYear) as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                {isCaptureCard ? (
                  <View style={styles.captureCard}>
                    <View style={styles.captureIconWrap}>
                      <Camera size={28} color="#ffffff" />
                      <View style={styles.plusBadge}>
                        <Text style={styles.plusText}>+</Text>
                      </View>
                    </View>
                    <Text style={styles.captureTitle}>Capture</Text>
                    <Text style={styles.captureSubTitle}>Open camera</Text>
                  </View>
                ) : (
                  <View style={styles.footer}>
                    <Text style={styles.yearText}>{item.year}</Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    marginBottom: 14,
  },
  content: {
    gap: CARD_GAP,
    paddingRight: 8,
  },
  cardPressable: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    padding: 14,
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  captureCard: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 10,
  },
  captureIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  plusBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  plusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 12,
  },
  captureTitle: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
    textShadowColor: 'rgba(15,23,42,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captureSubTitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    gap: 4,
  },
  yearText: {
    fontSize: 56,
    lineHeight: 56,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(15,23,42,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
