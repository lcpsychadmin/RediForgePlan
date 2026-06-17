// client/src/components/priorities/PriorityTaskCard.tsx

import React from 'react';
import { Card, CardContent, Box, Stack, Typography, Chip, Link } from '@mui/material';
import StatusChip from '../shared/StatusChip';
import DateRangeDisplay from '../shared/DateRangeDisplay';
import UserAvatar from '../shared/UserAvatar';
import { PriorityTask } from '../../hooks/usePriorities';

interface PriorityTaskCardProps {
  task: PriorityTask;
  onClick?: () => void;
}

const PriorityTaskCard: React.FC<PriorityTaskCardProps> = ({ task, onClick }) => {
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
        <Stack spacing={1.5}>
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
            {task.taskName || task.objectId || 'Unnamed Task'}
          </Typography>

          {/* Dates */}
          {task.endDate && (
            <Typography variant="caption" color="textSecondary">
              Due: {new Date(task.endDate).toLocaleDateString()}
            </Typography>
          )}

          {/* Assigned Users */}
          {(task.draUserId || task.developerUserId) && (
            <Stack direction="row" spacing={0.5}>
              {task.draUserId && (
                <UserAvatar userId={task.draUserId} email={task.draUserId} />
              )}
              {task.developerUserId && (
                <UserAvatar userId={task.developerUserId} email={task.developerUserId} />
              )}
            </Stack>
          )}

          {onClick && (
            <Link
              component="button"
              type="button"
              underline="hover"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              sx={{ fontSize: '0.75rem', textAlign: 'left' }}
            >
              Open task
            </Link>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PriorityTaskCard;
