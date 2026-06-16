// client/src/components/shared/TimelineBar.tsx

// client/src/components/shared/TimelineBar.tsx

import React from 'react';
import { Box, Tooltip, useTheme } from '@mui/material';
import { parse, isValid, differenceInDays } from 'date-fns';
import { palette } from '../../theme/palette';

interface TimelineBarProps {
  startDate?: string;
  endDate?: string;
  status?: string;
  height?: number;
}

const TimelineBar: React.FC<TimelineBarProps> = ({ startDate, endDate, status, height = 6 }) => {
  const theme = useTheme();

  if (!startDate || !endDate) {
    return (
      <Box
        sx={{
          height,
          backgroundColor: palette.background.elevated,
          borderRadius: 1,
        }}
      />
    );
  }

  const start = parse(startDate, 'yyyy-MM-dd', new Date());
  const end = parse(endDate, 'yyyy-MM-dd', new Date());

  if (!isValid(start) || !isValid(end)) {
    return (
      <Box
        sx={{
          height,
          backgroundColor: palette.background.elevated,
          borderRadius: 1,
        }}
      />
    );
  }

  const today = new Date();
  const totalDays = Math.max(1, differenceInDays(end, start));
  const elapsed = Math.max(0, Math.min(totalDays, differenceInDays(today, start)));
  const percentage = (elapsed / totalDays) * 100;

  let color = palette.primary.light;
  switch (status) {
    case 'in_progress':
      color = palette.warning.main;
      break;
    case 'blocked':
      color = palette.error.main;
      break;
    case 'complete':
      color = palette.success.main;
      break;
    case 'not_started':
    default:
      color = palette.primary.light;
  }

  return (
    <Tooltip title={`${startDate} → ${endDate}`}>
      <Box
        sx={{
          height,
          backgroundColor: `${palette.background.elevated}`,
          borderRadius: 1,
          overflow: 'hidden',
          border: `1px solid ${palette.divider}`,
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${Math.min(100, percentage)}%`,
            backgroundColor: color,
            transition: theme.transitions.create('width', {
              duration: theme.transitions.duration.standard,
            }),
            borderRadius: 1,
          }}
        />
      </Box>
    </Tooltip>
  );
};

export default TimelineBar;
