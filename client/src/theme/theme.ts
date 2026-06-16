// client/src/theme/theme.ts

import { createTheme, ThemeOptions } from '@mui/material/styles';
import { palette } from './palette';
import { typography } from './typography';
import { componentsOverrides } from './componentsOverrides';

// Create base theme with palette and typography
const baseTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: palette.primary.main,
      light: palette.primary.light,
      dark: palette.primary.dark,
      contrastText: palette.primary.contrastText,
    },
    secondary: {
      main: palette.secondary.main,
      light: palette.secondary.light,
      dark: palette.secondary.dark,
      contrastText: palette.secondary.contrastText,
    },
    success: {
      main: palette.success.main,
      light: palette.success.light,
      dark: palette.success.dark,
      contrastText: palette.success.contrastText,
    },
    warning: {
      main: palette.warning.main,
      light: palette.warning.light,
      dark: palette.warning.dark,
      contrastText: palette.warning.contrastText,
    },
    error: {
      main: palette.error.main,
      light: palette.error.light,
      dark: palette.error.dark,
      contrastText: palette.error.contrastText,
    },
    info: {
      main: palette.info.main,
      light: palette.info.light,
      dark: palette.info.dark,
      contrastText: palette.info.contrastText,
    },
    background: {
      default: palette.background.default,
      paper: palette.background.paper,
    },
    text: {
      primary: palette.text.primary,
      secondary: palette.text.secondary,
      disabled: palette.text.disabled,
    },
    divider: palette.divider as any,
    action: {
      hover: palette.action.hover,
      selected: palette.action.selected,
      disabled: palette.action.disabled,
      disabledBackground: palette.action.disabledBackground,
    },
  } as ThemeOptions['palette'],

  typography: typography as ThemeOptions['typography'],

  spacing: 8,

  shape: {
    borderRadius: 8,
  },
});

// Apply component overrides with full theme context
const theme = createTheme(baseTheme, {
  components: componentsOverrides(baseTheme),
});

export default theme;
export { palette };
