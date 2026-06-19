import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useIssueRecords } from '../../api/hooks/useIssueRecords';

interface IssueRecordsSectionProps {
  issueTypeId: string;
}

const IssueRecordsSection: React.FC<IssueRecordsSectionProps> = ({ issueTypeId }) => {
  const { data: records = [], isLoading, error, createIssueRecord, isCreatingIssueRecord } = useIssueRecords(issueTypeId);
  const [open, setOpen] = React.useState(false);
  const [recordIdentifier, setRecordIdentifier] = React.useState('');
  const [rawDataText, setRawDataText] = React.useState('{\n  \n}');
  const [jsonError, setJsonError] = React.useState('');

  const handleCreate = () => {
    let parsed: Record<string, any> | null = null;

    try {
      parsed = rawDataText.trim() ? JSON.parse(rawDataText) : null;
      setJsonError('');
    } catch (_error) {
      setJsonError('Invalid JSON in rawData.');
      return;
    }

    createIssueRecord(
      {
        recordIdentifier: recordIdentifier.trim(),
        rawData: parsed,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setRecordIdentifier('');
          setRawDataText('{\n  \n}');
        },
      }
    );
  };

  if (!issueTypeId) {
    return <Alert severity="info">Select an issue type to view records.</Alert>;
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">Failed to load issue records.</Alert> : null}

      <Box>
        <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setOpen(true)}>
          Add Issue Record
        </Button>
      </Box>

      {isLoading ? <Typography variant="body2">Loading issue records...</Typography> : null}
      {!isLoading && records.length === 0 ? <Alert severity="info">No issue records yet.</Alert> : null}

      <Stack spacing={1.5}>
        {records.map((record) => (
          <Paper key={record.id} variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {record.recordIdentifier}
            </Typography>
            <Typography
              component="pre"
              variant="body2"
              sx={{
                mt: 1,
                p: 1,
                borderRadius: 1,
                bgcolor: 'background.default',
                overflowX: 'auto',
                fontFamily: 'monospace',
              }}
            >
              {JSON.stringify(record.rawData || {}, null, 2)}
            </Typography>
          </Paper>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Issue Record</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Record Identifier"
              value={recordIdentifier}
              onChange={(e) => setRecordIdentifier(e.target.value)}
              fullWidth
            />
            <TextField
              label="Raw Data (JSON)"
              value={rawDataText}
              onChange={(e) => setRawDataText(e.target.value)}
              multiline
              minRows={8}
              fullWidth
              error={!!jsonError}
              helperText={jsonError || 'Provide valid JSON.'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={isCreatingIssueRecord || !recordIdentifier.trim()}>
            {isCreatingIssueRecord ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default IssueRecordsSection;
