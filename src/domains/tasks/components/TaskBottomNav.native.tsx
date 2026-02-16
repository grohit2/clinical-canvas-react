import { Bell, ClipboardList, Eye, FileText, Home, Undo2 } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { TaskBoardTab } from '../board/types';

export interface TaskBottomNavNativeProps {
  activeTab: TaskBoardTab;
  onTabChange: (tab: TaskBoardTab) => void;
  onBack: () => void;
  onToggleView: () => void;
  showViewPanel: boolean;
}

function TabButton({
  active,
  label,
  onPress,
  children,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      {children}
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function TaskBottomNavNative(props: TaskBottomNavNativeProps) {
  const { activeTab, onTabChange, onBack, onToggleView, showViewPanel } = props;

  return (
    <View style={styles.wrap}>
      <View style={styles.sideGroup}>
        <TabButton active={false} label="Back" onPress={onBack}>
          <Undo2 size={16} color="#334155" />
        </TabButton>
        <TabButton active={activeTab === 'home'} label="Home" onPress={() => onTabChange('home')}>
          <Home size={16} color={activeTab === 'home' ? '#1d4ed8' : '#334155'} />
        </TabButton>
        <TabButton
          active={activeTab === 'board'}
          label="Board"
          onPress={() => onTabChange('board')}
        >
          <ClipboardList size={16} color={activeTab === 'board' ? '#1d4ed8' : '#334155'} />
        </TabButton>
      </View>

      <View style={styles.sideGroup}>
        <TabButton
          active={activeTab === 'reminders'}
          label="Reminders"
          onPress={() => onTabChange('reminders')}
        >
          <Bell size={16} color={activeTab === 'reminders' ? '#1d4ed8' : '#334155'} />
        </TabButton>
        <TabButton active={activeTab === 'audit'} label="Audit" onPress={() => onTabChange('audit')}>
          <FileText size={16} color={activeTab === 'audit' ? '#1d4ed8' : '#334155'} />
        </TabButton>
      </View>

      <Pressable
        style={[styles.viewFab, showViewPanel && styles.viewFabActive]}
        onPress={onToggleView}
        accessibilityRole="button"
        accessibilityLabel="Toggle view panel"
      >
        <Eye size={18} color="#ffffff" />
        <Text style={styles.viewFabText}>View</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  sideGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabButton: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabButtonActive: {
    backgroundColor: '#dbeafe',
  },
  tabLabel: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#1d4ed8',
  },
  viewFab: {
    position: 'absolute',
    left: '50%',
    top: -20,
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  viewFabActive: {
    backgroundColor: '#1d4ed8',
  },
  viewFabText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '800',
  },
});

export default TaskBottomNavNative;
