// client/src/components/priorities/PrioritySection.tsx

import React from 'react';
import { Box, Typography, Grid, Alert } from '@mui/material';
import { PriorityTask } from '../../hooks/usePriorities';
import PriorityTaskCard from './PriorityTaskCard';

interface PrioritySectionProps {
  title: string;
  tasks: PriorityTask[];
  color?: string;
  onTaskClick?: (task: PriorityTask) => void;
  peopleById?: Record<string, { id: string; name: string; email?: string }>;
}

const PrioritySection: React.FC<PrioritySectionProps> = ({
  title,
  tasks,
  color = '#1976d2',
  onTaskClick,
  peopleById = {},
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          pb: 1,
          borderBottom: `3px solid ${color}`,
          display: 'inline-block',
        }}
      >
        {title} ({tasks.length})
      </Typography>

      {tasks.length === 0 ? (
        <Alert severity="info" sx={{ mt: 1 }}>No tasks in this category</Alert>
      ) : (
        <Grid container spacing={2} sx={{ mt: 0 }}>
          {tasks.map((task) => (
            <Grid item xs={12} sm={6} md={4} key={task.taskId}>
              <PriorityTaskCard task={task} onClick={() => onTaskClick?.(task)} peopleById={peopleById} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default PrioritySection;
