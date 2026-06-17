import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Chip,
  Grid,
  Divider,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';

type DisplayTask = {
  taskId?: string;
  id?: string;
  taskType?: string;
  taskName?: string;
  name?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  draUserId?: string;
  developerUserId?: string;
  notes?: string;
  objectId?: string;
  taskGroupId?: string;
  projectName?: string;
  programName?: string;
  mockCycleName?: string;
  progressPercentage?: number;
};

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  taskId?: string;
  task?: DisplayTask | null;
  peopleById?: Record<string, { id: string; name: string; email?: string }>;
}

const formatDate = (dateValue?: string) => {
  if (!dateValue) return 'Not set';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString();
};

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  open,
  onClose,
  taskId,
  task,
  peopleById = {},
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['task-details-modal', taskId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/${taskId}`);
      return response.data.data as DisplayTask;
    },
    enabled: open && !!taskId,
  });

  const resolvedTask = (data || task || null) as DisplayTask | null;

  const personLabel = (id?: string) => {
    if (!id) return 'Unassigned';
    const person = peopleById[id];
    return person?.name || person?.email || id;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {resolvedTask?.taskName || resolvedTask?.name || 'Task details'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {isLoading && !resolvedTask ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : !resolvedTask ? (
          <Typography color="text.secondary">No task details available.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {!!resolvedTask.taskType && (
                <Chip label={resolvedTask.taskType.replace(/_/g, ' ').toUpperCase()} variant="outlined" size="small" />
              )}
              {!!resolvedTask.status && <Chip label={resolvedTask.status.replace(/_/g, ' ').toUpperCase()} size="small" color="primary" />}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Start date</Typography>
                <Typography variant="body2">{formatDate(resolvedTask.startDate)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">End date</Typography>
                <Typography variant="body2">{formatDate(resolvedTask.endDate)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">DRA owner</Typography>
                <Typography variant="body2">{personLabel(resolvedTask.draUserId)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Developer owner</Typography>
                <Typography variant="body2">{personLabel(resolvedTask.developerUserId)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Project</Typography>
                <Typography variant="body2">{resolvedTask.projectName || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Object</Typography>
                <Typography variant="body2">{resolvedTask.objectId || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Task group</Typography>
                <Typography variant="body2">{resolvedTask.taskGroupId || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Progress</Typography>
                <Typography variant="body2">
                  {typeof resolvedTask.progressPercentage === 'number'
                    ? `${resolvedTask.progressPercentage}%`
                    : 'N/A'}
                </Typography>
              </Grid>
            </Grid>

            {(resolvedTask.programName || resolvedTask.mockCycleName) && (
              <>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">Program / Cycle</Typography>
                  <Typography variant="body2">
                    {[resolvedTask.programName, resolvedTask.mockCycleName].filter(Boolean).join(' / ')}
                  </Typography>
                </Box>
              </>
            )}

            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary">Notes</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {resolvedTask.notes || 'No notes for this task.'}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailModal;
