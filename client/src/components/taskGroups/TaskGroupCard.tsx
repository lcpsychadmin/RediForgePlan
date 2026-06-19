// client/src/components/taskGroups/TaskGroupCard.tsx

import React from 'react';
import { Card, CardContent, CardHeader, Box, Stack, Typography, IconButton, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TimelineBar from '../shared/TimelineBar';
import DateRangeDisplay from '../shared/DateRangeDisplay';
import { TaskGroup } from '../../hooks/useTaskGroups';

interface TaskGroupCardProps {
  group: TaskGroup & { stats?: { taskCount: number; completedTasks: number } };
  openDefectsCount?: number;
  onEdit?: (group: TaskGroup) => void;
  onDelete?: (groupId: string) => void;
  onClick?: () => void;
}

const TaskGroupCard: React.FC<TaskGroupCardProps> = ({ group, openDefectsCount = 0, onEdit, onDelete, onClick }) => {
  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
        },
      }}
      onClick={onClick}
    >
      <CardHeader
        title={
          <Typography variant="h6" noWrap>
            {group.name}
          </Typography>
        }
        action={
          <Box onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <IconButton size="small" onClick={() => onEdit(group)}>
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                size="small"
                onClick={() => onDelete(group.id)}
                sx={{ color: 'error.main' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        }
        sx={{ pb: 1 }}
      />

      <CardContent sx={{ pt: 0 }}>
        <Stack spacing={2}>
          {/* Timeline */}
          {group.startDate && group.endDate && (
            <Box>
              <TimelineBar startDate={group.startDate} endDate={group.endDate} />
            </Box>
          )}

          {/* Description */}
          {group.description && (
            <Typography variant="body2" color="textSecondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {group.description}
            </Typography>
          )}

          {/* Task Stats */}
          {group.stats && (
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                label={`${group.stats.taskCount} Total Tasks`}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`${group.stats.completedTasks} Completed`}
                color="success"
                variant="outlined"
              />
              {openDefectsCount > 0 ? (
                <Chip size="small" label={`${openDefectsCount} Open Defects`} color="error" variant="outlined" />
              ) : null}
            </Stack>
          )}

          {!group.stats && openDefectsCount > 0 ? (
            <Stack direction="row" spacing={1}>
              <Chip size="small" label={`${openDefectsCount} Open Defects`} color="error" variant="outlined" />
            </Stack>
          ) : null}

          {/* Dates */}
          {group.startDate && group.endDate && (
            <DateRangeDisplay startDate={group.startDate} endDate={group.endDate} />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default TaskGroupCard;
