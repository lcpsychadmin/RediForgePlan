// client/src/components/schedule/DraggableScheduleItem.tsx

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Box, useTheme } from '@mui/material';
import { ScheduleItem } from '../../api/types';
import ScheduleItemComponent from './ScheduleItem';

interface DraggableScheduleItemProps {
  item: ScheduleItem;
  isOverlay?: boolean;
}

/**
 * Draggable wrapper around ScheduleItem
 * Integrates with @dnd-kit drag-and-drop system
 */
export const DraggableScheduleItem: React.FC<DraggableScheduleItemProps> = ({
  item,
  isOverlay = false,
}) => {
  const theme = useTheme();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: {
      type: 'scheduleItem',
      item,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging && !isOverlay ? 0.5 : 1,
    transition: isDragging ? 'none' : `transform ${theme.transitions.duration.shorter}ms`,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      sx={{
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        '&:hover': {
          filter: 'brightness(1.05)',
        },
      }}
    >
      <ScheduleItemComponent item={item} isDragover={isDragging} />
    </Box>
  );
};

export default DraggableScheduleItem;
