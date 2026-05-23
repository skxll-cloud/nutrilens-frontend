// src/utils/theme.ts

export const Colors = {
  // Base
  bg: '#0A0A0F',
  bgCard: '#13131A',
  bgElevated: '#1C1C26',
  bgInput: '#1A1A24',

  // Brand
  primary: '#00E5A0',
  primaryDim: 'rgba(0,229,160,0.12)',
  secondary: '#7B61FF',
  secondaryDim: 'rgba(123,97,255,0.12)',

  // Accent
  accent1: '#FF6B6B',  // fat
  accent2: '#FFB347',  // carbs
  accent3: '#4ECDC4',  // protein
  accent4: '#00E5A0',  // calories

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textTertiary: 'rgba(255,255,255,0.35)',

  // Semantic
  success: '#00E5A0',
  warning: '#FFB347',
  error: '#FF6B6B',
  info: '#7B61FF',

  // Borders
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.15)',
};

export const Typography = {
  // Display
  h1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '600' as const },
  h4: { fontSize: 16, fontWeight: '600' as const },

  // Body
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.5 },

  // Special
  number: { fontSize: 40, fontWeight: '700' as const, letterSpacing: -1 },
  numberMed: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
