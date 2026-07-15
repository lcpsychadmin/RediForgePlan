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
  allowedModelIds: string[];
  preferredCostTiers: string[];
  preferredLatencyClass: string;
  requiredCapabilities: string[];
  fallbackModelIds: string[];
}

interface RouterEditorModalProps {
  open: boolean;
  gatewayOptions: Array<{ id: string; label: string }>;
  modelOptions: Array<{ id: string; label: string }>;
  initialValues?: RouterEditorValues;
  onClose: () => void;
  onSave: (values: RouterEditorValues) => Promise<void>;
}

const emptyValues: RouterEditorValues = {
  routerName: '',
  routerType: 'costOptimized',
  gatewayId: '',
  rules: '',
  allowedModelIds: [],
  preferredCostTiers: [],
  preferredLatencyClass: '',
  requiredCapabilities: [],
  fallbackModelIds: [],
};

const ROUTER_TYPES: RouterEditorValues['routerType'][] = [
  'costOptimized',
  'performanceOptimized',
  'capabilityBased',
  'hybrid',
];

const COST_TIER_OPTIONS = ['low', 'standard', 'high', 'enterprise'];
const CAPABILITY_OPTIONS = ['chat', 'reasoning', 'summarization', 'code', 'vision', 'embeddings'];
const LATENCY_OPTIONS = ['low-latency', 'standard', 'economy'];

const RouterEditorModal: React.FC<RouterEditorModalProps> = ({ open, gatewayOptions, modelOptions, initialValues, onClose, onSave }) => {
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

        <TextField
          select
          label="Allowed Models"
          SelectProps={{ multiple: true }}
          value={formValues.allowedModelIds}
          onChange={(e) => setFormValues((prev) => ({ ...prev, allowedModelIds: e.target.value as string[] }))}
          size="small"
          fullWidth
        >
          {modelOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Preferred Cost Tiers"
          SelectProps={{ multiple: true }}
          value={formValues.preferredCostTiers}
          onChange={(e) => setFormValues((prev) => ({ ...prev, preferredCostTiers: e.target.value as string[] }))}
          size="small"
          fullWidth
        >
          {COST_TIER_OPTIONS.map((tier) => (
            <MenuItem key={tier} value={tier}>{tier}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Preferred Latency Class"
          value={formValues.preferredLatencyClass}
          onChange={(e) => setFormValues((prev) => ({ ...prev, preferredLatencyClass: e.target.value }))}
          size="small"
          fullWidth
        >
          <MenuItem value=""><em>No preference</em></MenuItem>
          {LATENCY_OPTIONS.map((latency) => (
            <MenuItem key={latency} value={latency}>{latency}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Required Capabilities"
          SelectProps={{ multiple: true }}
          value={formValues.requiredCapabilities}
          onChange={(e) => setFormValues((prev) => ({ ...prev, requiredCapabilities: e.target.value as string[] }))}
          size="small"
          fullWidth
        >
          {CAPABILITY_OPTIONS.map((capability) => (
            <MenuItem key={capability} value={capability}>{capability}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Fallback Models"
          SelectProps={{ multiple: true }}
          value={formValues.fallbackModelIds}
          onChange={(e) => setFormValues((prev) => ({ ...prev, fallbackModelIds: e.target.value as string[] }))}
          size="small"
          fullWidth
        >
          {modelOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
          ))}
        </TextField>
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
