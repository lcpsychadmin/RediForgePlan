# RediForge Theme System Documentation

## Overview

The RediForge planning application uses a professional, dark-mode-first Material UI v5 theme designed for data-intensive dashboards and execution planning interfaces.

## Theme Architecture

### File Structure

```
client/src/theme/
├── palette.ts              # Color definitions and semantic colors
├── typography.ts           # Font sizing and heading hierarchy
├── componentsOverrides.ts   # MUI component customizations
├── theme.ts               # Main theme configuration
└── index.ts               # Export barrel
```

## Color Palette

### Primary Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#1976d2` | Links, active states, primary actions |
| Primary Light | `#42a5f5` | Hover states, disabled backgrounds |
| Primary Dark | `#0d47a1` | Pressed states |

### Secondary Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Secondary | `#9c27b0` | Accents, secondary UI elements |
| Secondary Light | `#ba68c8` | Hover states |
| Secondary Dark | `#4a148c` | Pressed states |

### Status Colors

| Status | Hex | Usage |
|--------|-----|-------|
| Success | `#22c55e` | Complete, active, positive actions |
| Warning | `#f97316` | In progress, caution, attention needed |
| Error | `#ef4444` | Blocked, errors, critical alerts |
| Info | `#06b6d4` | Informational, additional context |

### Background & Surface

| Layer | Hex | Usage |
|-------|-----|-------|
| Default Background | `#0f172a` | Page/app shell background |
| Paper/Surface | `#111827` | Cards, panels, surfaces |
| Elevated | `#1f2937` | Table headers, modals |

### Text Colors

| Level | Hex | Usage |
|-------|-----|-------|
| Primary Text | `#f9fafb` | Headings, primary content |
| Secondary Text | `#d1d5db` | Descriptions, metadata |
| Disabled Text | `#6b7280` | Disabled fields, inactive states |
| Hint Text | `#9ca3af` | Placeholders, hints |

## Task Type Colors

Specific colors for different task types in the schedule:

```typescript
{
  extract: '#90caf9',           // Light blue
  transform: '#ffb74d',         // Amber
  preloadValidation: '#81c784', // Green
  load: '#ef5350',              // Red
  postloadValidation: '#ba68c8',// Purple
  custom: '#a1887f',            // Brown
}
```

## Typography System

### Heading Hierarchy

| Variant | Size | Weight | Usage |
|---------|------|--------|-------|
| h1 | 2.5rem | 700 | Page titles |
| h2 | 2rem | 700 | Major sections |
| h3 | 1.5rem | 600 | Subsections |
| h4 | 1.25rem | 600 | Card titles |
| h5 | 1rem | 600 | Labels, subheadings |
| h6 | 0.875rem | 600 | Small labels |

### Body Text

| Variant | Size | Weight | Usage |
|---------|------|--------|-------|
| body1 | 1rem | 400 | Main content |
| body2 | 0.875rem | 400 | Secondary content |
| subtitle1 | 1rem | 500 | Prominent metadata |
| subtitle2 | 0.875rem | 500 | Metadata, labels |
| caption | 0.75rem | 400 | Small text, hints |
| overline | 0.75rem | 700 | All-caps labels |
| button | 0.875rem | 600 | Button labels |

### Font Family

- **Primary**: Inter (recommended)
- **Fallback**: Roboto, Helvetica, Arial, sans-serif

## Component Customizations

### Button

```typescript
// Custom styling applied:
- Text transform: none (no uppercase)
- Border radius: 8px
- Smooth transitions with hover elevation
- Hover effect: translateY(-2px) + shadow elevation
- Padding: 8px 16px (default)
```

### Tabs

```typescript
// Styling:
- Indicator height: 3px
- Inactive color: secondary text
- Active color: primary
- Indicator color: primary
- Smooth hover background tint
```

### Card

```typescript
// Styling:
- Border: 1px solid divider
- Border radius: 12px
- Hover: elevation + border highlight + transform
- Background: paper surface
```

### Table

```typescript
// Styling:
- Sticky header with elevated background
- Alternating row backgrounds
- Hover highlight on rows
- Dense cell padding
```

### Status Chip

