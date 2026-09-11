// ============================================================
// MetallicButton — CTA button with Luxury Dark styling
// Mercedes-Benz Club Indonesia
// ============================================================

import React from 'react';
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants/theme';

type ButtonVariant = 'gold' | 'silver' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface MetallicButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  labelStyle?: TextStyle;
  fullWidth?: boolean;
}

export function MetallicButton({
  label,
  onPress,
  variant = 'gold',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  labelStyle,
  fullWidth = true,
}: MetallicButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: false }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? Colors.brand.gold : Colors.text.inverse}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18}
              color={getIconColor(variant)}
              style={styles.iconLeft}
            />
          )}
          <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`], labelStyle]}>
            {label}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18}
              color={getIconColor(variant)}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

function getIconColor(variant: ButtonVariant): string {
  if (variant === 'outline' || variant === 'ghost') return Colors.brand.gold;
  if (variant === 'silver') return Colors.background.primary;
  if (variant === 'danger') return '#fff';
  return Colors.background.primary;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: { width: '100%' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconLeft: { marginRight: Spacing.sm },
  iconRight: { marginLeft: Spacing.sm },

  // Variants
  gold: {
    backgroundColor: Colors.brand.gold,
    ...Shadows.gold,
  },
  silver: {
    backgroundColor: Colors.text.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.brand.gold,
  },
  ghost: {
    backgroundColor: 'rgba(201, 168, 76, 0.1)',
  },
  danger: {
    backgroundColor: Colors.status.suspended,
  },

  // Sizes
  size_sm: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, minHeight: 36 },
  size_md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, minHeight: 48 },
  size_lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, minHeight: 56 },

  // Labels
  label: {
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.5,
  },
  label_gold: { color: Colors.background.primary },
  label_silver: { color: Colors.background.primary },
  label_outline: { color: Colors.brand.gold },
  label_ghost: { color: Colors.brand.gold },
  label_danger: { color: '#fff' },

  labelSize_sm: { fontSize: Typography.sm },
  labelSize_md: { fontSize: Typography.base },
  labelSize_lg: { fontSize: Typography.lg },

  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
