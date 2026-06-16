// client/src/components/export/ExportProgress.tsx

import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export type ProgressStatus = 'loading' | 'success' | 'error';

export interface ExportProgressProps {
  status: ProgressStatus;
  message?: string;
  progress?: number; // 0-100
  variant?: 'linear' | 'circular';
}

/**
 * Component to display export progress and status
 * 
 * @param status - Current status: 'loading', 'success', or 'error'
 * @param message - Optional message to display
 * @param progress - Optional progress percentage (0-100)
 * @param variant - Progress display variant: 'linear' or 'circular'
 */
export const ExportProgress: React.FC<ExportProgressProps> = ({
  status,
  message,
  progress = 0,
  variant = 'linear',
}) => {
  const theme = useTheme();

  if (status === 'loading') {
    return (
      <Stack spacing={2} align="center">
        {variant === 'circular' ? (
          <CircularProgress
            variant={progress > 0 ? 'determinate' : 'indeterminate'}
            value={progress}
            size={40}
            sx={{ color: theme.palette.primary.main }}
          />
        ) : (
          <LinearProgress
            variant={progress > 0 ? 'determinate' : 'indeterminate'}
            value={progress}
            sx={{ width: '100%' }}
          />
        )}
        <Typography variant="body2" color="textSecondary" align="center">
          {message || 'Preparing export...'}
        </Typography>
      </Stack>
    );
  }

  if (status === 'success') {
    return (
      <Stack spacing={1.5} align="center">
        <CheckCircleIcon
          sx={{
            color: theme.palette.success.main,
            fontSize: 40,
          }}
        />
        <Typography variant="body2" color="success.main" fontWeight={500}>
          {message || 'Export ready!'}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Your file download will begin shortly.
        </Typography>
      </Stack>
    );
  }

  if (status === 'error') {
    return (
      <Stack spacing={1}>
        <Alert
          severity="error"
          icon={<ErrorIcon />}
          sx={{
            backgroundColor: theme.palette.error.light,
            color: theme.palette.error.main,
          }}
        >
          <Typography variant="body2" fontWeight={500}>
            Export Failed
          </Typography>
          {message && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              {message}
            </Typography>
          )}
        </Alert>
      </Stack>
    );
  }

  return null;
};

export default ExportProgress;
