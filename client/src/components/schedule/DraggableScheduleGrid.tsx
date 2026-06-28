// client/src/components/schedule/DraggableScheduleGrid.tsx

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { addDays, format, differenceInCalendarDays, max, min } from 'date-fns';
import WeekHeader from './WeekHeader';
import { ScheduleItem as ScheduleItemType } from '../../api/types';
import { palette } from '../../theme/palette';

interface DraggableScheduleGridProps {
  items?: ScheduleItemType[];
  weekStart: Date;
  projectId: string;
  processAreaAccentOverrides?: Record<string, Record<string, string>>;
}

interface PositionedItem {
  item: ScheduleItemType;
  startCol: number;
  endCol: number;
  lane: number;
  color: string;
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
  processAreaAccentOverrides = {},
}) => {
  const laneCardHeight = 92;
  const laneGapPx = 8;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 6);

  const areaPalette = ['#2979FF', '#00A884', '#F97316', '#8B5CF6', '#D946EF', '#0EA5E9', '#F59E0B', '#EF4444'];

  const getDateKey = (value: string | undefined | null) => (value ? String(value).slice(0, 10) : '');

  const dateFromKey = (key: string) => {
    const safeKey = key || '1970-01-01';
    return new Date(`${safeKey}T00:00:00`);
  };

  const hashColorForArea = (area: string) => {
    let hash = 0;
    for (let i = 0; i < area.length; i += 1) {
      hash = (hash * 31 + area.charCodeAt(i)) >>> 0;
    }
    return areaPalette[hash % areaPalette.length];
  };

  const getAreaColor = (item: ScheduleItemType) => {
    const processArea = (item.processArea || 'Unassigned').trim();
    const override = processAreaAccentOverrides?.[projectId]?.[processArea];
    return override || hashColorForArea(processArea);
  };

  const visibleSpans = items
    .map((item) => {
      const startKey = getDateKey(item.startDate || item.scheduledDate);
      const endKey = getDateKey(item.endDate || item.scheduledDate);
      if (!startKey || !endKey) return null;

      const rawStart = dateFromKey(startKey);
      const rawEnd = dateFromKey(endKey);
      const spanStart = rawStart <= rawEnd ? rawStart : rawEnd;
      const spanEnd = rawStart <= rawEnd ? rawEnd : rawStart;

      if (spanEnd < weekStart || spanStart > weekEnd) return null;

      const clampedStart = max([spanStart, weekStart]);
      const clampedEnd = min([spanEnd, weekEnd]);
      const startCol = differenceInCalendarDays(clampedStart, weekStart) + 1;
      const endCol = differenceInCalendarDays(clampedEnd, weekStart) + 1;

      return {
        item,
        startCol,
        endCol,
      };
    })
    .filter(Boolean) as Array<{ item: ScheduleItemType; startCol: number; endCol: number }>;

  visibleSpans.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    return b.endCol - a.endCol;
  });

  const laneEndCols: number[] = [];
  const positionedItems: PositionedItem[] = visibleSpans.map((entry) => {
    let lane = laneEndCols.findIndex((endCol) => entry.startCol > endCol);
    if (lane === -1) {
      lane = laneEndCols.length;
      laneEndCols.push(entry.endCol);
    } else {
      laneEndCols[lane] = entry.endCol;
    }

    return {
      ...entry,
      lane,
      color: getAreaColor(entry.item),
    };
  });

  const laneCount = Math.max(1, laneEndCols.length);
  const columnHeight = (laneCount * laneCardHeight) + ((laneCount - 1) * laneGapPx);

  const legendEntries = Array.from(
    new Map(
      positionedItems.map((entry) => {
        const area = (entry.item.processArea || 'Unassigned').trim() || 'Unassigned';
        return [area, entry.color] as const;
      })
    ).entries()
  );

  return (
    <Box>
      <WeekHeader weekStart={weekStart} />

      {legendEntries.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
          {legendEntries.map(([area, color]) => (
            <Box
              key={area}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: `1px solid ${alpha('#ffffff', 0.7)}`,
                  boxShadow: `0 0 0 1px ${alpha(color, 0.35)}`,
                }}
              />
              <Typography variant="caption" sx={{ color: palette.text.primary, fontWeight: 700 }}>
                {area}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {positionedItems.length === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ color: palette.text.secondary }}>
            No scheduled load cards for this week.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gridTemplateRows: '1fr',
              gap: 1,
            }}
          >
            {days.map((day) => {
              const isToday =
                day.getDate() === new Date().getDate() &&
                day.getMonth() === new Date().getMonth() &&
                day.getFullYear() === new Date().getFullYear();

              return (
                <Paper
                  key={format(day, 'yyyy-MM-dd')}
                  sx={{
                    minHeight: columnHeight,
                    backgroundColor: isToday ? `${palette.primary.main}10` : palette.background.paper,
                    border: isToday ? `2px solid ${palette.primary.main}` : `1px solid ${palette.divider}`,
                    borderRadius: 1.25,
                  }}
                />
              );
            })}
          </Box>

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gridTemplateRows: '1fr',
              gap: 1,
              pointerEvents: 'none',
            }}
          >
            {positionedItems.map(({ item, startCol, endCol, lane, color }) => {
              const idLine = item.objectId || item.taskName || 'Object';
              const description = item.objectDescription || item.taskName || '';

              return (
                <Paper
                  key={item.id}
                  sx={{
                    gridColumn: `${startCol} / ${endCol + 1}`,
                    gridRow: 1,
                    alignSelf: 'start',
                    mt: `${lane * (laneCardHeight + laneGapPx)}px`,
                    minHeight: laneCardHeight,
                    backgroundColor: alpha(color, 0.56),
                    color: '#fff',
                    p: 1,
                    borderRadius: 1.25,
                    boxShadow: 1,
                    pointerEvents: 'auto',
                    overflow: 'hidden',
                    border: `2px dotted ${alpha('#ffffff', 0.85)}`,
                    backdropFilter: 'blur(2px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      display: 'block',
                      whiteSpace: 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.68rem',
                      lineHeight: 1.1,
                    }}
                  >
                    {idLine}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      opacity: 0.98,
                      whiteSpace: 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.66rem',
                      lineHeight: 1.1,
                    }}
                  >
                    {description}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      opacity: 0.9,
                      whiteSpace: 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.64rem',
                      lineHeight: 1.1,
                    }}
                  >
                    Program: {item.programName || 'Unassigned'}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      opacity: 0.9,
                      whiteSpace: 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.64rem',
                      lineHeight: 1.1,
                    }}
                  >
                    Project: {item.projectName || 'Unassigned'}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      opacity: 0.9,
                      whiteSpace: 'normal',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.64rem',
                      lineHeight: 1.1,
                    }}
                  >
                    Mock: {item.mockCycleName || 'Unassigned'}
                  </Typography>
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DraggableScheduleGrid;
