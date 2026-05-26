// Theme type definitions
export type ThemeName = 'light' | 'dark';

export interface Theme {
  background: string;
  surfaceContainerLow: string;
  surfaceContainerHigh: string;
  primary: string;
  primaryFixed: string;
  onPrimary: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  error: string;
  secondary: string;
  tertiary: string;
  gradientColors: [string, string];
}

// Colors extracted from Stitch design system
export const colors = {
  primary: '#ab3500',
  primaryLight: '#ff6b35',
  primaryContainer: '#ff6b35',
  primaryFixed: '#ffdbd0',
  primaryFixedDim: '#ffb59d',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#5f1900',

  secondary: '#006e0c',
  secondaryContainer: '#89f87a',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#00730d',

  tertiary: '#006687',
  tertiaryContainer: '#51a3c9',
  tertiaryFixedDim: '#81d0f8',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#00364a',

  background: '#ffffff',
  surface: '#ffffff',
  surfaceBright: '#ffffff',
  surfaceDim: '#f8d4a6',
  surfaceContainer: '#ffebd4',
  surfaceContainerLow: '#ffffff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#ffe4c3',
  surfaceContainerHighest: '#ffddb2',
  surfaceVariant: '#ffddb2',

  onBackground: '#291800',
  onSurface: '#291800',
  onSurfaceVariant: '#594139',

  outline: '#8d7168',
  outlineVariant: '#e1bfb5',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  inverseSurface: '#412c0c',
  inverseOnSurface: '#ffeedc',
  inversePrimary: '#ffb59d',
};

export const gradientColors = {
  solar: ['#ff6b35', '#ab3500'],
};

export const fonts = {
  headline: 'Quicksand',
  body: 'DM Sans',
};

export const fontSize = {
  headlineLg: 32,
  headlineMd: 24,
  headlineSm: 20,
  bodyLg: 18,
  bodyMd: 16,
  labelMd: 14,
  caption: 12,
  tiny: 10,
};

export const spacing = {
  gutter: 16,
  unit: 8,
  marginMobile: 20,
  marginDesktop: 40,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#4a2600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 4,
  },
  fab: {
    shadowColor: '#ab3500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    shadowColor: '#4a2600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 4,
  },
};

export const categories = [
  { key: 'all', label: '全部' },
  { key: '美食', label: '美食' },
  { key: '购物', label: '购物' },
  { key: '旅行', label: '旅行' },
  { key: '聊天', label: '聊天' },
  { key: '学习', label: '学习' },
  { key: '健身', label: '健身' },
  { key: '灵感', label: '灵感' },
  { key: '待办', label: '待办' },
] as const;

// Light theme (using existing color constants)
export const lightTheme: Theme = {
  background: colors.background,
  surfaceContainerLow: colors.surfaceContainerLow,
  surfaceContainerHigh: colors.surfaceContainerHigh,
  primary: colors.primaryLight,
  primaryFixed: colors.primaryFixed,
  onPrimary: colors.onPrimary,
  onSurface: colors.onSurface,
  onSurfaceVariant: colors.onSurfaceVariant,
  outline: colors.outline,
  outlineVariant: colors.outlineVariant,
  error: colors.error,
  secondary: colors.secondaryContainer,
  tertiary: colors.tertiaryContainer,
  gradientColors: colors.solar as [string, string],
};

// Dark theme with deep color palette
export const darkTheme: Theme = {
  // 背景色系
  background: '#1A1A1A',
  surfaceContainerLow: 'rgba(255,255,255,0.05)',
  surfaceContainerHigh: 'rgba(255,255,255,0.08)',

  // 主色系
  primary: '#FF6B35',
  primaryFixed: '#FFCCBC',
  onPrimary: '#FFFFFF',

  // 文本色
  onSurface: '#F5E6D3',
  onSurfaceVariant: '#C4B5A0',
  outline: '#7C6A58',
  outlineVariant: '#3D3228',

  // 功能色
  error: '#FFB4AB',
  secondary: '#89F87A',
  tertiary: '#51A3C9',

  // 渐变
  gradientColors: ['rgba(255,107,53,0.8)', 'rgba(171,53,0,0.8)'],
};
