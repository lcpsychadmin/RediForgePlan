import React from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import apiClient from '../api/client';

const strategies = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'lowest_cost', label: 'Lowest Cost' },
  { value: 'lowest_latency', label: 'Lowest Latency' },
  { value: 'highest_quality', label: 'Highest Quality' },
];

const AiRoutingRulesPage: React.FC = () => {
  const [gateways, setGateways] = React.useState<any[]>([]);
  const [routers, setRouters] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState({
    defaultGatewayId: '',
    defaultRouterId: '',
    routingStrategy: 'balanced',
    costCeiling: '',
    providerPreferences: '',
    fallbackLogic: '',
    aiOverridesEnabled: true,
  });
  const [status, setStatus] = React.useState('');

  React.useEffect(() => {
    Promise.all([
      apiClient.get('/api/ai/object-routing/options'),
      apiClient.get('/api/ai/routing-rules'),
    ])
      .then(([optionsRes, rulesRes]) => {
        const rules = rulesRes.data?.data || {};
        setGateways(optionsRes.data?.data?.gateways || []);
        setRouters(optionsRes.data?.data?.routers || []);
        setDraft({
          defaultGatewayId: rules.default_gateway_id || rules.defaultGatewayId || '',
          defaultRouterId: rules.default_router_id || rules.defaultRouterId || '',
          routingStrategy: rules.routing_strategy || rules.routingStrategy || 'balanced',
          costCeiling: rules.cost_ceiling != null ? String(rules.cost_ceiling) : '',
          providerPreferences: Array.isArray(rules.provider_preferences)
            ? rules.provider_preferences.join(', ')
            : Array.isArray(rules.providerPreferences)
              ? rules.providerPreferences.join(', ')
              : '',
          fallbackLogic: rules.fallback_logic || rules.fallbackLogic || '',
          aiOverridesEnabled: rules.ai_overrides_enabled !== false,
        });
      })
      .catch(() => {
        setGateways([]);
        setRouters([]);
      });
  }, []);

  const save = async () => {
    await apiClient.put('/api/ai/routing-rules', {
      defaultGatewayId: draft.defaultGatewayId || null,
      defaultRouterId: draft.defaultRouterId || null,
      routingStrategy: draft.routingStrategy,
      costCeiling: draft.costCeiling ? Number(draft.costCeiling) : null,
      providerPreferences: draft.providerPreferences
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      fallbackLogic: draft.fallbackLogic || null,
      aiOverridesEnabled: draft.aiOverridesEnabled,
    });
    setStatus('AI routing rules saved.');
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>AI Routing Rules</Typography>
      <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <CardContent>
          <Stack spacing={1.2}>
            <TextField
              select
              size="small"
              label="Default Gateway"
              value={draft.defaultGatewayId}
              onChange={(e) => setDraft((prev) => ({ ...prev, defaultGatewayId: e.target.value }))}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {gateways.map((gateway) => (
                <MenuItem key={gateway.id} value={gateway.id}>{gateway.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Default Router"
              value={draft.defaultRouterId}
              onChange={(e) => setDraft((prev) => ({ ...prev, defaultRouterId: e.target.value }))}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {routers.map((router) => (
                <MenuItem key={router.id} value={router.id}>{router.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Routing Strategy"
              value={draft.routingStrategy}
              onChange={(e) => setDraft((prev) => ({ ...prev, routingStrategy: e.target.value }))}
            >
              {strategies.map((strategy) => (
                <MenuItem key={strategy.value} value={strategy.value}>{strategy.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="Cost Ceiling (optional)"
              value={draft.costCeiling}
              onChange={(e) => setDraft((prev) => ({ ...prev, costCeiling: e.target.value.replace(/[^0-9.]/g, '') }))}
            />

            <TextField
              size="small"
              label="Provider Preferences"
              placeholder="openai, anthropic, databricks"
              value={draft.providerPreferences}
              onChange={(e) => setDraft((prev) => ({ ...prev, providerPreferences: e.target.value }))}
              helperText="Comma-separated provider order preference"
            />

            <TextField
              size="small"
              label="Fallback Logic"
              value={draft.fallbackLogic}
              onChange={(e) => setDraft((prev) => ({ ...prev, fallbackLogic: e.target.value }))}
              multiline
              minRows={2}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch
                checked={draft.aiOverridesEnabled}
                onChange={(e) => setDraft((prev) => ({ ...prev, aiOverridesEnabled: e.target.checked }))}
              />
              <Typography variant="body2">Enable per-object AI overrides</Typography>
            </Box>

            <Button variant="contained" onClick={save} sx={{ textTransform: 'none', width: 'fit-content' }}>
              Save
            </Button>
          </Stack>
          {status && <Alert severity="success" sx={{ mt: 1.5 }}>{status}</Alert>}
          <Alert severity="info" sx={{ mt: 1.5 }}>
            Object-level AI routing has been moved out of Object Inventory and governed here.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AiRoutingRulesPage;
