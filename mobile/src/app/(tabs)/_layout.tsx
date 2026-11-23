import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { useSession } from '@/state/session';
import { Icon, type IconName } from '@/ui/icons';
import { C } from '@/ui/theme';

function tabIcon(name: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={name} size={23} color={String(color)} strokeWidth={focused ? 2.3 : 2} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { pending, session } = useSession();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: '#9aa0bd',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
        },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: tabIcon('qr') }} />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: tabIcon('bell'),
          tabBarBadge: session && pending.length ? pending.length : undefined,
          tabBarBadgeStyle: { backgroundColor: C.amber, color: C.white, fontSize: 11, fontWeight: '700' },
        }}
      />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
