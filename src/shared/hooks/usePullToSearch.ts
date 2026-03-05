import { useRef, useCallback, useEffect, useState } from "react";

export interface PullToSearchState {
  /** 0–1 progress of the pull gesture (0 = no pull, 1 = fully extended / threshold met) */
  progress: number;
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

const IDLE_STATE: PullToSearchState = { progress: 0, isPulling: false, pullOffset: 0 };

/**
 * Hook that implements a "pull-down-to-search" gesture on a scrollable container.
 *
 * Attach `containerRef` to the scroll parent. The hook tracks touch events and
 * exposes progress/offset values that drive the animated search indicator.
 *
 * The gesture only activates when the page is scrolled to the very top.
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

  // Store callbacks in refs so the effect doesn't re-run when they change
  const onThresholdCrossRef = useRef(onThresholdCross);
  onThresholdCrossRef.current = onThresholdCross;
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  const [state, setState] = useState<PullToSearchState>(IDLE_STATE);

  const reset = useCallback(() => {
    pulling.current = false;
    crossedThreshold.current = false;
    setState(IDLE_STATE);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      // Use window.scrollY since the ref is on a non-scrolling wrapper div
      if (window.scrollY > 0) return;

      startY.current = e.touches[0].clientY;
      pulling.current = true;
      crossedThreshold.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;

      const dy = e.touches[0].clientY - startY.current;
      if (dy < 0) {
        // Scrolling up – abort the gesture
        pulling.current = false;
        setState(IDLE_STATE);
        return;
      }

      // Rubber-band: diminish pull past threshold
      const clamped = Math.min(dy, maxPull);
      const progress = Math.min(clamped / threshold, 1);

      if (progress >= 1 && !crossedThreshold.current) {
        crossedThreshold.current = true;
        onThresholdCrossRef.current?.();
      }

      setState({ progress, isPulling: true, pullOffset: clamped });

      // Prevent native scroll while pulling down at top
      if (dy > 0 && window.scrollY <= 0) {
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;

      if (crossedThreshold.current) {
        onTriggerRef.current?.();
      }
      // Always reset visual state on touch end – the callback handles opening search
      setState(IDLE_STATE);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, threshold, maxPull, reset]);

  return { ...state, containerRef, reset };
}
