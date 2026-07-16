import React from 'react';
import { Alert, Box, Card, CardContent, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import ObjectSubObjectSelector from '../../../components/objects/ObjectSubObjectSelector';
import useObjectSubObjectSelection from '../../../components/objects/useObjectSubObjectSelection';

const ObjectMetadataPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const {
    subObjects,
    selectedSubObject,
    selectedSubObjectId,
    setSelectedSubObjectId,
    isLoading,
  } = useObjectSubObjectSelection(objectId);

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Metadata" breadcrumbLabel="Metadata" />

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1.2 }}>Metadata Sync Scope</Typography>

            {isLoading ? (
              <Typography color="text.secondary" variant="body2">Loading sub-objects...</Typography>
            ) : subObjects.length === 0 ? (
              <Alert severity="info">Create a sub-object before running metadata sync.</Alert>
            ) : (
              <>
                <ObjectSubObjectSelector
                  subObjects={subObjects}
                  selectedSubObjectId={selectedSubObjectId}
                  onChange={setSelectedSubObjectId}
                  helperText="Metadata sync is scoped to the selected sub-object."
                />
                <Alert severity="info" sx={{ mt: 1 }}>
                  {selectedSubObject
                    ? `Selected sub-object: ${selectedSubObject.name}. Use the Applications tab to run Databricks metadata sync for this sub-object.`
                    : 'Select a sub-object to view metadata scope.'}
                </Alert>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
};

export default ObjectMetadataPage;