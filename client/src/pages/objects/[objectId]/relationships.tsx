import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import apiClient from '../../../api/client';

const ObjectRelationshipsPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [relationships, setRelationships] = React.useState<any[]>([]);

  React.useEffect(() => {
    apiClient.get(`/api/cdm/${objectId}`)
      .then((res) => {
        setRelationships(res.data?.data?.relationships || []);
      })
      .catch(() => setRelationships([]));
  }, [objectId]);

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Object Relationships" />

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Relationships</Typography>
            {relationships.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No relationships configured.</Typography>
            ) : relationships.map((rel) => (
              <Box key={rel.id} sx={{ py: 0.8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {rel.source_attribute_name || rel.sourceAttributeName || 'Unknown source'} {'->'} {rel.target_object_name || rel.targetObjectName || 'Unknown target'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {rel.relationship_type || rel.relationshipType || 'related'}
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
