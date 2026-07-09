import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper'

const brandColor = '#10b981'
const brandDark = '#0a0f1a'

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brandColor,
    primaryContainer: '#d1fae5',
    secondary: '#06b6d4',
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceVariant: '#f1f5f9',
    onPrimary: '#ffffff',
    onBackground: '#0f172a',
    onSurface: '#1e293b',
    outline: '#cbd5e1',
    error: '#ef4444',
  },
}

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brandColor,
    primaryContainer: '#064e3b',
    secondary: '#0891b2',
    background: brandDark,
    surface: '#1e293b',
    surfaceVariant: '#334155',
    onPrimary: '#ffffff',
    onBackground: '#f8fafc',
    onSurface: '#e2e8f0',
    outline: '#475569',
    error: '#f87171',
  },
}
