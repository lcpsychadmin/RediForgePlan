// client/src/theme/componentsOverrides.ts

import { Theme } from '@mui/material/styles';
import { palette } from './palette';

export const componentsOverrides = (theme: Theme) => ({
  // Button overrides
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: theme.spacing(1),
        padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
        transition: theme.transitions.create(['background-color', 'transform', 'box-shadow'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8],
        },
      },
      contained: {
        boxShadow: theme.shadows[2],
      },
      outlined: {
        borderColor: palette.divider,
        '&:hover': {
          borderColor: theme.palette.primary.main,
          backgroundColor: `${theme.palette.primary.main}08`,
        },
      },
      sizeSmall: {
        padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
        fontSize: '0.75rem',
      },
    },
  },

  // Tabs overrides
  MuiTabs: {
    styleOverrides: {
      root: {
        backgroundColor: palette.background.paper,
        borderBottom: `1px solid ${palette.divider}`,
      },
      indicator: {
        height: 3,
        backgroundColor: theme.palette.primary.main,
      },
    },
  },

  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        fontSize: '0.95rem',
        color: palette.text.secondary,
        transition: theme.transitions.create(['color', 'background-color']),
        '&:hover': {
          color: palette.text.primary,
          backgroundColor: `${palette.primary.main}08`,
        },
        '&.Mui-selected': {
          color: theme.palette.primary.main,
          fontWeight: 600,
        },
      },
    },
  },

  // Card overrides
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundColor: palette.background.paper,
        backgroundImage: 'none',
        borderRadius: theme.spacing(1.5),
        border: `1px solid ${palette.divider}`,
        boxShadow: theme.shadows[1],
        transition: theme.transitions.create(['box-shadow', 'border-color', 'transform'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          boxShadow: theme.shadows[4],
          borderColor: `${theme.palette.primary.main}40`,
        },
      },
    },
  },

  // Chip overrides
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 500,
        borderRadius: theme.spacing(1),
      },
      filled: {
        backgroundColor: `${palette.primary.main}20`,
        color: palette.text.primary,
      },
      outlined: {
        borderColor: palette.divider,
        backgroundColor: 'transparent',
      },
    },
  },

  // Table overrides
  MuiTable: {
    styleOverrides: {
      root: {
        backgroundColor: palette.background.paper,
      },
    },
  },

  MuiTableHead: {
    styleOverrides: {
      root: {
        backgroundColor: `${palette.background.elevated}80`,
        '& .MuiTableCell-head': {
          fontWeight: 700,
          color: palette.text.primary,
          borderColor: palette.divider,
          backgroundColor: palette.background.elevated,
        },
      },
    },
  },

  MuiTableBody: {
    styleOverrides: {
      root: {
        '& .MuiTableRow-root': {
          borderColor: palette.divider,
          '&:hover': {
            backgroundColor: `${palette.primary.main}08`,
          },
          '&:nth-of-type(even)': {
            backgroundColor: `${palette.background.elevated}40`,
          },
        },
        '& .MuiTableCell-body': {
          color: palette.text.primary,
          borderColor: palette.divider,
        },
      },
    },
  },

  MuiTableCell: {
    styleOverrides: {
      root: {
        borderColor: palette.divider,
      },
      head: {
        fontWeight: 700,
        color: palette.text.primary,
        backgroundColor: palette.background.elevated,
      },
    },
  },

  // Drawer overrides
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: palette.background.paper,
        backgroundImage: 'none',
        borderRight: `1px solid ${palette.divider}`,
      },
    },
  },

  // AppBar overrides
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: palette.background.paper,
        backgroundImage: 'none',
        borderBottom: `1px solid ${palette.divider}`,
        boxShadow: theme.shadows[1],
      },
    },
  },

  // TextField overrides
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          color: palette.text.primary,
          '& fieldset': {
            borderColor: palette.divider,
          },
          '&:hover fieldset': {
            borderColor: `${palette.primary.main}60`,
          },
          '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main,
          },
        },
      },
    },
  },

  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        backgroundColor: `${palette.background.elevated}40`,
      },
    },
  },

  // InputLabel overrides
  MuiInputLabel: {
    styleOverrides: {
      root: {
        color: palette.text.secondary,
      },
    },
  },

  // Tooltip overrides
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: `${palette.background.default}E0`,
        color: palette.text.primary,
        fontSize: '0.75rem',
        fontWeight: 500,
        backdropFilter: 'blur(4px)',
      },
      arrow: {
        color: `${palette.background.default}E0`,
      },
    },
  },

  // List overrides
  MuiList: {
    styleOverrides: {
      root: {
        backgroundColor: 'transparent',
      },
    },
  },

  MuiListItem: {
    styleOverrides: {
      root: {
        borderRadius: theme.spacing(0.75),
        marginBottom: theme.spacing(0.5),
        '&:hover': {
          backgroundColor: `${palette.primary.main}08`,
        },
      },
    },
  },

  MuiListItemButton: {
    styleOverrides: {
      root: {
        color: palette.text.secondary,
        borderRadius: theme.spacing(0.75),
        '&:hover': {
          backgroundColor: `${palette.primary.main}12`,
          color: palette.text.primary,
        },
        '&.Mui-selected': {
          backgroundColor: `${palette.primary.main}16`,
          color: theme.palette.primary.main,
          fontWeight: 600,
          '&:hover': {
            backgroundColor: `${palette.primary.main}20`,
          },
        },
      },
    },
  },

  // Dialog overrides
  MuiDialog: {
    styleOverrides: {
      paper: {
        backgroundColor: palette.background.paper,
        backgroundImage: 'none',
        borderRadius: theme.spacing(2),
      },
    },
  },

  // Paper overrides
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundColor: palette.background.paper,
        backgroundImage: 'none',
      },
    },
  },

  // Select overrides
  MuiSelect: {
    styleOverrides: {
      root: {
        color: palette.text.primary,
      },
    },
  },

  // Menu overrides
  MuiMenu: {
    styleOverrides: {
      paper: {
        backgroundColor: palette.background.elevated,
        backgroundImage: 'none',
      },
    },
  },

  MuiMenuItem: {
    styleOverrides: {
      root: {
        color: palette.text.primary,
        '&:hover': {
          backgroundColor: `${palette.primary.main}12`,
        },
        '&.Mui-selected': {
          backgroundColor: `${palette.primary.main}16`,
          '&:hover': {
            backgroundColor: `${palette.primary.main}20`,
          },
        },
      },
    },
  },

  // Badge overrides
  MuiBadge: {
    styleOverrides: {
      badge: {
        backgroundColor: theme.palette.primary.main,
        color: '#ffffff',
      },
    },
  },

  // Progress overrides
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        backgroundColor: `${palette.background.elevated}60`,
      },
      bar: {
        backgroundColor: theme.palette.primary.main,
      },
    },
  },

  // Divider overrides
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: palette.divider,
      },
    },
  },

  // Alert overrides
  MuiAlert: {
    styleOverrides: {
      root: {
        backgroundColor: `${palette.primary.main}12`,
        color: palette.text.primary,
        borderRadius: theme.spacing(1),
      },
      standardInfo: {
        backgroundColor: `${palette.info.main}12`,
      },
      standardSuccess: {
        backgroundColor: `${palette.success.main}12`,
      },
      standardWarning: {
        backgroundColor: `${palette.warning.main}12`,
      },
      standardError: {
        backgroundColor: `${palette.error.main}12`,
      },
    },
  },

  // Skeleton overrides
  MuiSkeleton: {
    styleOverrides: {
      root: {
        backgroundColor: `${palette.background.elevated}60`,
      },
    },
  },
});

export default componentsOverrides;
