// ============================================================
// Main App Layout — Bottom Tab Navigator (Luxury Sleek Dark)
// Mercedes-Benz Club Indonesia
// Whitelist: Beranda, Event, Forum, Profil
// ============================================================

import { Tabs } from 'expo-router';
import { CustomTabBar } from '../../src/components/navigation/CustomTabBar';

export default function MainLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // CustomTabBar renders the docked minimal bar
      }}
    >
      {/* 4 Primary Member Screens */}
      <Tabs.Screen name="dashboard" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="event/index" options={{ title: 'Event' }} />
      <Tabs.Screen name="forum/index" options={{ title: 'Forum' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />

      {/* All secondary, internal, dynamic, & admin routes explicitly hidden from bottom bar */}
      <Tabs.Screen name="toko/index" options={{ href: null }} />
      <Tabs.Screen name="toko/[id]" options={{ href: null }} />
      <Tabs.Screen name="event/[id]" options={{ href: null }} />
      <Tabs.Screen name="event/create" options={{ href: null }} />
      <Tabs.Screen name="forum/[id]" options={{ href: null }} />
      <Tabs.Screen name="admin/index" options={{ href: null }} />
      <Tabs.Screen name="organisasi" options={{ href: null }} />
      <Tabs.Screen name="keanggotaan/index" options={{ href: null }} />
      <Tabs.Screen name="keanggotaan/register" options={{ href: null }} />
      <Tabs.Screen name="gallery" options={{ href: null }} />
      <Tabs.Screen name="sponsorship" options={{ href: null }} />
      <Tabs.Screen name="koperasi" options={{ href: null }} />
    </Tabs>
  );
}
