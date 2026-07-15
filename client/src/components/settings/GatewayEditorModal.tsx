import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

export interface GatewayEditorValues {
  gatewayName: string;
  assignedModelIds: string[];
  priorityOrder: string[];
  fallbackRules: string;
  costCeiling: string;
}

interface GatewayEditorModalProps {
  open: boolean;
  modelOptions: Array<{ id: string; label: string }>;
  initialValues?: GatewayEditorValues;
  onClose: () => void;
  onSave: (values: GatewayEditorValues) => Promise<void>;
}

const emptyValues: GatewayEditorValues = {
  gatewayName: '',
  assignedModelIds: [],
  priorityOrder: [],
  fallbackRules: '',
  costCeiling: '',
};

const GatewayEditorModal: React.FC<GatewayEditorModalProps> = ({ open, modelOptions, initialValues, onClose, onSave }) => {
  const [formValues, setFormValues] = React.useState<GatewayEditorValues>(emptyValues);
  const [saving, setSaving] = React.useState(false);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setFormValues(initialValues ? { ...initialValues } : emptyValues);
  }, [open, initialValues]);

  const handleAssignModels = (modelIds: string[]) => {
    const nextPriority = formValues.priorityOrder.filter((id) => modelIds.includes(id));
    modelIds.forEach((id) => {
      if (!nextPriority.includes(id)) {
        nextPriority.push(id);
      }
    });

    setFormValues((prev) => ({
      ...prev,
      assignedModelIds: modelIds,
      priorityOrder: nextPriority,
    }));
  };

  const movePriority = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= formValues.priorityOrder.length) {
      return;
    }
    const reordered = [...formValues.priorityOrder];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setFormValues((prev) => ({ ...prev, priorityOrder: reordered }));
  };

  const handleDrop = (toIndex: number) => {
    if (dragIndex === null) {
      return;
    }
    movePriority(dragIndex, toIndex);
    setDragIndex(null);
  };

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(formValues);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialValues ? 'Edit Gateway' : 'Create Gateway'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2 }}>
        <TextField
          label="Gateway Name"
          value={formValues.gatewayName}
          onChange={(e) => setFormValues((prev) => ({ ...prev, gatewayName: e.target.value }))}
          size="small"
          fullWidth
          autoFocus
        />

        <TextField
          select
          label="Assigned Models"
          SelectProps={{ multiple: true }}
          value={formValues.assignedModelIds}
          onChange={(e) => handleAssignModels(e.target.value as string[])}
          size="small"
          fullWidth
        >
          {modelOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
          ))}
        </TextField>

        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
            Priority Order (drag to reorder)
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {formValues.priorityOrder.map((modelId, index) => {
              const option = modelOptions.find((entry) => entry.id === modelId);
              return (
                <Paper
                  key={modelId}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(index)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 0.75,
                    border: '1px solid rgba(255,255,255,0.12)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DragIndicatorIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                    <Typography variant="body2">{option?.label || modelId}</Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => movePriority(index, index - 1)}>▲</IconButton>
                    <IconButton size="small" onClick={() => movePriority(index, index + 1)}>▼</IconButton>
                  </Box>
                </Paper>
              );
            })}
            {formValues.priorityOrder.length === 0 && (
              <Typography variant="body2" color="text.secondary">No assigned models selected.</Typography>
            )}
          </Box>
        </Box>

        <TextField
          label="Fallback Rules"
          value={formValues.fallbackRules}
          onChange={(e) => setFormValues((prev) => ({ ...prev, fallbackRules: e.target.value }))}
          size="small"
          fullWidth
          multiline
          minRows={2}
        />

        <TextField
          type="number"
          label="Cost Ceiling"
          value={formValues.costCeiling}
          onChange={(e) => setFormValues((prev) => ({ ...prev, costCeiling: e.target.value }))}
          size="small"
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving || !formValues.gatewayName.trim()}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GatewayEditorModal;
