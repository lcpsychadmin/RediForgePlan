import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import apiClient from '../../api/client';
import type { AiGateway, AiModel, AiRouter, AiSettingsSection, AiUsagePolicy } from '../../types/aiPlatform';

type ModelFormState = {
  modelKey: string;
  displayName: string;
  provider: string;
  modelFamily: string;
  contextWindow: string;
  inputCostPer1kTokens: string;
  outputCostPer1kTokens: string;
  isActive: boolean;
};

type GatewayFormState = {
  name: string;
  description: string;
  endpointUrl: string;
  authType: string;
  defaultModelId: string;
  failoverModelId: string;
  isActive: boolean;
};

type RouterFormState = {
  name: string;
  description: string;
  strategy: string;
  primaryGatewayId: string;
  fallbackGatewayId: string;
  allowedModelIdsText: string;
  isActive: boolean;
};

type PolicyFormState = {
  name: string;
  description: string;
  maxRequestsPerMinute: string;
  maxTokensPerRequest: string;
  allowedCapabilitiesText: string;
  blockedModelIdsText: string;
  defaultRouterId: string;
  isActive: boolean;
};

const defaultModelForm = (): ModelFormState => ({
  modelKey: '',
  displayName: '',
  provider: '',
  modelFamily: '',
  contextWindow: '',
  inputCostPer1kTokens: '',
  outputCostPer1kTokens: '',
  isActive: true,
});

const defaultGatewayForm = (): GatewayFormState => ({
  name: '',
  description: '',
  endpointUrl: '',
  authType: '',
  defaultModelId: '',
  failoverModelId: '',
  isActive: true,
});

const defaultRouterForm = (): RouterFormState => ({
  name: '',
  description: '',
  strategy: '',
  primaryGatewayId: '',
  fallbackGatewayId: '',
  allowedModelIdsText: '',
  isActive: true,
});

const defaultPolicyForm = (): PolicyFormState => ({
  name: '',
  description: '',
  maxRequestsPerMinute: '',
  maxTokensPerRequest: '',
  allowedCapabilitiesText: '',
  blockedModelIdsText: '',
  defaultRouterId: '',
  isActive: true,
});

const parseList = (value: string) => value.split(',').map((entry) => entry.trim()).filter(Boolean);

const formatMoney = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '-';
  }
  return Number(value).toFixed(6);
};

interface AiPlatformSettingsProps {
  section: AiSettingsSection;
}

