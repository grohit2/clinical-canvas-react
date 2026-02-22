import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { DocumentItem } from '../../core/types';
import { GeoStampOverlay } from '../geotag/GeoStampOverlay';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.max(min, Math.min(value, max));
}

export function DocumentLightbox({
  visible,
  document,
  currentIndex,
  totalCount,
  canPrev,
  canNext,
  onClose,
  onNavigate,
}: {
  visible: boolean;
  document: DocumentItem | null;
  currentIndex: number;
  totalCount: number;
  canPrev: boolean;
  canNext: boolean;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}) {
  const { width, height } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = clamp(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE);
    });

  const pan = Gesture.Pan()
    .onBegin(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedX.value + event.translationX;
        translateY.value = savedY.value + event.translationY;
      } else {
        translateX.value = event.translationX * 0.2;
        translateY.value = 0;
      }
    })
    .onEnd((event) => {
      if (scale.value <= 1) {
        if (event.translationX < -70 && canNext) {
          runOnJS(onNavigate)('next');
        } else if (event.translationX > 70 && canPrev) {
          runOnJS(onNavigate)('prev');
        }

        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value === 1) {
        scale.value = withTiming(2);
      } else {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const uri = document?.localUri || document?.fileUrl;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.header}>
          <Text style={styles.counter}>
            {Math.min(currentIndex + 1, totalCount)} / {totalCount}
          </Text>
          <Pressable
            style={styles.actionButton}
            onPress={() => {
              onClose();
              reset();
            }}
          >
            <Text style={styles.actionButtonText}>Close</Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          {uri ? (
            <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
              <Animated.View style={animatedStyle}>
                <View style={{ width: width * 0.92, height: height * 0.74 }}>
                  <Image
                    source={{ uri }}
                    style={{ width: width * 0.92, height: height * 0.74 }}
                    contentFit="contain"
                  />
                  {document?.geo ? (
                    <GeoStampOverlay
                      address={document.geo.address}
                      latitude={document.geo.latitude}
                      longitude={document.geo.longitude}
                      capturedAtIso={document.geo.capturedAt}
                    />
                  ) : null}
                </View>
              </Animated.View>
            </GestureDetector>
          ) : (
            <Text style={styles.fallback}>Preview unavailable</Text>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable
            disabled={!canPrev}
            style={[styles.navButton, !canPrev ? styles.navDisabled : undefined]}
            onPress={() => {
              reset();
              onNavigate('prev');
            }}
          >
            <Text style={styles.navText}>Prev</Text>
          </Pressable>
          <Pressable
            disabled={!canNext}
            style={[styles.navButton, !canNext ? styles.navDisabled : undefined]}
            onPress={() => {
              reset();
              onNavigate('next');
            }}
          >
            <Text style={styles.navText}>Next</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 56,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  actionButton: {
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 42,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navDisabled: {
    opacity: 0.35,
  },
  navText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
