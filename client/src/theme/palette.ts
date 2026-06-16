// client/src/theme/palette.ts

export const palette = {
  // Primary (Blue - Data/Information)
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    lighter: '#90caf9',
    dark: '#1565c0',
    darker: '#0d47a1',
    contrastText: '#ffffff',
  },

  // Secondary (Purple - Accent)
  secondary: {
    main: '#9c27b0',
    light: '#ba68c8',
    lighter: '#e1bee7',
    dark: '#7b1fa2',
    darker: '#4a148c',
    contrastText: '#ffffff',
  },

  // Success (Green - Positive/Complete)
  success: {
    main: '#22c55e',
    light: '#4ade80',
    lighter: '#86efac',
    dark: '#16a34a',
    darker: '#15803d',
    contrastText: '#ffffff',
  },

  // Warning (Orange - Caution)
  warning: {
    main: '#f97316',
    light: '#fb923c',
    lighter: '#fed7aa',
    dark: '#ea580c',
    darker: '#c2410c',
    contrastText: '#ffffff',
  },

  // Error (Red - Alert/Blocked)
  error: {
    main: '#ef4444',
    light: '#f87171',
    lighter: '#fecaca',
    dark: '#dc2626',
    darker: '#991b1b',
    contrastText: '#ffffff',
  },

  // Info (Teal - Informational)
  info: {
    main: '#06b6d4',
    light: '#22d3ee',
    lighter: '#a5f3fc',
    dark: '#0891b2',
    darker: '#164e63',
    contrastText: '#ffffff',
  },

  // Grayscale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },

  // Dark Mode Background
  background: {
    default: '#0f172a',
    paper: '#111827',
    elevated: '#1f2937',
  },

  // Text
  text: {
    primary: '#f9fafb',
    secondary: '#d1d5db',
    disabled: '#6b7280',
    hint: '#9ca3af',
  },

  // Action
  action: {
    hover: 'rgba(25, 118, 210, 0.08)',
    selected: 'rgba(25, 118, 210, 0.12)',
    disabled: 'rgba(255, 255, 255, 0.38)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
  },

  // Divider
  divider: 'rgba(255, 255, 255, 0.12)',

  // Component-specific colors
  status: {
    notStarted: '#9ca3af',
    inProgress: '#1976d2',
    blocked: '#f97316',
    complete: '#22c55e',
  },

  taskType: {
    extract: '#90caf9',
    transform: '#ffb74d',
    preloadValidation: '#81c784',
    load: '#ef5350',
    postloadValidation: '#ba68c8',
    custom: '#a1887f',
  },
};

export type Palette = typeof palette;
