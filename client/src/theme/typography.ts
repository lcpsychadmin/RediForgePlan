// client/src/theme/typography.ts

import { TypographyOptions } from '@mui/material/styles/createTypography';

export const typography: TypographyOptions = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  
  // HTML heading tags
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },

  h2: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },

  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },

  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },

  h5: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },

  h6: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.6,
  },

  // Body text
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0.15px',
  },

  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.43,
    letterSpacing: '0.25px',
  },

  // Subtitle
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.75,
    letterSpacing: '0.15px',
  },

  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.57,
    letterSpacing: '0.1px',
  },

  // Button text
  button: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.75,
    letterSpacing: '0.4px',
    textTransform: 'none',
  },

  // Caption & overline
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.66,
    letterSpacing: '0.4px',
  },

  overline: {
    fontSize: '0.75rem',
    fontWeight: 700,
    lineHeight: 2.66,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
};

export default typography;
