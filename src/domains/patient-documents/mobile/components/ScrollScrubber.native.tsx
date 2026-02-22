import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import type { YearSummary } from '../../core';
import { ScrubberBubble } from './ScrubberBubble.native';

function toShortYear(year: number): string {
  return `'${String(year).slice(-2)}`;
}

export function ScrollScrubber({
  years,
  activeYear,
  visible,
  panGesture,
  bubbleLabel,
  bubbleOpacity,
  bubbleY,
  onYearPress,
  onArrowPress,
  onLayoutHeight,
}: {
  years: YearSummary[];
  activeYear: number;
  visible: boolean;
  panGesture: ReturnType<typeof Gesture.Pan>;
  bubbleLabel: string;
  bubbleOpacity: SharedValue<number>;
  bubbleY: SharedValue<number>;
  onYearPress: (year: number) => void;
  onArrowPress: (direction: 'up' | 'down') => void;
  onLayoutHeight: (height: number) => void;
}) {
  if (!visible || !years.length) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <Pressable style={styles.arrowButton} onPress={() => onArrowPress('up')}>
        <Text style={styles.arrowText}>▲</Text>
      </Pressable>

      <GestureDetector gesture={panGesture}>
        <View
          style={styles.labelsWrap}
          onLayout={(event) => onLayoutHeight(event.nativeEvent.layout.height)}
        >
          {years.map((item) => {
            const active = item.year === activeYear;
            return (
              <Pressable
                key={item.year}
                onPress={() => onYearPress(item.year)}
                style={[styles.labelWrap, active && styles.labelWrapActive]}
              >
                <Text style={[styles.label, active && styles.labelActive]}>
                  {toShortYear(item.year)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>

      <Pressable style={styles.arrowButton} onPress={() => onArrowPress('down')}>
        <Text style={styles.arrowText}>▼</Text>
      </Pressable>

      <ScrubberBubble label={bubbleLabel} opacity={bubbleOpacity} y={bubbleY} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 4,
    top: '15%',
    bottom: '10%',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  arrowButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '800',
  },
  labelsWrap: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    minHeight: 160,
  },
  labelWrap: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  labelWrapActive: {
    backgroundColor: 'rgba(30,41,59,0.86)',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666666',
  },
  labelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
