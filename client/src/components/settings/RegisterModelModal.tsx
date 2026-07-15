import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MemoryIcon from '@mui/icons-material/Memory';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import apiClient from '../../api/client';

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
  modelId?: string;
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

const normalizeModelName = (value: string) => value.trim().toLowerCase();
const modelMatches = (expected: string, actual: string) => {
  const expectedNorm = normalizeModelName(expected);
  const actualNorm = normalizeModelName(actual);
  if (!expectedNorm || !actualNorm) {
    return false;
  }
  if (expectedNorm === actualNorm) {
    return true;
  }
  return expectedNorm.startsWith(`${actualNorm}-`) || actualNorm.startsWith(`${expectedNorm}-`);
};

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

const RegisterModelModal: React.FC<RegisterModelModalProps> = ({ open, modelId, initialValues, onClose, onSave }) => {
  const [formValues, setFormValues] = React.useState<RegisterModelFormValues>(emptyValues);
  const [saving, setSaving] = React.useState(false);
  const [testPrompt, setTestPrompt] = React.useState('');
  const [testResponse, setTestResponse] = React.useState('');
  const [testState, setTestState] = React.useState<'idle' | 'success' | 'failure'>('idle');
  const [testLatencyMs, setTestLatencyMs] = React.useState<number | null>(null);
  const [testTokensUsed, setTestTokensUsed] = React.useState<number | null>(null);
  const [testModelUsed, setTestModelUsed] = React.useState('');
  const [testModelEcho, setTestModelEcho] = React.useState('');
  const [testDiagnostic, setTestDiagnostic] = React.useState('');
  const [testingModel, setTestingModel] = React.useState(false);

  const isOpenAiProvider = formValues.provider === 'openai';
  const endpointHelperText = isOpenAiProvider
    ? 'Defaults to the OpenAI chat completions endpoint if left unchanged.'
    : 'Enter a provider-specific or custom endpoint URL.';

  React.useEffect(() => {
    if (!open) {
      return;
    }
    setFormValues(initialValues ? { ...initialValues } : emptyValues);
    setTestPrompt('');
    setTestResponse('');
    setTestState('idle');
    setTestLatencyMs(null);
    setTestTokensUsed(null);
    setTestModelUsed('');
    setTestModelEcho('');
    setTestDiagnostic('');
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

  const clearTestFields = () => {
    setTestPrompt('');
    setTestResponse('');
    setTestState('idle');
    setTestLatencyMs(null);
    setTestTokensUsed(null);
    setTestModelUsed('');
    setTestModelEcho('');
    setTestDiagnostic('');
  };

  const handleTestModel = async () => {
    if (!modelId || !testPrompt.trim()) {
      return;
    }

    setTestingModel(true);
    setTestState('idle');
    setTestDiagnostic('');
    try {
      const response = await apiClient.post('/api/ai/models/test', {
        modelId,
        prompt: testPrompt.trim(),
      });

      const payload = response.data?.data || {};
      const modelUsed = String(payload.modelUsed || '').trim();
      const modelEcho = String(payload.modelEcho || '').trim();
      const expectedModelName = formValues.modelName.trim();
      const modelUsedMatches = modelMatches(expectedModelName, modelUsed);
      const modelEchoMatches = modelMatches(expectedModelName, modelEcho);

      setTestResponse(payload.responseText || 'No response text returned.');
      setTestLatencyMs(typeof payload.latencyMs === 'number' ? payload.latencyMs : null);
      setTestTokensUsed(typeof payload.tokensUsed === 'number' ? payload.tokensUsed : null);
      setTestModelUsed(modelUsed);
      setTestModelEcho(modelEcho);

      if (payload.success && modelUsedMatches) {
        setTestState('success');
        setTestDiagnostic(
          modelEchoMatches
            ? 'Model verification passed. Provider-reported model and echo both match.'
            : 'Provider model matches configuration. Echo response did not match and is shown as a warning.'
        );
      } else {
        setTestState('failure');
        const reasons: string[] = [];
        if (!payload.success) reasons.push('Provider test request failed.');
        if (!modelUsedMatches) reasons.push(`Model Used mismatch (expected ${expectedModelName}, got ${modelUsed || 'N/A'}).`);
        if (!modelEchoMatches) reasons.push(`Model Echo mismatch (expected ${expectedModelName}, got ${modelEcho || 'N/A'}).`);
        setTestDiagnostic(reasons.join(' '));
      }
    } catch (error: any) {
      const message = error?.response?.data?.data?.responseText || error?.response?.data?.message || error?.message || 'Model test failed.';
      setTestResponse(String(message));
      setTestLatencyMs(null);
      setTestTokensUsed(null);
      setTestModelUsed('');
      setTestModelEcho('');
      setTestDiagnostic('Provider request failed before verification completed.');
      setTestState('failure');
    } finally {
      setTestingModel(false);
    }
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
        <TextField
          label="Endpoint URL"
          value={formValues.endpointUrl}
          onChange={(e) => setFormValues((prev) => ({ ...prev, endpointUrl: e.target.value }))}
          fullWidth
          size="small"
          placeholder={isOpenAiProvider ? 'https://api.openai.com/v1/chat/completions' : 'https://provider-endpoint.example.com'}
          helperText={isOpenAiProvider ? endpointHelperText : 'Provider endpoint URL used for test and execution.'}
        />
        <TextField
          type="password"
          label="API Key"
          value={formValues.apiKey}
          onChange={(e) => setFormValues((prev) => ({ ...prev, apiKey: e.target.value }))}
          fullWidth
          size="small"
          helperText={isOpenAiProvider ? 'Paste your OpenAI secret key (sk-...).' : 'Secure API key for the selected provider.'}
        />
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

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mt: 0.5 }} />

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <SmartToyIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Test Configuration</Typography>
        </Stack>

        <TextField
          label="Prompt"
          value={testPrompt}
          onChange={(e) => setTestPrompt(e.target.value)}
          fullWidth
          multiline
          minRows={3}
          size="small"
        />

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="contained"
            onClick={handleTestModel}
            disabled={testingModel || !modelId || !testPrompt.trim()}
            startIcon={testingModel ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ textTransform: 'none' }}
          >
            {testingModel ? 'Testing...' : 'Test Model'}
          </Button>
          <Button onClick={clearTestFields} sx={{ textTransform: 'none' }}>Clear</Button>
          {!modelId && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Save model first to enable testing.
            </Typography>
          )}
        </Stack>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

        <TextField
          label="Model Used"
          value={testModelUsed}
          fullWidth
          size="small"
          InputProps={{
            readOnly: true,
            startAdornment: <MemoryIcon sx={{ fontSize: '1rem', color: 'text.secondary', mr: 1 }} />,
          }}
        />

        <TextField
          label="Model Echo"
          value={testModelEcho}
          fullWidth
          size="small"
          InputProps={{
            readOnly: true,
            startAdornment: <FingerprintIcon sx={{ fontSize: '1rem', color: 'text.secondary', mr: 1 }} />,
          }}
        />

        {testModelUsed && testModelEcho && !modelMatches(testModelUsed, testModelEcho) && (
          <Alert severity="warning" sx={{ py: 0.5 }}>
            Warning: Model response does not match expected model.
          </Alert>
        )}

        {testState !== 'idle' && (
          <Alert severity={testState === 'success' ? 'success' : 'error'} sx={{ py: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', fontSize: '0.8rem' }}>
              <Box>Status: {testState === 'success' ? 'Success' : 'Failure'}</Box>
              <Box>Latency: {testLatencyMs !== null ? `${testLatencyMs} ms` : 'N/A'}</Box>
              <Box>Tokens: {testTokensUsed !== null ? testTokensUsed : 'N/A'}</Box>
            </Box>
            {testDiagnostic && (
              <Box sx={{ mt: 0.5, fontSize: '0.78rem' }}>{testDiagnostic}</Box>
            )}
          </Alert>
        )}

        <TextField
          label="Response"
          value={testResponse}
          fullWidth
          multiline
          minRows={4}
          size="small"
          InputProps={{ readOnly: true }}
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
