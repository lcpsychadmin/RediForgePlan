// client/src/components/objects/DataObjectDetailDrawer.tsx

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
  MenuItem,
  Snackbar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import TimelineBar from '../TimelineBar';
import StatusChip from '../StatusChip';
import DataObjectTasksSection from './DataObjectTasksSection';
import DataObjectDependenciesSection from './DataObjectDependenciesSection';
import { useProjectObject, useUpdateProjectObject } from '../../api/hooks';
import { ProjectObject } from '../../api/types';
import { useParams } from 'react-router-dom';
import MuiAlert from '@mui/material/Alert';

interface DataObjectDetailDrawerProps {
  projectObjectId: string | null;
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
      id={`object-tabpanel-${index}`}
      aria-labelledby={`object-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

/**
 * Detail drawer for viewing and editing project objects
 * Displays object metadata, tasks, and dependencies
 */
export const DataObjectDetailDrawer: React.FC<DataObjectDetailDrawerProps> = ({
  projectObjectId,
  open,
  onClose,
}) => {
  const theme = useTheme();
  const { projectId } = useParams<{ projectId: string }>();
  const [currentTab, setCurrentTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProjectObject>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch object details
  const { data: object, isLoading, error } = useProjectObject(projectObjectId || '');

  // Mutation for updating
  const { mutate: updateObject, isPending: isUpdating } = useUpdateProjectObject(projectObjectId || '', projectId || '');

  // Initialize form when object loads
  useEffect(() => {
    if (object) {
      setFormData(object);
      setIsEditing(false);
    }
  }, [object]);

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    updateObject(formData as Partial<ProjectObject>);
    setSnackbar({
      open: true,
      message: 'Object updated successfully',
      severity: 'success',
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (object) {
      setFormData(object);
    }
    setIsEditing(false);
  };

  if (!projectObjectId || !projectId) {
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
              <Alert severity="error">Failed to load object</Alert>
            ) : object ? (
              <>
                <Typography variant="h6" fontWeight={700}>
                  {object.global_object_id}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {object.notes}
                </Typography>
                {object.status && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                    <StatusChip status={object.status as any} />
                    {object.start_date && object.end_date && (
                      <TimelineBar
                        startDate={object.start_date}
                        endDate={object.end_date}
                        status={object.status}
                        height={24}
                      />
                    )}
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
        ) : object ? (
          <>
            {/* Tabs */}
            <Tabs
              value={currentTab}
              onChange={(_, value) => setCurrentTab(value)}
              sx={{ borderBottom: `1px solid ${theme.palette.divider}`, px: 2 }}
              aria-label="object details tabs"
            >
              <Tab label="Overview" id="object-tab-0" aria-controls="object-tabpanel-0" />
              <Tab label="Tasks" id="object-tab-1" aria-controls="object-tabpanel-1" />
              <Tab label="Dependencies" id="object-tab-2" aria-controls="object-tabpanel-2" />
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
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Complexity
                          </Typography>
                          <Typography variant="body2">{object.complexity || '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Build Type
                          </Typography>
                          <Typography variant="body2">{object.build_type || '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Object Type
                          </Typography>
                          <Typography variant="body2">{object.object_type || '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Deployment Disposition
                          </Typography>
                          <Typography variant="body2">{object.deployment_disposition || '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Cutover Phase
                          </Typography>
                          <Typography variant="body2">{object.cutover_phase || '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            DDM Approach
                          </Typography>
                          <Typography variant="body2">{object.ddm_approach || '—'}</Typography>
                        </Box>
                      </Box>
                    </>
                  ) : (
                    <>
                      {/* Edit Mode */}
                      <Stack spacing={2}>
                        <TextField
                          label="Complexity"
                          select
                          value={formData.complexity || ''}
                          onChange={(e) => handleFormChange('complexity', e.target.value)}
                          fullWidth
                          size="small"
                        >
                          <MenuItem value="Low">Low</MenuItem>
                          <MenuItem value="Medium">Medium</MenuItem>
                          <MenuItem value="High">High</MenuItem>
                        </TextField>

                        <TextField
                          label="Build Type"
                          select
                          value={formData.build_type || ''}
                          onChange={(e) => handleFormChange('build_type', e.target.value)}
                          fullWidth
                          size="small"
                        >
                          <MenuItem value="New">New</MenuItem>
                          <MenuItem value="Modify">Modify</MenuItem>
                          <MenuItem value="Delete">Delete</MenuItem>
                        </TextField>

                        <TextField
                          label="Object Type"
                          value={formData.object_type || ''}
                          onChange={(e) => handleFormChange('object_type', e.target.value)}
                          fullWidth
                          size="small"
                        />

                        <TextField
                          label="Deployment Disposition"
                          value={formData.deployment_disposition || ''}
                          onChange={(e) => handleFormChange('deployment_disposition', e.target.value)}
                          fullWidth
                          size="small"
                        />

                        <TextField
                          label="Cutover Phase"
                          value={formData.cutover_phase || ''}
                          onChange={(e) => handleFormChange('cutover_phase', e.target.value)}
                          fullWidth
                          size="small"
                        />

                        <TextField
                          label="DDM Approach"
                          value={formData.ddm_approach || ''}
                          onChange={(e) => handleFormChange('ddm_approach', e.target.value)}
                          fullWidth
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
                <DataObjectTasksSection projectId={projectId} projectObjectId={projectObjectId} />
              </TabPanel>

              {/* Dependencies Tab */}
              <TabPanel value={currentTab} index={2}>
                <DataObjectDependenciesSection projectId={projectId} projectObjectId={projectObjectId} />
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

export default DataObjectDetailDrawer;
