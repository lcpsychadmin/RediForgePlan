import React from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectPageTabs from '../../../components/objects/ObjectPageTabs';
import apiClient from '../../../api/client';

const ObjectAiOverridesPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [gateways, setGateways] = React.useState<any[]>([]);
  const [routers, setRouters] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState({ defaultGatewayId: '', defaultRouterId: '', projectLevelOverride: false });
  const [enabled, setEnabled] = React.useState(false);
  const [status, setStatus] = React.useState('');

  React.useEffect(() => {
    let active = true;

    const resolveGlobalObjectId = async () => {
      try {
        await apiClient.get(`/api/ai/object-routing/${objectId}`);
        return objectId;
      } catch {
        const globalRes = await apiClient.get('/api/ai/object-routing/global-object-id-by-code', { params: { objectId } });
        return globalRes.data?.data?.globalObjectId || null;
      }
    };

    Promise.all([
      apiClient.get('/api/ai/object-routing/options'),
      apiClient.get('/api/ai/routing-rules'),
    ])
      .then(async ([optionsRes, rulesRes]) => {
        if (!active) return;
        const rules = rulesRes.data?.data || {};
        const isEnabled = rules.ai_overrides_enabled !== false;
        setEnabled(isEnabled);
        setGateways(optionsRes.data?.data?.gateways || []);
        setRouters(optionsRes.data?.data?.routers || []);

        const globalObjectId = await resolveGlobalObjectId();
        if (globalObjectId) {
          const routingRes = await apiClient.get(`/api/ai/object-routing/${globalObjectId}`);
          const row = routingRes.data?.data || {};
          if (active) {
            setDraft({
              defaultGatewayId: row.defaultGatewayId || '',
              defaultRouterId: row.defaultRouterId || '',
              projectLevelOverride: !!row.projectLevelOverride,
            });
          }
        }
      })
      .catch(() => {
        if (!active) return;
        setGateways([]);
        setRouters([]);
        setEnabled(false);
      });

    return () => { active = false; };
  }, [objectId]);

  const save = async () => {
    let globalObjectId = objectId;
    try {
      await apiClient.get(`/api/ai/object-routing/${objectId}`);
    } catch {
      const globalRes = await apiClient.get('/api/ai/object-routing/global-object-id-by-code', { params: { objectId } });
      globalObjectId = globalRes.data?.data?.globalObjectId;
    }

    if (!globalObjectId) {
      setStatus('Object not found in global catalog.');
      return;
    }

    await apiClient.put('/api/ai/object-routing', {
      globalObjectId,
      defaultGatewayId: draft.defaultGatewayId || null,
      defaultRouterId: draft.defaultRouterId || null,
      projectLevelOverride: draft.projectLevelOverride,
    });

    setStatus('AI overrides saved.');
  };

  return (
    <Layout>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Object AI Overrides</Typography>
        <ObjectPageTabs objectId={objectId} showAiOverrides={enabled} />

        {!enabled ? (
          <Alert severity="info">Global AI overrides are disabled in Settings. Enable them under AI Routing Rules to use this page.</Alert>
        ) : (
          <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Override Settings</Typography>
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

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Switch
                    checked={draft.projectLevelOverride}
                    onChange={(e) => setDraft((prev) => ({ ...prev, projectLevelOverride: e.target.checked }))}
                  />
                  <Typography variant="body2">Allow project-level override</Typography>
                </Box>

                <Button variant="contained" onClick={save} sx={{ textTransform: 'none', width: 'fit-content' }}>
                  Save Overrides
                </Button>
              </Stack>
              {status && <Alert severity="success" sx={{ mt: 1.5 }}>{status}</Alert>}
            </CardContent>
          </Card>
        )}
      </Box>
    </Layout>
  );
};

export default ObjectAiOverridesPage;
