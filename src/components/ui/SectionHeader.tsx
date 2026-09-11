// ============================================================
// SectionHeader — Titled section with gold accent line
// Mercedes-Benz Club Indonesia
// ============================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../constants/theme';
import type { ViewStyle, TextStyle } from 'react-native';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  showAccentLine?: boolean;
  accentColor?: string;
  style?: ViewStyle | ViewStyle[];
  titleStyle?: TextStyle | TextStyle[];
  subtitleStyle?: TextStyle | TextStyle[];
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  showAccentLine = true,
  accentColor,
  style,
  titleStyle,
  subtitleStyle,
}: SectionHeaderProps) {
  return (
    <View style={[styles.container, style as any]}>
      <View style={styles.left}>
        {showAccentLine && (
          <View
            style={[
              styles.accentLine,
              accentColor ? { backgroundColor: accentColor } : null,
            ]}
          />
        )}
        <View style={styles.textGroup}>
          <Text style={[styles.title, titleStyle as any]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, subtitleStyle as any]}>{subtitle}</Text>}
        </View>
      </View>

      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.action}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.brand.gold} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accentLine: {
    width: 3,
    height: 20,
    backgroundColor: Colors.brand.gold,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  textGroup: { flex: 1 },
  title: {
    fontSize: Typography.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.sm,
  },
  actionLabel: {
    fontSize: Typography.sm,
    color: Colors.brand.gold,
    fontWeight: Typography.weight.medium,
    marginRight: 2,
  },
});
