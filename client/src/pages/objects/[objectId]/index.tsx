import React from 'react';
import { Alert, Box, Card, CardContent, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import apiClient from '../../../api/client';

const ObjectIndexPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [showAiOverrides, setShowAiOverrides] = React.useState(false);
  const [routingEnabledLoaded, setRoutingEnabledLoaded] = React.useState(false);

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
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Object ID: {objectId}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Use the tabs above to manage applications, data model attributes, relationships, metadata, and optional AI overrides.
            </Typography>
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
