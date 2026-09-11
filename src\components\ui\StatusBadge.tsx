// ============================================================
// StatusBadge — Member status indicator badge
// Mercedes-Benz Club Indonesia
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MemberStatus } from '../../types/database.types';
import { getStatusColor, getStatusLabel } from '../../utils/helpers';
import { Typography, Spacing, Radius } from '../../constants/theme';

interface StatusBadgeProps {
  status: MemberStatus;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export function StatusBadge({ status, size = 'md', showDot = true }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <View
      style={[
        styles.container,
        size === 'sm' && styles.containerSm,
        { backgroundColor: `${color}18`, borderColor: `${color}40` },
      ]}
    >
      {showDot && (
        <View style={[styles.dot, size === 'sm' && styles.dotSm, { backgroundColor: color }]} />
      )}
      <Text style={[styles.label, size === 'sm' && styles.labelSm, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  containerSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  dotSm: {
    width: 5,
    height: 5,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.3,
  },
  labelSm: {
    fontSize: Typography.xs,
  },
});
