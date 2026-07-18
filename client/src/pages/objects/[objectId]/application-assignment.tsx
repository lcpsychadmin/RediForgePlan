import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import ObjectSubObjectSelector from '../../../components/objects/ObjectSubObjectSelector';
import useObjectSubObjectSelection from '../../../components/objects/useObjectSubObjectSelection';
import apiClient from '../../../api/client';

const ObjectApplicationAssignmentPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [apps, setApps] = React.useState<any[]>([]);
  const [linked, setLinked] = React.useState<any[]>([]);
  const [linkAppId, setLinkAppId] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [statusSeverity, setStatusSeverity] = React.useState<'success' | 'error' | 'info'>('info');

  const {
    subObjects,
    hasSubObjects,
    selectedSubObject,
    selectedSubObjectId,
    setSelectedSubObjectId,
    isLoading: isLoadingSubObjects,
  } = useObjectSubObjectSelection(objectId);

  const scopeSubObjectId = hasSubObjects ? selectedSubObjectId : '';

  const load = React.useCallback(async () => {
    if (hasSubObjects && !scopeSubObjectId) {
      setLinked([]);
      return;
    }

    const [appsRes, linkedRes] = await Promise.all([
      apiClient.get('/api/applications'),
      apiClient.get(`/api/applications/data-definitions/object/${objectId}`, {
        params: { subObjectId: scopeSubObjectId },
      }),
    ]);

    setApps(appsRes.data?.data || []);
    setLinked(linkedRes.data?.data || []);
  }, [hasSubObjects, objectId, scopeSubObjectId]);

  React.useEffect(() => {
    load().catch(() => {
      setApps([]);
      setLinked([]);
    });
  }, [load]);

  const handleLink = async () => {
    if (!linkAppId) return;

    try {
      await apiClient.post('/api/applications/data-definitions', {
        globalObjectId: objectId,
        applicationId: linkAppId,
        subObjectId: hasSubObjects ? selectedSubObjectId : null,
      });
      setLinkAppId('');
      setStatusSeverity('success');
      setStatus('Application assigned to object scope.');
      await load();
    } catch {
      setStatusSeverity('error');
      setStatus('Failed to assign application.');
    }
  };

  const handleUnlink = async (definitionId: string) => {
    try {
      await apiClient.delete(`/api/applications/data-definitions/${definitionId}`);
      setStatusSeverity('success');
      setStatus('Application unassigned from object scope.');
      await load();
    } catch {
      setStatusSeverity('error');
      setStatus('Failed to unassign application.');
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader
          objectId={objectId}
          title="Application Assignment"
          breadcrumbLabel="Application Assignment"
        />

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Layer 2: Application Assignment
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Assign which applications contain this object scope. Schema and mapping are handled in separate layers.
            </Typography>

            {isLoadingSubObjects ? (
              <Typography variant="body2" color="text.secondary">Loading sub-objects...</Typography>
            ) : hasSubObjects ? (
              <ObjectSubObjectSelector
                subObjects={subObjects}
                selectedSubObjectId={selectedSubObjectId}
                onChange={setSelectedSubObjectId}
                helperText="Assignments are scoped by selected sub-object."
              />
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                This object has no sub-objects. Assignments apply at object level.
              </Alert>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2, mb: 2 }}>
              <TextField
                select
                size="small"
                label="Application"
                value={linkAppId}
                onChange={(e) => setLinkAppId(e.target.value)}
                sx={{ minWidth: 280 }}
              >
                {apps.map((app) => (
                  <MenuItem key={app.id} value={app.id}>{app.name}</MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                sx={{ textTransform: 'none' }}
                onClick={handleLink}
                disabled={!linkAppId}
              >
                Assign Application
              </Button>
            </Stack>

            <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {['Application', 'Vendor', 'Version', 'Actions'].map((header) => (
                  <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                ))}
              </Box>
              {linked.length === 0 ? (
                <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No applications assigned to this scope.</Typography></Box>
              ) : linked.map((row) => (
                <Box key={row.id} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Box sx={{ px: 1, py: 0.8, fontWeight: 600 }}>{row.applicationName || row.application_name}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.vendor || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.version || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>
                    <Button size="small" color="error" sx={{ textTransform: 'none' }} onClick={() => handleUnlink(row.id)}>
                      Unassign
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>

            {status && <Alert severity={statusSeverity} sx={{ mt: 2 }}>{status}</Alert>}
            {hasSubObjects && selectedSubObject && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                Active sub-object scope: {selectedSubObject.name}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
};

export default ObjectApplicationAssignmentPage;
