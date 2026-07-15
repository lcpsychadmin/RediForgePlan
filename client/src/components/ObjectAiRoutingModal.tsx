import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

export interface ObjectAiRoutingValues {
  defaultGatewayId: string;
  defaultRouterId: string;
  projectLevelOverride: boolean;
}

interface ObjectAiRoutingModalProps {
  open: boolean;
  objectLabel: string;
  gatewayOptions: Array<{ id: string; label: string }>;
  routerOptions: Array<{ id: string; label: string }>;
  initialValues: ObjectAiRoutingValues;
  onClose: () => void;
  onSave: (values: ObjectAiRoutingValues) => Promise<void>;
}

const ObjectAiRoutingModal: React.FC<ObjectAiRoutingModalProps> = ({
  open,
  objectLabel,
  gatewayOptions,
  routerOptions,
  initialValues,
  onClose,
  onSave,
}) => {
  const [formValues, setFormValues] = React.useState<ObjectAiRoutingValues>(initialValues);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setFormValues(initialValues);
  }, [open, initialValues]);

  const handleSubmit = async () => {
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
      <DialogTitle>Assign AI Routing</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {objectLabel}
        </Typography>

        <TextField
          select
          size="small"
          label="Default Gateway"
          value={formValues.defaultGatewayId}
          onChange={(e) => setFormValues((prev) => ({ ...prev, defaultGatewayId: e.target.value }))}
          fullWidth
        >
          <MenuItem value=""><em>None</em></MenuItem>
          {gatewayOptions.map((gateway) => (
            <MenuItem key={gateway.id} value={gateway.id}>{gateway.label}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Default Router"
          value={formValues.defaultRouterId}
          onChange={(e) => setFormValues((prev) => ({ ...prev, defaultRouterId: e.target.value }))}
          fullWidth
        >
          <MenuItem value=""><em>None</em></MenuItem>
          {routerOptions.map((router) => (
            <MenuItem key={router.id} value={router.id}>{router.label}</MenuItem>
          ))}
        </TextField>

        <FormControlLabel
          control={
            <Switch
              checked={formValues.projectLevelOverride}
              onChange={(e) => setFormValues((prev) => ({ ...prev, projectLevelOverride: e.target.checked }))}
            />
          }
          label="Project-level override"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ObjectAiRoutingModal;
