// client/src/components/schedule/DraggableScheduleGrid.tsx

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  useTheme,
  Snackbar,
  Alert as MuiAlert,
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { addDays, parse, format } from 'date-fns';
import DraggableScheduleItem from './DraggableScheduleItem';
import DroppableScheduleCell from './DroppableScheduleCell';
import WeekHeader from './WeekHeader';
import { ScheduleItem as ScheduleItemType } from '../../api/types';
import { palette } from '../../theme/palette';
import { useUpdateScheduleItemInProject } from '../../api/hooks';

interface DraggableScheduleGridProps {
  items?: ScheduleItemType[];
  weekStart: Date;
  projectId: string;
}

interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

/**
 * Grid for drag-and-drop scheduling with week view
 * Uses @dnd-kit for robust drag-and-drop functionality
 * Supports dragging schedule items across days
 */
export const DraggableScheduleGrid: React.FC<DraggableScheduleGridProps> = ({
  items = [],
  weekStart,
  projectId,
}) => {
  const theme = useTheme();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { mutate: updateScheduleItem, isPending: isUpdating } = useUpdateScheduleItemInProject(projectId);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8, // 8px movement to activate drag
    }),
    useSensor(KeyboardSensor)
  );

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

  const getDayIdsForSortable = (date: Date) => {
    const dayItems = getItemsForDay(date);
    return dayItems.map((item) => `${item.id}-${format(date, 'yyyy-MM-dd')}`);
  };

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over) {
      return; // Dropped outside valid area
    }

    // Extract drop target info (format: "YYYY-MM-DD")
    const dropTargetId = over.id as string;

    if (typeof dropTargetId !== 'string' || !dropTargetId.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return; // Not a valid day drop target
    }

    // Extract item ID from active element
    const itemId = active.id as string;

    // Find the item being dragged
    const draggedItem = items.find((item) => item.id === itemId);

    if (!draggedItem) {
      return;
    }

    // If dropped on the same day, do nothing
    if (draggedItem.scheduledDate === dropTargetId) {
      return;
    }

    // Perform optimistic update
    updateScheduleItem(
      { id: itemId, scheduledDate: dropTargetId },
      {
        onSuccess: () => {
          setAlert({
            open: true,
            message: 'Schedule updated successfully',
            severity: 'success',
          });
        },
        onError: (error) => {
          setAlert({
            open: true,
            message: `Failed to update schedule. Changes reverted. ${error instanceof Error ? error.message : ''}`,
            severity: 'error',
          });
        },
      }
    );
  };

  const activeItem = items.find((item) => item.id === activeId);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Box>
          <WeekHeader weekStart={weekStart} />

          <Grid container spacing={1}>
            {days.map((day) => {
              const dayItems = getItemsForDay(day);
              const isToday =
                day.getDate() === new Date().getDate() &&
                day.getMonth() === new Date().getMonth() &&
                day.getFullYear() === new Date().getFullYear();
              const dayString = format(day, 'yyyy-MM-dd');

              return (
                <Grid item xs={12} sm={10 / 7} key={dayString}>
                  <DroppableScheduleCell
                    dayString={dayString}
                    dayItems={dayItems}
                    isToday={isToday}
                    isUpdating={isUpdating}
                  >
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
                    <SortableContext items={dayItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {dayItems.map((item) => (
                          <DraggableScheduleItem key={item.id} item={item} />
                        ))}
                      </Box>
                    </SortableContext>
                  </DroppableScheduleCell>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {/* Drag overlay for visual feedback */}
        <DragOverlay>
          {activeItem ? (
            <Box
              sx={{
                opacity: 0.8,
                boxShadow: theme.shadows[4],
              }}
            >
              <DraggableScheduleItem item={activeItem} isOverlay />
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MuiAlert severity={alert.severity} variant="filled">
          {alert.message}
        </MuiAlert>
      </Snackbar>
    </>
  );
};

export default DraggableScheduleGrid;
