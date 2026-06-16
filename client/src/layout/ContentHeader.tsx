// client/src/layout/ContentHeader.tsx

import React from 'react';
import { Box, Typography, Chip, Button, Stack, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { palette } from '../theme/palette';

interface ContentHeaderProps {
  title: string;
  subtitle?: string;
  stats?: { label: string; value: string | number }[];
  onAddClick?: () => void;
  addButtonLabel?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

const ContentHeader: React.FC<ContentHeaderProps> = ({
  title,
  subtitle,
  stats,
  onAddClick,
  addButtonLabel = 'Add',
  actions,
  children,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 2,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              mb: 1,
              color: palette.text.primary,
              fontWeight: 700,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body1"
              sx={{
                color: palette.text.secondary,
                fontWeight: 400,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {actions}
          {onAddClick && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={onAddClick}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: theme.spacing(1),
                px: 3,
                py: 1.25,
                minWidth: 140,
                boxShadow: theme.shadows[2],
                '&:hover': {
                  boxShadow: theme.shadows[4],
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {addButtonLabel}
            </Button>
          )}
        </Stack>
      </Box>

      {stats && stats.length > 0 && (
        <Stack
          direction="row"
          spacing={2}
          sx={{
            mb: 3,
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          {stats.map((stat, index) => (
            <Chip
              key={index}
              label={`${stat.label}: ${stat.value}`}
              variant="filled"
              sx={{
                backgroundColor: `${palette.primary.main}12`,
                color: palette.text.primary,
                fontWeight: 500,
                borderRadius: theme.spacing(1),
                '& .MuiChip-label': {
                  px: 1.5,
                },
              }}
            />
          ))}
        </Stack>
      )}

      {children}
    </Box>
  );
};

export default ContentHeader;
