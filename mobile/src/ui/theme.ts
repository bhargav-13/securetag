import { Platform, type ViewStyle } from 'react-native';

/* SecureTag's look, taken from the website's CSS variables. */
export const C = {
  brand: '#4e46dc',
  brand2: '#6366f1',
  brand3: '#8b8ff5',
  brandInk: '#2b2790',
  brandSoft: '#eef0fd',
  brandTint: '#eceafd',
  bg: '#f4f5fb',
  surface: '#ffffff',
  surface2: '#f9fafe',
  text: '#191b2e',
  muted: '#6c7291',
  placeholder: '#a4a9c4',
  border: '#e7e9f4',
  green: '#16a34a',
  greenSoft: '#e7f6ec',
  amber: '#d97706',
  amberSoft: '#fdf0dd',
  red: '#dc2626',
  redSoft: '#fdecec',
  white: '#ffffff',
} as const;

export const GRADIENT = ['#4e46dc', '#6366f1', '#7c83f7'] as const;

/** Hero / banner backgrounds by mood. */
export const GRADIENTS = {
  brand: GRADIENT,
  amber: ['#b45309', '#d97706', '#f59e0b'],
  red: ['#b91c1c', '#dc2626', '#ef4444'],
  green: ['#15803d', '#16a34a', '#22c55e'],
} as const;
export type Mood = keyof typeof GRADIENTS;

export const R = { sm: 10, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

/** Soft indigo-tinted card shadow. */
export const shadow: ViewStyle =
  Platform.select<ViewStyle>({
    ios: { shadowColor: '#2b2790', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 3, shadowColor: '#2b2790' },
    default: { boxShadow: '0 10px 30px rgba(43, 39, 144, 0.10)' } as ViewStyle,
  }) ?? {};

export const buttonShadow: ViewStyle =
  Platform.select<ViewStyle>({
    ios: { shadowColor: '#4e46dc', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 4, shadowColor: '#4e46dc' },
    default: { boxShadow: '0 6px 16px rgba(78,70,220,0.30)' } as ViewStyle,
  }) ?? {};

export const MAX_WIDTH = 560;
