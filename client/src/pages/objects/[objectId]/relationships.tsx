import React from 'react';
import { Alert, Box, Card, CardContent, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import ObjectSubObjectSelector from '../../../components/objects/ObjectSubObjectSelector';
import useObjectSubObjectSelection from '../../../components/objects/useObjectSubObjectSelection';
import apiClient from '../../../api/client';

const ObjectRelationshipsPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const {
    subObjects,
    hasSubObjects,
    selectedSubObject,
    selectedSubObjectId,
    setSelectedSubObjectId,
    isLoading: isLoadingSubObjects,
  } = useObjectSubObjectSelection(objectId);
  const [relationships, setRelationships] = React.useState<any[]>([]);
  const scopeSubObjectId = hasSubObjects ? selectedSubObjectId : '';

  React.useEffect(() => {
    if (hasSubObjects && !scopeSubObjectId) {
      setRelationships([]);
      return;
    }

    apiClient.get(`/api/cdm/${objectId}`, { params: { subObjectId: scopeSubObjectId } })
      .then((res) => {
        setRelationships(res.data?.data?.relationships || []);
      })
      .catch(() => setRelationships([]));
  }, [hasSubObjects, objectId, scopeSubObjectId]);

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Object Relationships" />

        {isLoadingSubObjects ? (
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>Loading sub-objects...</Typography>
        ) : !hasSubObjects ? (
          <Alert severity="info" sx={{ mb: 2 }}>This object has no sub-objects. Relationships are shown at object root scope.</Alert>
        ) : subObjects.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>Create sub-objects on the Sub Objects tab before defining relationships.</Alert>
        ) : (
          <ObjectSubObjectSelector
            subObjects={subObjects}
            selectedSubObjectId={selectedSubObjectId}
            onChange={setSelectedSubObjectId}
            helperText={selectedSubObject ? `Viewing relationships for sub-object: ${selectedSubObject.name}` : 'Select a sub-object to view relationships.'}
          />
        )}

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
