// ============================================================
// CustomTabBar — Luxury Minimalist Bottom Navigation Bar
// Mercedes-Benz Club Indonesia
// Whitelist Static Array: [Beranda, Event, Forum, Profil]
// ============================================================

import React from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

interface StaticTab {
  name: string;
  matchRoutes: string[];
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
}

// ── Strict Whitelist: HANYA 4 Menu Utama Tampilan Member ─────
const STATIC_MEMBER_TABS: StaticTab[] = [
  {
    name: 'dashboard',
    matchRoutes: ['dashboard'],
    icon: 'grid-outline',
    activeIcon: 'grid',
    label: 'Beranda',
  },
  {
    name: 'event/index',
    matchRoutes: ['event/index', 'event'],
    icon: 'calendar-outline',
    activeIcon: 'calendar',
    label: 'Event',
  },
  {
    name: 'forum/index',
    matchRoutes: ['forum/index', 'forum'],
    icon: 'chatbubbles-outline',
    activeIcon: 'chatbubbles',
    label: 'Forum',
  },
  {
    name: 'profil',
    matchRoutes: ['profil'],
    icon: 'person-outline',
    activeIcon: 'person',
    label: 'Profil',
  },
];

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const currentRouteName = state.routes[state.index]?.name || '';

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Subtle Metallic Top Border */}
      <View style={styles.topBorderLine} />

      <View style={styles.tabsRow}>
        {STATIC_MEMBER_TABS.map((tab) => {
          const isFocused = tab.matchRoutes.includes(currentRouteName);

          const handlePress = () => {
            const matchedRoute = state.routes.find((r) => tab.matchRoutes.includes(r.name));
            const targetName = matchedRoute?.name || tab.name;

            const event = navigation.emit({
              type: 'tabPress',
              target: matchedRoute?.key || targetName,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(targetName);
            }
          };

          return (
            <Pressable
              key={tab.label}
              onPress={handlePress}
              android_ripple={{ color: 'rgba(255,255,255,0.06)', borderless: true, radius: 28 }}
              style={styles.tabItem}
            >
              {/* Minimalist Top Indicator */}
              {isFocused && <View style={styles.activeIndicator} />}

              <View style={styles.iconContainer}>
                <Ionicons
                  name={isFocused ? tab.activeIcon : tab.icon}
                  size={20}
                  color={isFocused ? '#F4F4F5' : '#71717A'}
                />
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  isFocused && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#090A0C', // bg-neutral-950/90
    position: 'relative',
  },
  topBorderLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // border-neutral-800/80
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 54,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
    gap: 3,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#E4E4E7', // Silver / Chrome active accent
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 26,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    color: '#71717A',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: '#F4F4F5',
    fontWeight: '600',
  },
});
