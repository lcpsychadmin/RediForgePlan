// client/src/components/schedule/DroppableScheduleCell.tsx

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Paper, Box, useTheme } from '@mui/material';
import { ScheduleItem } from '../../api/types';
import { palette } from '../../theme/palette';

interface DroppableScheduleCellProps {
  dayString: string; // ISO date string (YYYY-MM-DD)
  dayItems: ScheduleItem[];
  isToday: boolean;
  isUpdating: boolean;
  children?: React.ReactNode;
}

/**
 * Droppable cell in the schedule grid
 * Represents a single day column
 */
export const DroppableScheduleCell: React.FC<DroppableScheduleCellProps> = ({
  dayString,
  dayItems,
  isToday,
  isUpdating,
  children,
}) => {
  const theme = useTheme();
  const { setNodeRef, isOver, active } = useDroppable({
    id: dayString,
    data: {
      type: 'dayCell',
      dayString,
      itemCount: dayItems.length,
    },
  });

  const activeData = active?.data?.current as { type?: string; item?: ScheduleItem } | undefined;
  const canAccept =
    activeData?.type === 'scheduleItem' &&
    activeData?.item?.scheduledDate !== dayString;

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        p: 1.5,
        minHeight: 140,
        backgroundColor: isToday ? `${palette.primary.main}12` : palette.background.paper,
        backgroundImage: 'none',
        border: isToday ? `2px solid ${palette.primary.main}` : `1px solid ${theme.palette.divider}`,
        borderRadius: theme.spacing(1.25),
        cursor: isUpdating ? 'wait' : 'default',
        transition: theme.transitions.create(
          ['border-color', 'background-color', 'box-shadow', 'opacity'],
          {
            duration: theme.transitions.duration.shorter,
          }
        ),
        opacity: isUpdating ? 0.6 : 1,
        // Highlight on hover
        '&:hover': {
          borderColor: palette.primary.main,
          backgroundColor: `${palette.primary.main}08`,
          boxShadow: theme.shadows[2],
        },
        // Highlight when dragging over
        ...(isOver &&
          canAccept && {
            backgroundColor: `${palette.primary.main}20`,
            borderColor: palette.primary.main,
            borderStyle: 'dashed',
            boxShadow: `0 0 0 2px ${palette.primary.main}40`,
          }),
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </Box>
    </Paper>
  );
};

export default DroppableScheduleCell;
