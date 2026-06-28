// client/src/components/schedule/WeekHeader.tsx

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { format, addDays, startOfWeek } from 'date-fns';
import { palette } from '../../theme/palette';

interface WeekHeaderProps {
  weekStart?: Date;
}

const WeekHeader: React.FC<WeekHeaderProps> = ({ weekStart = startOfWeek(new Date()) }) => {
  const theme = useTheme();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: 1,
        mb: 2,
        pb: 2,
        borderBottom: `2px solid ${palette.divider}`,
      }}
    >
      {days.map((day) => {
        const isToday =
          day.getDate() === new Date().getDate() &&
          day.getMonth() === new Date().getMonth() &&
          day.getFullYear() === new Date().getFullYear();

        return (
          <Box key={day.toISOString()}>
            <Box
              sx={{
                textAlign: 'center',
                py: 1,
                px: 1.5,
                borderRadius: theme.spacing(1),
                backgroundColor: isToday ? `${palette.primary.main}12` : 'transparent',
                border: isToday ? `2px solid ${palette.primary.main}` : 'transparent',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  display: 'block',
                  color: palette.text.primary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.75rem',
                }}
              >
                {format(day, 'EEE')}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: isToday ? palette.primary.main : palette.text.secondary,
                  fontWeight: isToday ? 600 : 500,
                  fontSize: '0.85rem',
                }}
              >
                {format(day, 'MMM d')}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default WeekHeader;
