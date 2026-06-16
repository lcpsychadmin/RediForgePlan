// client/src/components/taskGroups/TaskGroupTasksSection.tsx

import React, { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTasks, useUpdateTask, useDeleteTask } from '../../api/hooks';
import { Task } from '../../api/types';
import StatusChip from '../StatusChip';
import { format } from 'date-fns';

interface TaskGroupTasksSectionProps {
  projectId: string;
  taskGroupId: string;
}

/**
 * Section displaying tasks within a task group
 * Allows inline editing and deletion
 */
export const TaskGroupTasksSection: React.FC<TaskGroupTasksSectionProps> = ({
  projectId,
  taskGroupId,
}) => {
  const theme = useTheme();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Task>>({});

  // Fetch tasks for this group
  const { data: allTasks = [], isLoading, error } = useTasks(projectId, {
    taskGroupId,
  });

  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask(projectId);
  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask(projectId);

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditFormData(task);
    setEditDialogOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleSaveEdit = () => {
    if (editingTask) {
      updateTask({
        ...editFormData,
      } as Partial<Task>);
      setEditDialogOpen(false);
      setEditingTask(null);
    }
  };

  const handleEditFormChange = (field: string, value: any) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load tasks: {error.message}</Alert>;
  }

  if (allTasks.length === 0) {
    return (
      <Box sx={{ py: 2 }}>
        <Alert severity="info">No tasks in this group</Alert>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.background.elevated }}>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>End Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Assigned To</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allTasks.map((task) => (
              <TableRow key={task.id} hover>
                <TableCell>{task.name}</TableCell>
                <TableCell>
                  <StatusChip status={task.status as any} />
                </TableCell>
                <TableCell>{task.start_date ? format(new Date(task.start_date), 'MMM d, yyyy') : '—'}</TableCell>
                <TableCell>{task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={task.assigned_to_user_id || 'Unassigned'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditTask(task)}
                      title="Edit task"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete task"
                      disabled={isDeleting}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="Task Name"
              value={editFormData.name || ''}
              onChange={(e) => handleEditFormChange('name', e.target.value)}
              fullWidth
            />
            <TextField
              label="Status"
              select
              value={editFormData.status || ''}
              onChange={(e) => handleEditFormChange('status', e.target.value)}
              fullWidth
            >
              <MenuItem value="not_started">Not Started</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
              <MenuItem value="complete">Complete</MenuItem>
            </TextField>
            <TextField
              label="Start Date"
              type="date"
              value={editFormData.start_date?.split('T')[0] || ''}
              onChange={(e) => handleEditFormChange('start_date', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={editFormData.due_date?.split('T')[0] || ''}
              onChange={(e) => handleEditFormChange('due_date', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={isUpdating}>
            {isUpdating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default TaskGroupTasksSection;
