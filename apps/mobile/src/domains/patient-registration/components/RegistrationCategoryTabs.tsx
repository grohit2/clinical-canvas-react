import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { REGISTRATION_LAYOUT } from '../constants';

export interface RegistrationCategoryTab {
  id: string;
  title: string;
  done?: boolean;
}

interface RegistrationCategoryTabsProps {
  sections: readonly RegistrationCategoryTab[];
  activeTabId: string;
  onTabPress: (sectionId: string) => void;
}

export function RegistrationCategoryTabs({
  sections,
  activeTabId,
  onTabPress,
}: RegistrationCategoryTabsProps) {
  const scrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const scrollX = useRef(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const activeIds = new Set(sections.map((section) => section.id));
    Object.keys(tabLayouts.current).forEach((key) => {
      if (!activeIds.has(key)) {
        delete tabLayouts.current[key];
      }
    });
  }, [sections]);

  useEffect(() => {
    const layout = tabLayouts.current[activeTabId];
    if (!layout || !scrollRef.current || containerWidth <= 0) {
      return;
    }

    const targetX = layout.x + layout.width / 2 - containerWidth / 2;
    const clampedX = Math.max(targetX, 0);
    if (Math.abs(clampedX - scrollX.current) > 4) {
      scrollRef.current.scrollTo({ x: clampedX, animated: true });
    }
  }, [activeTabId, containerWidth]);

  const handleTabLayout =
    (sectionId: string) => (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      tabLayouts.current[sectionId] = { x, width };
    };

  return (
    <View
      style={styles.container}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        onScroll={(event) => {
          scrollX.current = event.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
      >
        {sections.map((section) => {
          const isActive = section.id === activeTabId;
          return (
            <View key={section.id} onLayout={handleTabLayout(section.id)}>
              <Pressable
                onPress={() => onTabPress(section.id)}
                style={styles.tabButton}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Jump to ${section.title}`}
                hitSlop={8}
              >
                <View style={styles.tabLabelRow}>
                  {section.done ? <Text style={styles.check}>✓</Text> : null}
                  <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>
                    {section.title}
                  </Text>
                </View>
              </Pressable>
              <View style={[styles.indicator, isActive ? styles.indicatorActive : null]} />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: REGISTRATION_LAYOUT.tabBarHeight,
    justifyContent: 'center',
  },
  tabsContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 16,
  },
  tabButton: {
    paddingVertical: 8,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#1d4ed8',
  },
  check: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '900',
  },
  indicator: {
    marginTop: 2,
    height: 2,
    borderRadius: 2,
    opacity: 0,
    backgroundColor: '#2563eb',
  },
  indicatorActive: {
    opacity: 1,
  },
});
