import React from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useDefects } from '../../api/hooks/useDefects';
import { Defect, DefectStatus } from '../../api/types';
import DefectCard from './DefectCard';
import DefectFormDialog from './DefectFormDialog';

interface DefectsSectionProps {
  taskId: string;
}

interface PersonOption {
  id: string;
  email: string;
}

const statusOrder: DefectStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const statusLabel: Record<DefectStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const DefectsSection: React.FC<DefectsSectionProps> = ({ taskId }) => {
  const {
    data: defects = [],
    isLoading,
    error,
    createDefect,
    updateDefect,
    isCreatingDefect,
    isUpdatingDefect,
  } = useDefects(taskId);

  const { data: users = [] } = useQuery({
    queryKey: ['people-defect-options'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: PersonOption[] }>('/people');
      return response.data.data || [];
    },
  });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingDefect, setEditingDefect] = React.useState<Defect | null>(null);

  const grouped = React.useMemo(() => {
    const groups: Record<DefectStatus, Defect[]> = {
      open: [],
      in_progress: [],
      resolved: [],
      closed: [],
    };

    defects.forEach((defect) => {
      const status = defect.status as DefectStatus;
      if (groups[status]) {
        groups[status].push(defect);
      }
    });

    return groups;
  }, [defects]);

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
          setEditingDefect(null);
          setDialogOpen(false);
        },
      }
    );
  };

  const openCreateDialog = () => {
    setEditingDefect(null);
    setDialogOpen(true);
  };

  const openEditDialog = (defect: Defect) => {
    setEditingDefect(defect);
    setDialogOpen(true);
  };

  if (!taskId) {
    return <Alert severity="info">Select a task to view defects.</Alert>;
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">Failed to load defects.</Alert> : null}

      <Box>
        <Button startIcon={<AddIcon />} variant="contained" onClick={openCreateDialog}>
          Add Defect
        </Button>
      </Box>

      {isLoading ? <Typography variant="body2">Loading defects...</Typography> : null}
      {!isLoading && defects.length === 0 ? <Alert severity="info">No defects linked to this task yet.</Alert> : null}

      {statusOrder.map((status) => (
        <Stack key={status} spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            {statusLabel[status]} ({grouped[status].length})
          </Typography>

          {grouped[status].length === 0 ? (
            <Alert severity="info" variant="outlined">
              No {statusLabel[status].toLowerCase()} defects.
            </Alert>
          ) : (
            grouped[status].map((defect) => (
              <DefectCard
                key={defect.id}
                defect={defect}
                users={users}
                onEdit={openEditDialog}
                onStatusChange={(defectId, nextStatus) => handleUpdate(defectId, { status: nextStatus })}
                onAssign={(defectId, assignedToUserId) => handleUpdate(defectId, { assignedToUserId })}
              />
            ))
          )}
        </Stack>
      ))}

      <DefectFormDialog
        open={dialogOpen}
        taskId={taskId}
        defect={editingDefect}
        onClose={() => {
          setDialogOpen(false);
          setEditingDefect(null);
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        isSaving={isCreatingDefect || isUpdatingDefect}
      />
    </Stack>
  );
};

export default DefectsSection;
