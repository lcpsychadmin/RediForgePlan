import React from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import ObjectSubObjectSelector from '../../../components/objects/ObjectSubObjectSelector';
import useObjectSubObjectSelection from '../../../components/objects/useObjectSubObjectSelection';
import apiClient from '../../../api/client';

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

  const {
    subObjects,
    hasSubObjects,
    selectedSubObject,
    selectedSubObjectId,
    setSelectedSubObjectId,
    isLoading: isLoadingSubObjects,
  } = useObjectSubObjectSelection(objectId);

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
              <Stack spacing={2} sx={{ mt: 1.2, maxWidth: 900 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.2 }}>
                  <Box sx={{ p: 1.25, borderRadius: 1, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Object Definition
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{objectDraft.objectId || '-'}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>{objectDraft.description || 'No description provided.'}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.8 }}>
                      Process Area: {objectDraft.processArea || '-'}
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1.25, borderRadius: 1, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Sub-Object Definitions
                    </Typography>

                    {isLoadingSubObjects ? (
                      <Typography variant="body2" color="text.secondary">Loading sub-objects...</Typography>
                    ) : hasSubObjects ? (
                      <>
                        <ObjectSubObjectSelector
                          subObjects={subObjects}
                          selectedSubObjectId={selectedSubObjectId}
                          onChange={setSelectedSubObjectId}
                          helperText="Use Sub Objects tab to create or edit definitions."
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.8 }}>
                          Selected definition: {selectedSubObject?.name || '-'}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No sub-object definitions yet.</Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ textTransform: 'none' }}
                    onClick={handleSaveOverview}
                    disabled={isSavingObject}
                  >
                    {isSavingObject ? 'Saving...' : 'Save Definitions'}
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
