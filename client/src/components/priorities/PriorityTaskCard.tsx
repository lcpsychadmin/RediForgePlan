// client/src/components/priorities/PriorityTaskCard.tsx

import React from 'react';
import { Card, CardContent, Box, Stack, Typography, Chip, Divider } from '@mui/material';
import StatusChip from '../shared/StatusChip';
import UserAvatar from '../shared/UserAvatar';
import { PriorityTask } from '../../hooks/usePriorities';

interface PriorityTaskCardProps {
  task: PriorityTask;
  onClick?: () => void;
  peopleById?: Record<string, { id: string; name: string; email?: string }>;
}

const PriorityTaskCard: React.FC<PriorityTaskCardProps> = ({ task, onClick, peopleById = {} }) => {
  const dateLabel = (() => {
    if (!task.startDate && !task.endDate) return 'No dates set';
    if (task.startDate && task.endDate) {
      return `${new Date(task.startDate).toLocaleDateString()} - ${new Date(task.endDate).toLocaleDateString()}`;
    }
    if (task.endDate) return `Due ${new Date(task.endDate).toLocaleDateString()}`;
    return `Starts ${new Date(task.startDate!).toLocaleDateString()}`;
  })();

  const dueState = (() => {
    if (!task.endDate || task.status === 'complete') return null;
    const end = new Date(task.endDate);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endStart = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const diff = Math.floor((endStart.getTime() - todayStart.getTime()) / 86400000);
    if (diff < 0) return `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}`;
    if (diff === 0) return 'Due today';
    return `Due in ${diff} day${diff === 1 ? '' : 's'}`;
  })();

  const personName = (id?: string) => {
    if (!id) return null;
    const person = peopleById[id];
    return person?.name || person?.email || id;
  };

  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': onClick ? { boxShadow: 3, transform: 'translateX(4px)' } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Stack spacing={1.25}>
          {/* Task Type and Status */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Chip
              label={task.taskType.replace(/_/g, ' ').toUpperCase()}
              size="small"
              variant="outlined"
            />
            <StatusChip size="small" status={task.status} />
          </Box>

          {/* Task Name / Object */}
          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
            {task.taskName || task.name || task.objectId || 'Unnamed Task'}
          </Typography>

          {(task.projectName || task.objectId || task.taskGroupId) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {task.projectName && <Chip size="small" variant="outlined" label={task.projectName} />}
              {task.objectId && <Chip size="small" variant="outlined" label={`Object: ${task.objectId}`} />}
              {task.taskGroupId && <Chip size="small" variant="outlined" label={`Group: ${task.taskGroupId.slice(0, 8)}`} />}
            </Box>
          )}

          <Typography variant="caption" color="textSecondary">
            {dateLabel}
          </Typography>
          {dueState && (
            <Typography variant="caption" color={dueState.startsWith('Overdue') ? 'error.main' : 'text.secondary'}>
              {dueState}
            </Typography>
          )}

          {/* Assigned Users */}
          {(task.draUserId || task.developerUserId) && (
            <Stack spacing={0.5}>
              <Divider sx={{ my: 0.25 }} />
              {task.draUserId && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <UserAvatar userId={task.draUserId} email={task.draUserId} />
                  <Typography variant="caption" color="textSecondary">
                    DRA: {personName(task.draUserId)}
                  </Typography>
                </Box>
              )}
              {task.developerUserId && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <UserAvatar userId={task.developerUserId} email={task.developerUserId} />
                  <Typography variant="caption" color="textSecondary">
                    Developer: {personName(task.developerUserId)}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}

          {!!task.notes && (
            <Typography variant="caption" color="textSecondary" sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              Notes: {task.notes}
            </Typography>
          )}

          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
            Click to open details
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PriorityTaskCard;
