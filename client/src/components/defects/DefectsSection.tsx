import React from 'react';
import { Alert, Box, Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useDefects } from '../../api/hooks/useDefects';
import { Defect } from '../../api/types';
import DefectFormDialog from './DefectFormDialog';
import DefectCommentsModal from '../DefectCommentsModal';

interface DefectsSectionProps {
  taskId: string;
  accentColor?: string;
}

interface PersonOption {
  id: string;
  email?: string | null;
  name?: string | null;
}

const formatDefectNumber = (defect: Defect) => {
  const parsed = typeof defect.defectNumber === 'number' ? defect.defectNumber : Number(defect.defectNumber);
  if (Number.isFinite(parsed)) return `DEF-${String(parsed).padStart(5, '0')}`;
  return defect.id;
};

const toRgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const DefectsSection: React.FC<DefectsSectionProps> = ({ taskId, accentColor = '#29b6f6' }) => {
  const queryClient = useQueryClient();
  const {
    data: defects = [],
    isLoading,
    error,
    createDefect,
    updateDefect,
    isCreatingDefect,
    isUpdatingDefect,
  } = useDefects(taskId);

  const { data: people = [] } = useQuery({
    queryKey: ['people-defect-options'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: PersonOption[] }>('/api/people');
      return response.data.data || [];
    },
  });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeDefectId, setActiveDefectId] = React.useState<string>('');

  const activeDefect = React.useMemo(
    () => defects.find((defect) => defect.id === activeDefectId) || null,
    [defects, activeDefectId]
  );

  React.useEffect(() => {
    if (activeDefectId && !defects.some((defect) => defect.id === activeDefectId)) {
      setActiveDefectId('');
    }
  }, [defects, activeDefectId]);

  const handleCreate = (payload: any) => {
    createDefect(payload, {
      onSuccess: () => {
        setDialogOpen(false);
      },
    });
  };

  const handleUpdate = (defectId: string, payload: any) => {
    updateDefect(
      { defectId, payload },
      {
        onSuccess: () => {
          setDialogOpen(false);
        },
      }
    );
  };

  const openCreateDialog = () => {
    setDialogOpen(true);
  };

  if (!taskId) {
    return <Alert severity="info">Select a task to view defects.</Alert>;
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">Failed to load defects.</Alert> : null}

      <Box>
        <Button
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          sx={{
            textTransform: 'none',
            borderRadius: 1.5,
            px: 2,
            py: 0.85,
            fontWeight: 700,
            fontSize: '0.88rem',
            backgroundColor: toRgba(accentColor, 0.25),
            color: accentColor,
            '&:hover': { backgroundColor: toRgba(accentColor, 0.4) },
          }}
        >
          Add Defect
        </Button>
      </Box>

      {isLoading ? <Typography variant="body2">Loading defects...</Typography> : null}
      {!isLoading && defects.length === 0 ? <Alert severity="info">No defects linked to this task yet.</Alert> : null}
      {!isLoading && defects.length > 0 ? (
        <Box sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Defect #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned To</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {defects.map((defect) => (
                <TableRow
                  key={defect.id}
                  hover
                  onClick={() => setActiveDefectId(defect.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{formatDefectNumber(defect)}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{defect.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {defect.defectDetails || 'No details provided.'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={defect.status.replace('_', ' ')} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={defect.severity} />
                  </TableCell>
                  <TableCell>{defect.assignedToUserEmail || 'Unassigned'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      <DefectFormDialog
        open={dialogOpen}
        taskId={taskId}
        defect={null}
        onClose={() => {
          setDialogOpen(false);
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        isSaving={isCreatingDefect || isUpdatingDefect}
      />

      <DefectCommentsModal
        open={Boolean(activeDefect)}
        defect={activeDefect}
        people={people}
        onClose={() => setActiveDefectId('')}
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: ['defects', taskId] });
          await queryClient.invalidateQueries({ queryKey: ['project-defects'] });
          await queryClient.invalidateQueries({ queryKey: ['project-defects-summary'] });
        }}
      />
    </Stack>
  );
};

export default DefectsSection;
