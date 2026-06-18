import React, { useState } from 'react';
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
  Button,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import StatusChip from '../shared/StatusChip';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { TaskCommentsModal } from '../TaskCommentsModal';

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
  people?: Array<{ id: string; name: string; email?: string }>;
  accentColor?: string;
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
  people = [],
  accentColor = '#29b6f6',
}) => {
  const [editMode, setEditMode] = useState(false);
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [editData, setEditData] = useState<DisplayTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['task-details-modal', taskId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/${taskId}`);
      return response.data.data as DisplayTask;
    },
    enabled: open && !!taskId,
  });

  const resolvedTask = (data || task || null) as DisplayTask | null;

  // Initialize edit data when modal opens or task changes
  React.useEffect(() => {
    if (editMode && resolvedTask) {
      setEditData(resolvedTask);
    }
  }, [editMode, resolvedTask]);

  const personLabel = (id?: string) => {
    if (!id) return 'Unassigned';
    const person = peopleById[id];
    return person?.name || person?.email || id;
  };

  const handleEditChange = (field: keyof DisplayTask, value: any) => {
    setEditData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = async () => {
    if (!editData || !resolvedTask?.id) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const updatePayload = {
        status: editData.status,
        startDate: editData.startDate,
        endDate: editData.endDate,
        draUserId: editData.draUserId,
        developerUserId: editData.developerUserId,
        notes: editData.notes,
        progressPercentage: editData.progressPercentage,
      };
      
      await apiClient.patch(`/api/tasks/${resolvedTask.id}`, updatePayload);
      refetch();
      setEditMode(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setError(null)
    const person = peopleById[id];
    return person?.name || person?.email || id;
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 1.5 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2, mb: resolvedTask?.status ? 0.75 : 0 }}>
              {resolvedTask?.taskName || resolvedTask?.name || 'Task details'}
            </Typography>
            {resolvedTask?.status && (
              <StatusChip
                status={resolvedTask.status}
                sx={{ fontSize: '0.78rem', fontWeight: 700, px: 0.5 }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}>
            {!editMode && (
              <>
                <IconButton
                  onClick={() => setShowDiscussion(true)}
                  size="small"
                  title="Discussion"
                  sx={{ color: accentColor }}
                >
                  <ChatBubbleOutlineIcon sx={{ fontSize: '1.2rem' }} />
                </IconButton>
                <IconButton
                  onClick={() => setEditMode(true)}
                  size="small"
                  title="Edit"
                  sx={{ color: accentColor }}
                >
                  <EditIcon sx={{ fontSize: '1.2rem' }} />
                </IconButton>
              </>
            )}
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {isLoading && !resolvedTask ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : !resolvedTask ? (
            <Typography color="text.secondary">No task details available.</Typography>
          ) : editMode && editData ? (
            // Edit Mode
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Status"
                select
                value={editData.status || ''}
                onChange={(e) => handleEditChange('status', e.target.value)}
                size="small"
              >
                <MenuItem value="">Select status</MenuItem>
                <MenuItem value="not_started">Not Started</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
                <MenuItem value="complete">Complete</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={editData.startDate?.split('T')[0] || ''}
                onChange={(e) => handleEditChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />

              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={editData.endDate?.split('T')[0] || ''}
                onChange={(e) => handleEditChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />

              <TextField
                fullWidth
                label="DRA Owner"
                select
                value={editData.draUserId || ''}
                onChange={(e) => handleEditChange('draUserId', e.target.value)}
                size="small"
              >
                <MenuItem value="">Unassigned</MenuItem>
                {people.map((person) => (
                  <MenuItem key={person.id} value={person.id}>
                    {person.name || person.email}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                label="Developer Owner"
                select
                value={editData.developerUserId || ''}
                onChange={(e) => handleEditChange('developerUserId', e.target.value)}
                size="small"
              >
                <MenuItem value="">Unassigned</MenuItem>
                {people.map((person) => (
                  <MenuItem key={person.id} value={person.id}>
                    {person.name || person.email}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                label="Progress %"
                type="number"
                inputProps={{ min: 0, max: 100 }}
                value={editData.progressPercentage || 0}
                onChange={(e) => handleEditChange('progressPercentage', parseInt(e.target.value) || 0)}
                size="small"
              />

              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={4}
                value={editData.notes || ''}
                onChange={(e) => handleEditChange('notes', e.target.value)}
                size="small"
              />

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{ backgroundColor: accentColor }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            </Box>
          ) : (
            // View Mode
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!!resolvedTask.taskType && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={resolvedTask.taskType.replace(/_/g, ' ').toUpperCase()} variant="outlined" size="small" />
                </Box>
              )}

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

      {/* Discussion Modal */}
      {resolvedTask && (
        <TaskCommentsModal
          open={showDiscussion}
          onClose={() => setShowDiscussion(false)}
          taskId={resolvedTask.id || resolvedTask.taskId || taskId || ''}
          taskName={resolvedTask.taskName || resolvedTask.name || 'Task'}
          accentColor={accentColor}
          people={people}
        />
      )}
    </>
  );
};

export default TaskDetailModal;