```typescript
// Color mapping:
- not_started: Gray (#9ca3af)
- in_progress: Primary (#1976d2)
- blocked: Warning (#f97316)
- complete: Success (#22c55e)
```

## Usage Examples

### Using Theme Colors in Components

```typescript
import { useTheme } from '@mui/material/styles';
import { palette } from '../theme/palette';

export const MyComponent = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        backgroundColor: palette.background.paper,
        borderColor: palette.divider,
        color: palette.text.primary,
        borderRadius: theme.spacing(1),
        p: theme.spacing(2),
      }}
    >
      Content
    </Box>
  );
};
```

### Creating Colored Buttons

```typescript
import { Button, useTheme } from '@mui/material';
import { palette } from '../theme/palette';

// Primary action
<Button variant="contained" color="primary">
  Create
</Button>

// Success action
<Button
  variant="contained"
  sx={{
    backgroundColor: palette.success.main,
    '&:hover': {
      backgroundColor: palette.success.dark,
    },
  }}
>
  Complete
</Button>

// Danger action
<Button
  variant="contained"
  sx={{
    backgroundColor: palette.error.main,
    '&:hover': {
      backgroundColor: palette.error.dark,
    },
  }}
>
  Delete
</Button>
```

### Responsive Typography

```typescript
import { Typography, useTheme } from '@mui/material';
import { useMediaQuery } from '@mui/material';

export const ResponsiveTitle = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Typography variant={isMobile ? 'h4' : 'h3'}>
      Responsive Heading
    </Typography>
  );
};
```

### Dark-Mode Aware Styling

Since the theme is dark mode first, all backgrounds and text colors are pre-configured:

```typescript
// ✓ Correct - Uses theme colors
<Box sx={{ 
  backgroundColor: palette.background.paper,
  color: palette.text.primary 
}}>
  Content
</Box>

// ✗ Wrong - Hard-coded light colors
<Box sx={{ 
  backgroundColor: '#ffffff',
  color: '#000000'
}}>
  Won't work well in dark mode
</Box>
```

## Customization Guide

### Changing Brand Colors

Edit `client/src/theme/palette.ts`:

```typescript
export const palette = {
  primary: {
    main: '#1976d2',      // Change this
    light: '#42a5f5',     // Change this
    dark: '#0d47a1',      // Change this
    // ...
  },
  // ...
};
```

Then rebuild the app for changes to take effect.

### Modifying Typography

Edit `client/src/theme/typography.ts`:

```typescript
export const typography: TypographyOptions = {
  h1: {
    fontSize: '2.5rem',    // Adjust size
    fontWeight: 700,       // Adjust weight
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  // ...
};
```

### Customizing Component Styles

Edit `client/src/theme/componentsOverrides.ts`:

```typescript
export const componentsOverrides = (theme: Theme) => ({
  MuiButton: {
    styleOverrides: {
      root: {
        // Customize button styling here
        borderRadius: theme.spacing(2),
        // ...
      },
    },
  },
  // Add or modify component overrides
});
```

### Adding New Status Colors

1. Add to palette in `client/src/theme/palette.ts`:

```typescript
status: {
  notStarted: '#9ca3af',
  inProgress: '#1976d2',
  blocked: '#f97316',
  complete: '#22c55e',
  custom: '#new-color',  // Add here
},
```

2. Use in components:

```typescript
import { palette } from '../theme/palette';

const color = palette.status.custom;
```

## Spacing System

The theme uses an 8px base unit:

```typescript
theme.spacing(1)  // 8px
theme.spacing(2)  // 16px
theme.spacing(3)  // 24px
theme.spacing(4)  // 32px
// etc.
```

### Spacing Guidelines

- **Content padding**: `theme.spacing(2)` to `theme.spacing(3)` (16-24px)
- **Element gap**: `theme.spacing(1)` to `theme.spacing(2)` (8-16px)
- **Section margin**: `theme.spacing(3)` to `theme.spacing(4)` (24-32px)

## Breakpoints

```typescript
xs: 0px      // Mobile
sm: 600px    // Tablet
md: 960px    // Desktop
lg: 1280px   // Large desktop
xl: 1920px   // Extra large
```

