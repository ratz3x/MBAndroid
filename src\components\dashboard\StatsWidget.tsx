// ============================================================
// StatsWidget — Admin dashboard statistics card
// Mercedes-Benz Dark Chrome / Platinum (Monochrome)
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '../../constants/theme';

interface StatItem {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}

interface StatsWidgetProps {
  stats: StatItem[];
  columns?: 2 | 3;
}

export function StatsWidget({ stats, columns = 2 }: StatsWidgetProps) {
  return (
    <View style={[styles.grid, columns === 3 && styles.grid3]}>
      {stats.map((stat, index) => (
        <View key={index} style={styles.statCard}>
          <View style={styles.iconRow}>
            {/* Standardized Silver/Chrome Icon Container */}
            <View style={styles.iconBg}>
              <Ionicons
                name={stat.icon}
                size={18}
                color="#D4D4D8"
              />
            </View>
            {stat.trend && (
              <Ionicons
                name={stat.trend === 'up' ? 'trending-up' : stat.trend === 'down' ? 'trending-down' : 'remove'}
                size={14}
                color="#A1A1AA"
              />
            )}
          </View>
          {/* Sharp Monochromatic Metric */}
          <Text style={styles.value}>{stat.value}</Text>
          <Text style={styles.label} numberOfLines={1}>{stat.label}</Text>
          {stat.trendValue && (
            <Text style={styles.trendValue}>
              {stat.trendValue}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  grid3: {},
  statCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: 'rgba(24, 24, 27, 0.5)', // bg-zinc-900/50
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.8)', // border-zinc-800/80
    borderRadius: 16,
    padding: 16,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)', // bg-white/[0.04]
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)', // border-white/[0.08]
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A1A1AA',
    marginTop: 4,
  },
  trendValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#A1A1AA',
    marginTop: 4,
  },
});
