// client/src/components/export/ExportDialog.tsx

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ExportProgress, { ProgressStatus } from './ExportProgress';

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  exportType: 'excel' | 'csv' | 'projectXml';
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const EXPORT_TYPE_LABELS: Record<string, { title: string; description: string }> = {
  excel: {
    title: 'Export to Excel',
    description: 'Export project data including objects, tasks, schedule, and dependencies to Excel format.',
  },
  csv: {
    title: 'Export to CSV',
    description: 'Export project inventory to comma-separated values for use in spreadsheets and other tools.',
  },
  projectXml: {
    title: 'Export to Project Plan (XML)',
    description: 'Export project structure compatible with Microsoft Project and other project management tools.',
  },
};

/**
 * Dialog to display export progress and status
 * 
 * @param open - Whether dialog is open
 * @param onClose - Called when dialog should close
 * @param exportType - Type of export: 'excel', 'csv', or 'projectXml'
 * @param isLoading - Whether export is in progress
 * @param error - Error message if export failed
 * @param onRetry - Called when user clicks retry button
 */
export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  exportType,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const theme = useTheme();
  const [status, setStatus] = useState<ProgressStatus>('loading');

  const exportInfo = EXPORT_TYPE_LABELS[exportType];

  // Update status based on loading and error states
  useEffect(() => {
    if (isLoading) {
      setStatus('loading');
    } else if (error) {
      setStatus('error');
    } else if (!error && !isLoading && open) {
      setStatus('success');
    }
  }, [isLoading, error, open]);

  const handleRetry = () => {
    setStatus('loading');
    onRetry?.();
  };

  const handleClose = () => {
    if (!isLoading) {
      setStatus('loading');
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      {/* Header */}
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <FileDownloadIcon sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6">{exportInfo?.title || 'Export Project Data'}</Typography>
        </Stack>
      </DialogTitle>

      <Divider />

      {/* Content */}
      <DialogContent sx={{ py: 3 }}>
        <Stack spacing={3}>
          {/* Description */}
          <Typography variant="body2" color="textSecondary">
            {exportInfo?.description}
          </Typography>

          {/* Progress */}
          <Box
            sx={{
              py: 2,
              px: 2,
              backgroundColor: theme.palette.background.elevated || theme.palette.grey[900],
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <ExportProgress
              status={status}
              message={
                status === 'loading'
                  ? 'Preparing export...'
                  : status === 'success'
                    ? 'Export ready! Download starting...'
                    : error || 'Export failed'
              }
              variant="linear"
            />
          </Box>

          {/* Error details if present */}
          {error && status === 'error' && (
            <Box
              sx={{
                p: 1.5,
                backgroundColor: theme.palette.error.light,
                borderRadius: 1,
                border: `1px solid ${theme.palette.error.main}`,
              }}
            >
              <Typography variant="caption" color="error.main" display="block">
                {error}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      {/* Actions */}
      <DialogActions sx={{ p: 2 }}>
        {status === 'loading' ? (
          <Button onClick={handleClose} variant="outlined" color="inherit">
            Working...
          </Button>
        ) : status === 'success' ? (
          <Button onClick={handleClose} variant="contained" color="primary">
            Done
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} variant="outlined" color="inherit">
              Close
            </Button>
            <Button onClick={handleRetry} variant="contained" color="primary">
              Retry
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;
