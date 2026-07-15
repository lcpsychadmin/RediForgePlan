import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';

export interface RouterEditorValues {
  routerName: string;
  routerType: 'costOptimized' | 'performanceOptimized' | 'capabilityBased' | 'hybrid';
  gatewayId: string;
  rules: string;
}

interface RouterEditorModalProps {
  open: boolean;
  gatewayOptions: Array<{ id: string; label: string }>;
  initialValues?: RouterEditorValues;
  onClose: () => void;
  onSave: (values: RouterEditorValues) => Promise<void>;
}

const emptyValues: RouterEditorValues = {
  routerName: '',
  routerType: 'costOptimized',
  gatewayId: '',
  rules: '',
};

const ROUTER_TYPES: RouterEditorValues['routerType'][] = [
  'costOptimized',
  'performanceOptimized',
  'capabilityBased',
  'hybrid',
];

const RouterEditorModal: React.FC<RouterEditorModalProps> = ({ open, gatewayOptions, initialValues, onClose, onSave }) => {
  const [formValues, setFormValues] = React.useState<RouterEditorValues>(emptyValues);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setFormValues(initialValues ? { ...initialValues } : emptyValues);
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
      <DialogTitle>{initialValues ? 'Edit Router' : 'Create Router'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2 }}>
        <TextField
          label="Router Name"
          value={formValues.routerName}
          onChange={(e) => setFormValues((prev) => ({ ...prev, routerName: e.target.value }))}
          size="small"
          autoFocus
          fullWidth
        />

        <TextField
          select
          label="Router Type"
          value={formValues.routerType}
          onChange={(e) => setFormValues((prev) => ({ ...prev, routerType: e.target.value as RouterEditorValues['routerType'] }))}
          size="small"
          fullWidth
        >
          {ROUTER_TYPES.map((routerType) => (
            <MenuItem key={routerType} value={routerType}>{routerType}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Gateway"
          value={formValues.gatewayId}
          onChange={(e) => setFormValues((prev) => ({ ...prev, gatewayId: e.target.value }))}
          size="small"
          fullWidth
        >
          <MenuItem value=""><em>None</em></MenuItem>
          {gatewayOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
          ))}
        </TextField>

        <TextField
          label="Rules"
          value={formValues.rules}
          onChange={(e) => setFormValues((prev) => ({ ...prev, rules: e.target.value }))}
          size="small"
          fullWidth
          multiline
          minRows={3}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || !formValues.routerName.trim()}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RouterEditorModal;
