import React from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import apiClient from '../../../api/client';

const DEFAULT_PROCESS_AREAS = ['A2R', 'CTRM', 'GTS', 'H2R', 'I2L', 'MDM', 'P2C', 'P2D', 'PSS', 'R2R', 'S2P', 'TM'];

function loadProcessAreaOptions(): string[] {
  try {
    const raw = localStorage.getItem('rf-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      const vals = parsed?.picklistValues?.processArea;
      if (Array.isArray(vals) && vals.length > 0) return vals;
    }
  } catch {
    // ignore
  }
  return DEFAULT_PROCESS_AREAS;
}

const ObjectIndexPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const navigate = useNavigate();
  const [showAiOverrides, setShowAiOverrides] = React.useState(false);
  const [routingEnabledLoaded, setRoutingEnabledLoaded] = React.useState(false);
  const [objectDraft, setObjectDraft] = React.useState({ objectId: '', description: '', processArea: '' });
  const [isLoadingObject, setIsLoadingObject] = React.useState(true);
  const [isSavingObject, setIsSavingObject] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState('');
  const [saveError, setSaveError] = React.useState('');
  const processAreaOptions = React.useMemo(() => loadProcessAreaOptions(), []);

  React.useEffect(() => {
    let active = true;
    apiClient.get('/api/ai/routing-rules')
      .then((res) => {
        if (!active) return;
        setShowAiOverrides(res.data?.data?.ai_overrides_enabled !== false);
      })
      .catch(() => {
        if (!active) return;
        setShowAiOverrides(false);
      })
      .finally(() => {
        if (active) setRoutingEnabledLoaded(true);
      });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    let active = true;
    setIsLoadingObject(true);
    apiClient.get(`/api/global-objects/${objectId}`)
      .then((res) => {
        if (!active) return;
        const row = res.data?.data || {};
        setObjectDraft({
          objectId: row.objectId || row.object_id || '',
          description: row.description || '',
          processArea: row.processArea || row.process_area || '',
        });
      })
      .catch(() => {
        if (!active) return;
        setObjectDraft({ objectId: '', description: '', processArea: '' });
      })
      .finally(() => {
        if (active) setIsLoadingObject(false);
      });

    return () => {
      active = false;
    };
  }, [objectId]);

  const handleSaveOverview = async () => {
    setSaveStatus('');
    setSaveError('');

    const payload = {
      objectId: objectDraft.objectId.trim(),
      description: objectDraft.description.trim(),
      processArea: objectDraft.processArea.trim(),
    };

    if (!payload.objectId) {
      setSaveError('Object ID is required.');
      return;
    }

    setIsSavingObject(true);
    try {
      await apiClient.patch(`/api/global-objects/${objectId}`, payload);
      setSaveStatus('Overview details saved.');
    } catch (error: any) {
      setSaveError(error?.response?.data?.message || 'Failed to save overview details.');
    } finally {
      setIsSavingObject(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader
          objectId={objectId}
          title="Object Workspace"
          showAiOverrides={showAiOverrides}
        />

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Overview</Typography>

            {isLoadingObject ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Loading object details...
              </Typography>
            ) : (
              <Stack spacing={2} sx={{ mt: 1.2, maxWidth: 600 }}>
                <TextField
                  label="Object ID"
                  size="small"
                  fullWidth
                  value={objectDraft.objectId}
                  onChange={(e) => setObjectDraft((d) => ({ ...d, objectId: e.target.value }))}
                />
                <TextField
                  label="Description"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  value={objectDraft.description}
                  onChange={(e) => setObjectDraft((d) => ({ ...d, description: e.target.value }))}
                />
                <TextField
                  label="Process Area"
                  size="small"
                  fullWidth
                  select
                  value={objectDraft.processArea}
                  onChange={(e) => setObjectDraft((d) => ({ ...d, processArea: e.target.value }))}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {processAreaOptions.map((area) => (
                    <MenuItem key={area} value={area}>{area}</MenuItem>
                  ))}
                </TextField>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ textTransform: 'none' }}
                    onClick={handleSaveOverview}
                    disabled={isSavingObject}
                  >
                    {isSavingObject ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ textTransform: 'none' }}
                    onClick={() => navigate(`/objects/${objectId}/application-assignment`)}
                  >
                    Assign Applications
                  </Button>
                </Box>
              </Stack>
            )}

            {saveStatus && (
              <Alert severity="success" sx={{ mt: 2 }}>{saveStatus}</Alert>
            )}
            {saveError && (
              <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>
            )}
            {routingEnabledLoaded && !showAiOverrides && (
              <Alert severity="info" sx={{ mt: 2 }}>
                AI Overrides are hidden because global AI routing overrides are currently disabled.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
};

export default ObjectIndexPage;