### Responsive Usage

```typescript
import { useTheme, useMediaQuery } from '@mui/material';

export const ResponsiveComponent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  return (
    <Box sx={{
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? theme.spacing(1) : theme.spacing(2),
    }}>
      {/* Content */}
    </Box>
  );
};
```

## Component Reference

### Themed Components

All MUI components automatically use the theme:

- ✓ Button, ButtonGroup
- ✓ TextField, Select, Checkbox, Radio
- ✓ Card, Paper, Box
- ✓ Table, TableCell, TableRow
- ✓ Tabs, Tab
- ✓ Chip
- ✓ Drawer, AppBar
- ✓ Dialog, Modal
- ✓ Alert, Snackbar
- ✓ LinearProgress, CircularProgress
- ✓ Badge, Avatar
- ✓ Tooltip, Menu, Popover
- ✓ List, ListItem
- ✓ And all other MUI components

### Themed Shadows

```typescript
theme.shadows[1]   // Subtle
theme.shadows[4]   // Elevated
theme.shadows[8]   // High elevation
theme.shadows[16]  // Modal
```

### Transitions

```typescript
// Use theme transitions for smooth animations
sx={{
  transition: theme.transitions.create(['color', 'background-color'], {
    duration: theme.transitions.duration.shorter,
  }),
}}
```

## Best Practices

### 1. Always Use Theme Colors

```typescript
// ✓ Good
sx={{ color: palette.text.primary }}

// ✗ Bad
sx={{ color: '#f9fafb' }}
```

### 2. Use Theme Spacing

```typescript
// ✓ Good
sx={{ p: theme.spacing(2), gap: theme.spacing(1) }}

// ✗ Bad
sx={{ p: '16px', gap: '8px' }}
```

### 3. Respect Dark Mode

```typescript
// ✓ Good - Works with dark theme
sx={{ backgroundColor: palette.background.paper }}

// ✗ Bad - Light background breaks dark theme
sx={{ backgroundColor: '#ffffff' }}
```

### 4. Use Theme Transitions

```typescript
// ✓ Good
sx={{
  transition: theme.transitions.create(['opacity'], {
    duration: theme.transitions.duration.standard,
  }),
}}

// ✗ Bad
sx={{ transition: 'opacity 300ms' }}
```

### 5. Responsive Design

```typescript
// ✓ Good
sx={{
  fontSize: { xs: '14px', sm: '16px', md: '18px' },
  padding: { xs: theme.spacing(1), md: theme.spacing(2) },
}}

// ✗ Bad - Not responsive
sx={{ fontSize: '18px', padding: '16px' }}
```

## Troubleshooting

### Colors Look Wrong

**Problem**: Colors appear different than expected.

**Solution**: 
- Check that you're importing from `theme/palette.ts`
- Ensure the component has access to the theme (wrapped with `ThemeProvider`)
- Check browser dark mode setting

### Typography Not Applied

**Problem**: Font sizes or weights don't match theme.

**Solution**:
- Verify component is using MUI Typography with correct variant
- Check that custom styles aren't overriding theme typography
- Ensure theme is applied at root level in App.tsx

### Theme Not Updating

**Problem**: Changes to theme don't appear in app.

**Solution**:
- Restart dev server: `npm run dev`
- Clear browser cache
- Check that imports reference correct theme files
- Verify `theme.ts` exports correctly

## Contributing to Theme

When adding new components or styles:

1. Use theme colors from `palette.ts`
2. Use theme spacing with `theme.spacing()`
3. Use theme transitions with `theme.transitions.create()`
4. Follow typography hierarchy from `typography.ts`
5. Add component overrides to `componentsOverrides.ts` if needed
6. Test in dark mode
7. Test on mobile breakpoints

## Related Files

- [API_ENDPOINTS.md](../API_ENDPOINTS.md) - Backend API reference
- [FRONTEND_DOCUMENTATION.md](../FRONTEND_DOCUMENTATION.md) - Component documentation
- [QUICK_START.md](../QUICK_START.md) - Setup and getting started

---

**Last Updated**: 2026-06-15  
**Version**: 1.0  
**Theme Version**: Material UI v5.14.0
