import React from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import apiClient from '../../../api/client';

const defaultAttribute = {
  name: '',
  description: '',
  dataType: '',
  length: '',
  businessRules: '',
};

const ObjectCdmPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [attributes, setAttributes] = React.useState<any[]>([]);
  const [relationships, setRelationships] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState(defaultAttribute);
  const [saveStatus, setSaveStatus] = React.useState('');

  const load = React.useCallback(async () => {
    const res = await apiClient.get(`/api/common-data-model/object/${objectId}`);
    const payload = res.data?.data || {};
    setAttributes(payload.attributes || []);
    setRelationships(payload.relationships || []);
  }, [objectId]);

  React.useEffect(() => {
    load().catch(() => {
      setAttributes([]);
      setRelationships([]);
    });
  }, [load]);

  const save = async () => {
    const updatedAttributes = [
      ...attributes,
      {
        id: `local-${Date.now()}`,
        attributeName: draft.name,
        description: draft.description,
        dataType: draft.dataType,
        length: draft.length ? Number(draft.length) : null,
        businessRules: draft.businessRules,
      },
    ];

    await apiClient.put(`/api/common-data-model/object/${objectId}`, {
      model: { objectName: objectId },
      attributes: updatedAttributes,
      relationships,
    });

    setDraft(defaultAttribute);
    setSaveStatus('Attribute saved.');
    await load();
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Common Data Model" />

        <Stack spacing={2}>
          <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Add Attribute</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1.6fr 1fr 0.7fr' }, gap: 1 }}>
                <TextField label="Attribute Name" size="small" value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
                <TextField label="Description" size="small" value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} />
                <TextField label="Data Type" size="small" value={draft.dataType} onChange={(e) => setDraft((prev) => ({ ...prev, dataType: e.target.value }))} />
                <TextField label="Length" size="small" value={draft.length} onChange={(e) => setDraft((prev) => ({ ...prev, length: e.target.value.replace(/[^0-9]/g, '') }))} />
              </Box>
              <TextField
                sx={{ mt: 1, width: '100%' }}
                label="Business Rules"
                size="small"
                multiline
                minRows={2}
                value={draft.businessRules}
                onChange={(e) => setDraft((prev) => ({ ...prev, businessRules: e.target.value }))}
              />
              <Button sx={{ mt: 1.2, textTransform: 'none' }} variant="contained" onClick={save} disabled={!draft.name.trim()}>
                Save Attribute
              </Button>
              {saveStatus && <Alert severity="success" sx={{ mt: 1 }}>{saveStatus}</Alert>}
            </CardContent>
          </Card>

          <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Attributes</Typography>
              <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr 0.7fr 1.4fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  {['Attribute Name', 'Description', 'Data Type', 'Length', 'Business Rules'].map((header) => (
                    <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                  ))}
                </Box>
                {attributes.length === 0 ? (
                  <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No attributes defined.</Typography></Box>
                ) : attributes.map((row) => (
                  <Box key={row.id} sx={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr 0.7fr 1.4fr', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ px: 1, py: 0.8 }}>{row.attributeName || row.name || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.description || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8 }}>{row.dataType || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8 }}>{row.length ?? '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.businessRules || '-'}</Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Relationships</Typography>
              {relationships.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No relationships defined.</Typography>
              ) : (
                relationships.map((rel) => (
                  <Typography key={rel.id} variant="body2" sx={{ mb: 0.5 }}>
                    {rel.sourceEntity || rel.sourceAttribute || 'Unknown source'} {'->'} {rel.targetEntity || rel.targetAttribute || 'Unknown target'} ({rel.relationshipType || 'related'})
                  </Typography>
                ))
              )}
              <Alert severity="info" sx={{ mt: 1.5 }}>
                Labels on this page intentionally use Attribute and Relationships terminology instead of CDM-prefixed fields.
              </Alert>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Layout>
  );
};

export default ObjectCdmPage;
