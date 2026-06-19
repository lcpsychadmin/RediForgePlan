// client/src/components/taskGroups/TaskGroupDetailDrawer.tsx

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Stack,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  TextField,
  Snackbar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import TimelineBar from '../TimelineBar';
import TaskGroupTasksSection from './TaskGroupTasksSection';
import { useTaskGroup, useUpdateTaskGroup, useTasks } from '../../api/hooks';
import DefectsSection from '../defects/DefectsSection';
import { TaskGroup } from '../../api/types';
import { useParams } from 'react-router-dom';
import MuiAlert from '@mui/material/Alert';

interface TaskGroupDetailDrawerProps {
  taskGroupId: string | null;
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`taskgroup-tabpanel-${index}`}
      aria-labelledby={`taskgroup-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

/**
 * Detail drawer for viewing and editing task groups
 * Displays task group metadata and associated tasks
 */
export const TaskGroupDetailDrawer: React.FC<TaskGroupDetailDrawerProps> = ({
  taskGroupId,
  open,
  onClose,
}) => {
  const theme = useTheme();
  const { projectId } = useParams<{ projectId: string }>();
  const [currentTab, setCurrentTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<TaskGroup>>({});
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch task group details
  const { data: taskGroup, isLoading, error } = useTaskGroup(taskGroupId || '');
  const { data: groupTasks = [] } = useTasks(projectId || '', { taskGroupId: taskGroupId || '' });

  // Mutation for updating
  const { mutate: updateTaskGroup, isPending: isUpdating } = useUpdateTaskGroup(taskGroupId || '', projectId || '');

  // Initialize form when task group loads
  useEffect(() => {
    if (taskGroup) {
      setFormData(taskGroup);
      setIsEditing(false);
    }
  }, [taskGroup]);

  useEffect(() => {
    if (groupTasks.length > 0) {
      setSelectedTaskId(groupTasks[0].id);
    } else {
      setSelectedTaskId('');
    }
  }, [groupTasks]);

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    updateTaskGroup(formData as Partial<TaskGroup>);
    setSnackbar({
      open: true,
      message: 'Task group updated successfully',
      severity: 'success',
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (taskGroup) {
      setFormData(taskGroup);
    }
    setIsEditing(false);
  };

  if (!taskGroupId || !projectId) {
    return null;
  }

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: '50%', maxWidth: 800 } }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Stack spacing={1} sx={{ flex: 1 }}>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : error ? (
              <Alert severity="error">Failed to load task group</Alert>
            ) : taskGroup ? (
              <>
                <Typography variant="h6" fontWeight={700}>
                  {taskGroup.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {taskGroup.description}
                </Typography>
                {taskGroup.start_date && taskGroup.end_date && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                    <TimelineBar
                      startDate={taskGroup.start_date}
                      endDate={taskGroup.end_date}
                      status="in_progress"
                      height={24}
                    />
                  </Box>
                )}
              </>
            ) : null}
          </Stack>
          <Button
            onClick={onClose}
            startIcon={<CloseIcon />}
            color="inherit"
            size="small"
          >
            Close
          </Button>
        </Box>

        {/* Content */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error.message}</Alert>
          </Box>
        ) : taskGroup ? (
          <>
            {/* Tabs */}
            <Tabs
              value={currentTab}
              onChange={(_, value) => setCurrentTab(value)}
              sx={{ borderBottom: `1px solid ${theme.palette.divider}`, px: 2 }}
              aria-label="task group details tabs"
            >
              <Tab label="Overview" id="taskgroup-tab-0" aria-controls="taskgroup-tabpanel-0" />
              <Tab label="Tasks" id="taskgroup-tab-1" aria-controls="taskgroup-tabpanel-1" />
              <Tab label="Defects" id="taskgroup-tab-2" aria-controls="taskgroup-tabpanel-2" />
            </Tabs>

            {/* Tab Content */}
            <Box sx={{ p: 2, overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
              {/* Overview Tab */}
              <TabPanel value={currentTab} index={0}>
                <Stack spacing={2}>
                  {!isEditing ? (
                    <>
                      {/* Display Mode */}
                      <Box>
                        <Button
                          onClick={() => setIsEditing(true)}
                          variant="contained"
                          size="small"
                          sx={{ mb: 2 }}
                        >
                          Edit
                        </Button>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Name
                        </Typography>
                        <Typography variant="body2">{taskGroup.name || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Description
                        </Typography>
                        <Typography variant="body2">{taskGroup.description || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Start Date
                        </Typography>
                        <Typography variant="body2">
                          {taskGroup.start_date ? new Date(taskGroup.start_date).toLocaleDateString() : '—'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          End Date
                        </Typography>
                        <Typography variant="body2">
                          {taskGroup.end_date ? new Date(taskGroup.end_date).toLocaleDateString() : '—'}
                        </Typography>
                      </Box>
                      {taskGroup.notes && (
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Notes
                          </Typography>
                          <Typography variant="body2">{taskGroup.notes}</Typography>
                        </Box>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Edit Mode */}
                      <Stack spacing={2}>
                        <TextField
                          label="Name"
                          value={formData.name || ''}
                          onChange={(e) => handleFormChange('name', e.target.value)}
                          fullWidth
                          size="small"
                        />

                        <TextField
                          label="Description"
                          value={formData.description || ''}
                          onChange={(e) => handleFormChange('description', e.target.value)}
                          fullWidth
                          multiline
                          rows={2}
                          size="small"
                        />

                        <TextField
                          label="Start Date"
                          type="date"
                          value={formData.start_date?.split('T')[0] || ''}
                          onChange={(e) => handleFormChange('start_date', e.target.value)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          size="small"
                        />

                        <TextField
                          label="End Date"
                          type="date"
                          value={formData.end_date?.split('T')[0] || ''}
                          onChange={(e) => handleFormChange('end_date', e.target.value)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          size="small"
                        />

                        <TextField
                          label="Notes"
                          value={formData.notes || ''}
                          onChange={(e) => handleFormChange('notes', e.target.value)}
                          fullWidth
                          multiline
                          rows={3}
                          size="small"
                        />

                        <Stack direction="row" spacing={1}>
                          <Button
                            onClick={handleSave}
                            variant="contained"
                            startIcon={<SaveIcon />}
                            disabled={isUpdating}
                          >
                            {isUpdating ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            onClick={handleCancel}
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            disabled={isUpdating}
                          >
                            Cancel
                          </Button>
                        </Stack>
                      </Stack>
                    </>
                  )}
                </Stack>
              </TabPanel>

              {/* Tasks Tab */}
              <TabPanel value={currentTab} index={1}>
                <TaskGroupTasksSection projectId={projectId} taskGroupId={taskGroupId} />
              </TabPanel>

              {/* Defects Tab */}
              <TabPanel value={currentTab} index={2}>
                <Stack spacing={2}>
                  <TextField
                    label="Task"
                    select
                    size="small"
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    fullWidth
                  >
                    {groupTasks.map((task) => (
                      <MenuItem key={task.id} value={task.id}>
                        {(task.name || task.taskName || 'Task').toString()} ({task.taskType || task.task_type || 'custom'})
                      </MenuItem>
                    ))}
                  </TextField>
                  <DefectsSection taskId={selectedTaskId} />
                </Stack>
              </TabPanel>
            </Box>
          </>
        ) : null}
      </Drawer>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MuiAlert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </>
  );
};

export default TaskGroupDetailDrawer;
