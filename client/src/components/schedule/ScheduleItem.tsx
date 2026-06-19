// client/src/components/schedule/ScheduleItem.tsx

import React from 'react';
import { Box, Chip, Tooltip, Typography, useTheme } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ScheduleItem } from '../../hooks/useSchedule';
import { palette } from '../../theme/palette';

interface ScheduleItemProps {
  item: ScheduleItem;
  hasOpenDefects?: boolean;
  isDragover?: boolean;
  onDragStart?: (e: React.DragEvent, item: ScheduleItem) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

const ScheduleItemComponent: React.FC<ScheduleItemProps> = ({
  item,
  hasOpenDefects = false,
  isDragover,
  onDragStart,
  onDragEnd,
}) => {
  const theme = useTheme();

  let color = palette.gray[500];
  switch (item.taskType) {
    case 'extract':
      color = palette.taskType.extract;
      break;
    case 'transform':
      color = palette.taskType.transform;
      break;
    case 'preload_validation':
      color = palette.taskType.preloadValidation;
      break;
    case 'load':
      color = palette.taskType.load;
      break;
    case 'postload_validation':
      color = palette.taskType.postloadValidation;
      break;
    case 'custom':
      color = palette.taskType.custom;
      break;
  }

  return (
    <Tooltip title={`${item.taskName || item.objectId} (${item.taskType})`}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Chip
          label={item.taskName || item.objectId || 'Task'}
          onDragStart={(e) => onDragStart?.(e, item)}
          onDragEnd={onDragEnd}
          draggable
          sx={{
            backgroundColor: color,
            color: '#ffffff',
            cursor: 'grab',
            fontWeight: 600,
            borderRadius: theme.spacing(1),
            fontSize: '0.8rem',
            '&:active': {
              cursor: 'grabbing',
              opacity: 0.8,
            },
            '&:hover': {
              filter: 'brightness(1.1)',
              boxShadow: theme.shadows[2],
            },
            opacity: isDragover ? 0.6 : 1,
            transition: theme.transitions.create(['opacity', 'box-shadow', 'filter'], {
              duration: theme.transitions.duration.shorter,
            }),
            maxWidth: '100%',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            '& .MuiChip-label': {
              px: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          }}
          size="small"
        />
        {hasOpenDefects ? (
          <Tooltip title="This task has open defects">
            <WarningAmberIcon color="warning" fontSize="small" />
          </Tooltip>
        ) : null}
      </Box>
    </Tooltip>
  );
};

export default ScheduleItemComponent;
