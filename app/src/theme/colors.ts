/**
 * Design tokens - Colors
 * Based on FRONTEND_SPEC.md
 */

export const colors = {
  // Light theme
  bg: '#F2F5F9',
  surface: '#FFFFFF',
  border: '#D9DFE7',
  text: '#1F2933',
  textMuted: '#5F6B7A',
  primary: '#0B5FB5',
  primaryText: '#0B5FB5',
  headerBg: '#0B4A94',
  success: '#2E7D32',
  warning: '#B26A00',
  danger: '#C62828',

  // Dark theme
  bgDark: '#101418',
  surfaceDark: '#171C22',
  borderDark: '#232A33',
  textDark: '#E6EAF0',
  textMutedDark: '#8B95A3',
  primaryTextDark: '#4A9BE8',
  headerBgDark: '#0E2A4D',
  successDark: '#66BB6A',
  warningDark: '#FFB74D',
  dangerDark: '#EF5350',
} as const;

export type ColorKeys = keyof typeof colors;
