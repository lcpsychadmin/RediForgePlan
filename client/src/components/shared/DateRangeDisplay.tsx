// client/src/components/shared/DateRangeDisplay.tsx

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { format, parse, isValid } from 'date-fns';
import EventIcon from '@mui/icons-material/Event';
import { palette } from '../../theme/palette';

interface DateRangeDisplayProps {
  startDate?: string;
  endDate?: string;
}

const DateRangeDisplay: React.FC<DateRangeDisplayProps> = ({ startDate, endDate }) => {
  const theme = useTheme();

  if (!startDate || !endDate) {
    return (
      <Typography
        variant="body2"
        sx={{
          color: palette.text.secondary,
          fontStyle: 'italic',
        }}
      >
        No dates set
      </Typography>
    );
  }

  const start = parse(startDate, 'yyyy-MM-dd', new Date());
  const end = parse(endDate, 'yyyy-MM-dd', new Date());

  if (!isValid(start) || !isValid(end)) {
    return (
      <Typography
        variant="body2"
        sx={{
          color: palette.error.main,
          fontStyle: 'italic',
        }}
      >
        Invalid dates
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <EventIcon
        sx={{
          fontSize: 16,
          color: palette.primary.main,
        }}
      />
      <Typography
        variant="body2"
        sx={{
          color: palette.text.secondary,
          fontWeight: 500,
        }}
      >
        {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}
      </Typography>
    </Box>
  );
};

export default DateRangeDisplay;