const AiPlatformSettings: React.FC<AiPlatformSettingsProps> = ({ section }) => {
  const [models, setModels] = useState<AiModel[]>([]);
  const [gateways, setGateways] = useState<AiGateway[]>([]);
  const [routers, setRouters] = useState<AiRouter[]>([]);
  const [policies, setPolicies] = useState<AiUsagePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modelForm, setModelForm] = useState<ModelFormState>(defaultModelForm());
  const [editingModelId, setEditingModelId] = useState('');
  const [capabilityDrafts, setCapabilityDrafts] = useState<Record<string, { capabilityKey: string; description: string; isSupported: boolean }>>({});

  const [gatewayForm, setGatewayForm] = useState<GatewayFormState>(defaultGatewayForm());
  const [editingGatewayId, setEditingGatewayId] = useState('');

  const [routerForm, setRouterForm] = useState<RouterFormState>(defaultRouterForm());
  const [editingRouterId, setEditingRouterId] = useState('');

  const [policyForm, setPolicyForm] = useState<PolicyFormState>(defaultPolicyForm());
  const [editingPolicyId, setEditingPolicyId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [modelsRes, gatewaysRes, routersRes, policiesRes] = await Promise.all([
        apiClient.get('/api/ai/models'),
        apiClient.get('/api/ai/gateways'),
        apiClient.get('/api/ai/routers'),
        apiClient.get('/api/ai/policies'),
      ]);

      setModels(modelsRes.data?.data || []);
      setGateways(gatewaysRes.data?.data || []);
      setRouters(routersRes.data?.data || []);
      setPolicies(policiesRes.data?.data || []);
    } catch {
      setError('Unable to load AI platform settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const modelOptions = useMemo(() => models.map((model) => ({ id: model.id, label: `${model.displayName} (${model.modelKey})` })), [models]);
  const gatewayOptions = useMemo(() => gateways.map((gateway) => ({ id: gateway.id, label: gateway.name })), [gateways]);
  const routerOptions = useMemo(() => routers.map((router) => ({ id: router.id, label: router.name })), [routers]);

  const resetSectionForm = (nextSection: AiSettingsSection) => {
    if (nextSection === 'models') {
      setModelForm(defaultModelForm());
      setEditingModelId('');
      return;
    }
    if (nextSection === 'gateways') {
      setGatewayForm(defaultGatewayForm());
      setEditingGatewayId('');
      return;
    }
    if (nextSection === 'routers') {
      setRouterForm(defaultRouterForm());
      setEditingRouterId('');
      return;
    }
    setPolicyForm(defaultPolicyForm());
    setEditingPolicyId('');
  };

  useEffect(() => {
    resetSectionForm(section);
  }, [section]);

  const saveModel = async () => {
    const payload = {
      modelKey: modelForm.modelKey,
      displayName: modelForm.displayName,
      provider: modelForm.provider,
      modelFamily: modelForm.modelFamily,
      contextWindow: modelForm.contextWindow ? Number(modelForm.contextWindow) : null,
      inputCostPer1kTokens: modelForm.inputCostPer1kTokens ? Number(modelForm.inputCostPer1kTokens) : null,
      outputCostPer1kTokens: modelForm.outputCostPer1kTokens ? Number(modelForm.outputCostPer1kTokens) : null,
      isActive: modelForm.isActive,
    };

    if (editingModelId) {
      await apiClient.put(`/api/ai/models/${editingModelId}`, payload);
    } else {
      await apiClient.post('/api/ai/models', payload);
    }

    setModelForm(defaultModelForm());
    setEditingModelId('');
    await loadData();
  };

  const saveCapability = async (modelId: string) => {
    const draft = capabilityDrafts[modelId];
    if (!draft?.capabilityKey.trim()) {
      return;
    }

    await apiClient.post(`/api/ai/models/${modelId}/capabilities`, {
      capabilityKey: draft.capabilityKey,
      description: draft.description,
      isSupported: draft.isSupported,
    });

    setCapabilityDrafts((prev) => ({
      ...prev,
      [modelId]: { capabilityKey: '', description: '', isSupported: true },
    }));
    await loadData();
  };

  const saveGateway = async () => {
    const payload = {
      name: gatewayForm.name,
      description: gatewayForm.description,
      endpointUrl: gatewayForm.endpointUrl,
      authType: gatewayForm.authType,
      defaultModelId: gatewayForm.defaultModelId || null,
      failoverModelId: gatewayForm.failoverModelId || null,
      isActive: gatewayForm.isActive,
    };

    if (editingGatewayId) {
      await apiClient.put(`/api/ai/gateways/${editingGatewayId}`, payload);
    } else {
      await apiClient.post('/api/ai/gateways', payload);
    }

    setGatewayForm(defaultGatewayForm());
    setEditingGatewayId('');
    await loadData();
  };

  const saveRouter = async () => {
    const payload = {
      name: routerForm.name,
      description: routerForm.description,
      strategy: routerForm.strategy,
      primaryGatewayId: routerForm.primaryGatewayId || null,
      fallbackGatewayId: routerForm.fallbackGatewayId || null,
      allowedModelIds: parseList(routerForm.allowedModelIdsText),
      isActive: routerForm.isActive,
    };

    if (editingRouterId) {
      await apiClient.put(`/api/ai/routers/${editingRouterId}`, payload);
    } else {
      await apiClient.post('/api/ai/routers', payload);
    }

    setRouterForm(defaultRouterForm());
    setEditingRouterId('');
    await loadData();
  };

  const savePolicy = async () => {
    const payload = {
      name: policyForm.name,
      description: policyForm.description,
      maxRequestsPerMinute: policyForm.maxRequestsPerMinute ? Number(policyForm.maxRequestsPerMinute) : null,
      maxTokensPerRequest: policyForm.maxTokensPerRequest ? Number(policyForm.maxTokensPerRequest) : null,
      allowedCapabilities: parseList(policyForm.allowedCapabilitiesText),
      blockedModelIds: parseList(policyForm.blockedModelIdsText),
      defaultRouterId: policyForm.defaultRouterId || null,
      isActive: policyForm.isActive,
    };

    if (editingPolicyId) {
      await apiClient.put(`/api/ai/policies/${editingPolicyId}`, payload);
    } else {
      await apiClient.post('/api/ai/policies', payload);
    }

    setPolicyForm(defaultPolicyForm());
    setEditingPolicyId('');
    await loadData();
  };

  const removeModel = async (modelId: string) => {
    await apiClient.delete(`/api/ai/models/${modelId}`);
    await loadData();
  };

  const removeCapability = async (modelId: string, capabilityId: string) => {
    await apiClient.delete(`/api/ai/models/${modelId}/capabilities/${capabilityId}`);
    await loadData();
  };

  const removeGateway = async (gatewayId: string) => {
    await apiClient.delete(`/api/ai/gateways/${gatewayId}`);
    await loadData();
  };

  const removeRouter = async (routerId: string) => {
    await apiClient.delete(`/api/ai/routers/${routerId}`);
    await loadData();
  };

  const removePolicy = async (policyId: string) => {
    await apiClient.delete(`/api/ai/policies/${policyId}`);
    await loadData();
  };

  if (loading) {
    return <Typography variant="body2" color="text.secondary">Loading AI platform settings...</Typography>;
  }

  const sectionHeader = {
    models: {
      title: 'Model Registry',
      subtitle: 'Register models, providers, cost metadata, and supported capabilities.',
    },
    gateways: {
      title: 'AI Gateways',
      subtitle: 'Define API endpoints and fallback models for provider access.',
    },
    routers: {
      title: 'AI Routers',
      subtitle: 'Map requests to gateways and constrain the model set allowed for routing.',
    },
    policies: {
      title: 'Usage Policies',
      subtitle: 'Control cost, token, capability, and model usage limits.',
    },
  }[section];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{sectionHeader.title}</Typography>
        <Typography variant="body2" color="text.secondary">{sectionHeader.subtitle}</Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {section === 'models' && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2, border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{editingModelId ? 'Edit Model' : 'New Model'}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
              <TextField size="small" label="Model Key" value={modelForm.modelKey} onChange={(e) => setModelForm((prev) => ({ ...prev, modelKey: e.target.value }))} />
              <TextField size="small" label="Display Name" value={modelForm.displayName} onChange={(e) => setModelForm((prev) => ({ ...prev, displayName: e.target.value }))} />
              <TextField size="small" label="Provider" value={modelForm.provider} onChange={(e) => setModelForm((prev) => ({ ...prev, provider: e.target.value }))} />
              <TextField size="small" label="Model Family" value={modelForm.modelFamily} onChange={(e) => setModelForm((prev) => ({ ...prev, modelFamily: e.target.value }))} />
              <TextField size="small" label="Context Window" type="number" value={modelForm.contextWindow} onChange={(e) => setModelForm((prev) => ({ ...prev, contextWindow: e.target.value }))} />
              <TextField size="small" label="Input Cost / 1K Tokens" type="number" value={modelForm.inputCostPer1kTokens} onChange={(e) => setModelForm((prev) => ({ ...prev, inputCostPer1kTokens: e.target.value }))} />
              <TextField size="small" label="Output Cost / 1K Tokens" type="number" value={modelForm.outputCostPer1kTokens} onChange={(e) => setModelForm((prev) => ({ ...prev, outputCostPer1kTokens: e.target.value }))} />
              <FormControlLabel control={<Switch checked={modelForm.isActive} onChange={(e) => setModelForm((prev) => ({ ...prev, isActive: e.target.checked }))} />} label="Active" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
              {editingModelId && <Button variant="text" onClick={() => { setModelForm(defaultModelForm()); setEditingModelId(''); }}>Cancel</Button>}
              <Button variant="contained" startIcon={<SaveIcon />} onClick={saveModel} sx={{ textTransform: 'none' }}>{editingModelId ? 'Save Model' : 'Add Model'}</Button>
            </Box>
          </Paper>

          {models.map((model) => {
            const capabilityDraft = capabilityDrafts[model.id] || { capabilityKey: '', description: '', isSupported: true };
            return (
              <Paper key={model.id} sx={{ p: 2, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{model.displayName}</Typography>
                    <Typography variant="caption" color="text.secondary">{model.modelKey}{model.provider ? ` · ${model.provider}` : ''}{model.modelFamily ? ` · ${model.modelFamily}` : ''}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button size="small" variant="outlined" onClick={() => {
                      setEditingModelId(model.id);
                      setModelForm({
                        modelKey: model.modelKey,
                        displayName: model.displayName,
                        provider: model.provider || '',
                        modelFamily: model.modelFamily || '',
                        contextWindow: model.contextWindow?.toString() || '',
                        inputCostPer1kTokens: model.inputCostPer1kTokens?.toString() || '',
                        outputCostPer1kTokens: model.outputCostPer1kTokens?.toString() || '',
                        isActive: model.isActive,
                      });
                    }}>Edit</Button>
                    <IconButton size="small" onClick={() => removeModel(model.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1.25, mb: 1.5 }}>
                  <Box><Typography variant="caption" color="text.secondary">Context Window</Typography><Typography variant="body2">{model.contextWindow ?? '-'}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Input Cost</Typography><Typography variant="body2">${formatMoney(model.inputCostPer1kTokens)}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Output Cost</Typography><Typography variant="body2">${formatMoney(model.outputCostPer1kTokens)}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Status</Typography><Typography variant="body2">{model.isActive ? 'Active' : 'Inactive'}</Typography></Box>
                </Box>

                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Capabilities</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                  {(model.capabilities || []).map((capability) => (
                    <Chip
                      key={capability.id}
                      label={capability.capabilityKey}
                      onDelete={() => removeCapability(model.id, capability.id)}
                      variant={capability.isSupported ? 'filled' : 'outlined'}
                      sx={{ backgroundColor: capability.isSupported ? 'rgba(102, 187, 106, 0.16)' : undefined }}
                    />
                  ))}
                  {(model.capabilities || []).length === 0 && <Typography variant="body2" color="text.secondary">No capabilities registered.</Typography>}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1 }}>
                  <TextField size="small" label="Capability Key" value={capabilityDraft.capabilityKey} onChange={(e) => setCapabilityDrafts((prev) => ({ ...prev, [model.id]: { ...capabilityDraft, capabilityKey: e.target.value } }))} />
                  <TextField size="small" label="Description" value={capabilityDraft.description} onChange={(e) => setCapabilityDrafts((prev) => ({ ...prev, [model.id]: { ...capabilityDraft, description: e.target.value } }))} />
                  <Button variant="outlined" onClick={() => saveCapability(model.id)} sx={{ textTransform: 'none' }}>Add Capability</Button>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}

      {section === 'gateways' && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2, border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{editingGatewayId ? 'Edit Gateway' : 'New Gateway'}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
              <TextField size="small" label="Name" value={gatewayForm.name} onChange={(e) => setGatewayForm((prev) => ({ ...prev, name: e.target.value }))} />
              <TextField size="small" label="Endpoint URL" value={gatewayForm.endpointUrl} onChange={(e) => setGatewayForm((prev) => ({ ...prev, endpointUrl: e.target.value }))} />
              <TextField size="small" label="Auth Type" value={gatewayForm.authType} onChange={(e) => setGatewayForm((prev) => ({ ...prev, authType: e.target.value }))} />
              <TextField size="small" label="Description" value={gatewayForm.description} onChange={(e) => setGatewayForm((prev) => ({ ...prev, description: e.target.value }))} />
              <TextField select size="small" label="Default Model" value={gatewayForm.defaultModelId} onChange={(e) => setGatewayForm((prev) => ({ ...prev, defaultModelId: e.target.value }))}>
                <MenuItem value="">None</MenuItem>
                {modelOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Failover Model" value={gatewayForm.failoverModelId} onChange={(e) => setGatewayForm((prev) => ({ ...prev, failoverModelId: e.target.value }))}>
                <MenuItem value="">None</MenuItem>
                {modelOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
              </TextField>
              <FormControlLabel control={<Switch checked={gatewayForm.isActive} onChange={(e) => setGatewayForm((prev) => ({ ...prev, isActive: e.target.checked }))} />} label="Active" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
              {editingGatewayId && <Button variant="text" onClick={() => { setGatewayForm(defaultGatewayForm()); setEditingGatewayId(''); }}>Cancel</Button>}
              <Button variant="contained" startIcon={<SaveIcon />} onClick={saveGateway} sx={{ textTransform: 'none' }}>{editingGatewayId ? 'Save Gateway' : 'Add Gateway'}</Button>
            </Box>
          </Paper>

          {gateways.map((gateway) => (
            <Paper key={gateway.id} sx={{ p: 2, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{gateway.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{gateway.endpointUrl || 'No endpoint configured'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button size="small" variant="outlined" onClick={() => {
                    setEditingGatewayId(gateway.id);
                    setGatewayForm({
                      name: gateway.name,
                      description: gateway.description || '',
                      endpointUrl: gateway.endpointUrl || '',
                      authType: gateway.authType || '',
                      defaultModelId: gateway.defaultModelId || '',
                      failoverModelId: gateway.failoverModelId || '',
                      isActive: gateway.isActive,
                    });
                  }}>Edit</Button>
                  <IconButton size="small" onClick={() => removeGateway(gateway.id)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{gateway.description || 'No description.'}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip label={gateway.defaultModelName || 'No default model'} size="small" />
                <Chip label={gateway.failoverModelName || 'No failover model'} size="small" variant="outlined" />
                <Chip label={gateway.isActive ? 'Active' : 'Inactive'} size="small" color={gateway.isActive ? 'success' : 'default'} />
              </Box>
            </Paper>
          ))}
        </Stack>
      )}

      {section === 'routers' && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2, border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{editingRouterId ? 'Edit Router' : 'New Router'}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
              <TextField size="small" label="Name" value={routerForm.name} onChange={(e) => setRouterForm((prev) => ({ ...prev, name: e.target.value }))} />
              <TextField size="small" label="Strategy" value={routerForm.strategy} onChange={(e) => setRouterForm((prev) => ({ ...prev, strategy: e.target.value }))} />
              <TextField size="small" label="Description" value={routerForm.description} onChange={(e) => setRouterForm((prev) => ({ ...prev, description: e.target.value }))} />
              <TextField size="small" label="Allowed Model IDs" value={routerForm.allowedModelIdsText} onChange={(e) => setRouterForm((prev) => ({ ...prev, allowedModelIdsText: e.target.value }))} helperText="Comma-separated model IDs" />
              <TextField select size="small" label="Primary Gateway" value={routerForm.primaryGatewayId} onChange={(e) => setRouterForm((prev) => ({ ...prev, primaryGatewayId: e.target.value }))}>
                <MenuItem value="">None</MenuItem>
                {gatewayOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Fallback Gateway" value={routerForm.fallbackGatewayId} onChange={(e) => setRouterForm((prev) => ({ ...prev, fallbackGatewayId: e.target.value }))}>
                <MenuItem value="">None</MenuItem>
                {gatewayOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
              </TextField>
              <FormControlLabel control={<Switch checked={routerForm.isActive} onChange={(e) => setRouterForm((prev) => ({ ...prev, isActive: e.target.checked }))} />} label="Active" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
              {editingRouterId && <Button variant="text" onClick={() => { setRouterForm(defaultRouterForm()); setEditingRouterId(''); }}>Cancel</Button>}
              <Button variant="contained" startIcon={<SaveIcon />} onClick={saveRouter} sx={{ textTransform: 'none' }}>{editingRouterId ? 'Save Router' : 'Add Router'}</Button>
            </Box>
          </Paper>

          {routers.map((router) => (
            <Paper key={router.id} sx={{ p: 2, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{router.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{router.strategy || 'No strategy configured'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button size="small" variant="outlined" onClick={() => {
                    setEditingRouterId(router.id);
                    setRouterForm({
                      name: router.name,
                      description: router.description || '',
                      strategy: router.strategy || '',
                      primaryGatewayId: router.primaryGatewayId || '',
                      fallbackGatewayId: router.fallbackGatewayId || '',
                      allowedModelIdsText: (router.allowedModelIds || []).join(', '),
                      isActive: router.isActive,
                    });
                  }}>Edit</Button>
                  <IconButton size="small" onClick={() => removeRouter(router.id)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{router.description || 'No description.'}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip label={router.primaryGatewayName || 'No primary gateway'} size="small" />
                <Chip label={router.fallbackGatewayName || 'No fallback gateway'} size="small" variant="outlined" />
                <Chip label={router.isActive ? 'Active' : 'Inactive'} size="small" color={router.isActive ? 'success' : 'default'} />
              </Box>
            </Paper>
          ))}
        </Stack>
      )}

      {section === 'policies' && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2, border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{editingPolicyId ? 'Edit Policy' : 'New Policy'}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
              <TextField size="small" label="Name" value={policyForm.name} onChange={(e) => setPolicyForm((prev) => ({ ...prev, name: e.target.value }))} />
              <TextField size="small" label="Description" value={policyForm.description} onChange={(e) => setPolicyForm((prev) => ({ ...prev, description: e.target.value }))} />
              <TextField size="small" label="Max Requests / Minute" type="number" value={policyForm.maxRequestsPerMinute} onChange={(e) => setPolicyForm((prev) => ({ ...prev, maxRequestsPerMinute: e.target.value }))} />
              <TextField size="small" label="Max Tokens / Request" type="number" value={policyForm.maxTokensPerRequest} onChange={(e) => setPolicyForm((prev) => ({ ...prev, maxTokensPerRequest: e.target.value }))} />
              <TextField size="small" label="Allowed Capabilities" value={policyForm.allowedCapabilitiesText} onChange={(e) => setPolicyForm((prev) => ({ ...prev, allowedCapabilitiesText: e.target.value }))} helperText="Comma-separated capability keys" />
              <TextField size="small" label="Blocked Model IDs" value={policyForm.blockedModelIdsText} onChange={(e) => setPolicyForm((prev) => ({ ...prev, blockedModelIdsText: e.target.value }))} helperText="Comma-separated model IDs" />
              <TextField select size="small" label="Default Router" value={policyForm.defaultRouterId} onChange={(e) => setPolicyForm((prev) => ({ ...prev, defaultRouterId: e.target.value }))}>
                <MenuItem value="">None</MenuItem>
                {routerOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
              </TextField>
              <FormControlLabel control={<Switch checked={policyForm.isActive} onChange={(e) => setPolicyForm((prev) => ({ ...prev, isActive: e.target.checked }))} />} label="Active" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
              {editingPolicyId && <Button variant="text" onClick={() => { setPolicyForm(defaultPolicyForm()); setEditingPolicyId(''); }}>Cancel</Button>}
              <Button variant="contained" startIcon={<SaveIcon />} onClick={savePolicy} sx={{ textTransform: 'none' }}>{editingPolicyId ? 'Save Policy' : 'Add Policy'}</Button>
            </Box>
          </Paper>

          {policies.map((policy) => (
            <Paper key={policy.id} sx={{ p: 2, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{policy.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{policy.description || 'No description.'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button size="small" variant="outlined" onClick={() => {
                    setEditingPolicyId(policy.id);
                    setPolicyForm({
                      name: policy.name,
                      description: policy.description || '',
                      maxRequestsPerMinute: policy.maxRequestsPerMinute?.toString() || '',
                      maxTokensPerRequest: policy.maxTokensPerRequest?.toString() || '',
                      allowedCapabilitiesText: (policy.allowedCapabilities || []).join(', '),
                      blockedModelIdsText: (policy.blockedModelIds || []).join(', '),
                      defaultRouterId: policy.defaultRouterId || '',
                      isActive: policy.isActive,
                    });
                  }}>Edit</Button>
                  <IconButton size="small" onClick={() => removePolicy(policy.id)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip label={policy.defaultRouterName || 'No default router'} size="small" />
                <Chip label={policy.isActive ? 'Active' : 'Inactive'} size="small" color={policy.isActive ? 'success' : 'default'} />
                <Chip label={`RPM: ${policy.maxRequestsPerMinute ?? '-'}`} size="small" variant="outlined" />
                <Chip label={`Tokens: ${policy.maxTokensPerRequest ?? '-'}`} size="small" variant="outlined" />
              </Box>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default AiPlatformSettings;