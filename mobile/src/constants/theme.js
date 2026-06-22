// src/constants/theme.js
// Tema S-Doorbell — claro, con dorado como color de acción y azul de marca (logo).

export const COLORS = {
  // Acción principal (dorado de los mockups)
  primary: '#E0A82E',
  primaryDark: '#C68A1E',
  primaryLight: '#F0C65A',
  primarySoft: '#FBF3DF', // fondo suave dorado

  // Marca (azul del logo S-doorbell / QR)
  brand: '#2E9BE0',
  brandDark: '#1E7BC0',
  brandSoft: '#E6F3FB',

  // Neutros
  black: '#000000',
  white: '#FFFFFF',
  gray50: '#F7F7F8',
  gray100: '#EFEFF1',
  gray200: '#E2E2E6',
  gray300: '#C9C9CF',
  gray400: '#A0A0A8',
  gray500: '#76767E',
  gray600: '#55555C',
  gray700: '#3C3C42',
  gray800: '#2A2A2E',
  gray900: '#19191C',

  // Semánticos
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#2E9BE0',

  // Superficies (modo claro, el de los mockups)
  background: '#F2F2F4',
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',

  // Barra de tabs oscura (mockup)
  tabBar: '#2A2A2E',

  // Texto
  text: '#19191C',
  textSecondary: '#76767E',
  textMuted: '#A0A0A8',
  border: '#E2E2E6',

  // Transparencias
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.12)',
};

export const FONTS = {
  light: 'System',
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
};

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
  '5xl': 72,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  gold: {
    shadowColor: '#E0A82E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  blue: {
    shadowColor: '#2E9BE0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Compat: getTheme sigue disponible, ahora siempre claro.
export const getTheme = () => ({
  dark: false,
  colors: {
    background: COLORS.background,
    surface: COLORS.surface,
    card: COLORS.surfaceCard,
    text: COLORS.text,
    textSecondary: COLORS.textSecondary,
    textMuted: COLORS.textMuted,
    border: COLORS.border,
    primary: COLORS.primary,
    ...COLORS,
  },
});
