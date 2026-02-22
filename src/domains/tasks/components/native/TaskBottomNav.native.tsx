import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TaskBoardTab } from '../../models/types';

export interface TaskNavTabNative {
  id: TaskBoardTab;
  label: string;
  icon: ReactNode;
  badge?: number;
  dot?: boolean;
  enabled?: boolean;
}

export interface TaskBottomNavNativeProps {
  tabs: TaskNavTabNative[];
  activeTab: TaskBoardTab;
  onTabChange: (tab: TaskBoardTab) => void;
}

function TabButton({
  tab,
  active,
  onPress,
}: {
  tab: TaskNavTabNative;
  active: boolean;
  onPress: () => void;
}) {
  const badgeValue =
    typeof tab.badge === 'number' && Number.isFinite(tab.badge) ? tab.badge : 0;
  const hasBadge = badgeValue > 0;

  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <View style={styles.iconWrap}>
        {tab.icon}
        {hasBadge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeValue > 99 ? '99+' : String(badgeValue)}</Text>
          </View>
        ) : null}
        {!hasBadge && tab.dot ? <View style={styles.dot} /> : null}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

export function TaskBottomNavNative(props: TaskBottomNavNativeProps) {
  const { tabs, activeTab, onTabChange } = props;
  const insets = useSafeAreaInsets();
  const enabledTabs = tabs.filter((tab) => tab.enabled !== false);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabRow}>
        {enabledTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TabButton
              key={tab.id}
              tab={tab}
              active={active}
              onPress={() => onTabChange(tab.id)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    minHeight: 60,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 2,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  tabLabel: {
    fontSize: 12,
    lineHeight: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#2563eb',
  },
  iconWrap: {
    position: 'relative',
    marginBottom: 1,
  },
  badge: {
    position: 'absolute',
    right: -10,
    top: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 10,
    color: '#ffffff',
    fontWeight: '800',
  },
  dot: {
    position: 'absolute',
    right: -5,
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e11d48',
  },
});

export default TaskBottomNavNative;
