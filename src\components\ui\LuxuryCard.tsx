// ============================================================
// LuxuryCard — Base card component with Luxury Dark styling
// Mercedes-Benz Club Indonesia
// ============================================================

import React, { type ReactNode } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type PressableProps,
} from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '../../constants/theme';

interface LuxuryCardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: PressableProps['onPress'];
  variant?: 'default' | 'elevated' | 'outlined' | 'gold';
  padding?: number;
}

export function LuxuryCard({
  children,
  style,
  onPress,
  variant = 'default',
  padding = Spacing.base,
}: LuxuryCardProps) {
  const cardStyle = [
    styles.base,
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
    variant === 'gold' && styles.gold,
    { padding },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
        android_ripple={{ color: 'rgba(201, 168, 76, 0.08)', borderless: false }}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.background.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border.default,
    ...Shadows.card,
  },
  elevated: {
    backgroundColor: Colors.background.cardLight,
    borderColor: Colors.border.light,
    ...Shadows.header,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  gold: {
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.brand.gold,
    ...Shadows.gold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
