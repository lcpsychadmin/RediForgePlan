import React from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import apiClient from '../../../api/client';

const ObjectApplicationsPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [apps, setApps] = React.useState<any[]>([]);
  const [linked, setLinked] = React.useState<any[]>([]);
  const [linkAppId, setLinkAppId] = React.useState('');
  const [status, setStatus] = React.useState('');

  const load = React.useCallback(async () => {
    const [appsRes, linkedRes] = await Promise.all([
      apiClient.get('/api/applications'),
      apiClient.get(`/api/applications/data-definitions/object/${objectId}`),
    ]);
    setApps(appsRes.data?.data || []);
    setLinked(linkedRes.data?.data || []);
  }, [objectId]);

  React.useEffect(() => {
    load().catch(() => {
      setApps([]);
      setLinked([]);
    });
  }, [load]);

  const handleLink = async () => {
    if (!linkAppId) return;
    await apiClient.post('/api/applications/data-definitions', { globalObjectId: objectId, applicationId: linkAppId });
    setLinkAppId('');
    setStatus('Application linked.');
    await load();
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Object Applications" />

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Applications</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
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
              <Button variant="contained" onClick={handleLink} sx={{ textTransform: 'none' }}>Link Application</Button>
            </Stack>

            <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {['Application', 'Vendor', 'Actions'].map((header) => (
                  <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                ))}
              </Box>
              {linked.length === 0 ? (
                <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No linked applications.</Typography></Box>
              ) : linked.map((row) => (
                <Box key={row.id} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.application_name}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.vendor || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>
                    <Button
                      size="small"
                      color="error"
                      sx={{ textTransform: 'none' }}
                      onClick={async () => {
                        await apiClient.delete(`/api/applications/data-definitions/${row.id}`);
                        await load();
                      }}
                    >
                      Unlink
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              Databricks metadata sync and sub-object/data definition editing are handled on this page flow; no object modal is required.
            </Alert>
            {status && <Alert severity="success" sx={{ mt: 1 }}>{status}</Alert>}
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
};

export default ObjectApplicationsPage;
