// client/src/components/schedule/ScheduleGrid.tsx

import React, { useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress, Alert, useTheme } from '@mui/material';
import { addDays, startOfWeek, parse, isWithinInterval } from 'date-fns';
import ScheduleItem from './ScheduleItem';
import WeekHeader from './WeekHeader';
import { ScheduleItem as ScheduleItemType } from '../../hooks/useSchedule';
import { palette } from '../../theme/palette';

interface ScheduleGridProps {
  items?: ScheduleItemType[];
  loading?: boolean;
  error?: Error | null;
  weekStart?: Date;
  onItemDropped?: (itemId: string, newDate: string) => void;
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  items = [],
  loading,
  error,
  weekStart = startOfWeek(new Date()),
  onItemDropped,
}) => {
  const theme = useTheme();
  const [draggedItem, setDraggedItem] = useState<ScheduleItemType | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getItemsForDay = (date: Date) => {
    return items.filter((item) => {
      try {
        const itemDate = parse(item.scheduledDate, 'yyyy-MM-dd', new Date());
        return (
          itemDate.getFullYear() === date.getFullYear() &&
          itemDate.getMonth() === date.getMonth() &&
          itemDate.getDate() === date.getDate()
        );
      } catch {
        return false;
      }
    });
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedItem) {
      const formattedDate = date.toISOString().split('T')[0];
      onItemDropped?.(draggedItem.id, formattedDate);
      setDraggedItem(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load schedule: {error.message}</Alert>;
  }

  return (
    <Box>
      <WeekHeader weekStart={weekStart} />

      <Grid container spacing={1}>
        {days.map((day) => {
          const dayItems = getItemsForDay(day);
          const isToday =
            day.getDate() === new Date().getDate() &&
            day.getMonth() === new Date().getMonth() &&
            day.getFullYear() === new Date().getFullYear();

          return (
            <Grid item xs={12} sm={10 / 7} key={day.toISOString()}>
              <Paper
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, day)}
                sx={{
                  p: 1.5,
                  minHeight: 140,
                  backgroundColor: isToday ? `${palette.primary.main}12` : palette.background.paper,
                  backgroundImage: 'none',
                  border: isToday ? `2px solid ${palette.primary.main}` : `1px solid ${palette.divider}`,
                  borderRadius: theme.spacing(1.25),
                  cursor: 'copy',
                  transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                  '&:hover': {
                    borderColor: palette.primary.main,
                    backgroundColor: `${palette.primary.main}08`,
                    boxShadow: theme.shadows[2],
                  },
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {dayItems.map((item) => (
                    <ScheduleItem
                      key={item.id}
                      item={item}
                      onDragStart={() => setDraggedItem(item)}
                      onDragEnd={() => setDraggedItem(null)}
                    />
                  ))}
                  {dayItems.length === 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: palette.text.disabled,
                        p: 2,
                        textAlign: 'center',
                        fontStyle: 'italic',
                      }}
                    >
                      No tasks scheduled
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default ScheduleGrid;
