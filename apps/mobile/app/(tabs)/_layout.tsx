import { Tabs } from 'expo-router';
import { Home, Users, ClipboardList, User } from 'lucide-react-native';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HIDDEN_STYLE, getTabBarVisibleStyle } from '../../src/navigation/tabBarStyle';

const BOTTOM_NAV_ICON_SIZE = 22;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarVisibleStyle = useMemo(
    () => getTabBarVisibleStyle(insets.bottom),
    [insets.bottom],
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: tabBarVisibleStyle,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Home color={color} size={BOTTOM_NAV_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          tabBarIcon: ({ color }) => <Users color={color} size={BOTTOM_NAV_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => (
            <ClipboardList color={color} size={BOTTOM_NAV_ICON_SIZE} />
          ),
          tabBarStyle: TAB_BAR_HIDDEN_STYLE,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={BOTTOM_NAV_ICON_SIZE} />,
        }}
      />
      <Tabs.Screen
        name="patients/register"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="patients/[id]/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="patients/[id]/edit"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="patients/[id]/add-mrn"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
