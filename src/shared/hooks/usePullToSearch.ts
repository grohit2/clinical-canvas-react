import { useRef, useCallback, useEffect, useState } from "react";

export interface PullToSearchState {
  /** 0–1 progress of the pull gesture (0 = no pull, 1 = fully extended / threshold met) */
  progress: number;
  /** true once the user has pulled past the threshold and the search overlay should open */
  isTriggered: boolean;
  /** true while the user is actively dragging down */
  isPulling: boolean;
  /** current visual offset in px (clamped to maxPull) */
  pullOffset: number;
}

export interface UsePullToSearchOptions {
  /** Distance (px) the user must pull before search triggers. @default 80 */
  threshold?: number;
  /** Maximum pull distance (px) for the rubber-band effect. @default 120 */
  maxPull?: number;
  /** Whether the pull gesture is enabled. @default true */
  enabled?: boolean;
  /** Called once when threshold is first crossed (good place for haptic). */
  onThresholdCross?: () => void;
  /** Called when the gesture completes and search should open. */
  onTrigger?: () => void;
}

/**
 * Hook that implements a "pull-down-to-search" gesture on a scrollable container.
 *
 * Attach `containerRef` to the scroll parent. The hook tracks touch events and
 * exposes progress/offset values that drive the animated search indicator.
 *
 * The gesture only activates when `scrollTop === 0` (user is at the very top).
 */
export function usePullToSearch({
  threshold = 80,
  maxPull = 120,
  enabled = true,
  onThresholdCross,
  onTrigger,
}: UsePullToSearchOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const crossedThreshold = useRef(false);

  const [state, setState] = useState<PullToSearchState>({
    progress: 0,
    isTriggered: false,
    isPulling: false,
    pullOffset: 0,
  });

  const reset = useCallback(() => {
    pulling.current = false;
    crossedThreshold.current = false;
    setState({ progress: 0, isTriggered: false, isPulling: false, pullOffset: 0 });
  }, []);

  /** Dismiss the triggered search overlay – pages call this when closing search. */
  const dismiss = useCallback(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only start if we're scrolled to the very top
      const scrollTop = el.scrollTop ?? window.scrollY;
      if (scrollTop > 0) return;

      startY.current = e.touches[0].clientY;
      pulling.current = true;
      crossedThreshold.current = false;
      setState((s) => ({ ...s, isPulling: true }));
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;

      const dy = e.touches[0].clientY - startY.current;
      if (dy < 0) {
        // Scrolling up – abort the gesture
        pulling.current = false;
        setState({ progress: 0, isTriggered: false, isPulling: false, pullOffset: 0 });
        return;
      }

      // Rubber-band: diminish pull past threshold
      const clamped = Math.min(dy, maxPull);
      const progress = Math.min(clamped / threshold, 1);

      if (progress >= 1 && !crossedThreshold.current) {
        crossedThreshold.current = true;
        onThresholdCross?.();
      }

      setState({ progress, isTriggered: false, isPulling: true, pullOffset: clamped });

      // Prevent native scroll while pulling down at top
      if (dy > 0 && (el.scrollTop ?? 0) <= 0) {
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;

      if (crossedThreshold.current) {
        setState((s) => ({ ...s, isTriggered: true, isPulling: false }));
        onTrigger?.();
      } else {
        reset();
      }
      pulling.current = false;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, threshold, maxPull, onThresholdCross, onTrigger, reset]);

  return { ...state, containerRef, dismiss, reset };
}
