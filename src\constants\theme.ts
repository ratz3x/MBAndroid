// ============================================================
// Luxury Dark Design System — Theme Constants
// Mercedes-Benz Club Indonesia
// ============================================================

import { StyleSheet } from 'react-native';

// ── Color Palette ─────────────────────────────────────────────
export const Colors = {
  // Backgrounds
  background: {
    primary: '#0B0B0C',    // Deep Obsidian
    secondary: '#141418',  // Obsidian Light
    card: '#17181C',       // Charcoal
    cardLight: '#1E1F24',  // Charcoal Light
    modal: '#111214',      // Charcoal Dark
  },

  // Borders
  border: {
    default: '#2E3038',    // Metallic Silver
    light: '#3A3D48',      // Metallic Light
    dark: '#22242C',       // Metallic Dark
    accent: '#C9A84C',     // Gold Accent
  },

  // Text
  text: {
    primary: '#E5E7EB',    // Platinum
    secondary: '#D1D5DB',  // Chrome Silver
    tertiary: '#9CA3AF',   // Muted
    disabled: '#4B5563',   // Disabled
    inverse: '#0B0B0C',    // Dark text on light bg
    gold: '#C9A84C',       // Gold accent text
  },

  // Mercedes Brand Colors
  brand: {
    gold: '#C9A84C',
    goldLight: '#E8C76A',
    goldDark: '#A88835',
    silver: '#8D9DB6',
    black: '#0B0B0C',
  },

  // Status
  status: {
    active: '#22C55E',
    pending: '#F59E0B',
    suspended: '#EF4444',
    inactive: '#6B7280',
    info: '#3B82F6',
  },

  // Gradients (used as array pairs for LinearGradient)
  gradient: {
    gold: ['#C9A84C', '#A88835'] as [string, string],
    silver: ['#E5E7EB', '#9CA3AF'] as [string, string],
    dark: ['#17181C', '#0B0B0C'] as [string, string],
    card: ['#1E1F24', '#17181C'] as [string, string],
  },
} as const;

// ── Typography ────────────────────────────────────────────────
export const Typography = {
  // Font sizes
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,

  // Font weights
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ── Spacing ───────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// ── Border Radius ─────────────────────────────────────────────
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const;

// ── Shadows ───────────────────────────────────────────────────
export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  gold: {
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
} as const;

// ── Common StyleSheet Presets ─────────────────────────────────
export const CommonStyles = StyleSheet.create({
  // Containers
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  contentPadding: {
    paddingHorizontal: Spacing.base,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },

  // Cards
  card: {
    backgroundColor: Colors.background.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border.default,
    padding: Spacing.base,
    ...Shadows.card,
  },
  cardPressable: {
    backgroundColor: Colors.background.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border.default,
    padding: Spacing.base,
    ...Shadows.card,
  },

  // Text presets
  screenTitle: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  bodyText: {
    fontSize: Typography.base,
    fontWeight: Typography.weight.regular,
    color: Colors.text.secondary,
    lineHeight: Typography.base * Typography.lineHeight.normal,
  },
  captionText: {
    fontSize: Typography.sm,
    color: Colors.text.tertiary,
  },
  goldText: {
    color: Colors.brand.gold,
    fontWeight: Typography.weight.semibold,
  },

  // Separator
  separator: {
    height: 0.5,
    backgroundColor: Colors.border.default,
    marginVertical: Spacing.md,
  },

  // Row/Column utilities
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── Tab Bar Configuration ─────────────────────────────────────
export const TAB_BAR_HEIGHT = 64;
export const HEADER_HEIGHT = 56;
