/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Luxury Dark Design System ──────────────────────────
        obsidian: {
          DEFAULT: '#0B0B0C',
          50: '#1A1A1F',
          100: '#141418',
        },
        charcoal: {
          DEFAULT: '#17181C',
          light: '#1E1F24',
          dark: '#111214',
        },
        metallic: {
          DEFAULT: '#2E3038',
          light: '#3A3D48',
          dark: '#22242C',
        },
        platinum: {
          DEFAULT: '#E5E7EB',
          light: '#F3F4F6',
          muted: '#D1D5DB',
          dim: '#9CA3AF',
        },
        // Mercedes Gold Accent
        mb: {
          gold: '#C9A84C',
          'gold-light': '#E8C76A',
          'gold-dark': '#A88835',
          silver: '#8D9DB6',
        },
        // Status Colors
        status: {
          active: '#22C55E',
          pending: '#F59E0B',
          suspended: '#EF4444',
          inactive: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['System'],
        mono: ['SpaceMono'],
      },
      borderWidth: {
        0.5: '0.5px',
      },
    },
  },
  plugins: [],
};
