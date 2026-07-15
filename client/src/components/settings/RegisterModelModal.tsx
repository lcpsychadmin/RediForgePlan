import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
} from '@mui/material';

export interface RegisterModelFormValues {
  modelName: string;
  provider: string;
  endpointUrl: string;
  apiKey: string;
  costTier: string;
  capabilities: string[];
  maxTokens: string;
  latencyClass: string;
  enabled: boolean;
}

interface RegisterModelModalProps {
  open: boolean;
  initialValues?: RegisterModelFormValues;
  onClose: () => void;
  onSave: (values: RegisterModelFormValues) => Promise<void>;
}

const PROVIDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'databricks', label: 'Databricks' },
  { value: 'azure-openai', label: 'Azure OpenAI' },
  { value: 'custom', label: 'Custom' },
];
const COST_TIER_OPTIONS = ['low', 'standard', 'high', 'enterprise'];
const CAPABILITY_OPTIONS = ['chat', 'reasoning', 'summarization', 'code', 'vision', 'embeddings'];
const LATENCY_OPTIONS = ['low-latency', 'standard', 'economy'];

const emptyValues: RegisterModelFormValues = {
  modelName: '',
  provider: 'openai',
  endpointUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  costTier: 'standard',
  capabilities: [],
  maxTokens: '',
  latencyClass: 'standard',
  enabled: true,
};

const RegisterModelModal: React.FC<RegisterModelModalProps> = ({ open, initialValues, onClose, onSave }) => {
  const [formValues, setFormValues] = React.useState<RegisterModelFormValues>(emptyValues);
  const [saving, setSaving] = React.useState(false);

  const isOpenAiProvider = formValues.provider === 'openai';
  const endpointHelperText = isOpenAiProvider
    ? 'Defaults to the OpenAI chat completions endpoint if left unchanged.'
    : 'Enter a provider-specific or custom endpoint URL.';

  React.useEffect(() => {
    if (!open) {
      return;
    }
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

  const toggleCapability = (capability: string) => {
    setFormValues((prev) => {
      const exists = prev.capabilities.includes(capability);
      return {
        ...prev,
        capabilities: exists
          ? prev.capabilities.filter((entry) => entry !== capability)
          : [...prev.capabilities, capability],
      };
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialValues ? 'Edit Model' : 'Register Model'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2 }}>
        <TextField
          label="Model Name"
          value={formValues.modelName}
          onChange={(e) => setFormValues((prev) => ({ ...prev, modelName: e.target.value }))}
          fullWidth
          size="small"
          autoFocus
        />
        <TextField
          select
          label="Provider"
          value={formValues.provider}
          onChange={(e) => {
            const provider = e.target.value;
            setFormValues((prev) => ({
              ...prev,
              provider,
              endpointUrl: provider === 'openai'
                ? (prev.endpointUrl || 'https://api.openai.com/v1/chat/completions')
                : prev.endpointUrl,
            }));
          }}
          fullWidth
          size="small"
        >
          {PROVIDER_OPTIONS.map((provider) => (
            <MenuItem key={provider.value} value={provider.value}>{provider.label}</MenuItem>
          ))}
        </TextField>
        {isOpenAiProvider && (
          <>
            <TextField
              label="Endpoint URL"
              value={formValues.endpointUrl}
              onChange={(e) => setFormValues((prev) => ({ ...prev, endpointUrl: e.target.value }))}
              fullWidth
              size="small"
              placeholder="https://api.openai.com/v1/chat/completions"
              helperText={endpointHelperText}
            />
            <TextField
              type="password"
              label="API Key"
              value={formValues.apiKey}
              onChange={(e) => setFormValues((prev) => ({ ...prev, apiKey: e.target.value }))}
              fullWidth
              size="small"
              helperText="Paste your OpenAI secret key (sk-...)."
            />
          </>
        )}
        <TextField
          select
          label="Cost Tier"
          value={formValues.costTier}
          onChange={(e) => setFormValues((prev) => ({ ...prev, costTier: e.target.value }))}
          fullWidth
          size="small"
        >
          {COST_TIER_OPTIONS.map((tier) => (
            <MenuItem key={tier} value={tier}>{tier}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Latency Class"
          value={formValues.latencyClass}
          onChange={(e) => setFormValues((prev) => ({ ...prev, latencyClass: e.target.value }))}
          fullWidth
          size="small"
        >
          {LATENCY_OPTIONS.map((latency) => (
            <MenuItem key={latency} value={latency}>{latency}</MenuItem>
          ))}
        </TextField>

        <TextField
          type="number"
          label="Max Tokens"
          value={formValues.maxTokens}
          onChange={(e) => setFormValues((prev) => ({ ...prev, maxTokens: e.target.value }))}
          fullWidth
          size="small"
        />

        <Box>
          <Box sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 0.75 }}>Capabilities</Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {CAPABILITY_OPTIONS.map((capability) => (
              <Chip
                key={capability}
                label={capability}
                clickable
                color={formValues.capabilities.includes(capability) ? 'primary' : 'default'}
                variant={formValues.capabilities.includes(capability) ? 'filled' : 'outlined'}
                onClick={() => toggleCapability(capability)}
                size="small"
              />
            ))}
          </Box>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={formValues.enabled}
              onChange={(e) => setFormValues((prev) => ({ ...prev, enabled: e.target.checked }))}
            />
          }
          label="Enabled"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || !formValues.modelName.trim()}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RegisterModelModal;
