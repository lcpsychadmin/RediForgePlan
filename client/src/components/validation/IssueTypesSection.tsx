import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useIssueTypes } from '../../api/hooks/useIssueTypes';
import IssueRecordsSection from './IssueRecordsSection';

interface IssueTypesSectionProps {
  taskId: string;
}

const IssueTypesSection: React.FC<IssueTypesSectionProps> = ({ taskId }) => {
  const { data: issueTypes = [], isLoading, error, createIssueType, isCreatingIssueType } = useIssueTypes(taskId);
  const [openForm, setOpenForm] = React.useState(false);
  const [selectedIssueTypeId, setSelectedIssueTypeId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    issueCode: '',
    issueDescription: '',
    count: 0,
  });

  const handleSave = () => {
    createIssueType(
      {
        issueCode: form.issueCode.trim(),
        issueDescription: form.issueDescription.trim() || undefined,
        count: Number(form.count) || 0,
      },
      {
        onSuccess: () => {
          setOpenForm(false);
          setForm({ issueCode: '', issueDescription: '', count: 0 });
        },
      }
    );
  };

  if (!taskId) {
    return <Alert severity="info">Select a task to view issue types.</Alert>;
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">Failed to load issue types.</Alert> : null}

      <Box>
        <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setOpenForm(true)}>
          Add Issue Type
        </Button>
      </Box>

      {isLoading ? <Typography variant="body2">Loading issue types...</Typography> : null}
      {!isLoading && issueTypes.length === 0 ? <Alert severity="info">No issue types yet.</Alert> : null}

      {issueTypes.length > 0 ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Issue Code</TableCell>
              <TableCell>Issue Description</TableCell>
              <TableCell>Count</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {issueTypes.map((issueType) => (
              <TableRow key={issueType.id} hover>
                <TableCell>{issueType.issueCode}</TableCell>
                <TableCell>{issueType.issueDescription || '—'}</TableCell>
                <TableCell>{issueType.count}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => setSelectedIssueTypeId(issueType.id)}
                  >
                    View Records
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Issue Type</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Issue Code"
              value={form.issueCode}
              onChange={(e) => setForm((prev) => ({ ...prev, issueCode: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Issue Description"
              value={form.issueDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, issueDescription: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              type="number"
              label="Count"
              value={form.count}
              onChange={(e) => setForm((prev) => ({ ...prev, count: Math.max(0, Number(e.target.value) || 0) }))}
              inputProps={{ min: 0 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={isCreatingIssueType || !form.issueCode.trim()}>
            {isCreatingIssueType ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!selectedIssueTypeId}
        onClose={() => setSelectedIssueTypeId(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Issue Records</DialogTitle>
        <DialogContent>
          {selectedIssueTypeId ? <IssueRecordsSection issueTypeId={selectedIssueTypeId} /> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedIssueTypeId(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default IssueTypesSection;
