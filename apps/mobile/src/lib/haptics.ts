import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

let lastSubtleHapticAt = 0;
const SUBTLE_HAPTIC_COOLDOWN_MS = 250;

/**
 * Triggers a subtle selection-style haptic.
 * Uses platform haptics APIs when available and rate-limits repeats.
 */
export function triggerSubtleSelectionHaptic() {
  const now = Date.now();
  if (now - lastSubtleHapticAt < SUBTLE_HAPTIC_COOLDOWN_MS) {
    return;
  }
  lastSubtleHapticAt = now;

  try {
    if (
      Platform.OS === 'android' &&
      Haptics.performAndroidHapticsAsync &&
      (Haptics.AndroidHaptics?.Gesture_End || Haptics.AndroidHaptics?.Segment_Tick)
    ) {
      void Haptics.performAndroidHapticsAsync(
        Haptics.AndroidHaptics?.Gesture_End ?? Haptics.AndroidHaptics.Segment_Tick,
      ).catch(() => {
        if (Haptics.impactAsync && Haptics.ImpactFeedbackStyle?.Light) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
            Vibration.vibrate(6);
          });
          return;
        }
        Vibration.vibrate(6);
      });
      return;
    }

    if (Haptics.impactAsync && Haptics.ImpactFeedbackStyle?.Light) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        Vibration.vibrate(6);
      });
      return;
    }

    void Haptics.selectionAsync().catch(() => {
      Vibration.vibrate(6);
    });
  } catch {
    // Fallback to a very short pulse when Expo haptics isn't available.
    Vibration.vibrate(6);
  }
}
