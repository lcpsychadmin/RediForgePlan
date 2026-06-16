// client/src/components/export/ExportMenu.tsx

import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ExportDialog from './ExportDialog';
import { downloadFileWithRetry } from '../../utils/downloadFile';

export type ExportVariant = 'icon' | 'button';
export type ExportType = 'excel' | 'csv' | 'projectXml';

export interface ExportMenuProps {
  projectId: string;
  variant?: ExportVariant;
  label?: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
}

/**
 * Export menu component for project data
 * 
 * Provides options to export project data in multiple formats:
 * - Excel (XLSX)
 * - CSV
 * - Microsoft Project XML
 * 
 * @param projectId - The project ID to export
 * @param variant - Button variant: 'icon' or 'button' (default: 'icon')
 * @param label - Custom label for the button
 */
export const ExportMenu: React.FC<ExportMenuProps> = ({
  projectId,
  variant = 'icon',
  label = 'Export',
}) => {
  const theme = useTheme();

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExportOption = (type: ExportType) => {
    setExportType(type);
    setExportError(null);
    setIsExporting(true);
    setDialogOpen(true);
    handleMenuClose();

    // Start the export
    performExport(type);
  };

  const performExport = async (type: ExportType) => {
    try {
      const endpoints: Record<ExportType, { url: string; filename: string }> = {
        excel: {
          url: `/projects/${projectId}/export/excel`,
          filename: `project-${projectId}-export.xlsx`,
        },
        csv: {
          url: `/projects/${projectId}/export/csv`,
          filename: `project-${projectId}-export.csv`,
        },
        projectXml: {
          url: `/projects/${projectId}/export/project-xml`,
          filename: `project-${projectId}-export.xml`,
        },
      };

      const { url, filename } = endpoints[type];

      // Attempt download with retry
      await downloadFileWithRetry(url, { filename });

      // Success
      setIsExporting(false);
      setSnackbar({
        open: true,
        message: 'Export completed! Your file has been downloaded.',
        severity: 'success',
      });

      // Close dialog after a short delay
      setTimeout(() => {
        setDialogOpen(false);
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed. Please try again.';
      setExportError(errorMessage);
      setIsExporting(false);

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }
  };

  const handleRetry = () => {
    performExport(exportType);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setExportError(null);
    setIsExporting(false);
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const exportOptions = [
    {
      type: 'excel' as ExportType,
      label: 'Export to Excel',
      icon: <TableChartIcon />,
      description: 'XLSX format with all project data',
    },
    {
      type: 'csv' as ExportType,
      label: 'Export to CSV',
      icon: <DescriptionIcon />,
      description: 'Comma-separated values for spreadsheets',
    },
    {
      type: 'projectXml' as ExportType,
      label: 'Export to Project Plan (XML)',
      icon: <FolderOpenIcon />,
      description: 'Microsoft Project compatible format',
    },
  ];

  return (
    <>
      {/* Export Button/Icon */}
      {variant === 'icon' ? (
        <Tooltip title={label}>
          <IconButton
            onClick={handleMenuOpen}
            size="medium"
            sx={{
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <FileDownloadIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          startIcon={<FileDownloadIcon />}
          onClick={handleMenuOpen}
          variant="outlined"
          color="primary"
          size="small"
        >
          {label}
        </Button>
      )}

      {/* Export Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.paper,
            borderRadius: 1,
            mt: 1,
            boxShadow: theme.shadows[8],
          },
        }}
      >
        {exportOptions.map((option) => (
          <MenuItem
            key={option.type}
            onClick={() => handleExportOption(option.type)}
            sx={{
              py: 1.5,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon sx={{ mr: 1, color: theme.palette.primary.main }}>
              {option.icon}
            </ListItemIcon>
            <div>
              <ListItemText primary={option.label} />
              <ListItemText
                secondary={option.description}
                secondaryTypographyProps={{
                  variant: 'caption',
                  sx: { color: theme.palette.text.secondary },
                }}
              />
            </div>
          </MenuItem>
        ))}
      </Menu>

      {/* Export Dialog */}
      <ExportDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        exportType={exportType}
        isLoading={isExporting}
        error={exportError}
        onRetry={handleRetry}
      />

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: '100%',
            borderRadius: 1,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ExportMenu;
