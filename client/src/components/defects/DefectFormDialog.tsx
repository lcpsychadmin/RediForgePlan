import React from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useTask } from '../../api/hooks';
import { CreateDefectPayload, Defect, DefectStatus, DefectSeverity } from '../../api/types';

interface DefectFormDialogProps {
  open: boolean;
  taskId: string;
  defect?: Defect | null;
  onClose: () => void;
  onCreate: (payload: CreateDefectPayload) => void;
  onUpdate: (defectId: string, payload: Partial<CreateDefectPayload> & { status?: DefectStatus }) => void;
  isSaving?: boolean;
}

interface PersonOption {
  id: string;
  email: string;
}

const defaultState = {
  title: '',
  defectDetails: '',
  severity: 'medium' as DefectSeverity,
  status: 'open' as DefectStatus,
  assignedToUserId: '',
};

const DefectFormDialog: React.FC<DefectFormDialogProps> = ({
  open,
  taskId,
  defect,
  onClose,
  onCreate,
  onUpdate,
  isSaving,
}) => {
  const [state, setState] = React.useState(defaultState);

  const { data: task } = useTask(taskId);
  const { data: people = [] } = useQuery({
    queryKey: ['people-options'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: PersonOption[] }>('/people');
      return response.data.data || [];
    },
  });

  React.useEffect(() => {
    if (defect) {
      setState({
        title: defect.title || '',
        defectDetails: defect.defectDetails || '',
        severity: defect.severity,
        status: defect.status,
        assignedToUserId: defect.assignedToUserId || '',
      });
      return;
    }

    setState(defaultState);
  }, [defect, open]);

  const selectedAssignee = people.find((person) => person.id === state.assignedToUserId) || null;

  const handleSave = () => {
    const payload = {
      title: state.title.trim(),
      defectDetails: state.defectDetails.trim(),
      severity: state.severity,
      status: state.status,
      assignedToUserId: state.assignedToUserId || null,
      projectObjectId: task?.projectObjectId || null,
    };

    if (defect?.id) {
      onUpdate(defect.id, payload);
      return;
    }

    onCreate(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{defect ? 'Edit Defect' : 'Add Defect'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={state.title}
            onChange={(e) => setState((prev) => ({ ...prev, title: e.target.value }))}
            fullWidth
            required
          />

          <TextField
            label="Description"
            value={state.defectDetails}
            onChange={(e) => setState((prev) => ({ ...prev, defectDetails: e.target.value }))}
            multiline
            minRows={3}
            fullWidth
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Severity"
              select
              value={state.severity}
              onChange={(e) => setState((prev) => ({ ...prev, severity: e.target.value as DefectSeverity }))}
              fullWidth
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </TextField>

            <TextField
              label="Status"
              select
              value={state.status}
              onChange={(e) => setState((prev) => ({ ...prev, status: e.target.value as DefectStatus }))}
              fullWidth
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </TextField>
          </Stack>

          <Autocomplete
            options={people}
            value={selectedAssignee}
            onChange={(_, value) => setState((prev) => ({ ...prev, assignedToUserId: value?.id || '' }))}
            getOptionLabel={(option) => option.email}
            renderInput={(params) => <TextField {...params} label="Assigned User" placeholder="Unassigned" />}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={isSaving || !state.title.trim()}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DefectFormDialog;
