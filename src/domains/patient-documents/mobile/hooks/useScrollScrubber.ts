import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { DateSection, YearSummary } from '../../core';
import type { GallerySectionListRef } from '../components/GalleryGrid.native';

const MONTH_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
});

function mapYToYearIndex(y: number, totalHeight: number, yearCount: number): number {
  'worklet';
  if (yearCount <= 1) return 0;
  const normalized = Math.max(0, Math.min(y / Math.max(totalHeight, 1), 1));
  return Math.round(normalized * (yearCount - 1));
}

function formatSectionMonthYear(section?: Pick<DateSection, 'year' | 'month'>): string {
  if (!section) return '';
  return MONTH_YEAR.format(new Date(section.year, section.month, 1));
}

function triggerHaptic(style: 'light' | 'medium') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const haptics = require('expo-haptics') as {
      impactAsync: (value: unknown) => Promise<void>;
      ImpactFeedbackStyle: {
        Light: unknown;
        Medium: unknown;
      };
    };

    haptics
      .impactAsync(style === 'medium' ? haptics.ImpactFeedbackStyle.Medium : haptics.ImpactFeedbackStyle.Light)
      .catch(() => undefined);
  } catch {
    // Ignore haptics on non-Expo/native builds.
  }
}

export function useScrollScrubber(args: {
  sections: DateSection[];
  years: YearSummary[];
  sectionListRef: React.RefObject<GallerySectionListRef | null>;
}) {
  const { sections, years, sectionListRef } = args;

  const [activeYear, setActiveYear] = useState(years[0]?.year || new Date().getFullYear());
  const [bubbleLabel, setBubbleLabel] = useState('');

  const bubbleOpacity = useSharedValue(0);
  const scrubberHighlightY = useSharedValue(0);
  const previousYearIndex = useSharedValue(-1);
  const scrubberHeight = useSharedValue(1);

  useEffect(() => {
    if (!years.length) return;
    setActiveYear(years[0].year);
  }, [years]);

  const sectionLabelByYear = useMemo(() => {
    const map = new Map<number, string>();
    for (const summary of years) {
      const section = sections[summary.firstSectionIndex];
      map.set(summary.year, formatSectionMonthYear(section));
    }
    return map;
  }, [sections, years]);

  const scrollToYear = useCallback(
    (year: number) => {
      const summary = years.find((item) => item.year === year);
      if (!summary || !sectionListRef.current) return;

      sectionListRef.current.scrollToLocation({
        sectionIndex: summary.firstSectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
    },
    [sectionListRef, years]
  );

  const handleSectionVisible = useCallback(
    (sectionIndex: number) => {
      const section = sections[sectionIndex];
      if (!section) return;
      setActiveYear(section.year);
      setBubbleLabel(formatSectionMonthYear(section));
    },
    [sections]
  );

  const handleScrubToIndex = useCallback(
    (yearIndex: number, phase: 'begin' | 'update') => {
      const summary = years[yearIndex];
      if (!summary) return;

      setActiveYear(summary.year);
      setBubbleLabel(sectionLabelByYear.get(summary.year) || `${summary.year}`);
      scrollToYear(summary.year);

      if (phase === 'begin') {
        triggerHaptic('medium');
      } else {
        triggerHaptic('light');
      }
    },
    [scrollToYear, sectionLabelByYear, years]
  );

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onBegin((event) => {
        'worklet';
        bubbleOpacity.value = withTiming(1, { duration: 150 });
        const yearIndex = mapYToYearIndex(event.y, scrubberHeight.value, years.length);
        previousYearIndex.value = yearIndex;
        scrubberHighlightY.value = event.y;
        runOnJS(handleScrubToIndex)(yearIndex, 'begin');
      })
      .onUpdate((event) => {
        'worklet';
        const yearIndex = mapYToYearIndex(event.y, scrubberHeight.value, years.length);
        scrubberHighlightY.value = event.y;

        if (yearIndex !== previousYearIndex.value) {
          previousYearIndex.value = yearIndex;
          runOnJS(handleScrubToIndex)(yearIndex, 'update');
        }
      })
      .onEnd(() => {
        'worklet';
        bubbleOpacity.value = withDelay(800, withTiming(0, { duration: 300 }));
        runOnJS(triggerHaptic)('light');
      });
  }, [bubbleOpacity, handleScrubToIndex, previousYearIndex, scrubberHeight, scrubberHighlightY, years.length]);

  const setScrubberHeight = useCallback(
    (height: number) => {
      scrubberHeight.value = Math.max(1, height);
    },
    [scrubberHeight]
  );

  const scrollByOneYear = useCallback(
    (direction: 'up' | 'down') => {
      if (!years.length) return;
      const currentIndex = years.findIndex((item) => item.year === activeYear);
      if (currentIndex < 0) return;
      const nextIndex = direction === 'up'
        ? Math.max(0, currentIndex - 1)
        : Math.min(years.length - 1, currentIndex + 1);
      if (nextIndex === currentIndex) return;

      const nextYear = years[nextIndex].year;
      setActiveYear(nextYear);
      setBubbleLabel(sectionLabelByYear.get(nextYear) || `${nextYear}`);
      triggerHaptic('light');
      scrollToYear(nextYear);
    },
    [activeYear, scrollToYear, sectionLabelByYear, years]
  );

  return {
    activeYear,
    bubbleLabel,
    bubbleOpacity,
    scrubberHighlightY,
    panGesture,
    setScrubberHeight,
    scrollToYear,
    scrollByOneYear,
    handleSectionVisible,
  };
}
