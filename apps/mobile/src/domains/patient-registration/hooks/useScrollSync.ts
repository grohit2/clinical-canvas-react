import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import {
  REGISTRATION_ANIMATION,
  REGISTRATION_SCROLL,
} from '../constants';

interface ScrollSyncSection {
  id: string;
}

interface UseScrollSyncParams {
  sections: readonly ScrollSyncSection[];
  scrollOffset: number;
}

export function useScrollSync({ sections, scrollOffset }: UseScrollSyncParams) {
  const [activeTabId, setActiveTabId] = useState(sections[0]?.id ?? '');
  const activeTabIdRef = useRef(activeTabId);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const sectionPositionsMap = useRef<Map<string, number>>(new Map());
  const isProgrammaticScroll = useRef(false);
  const targetScrollY = useRef<number | null>(null);

  const scrollY = useSharedValue(0);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRecomputeAtRef = useRef(0);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    const sectionIds = new Set(sections.map((section) => section.id));
    Array.from(sectionPositionsMap.current.keys()).forEach((id) => {
      if (!sectionIds.has(id)) {
        sectionPositionsMap.current.delete(id);
      }
    });

    if (!sections.some((section) => section.id === activeTabIdRef.current)) {
      const nextId = sections[0]?.id ?? '';
      activeTabIdRef.current = nextId;
      setActiveTabId(nextId);
    }
  }, [sections]);

  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  const clearProgrammaticLock = useCallback(() => {
    isProgrammaticScroll.current = false;
    targetScrollY.current = null;
  }, []);

  const setActiveId = useCallback((nextActiveId: string) => {
    if (nextActiveId === activeTabIdRef.current) {
      return;
    }
    activeTabIdRef.current = nextActiveId;
    setActiveTabId(nextActiveId);
  }, []);

  const computeActiveTab = useCallback(
    (currentScrollY: number) => {
      if (
        isProgrammaticScroll.current &&
        targetScrollY.current !== null &&
        Math.abs(currentScrollY - targetScrollY.current) <= 2
      ) {
        clearProgrammaticLock();
      }

      if (isProgrammaticScroll.current) {
        return;
      }

      const threshold = currentScrollY + scrollOffset + 50;
      let nextActiveId = activeTabIdRef.current;
      let highestPosition = -Infinity;

      sections.forEach((section) => {
        const sectionY = sectionPositionsMap.current.get(section.id);
        if (sectionY === undefined) {
          return;
        }
        if (sectionY <= threshold && sectionY > highestPosition) {
          highestPosition = sectionY;
          nextActiveId = section.id;
        }
      });

      setActiveId(nextActiveId);
    },
    [clearProgrammaticLock, scrollOffset, sections, setActiveId]
  );

  const registerSectionPosition = useCallback((sectionId: string, y: number) => {
    sectionPositionsMap.current.set(sectionId, y);
  }, []);

  const setScrollViewRef = useCallback((node: ScrollView | null) => {
    scrollViewRef.current = node;
  }, []);

  const scrollToSection = useCallback(
    (sectionId: string) => {
      const sectionY = sectionPositionsMap.current.get(sectionId);
      if (sectionY === undefined || !scrollViewRef.current) {
        return;
      }

      const nextTargetY = Math.max(sectionY - scrollOffset, 0);
      isProgrammaticScroll.current = true;
      targetScrollY.current = nextTargetY;
      setActiveId(sectionId);
      scrollViewRef.current.scrollTo({ y: nextTargetY, animated: true });

      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }

      lockTimeoutRef.current = setTimeout(() => {
        clearProgrammaticLock();
      }, REGISTRATION_ANIMATION.scrollDuration);
    },
    [clearProgrammaticLock, scrollOffset, setActiveId]
  );

  const handleScrollOffset = useCallback(
    (newScrollY: number) => {
      scrollY.value = newScrollY;

      const now = Date.now();
      if (
        now - lastRecomputeAtRef.current >= REGISTRATION_SCROLL.activeTabThrottleMs
      ) {
        lastRecomputeAtRef.current = now;
        computeActiveTab(newScrollY);
        return;
      }

      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }

      const waitMs =
        REGISTRATION_SCROLL.activeTabThrottleMs -
        (now - lastRecomputeAtRef.current);
      throttleTimeoutRef.current = setTimeout(() => {
        lastRecomputeAtRef.current = Date.now();
        computeActiveTab(scrollY.value);
        throttleTimeoutRef.current = null;
      }, Math.max(waitMs, 0));
    },
    [computeActiveTab, scrollY]
  );

  const handleScrollEnd = useCallback(() => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
    computeActiveTab(scrollY.value);
  }, [computeActiveTab, scrollY]);

  return {
    activeTabId,
    scrollViewRef,
    setScrollViewRef,
    registerSectionPosition,
    scrollToSection,
    handleScrollOffset,
    handleScrollEnd,
  };
}
