import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectPageTabs from '../../../components/objects/ObjectPageTabs';
import apiClient from '../../../api/client';

const ObjectRelationshipsPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [relationships, setRelationships] = React.useState<any[]>([]);

  React.useEffect(() => {
    apiClient.get(`/api/common-data-model/object/${objectId}`)
      .then((res) => {
        setRelationships(res.data?.data?.relationships || []);
      })
      .catch(() => setRelationships([]));
  }, [objectId]);

  return (
    <Layout>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Object Relationships</Typography>
        <ObjectPageTabs objectId={objectId} />

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Relationships</Typography>
            {relationships.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No relationships configured.</Typography>
            ) : relationships.map((rel) => (
              <Box key={rel.id} sx={{ py: 0.8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {rel.sourceEntity || rel.sourceAttribute || 'Unknown source'} -> {rel.targetEntity || rel.targetAttribute || 'Unknown target'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {rel.relationshipType || 'related'}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
};

export default ObjectRelationshipsPage;
