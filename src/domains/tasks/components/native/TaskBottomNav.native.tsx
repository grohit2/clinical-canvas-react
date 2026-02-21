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
    <Pressable style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <View style={styles.iconWrap}>
        {tab.icon}
        {hasBadge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeValue > 99 ? '99+' : String(badgeValue)}</Text>
          </View>
        ) : null}
        {!hasBadge && tab.dot ? <View style={styles.dot} /> : null}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
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
    borderTopColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    minHeight: 72,
    paddingHorizontal: 10,
    paddingTop: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 12,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabButtonActive: {
    backgroundColor: '#171d3a',
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  iconWrap: {
    position: 'relative',
    marginBottom: 2,
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
