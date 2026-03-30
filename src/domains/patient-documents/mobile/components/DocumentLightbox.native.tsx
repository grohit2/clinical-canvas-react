import { useEffect } from 'react';
import { Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Info, Share2, X } from 'lucide-react-native';
import type { DocumentItem } from '../../core/types';
import { GeoStampOverlay } from '../geotag/GeoStampOverlay';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SWIPE_THRESHOLD = 70;
const DISMISS_THRESHOLD = 100;

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

  /* ── zoom / pan shared values ── */
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  /* ── UI visibility (header / footer) ── */
  const uiVisible = useSharedValue(1);

  /* ── dismiss drag ── */
  const dismissY = useSharedValue(0);

  /* ── transition opacity for smooth navigation ── */
  const imageOpacity = useSharedValue(1);

  const resetImmediate = () => {
    'worklet';
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedX.value = 0;
    savedY.value = 0;
    dismissY.value = 0;
    uiVisible.value = 1;
    imageOpacity.value = 1;
  };

  // Reset all state when lightbox opens or image changes
  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedX.value = 0;
      savedY.value = 0;
      dismissY.value = 0;
      uiVisible.value = 1;
      imageOpacity.value = 1;
    }
  }, [visible, currentIndex]);

  /* ── Gestures ── */

  // Pinch to zoom
  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = clamp(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE);
    });

  // Pan: zoomed = free move, unzoomed = slide horizontally + vertical dismiss
  const pan = Gesture.Pan()
    .minDistance(10)
    .onBegin(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value > 1) {
        // Free pan when zoomed
        translateX.value = savedX.value + event.translationX;
        translateY.value = savedY.value + event.translationY;
      } else {
        // Slide image horizontally with finger (like Google Photos)
        translateX.value = event.translationX;
        // Vertical drag for dismiss
        const dy = event.translationY;
        if (dy > 0) {
          dismissY.value = dy;
        }
      }
    })
    .onEnd((event) => {
      if (scale.value <= 1) {
        // Swipe left (next) — slide current image off to the left
        if (event.translationX < -SWIPE_THRESHOLD && canNext) {
          translateX.value = withTiming(-width, { duration: 200 }, () => {
            resetImmediate();
            runOnJS(onNavigate)('next');
          });
          return;
        }
        // Swipe right (prev) — slide current image off to the right
        if (event.translationX > SWIPE_THRESHOLD && canPrev) {
          translateX.value = withTiming(width, { duration: 200 }, () => {
            resetImmediate();
            runOnJS(onNavigate)('prev');
          });
          return;
        }

        // Check vertical dismiss
        if (dismissY.value > DISMISS_THRESHOLD) {
          dismissY.value = withTiming(height, { duration: 200 });
          runOnJS(onClose)();
          return;
        }

        // Snap back
        translateX.value = withTiming(0, { duration: 150 });
        translateY.value = withTiming(0);
        dismissY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  // Double-tap to toggle zoom
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

  // Single-tap to toggle UI
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      uiVisible.value = withTiming(uiVisible.value > 0.5 ? 0 : 1, { duration: 250 });
    });

  // Exclusive: double-tap wins over single-tap
  const tapGesture = Gesture.Exclusive(doubleTap, singleTap);
  // Simultaneous: pinch + pan work together, tap is separate layer
  const composed = Gesture.Simultaneous(pinch, pan);
  const allGestures = Gesture.Exclusive(composed, tapGesture);

  /* ── Animated styles ── */

  const animatedImageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + dismissY.value },
      { scale: scale.value },
    ],
  }));

  const backdropOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(dismissY.value, [0, height * 0.5], [1, 0.3], 'clamp'),
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: uiVisible.value,
    pointerEvents: uiVisible.value > 0.5 ? 'auto' : 'none',
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: uiVisible.value,
    pointerEvents: uiVisible.value > 0.5 ? 'auto' : 'none',
  }));

  const uri = document?.localUri || document?.fileUrl;
  const docName = document?.name ?? 'Document';
  const displayName = docName.length > 28 ? `${docName.slice(0, 28)}...` : docName;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[styles.backdrop, backdropOpacity]}>
        {/* ── Header with gradient overlay ── */}
        <Animated.View style={[styles.headerWrap, headerStyle]}>
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0)']}
            style={styles.headerGradient}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.docName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.counter}>
                  {Math.min(currentIndex + 1, totalCount)} of {totalCount}
                </Text>
              </View>
              <GestureDetector gesture={Gesture.Tap().onEnd(() => runOnJS(onClose)())}>
                <Animated.View style={styles.closeButton}>
                  <X size={20} color="#ffffff" strokeWidth={2.5} />
                </Animated.View>
              </GestureDetector>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Image area ── */}
        <View style={styles.center}>
          {uri ? (
            <GestureDetector gesture={allGestures}>
              <Animated.View style={animatedImageStyle}>
                <View style={{ width, height: height * 0.55 }}>
                  <Image
                    source={{ uri }}
                    style={{ width, height: height * 0.55 }}
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

        {/* ── Footer action bar ── */}
        <Animated.View style={[styles.footerWrap, footerStyle]}>
          <View style={styles.footerBar}>
            <GestureDetector gesture={Gesture.Tap().onEnd(() => { /* share handler placeholder */ })}>
              <Animated.View style={styles.footerIcon}>
                <Share2 size={20} color="#ffffff" strokeWidth={2} />
              </Animated.View>
            </GestureDetector>
            <GestureDetector gesture={Gesture.Tap().onEnd(() => { /* info handler placeholder */ })}>
              <Animated.View style={styles.footerIcon}>
                <Info size={20} color="#ffffff" strokeWidth={2} />
              </Animated.View>
            </GestureDetector>
          </View>
        </Animated.View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },

  /* Header */
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  headerGradient: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  docName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  counter: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Image area */
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    color: '#cbd5e1',
    fontSize: 14,
  },

  /* Footer */
  footerWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingBottom: 48,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  footerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
