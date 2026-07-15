import React from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectPageTabs from '../../../components/objects/ObjectPageTabs';
import apiClient from '../../../api/client';

const ObjectMetadataPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [dataDefinitions, setDataDefinitions] = React.useState<any[]>([]);
  const [selectedDefId, setSelectedDefId] = React.useState('');
  const [catalogs, setCatalogs] = React.useState<string[]>([]);
  const [schemas, setSchemas] = React.useState<string[]>([]);
  const [tables, setTables] = React.useState<string[]>([]);
  const [draft, setDraft] = React.useState({ catalog: '', schema: '', table: '' });
  const [status, setStatus] = React.useState('');

  React.useEffect(() => {
    apiClient.get(`/api/applications/data-definitions/object/${objectId}`)
      .then((res) => {
        const defs = res.data?.data || [];
        setDataDefinitions(defs);
        if (defs.length > 0) setSelectedDefId(defs[0].id);
      })
      .catch(() => {
        setDataDefinitions([]);
        setSelectedDefId('');
      });
  }, [objectId]);

  React.useEffect(() => {
    apiClient.get('/api/settings/databricks/catalogs')
      .then((res) => setCatalogs(res.data?.data?.catalogs || []))
      .catch(() => setCatalogs([]));
  }, []);

  const loadSchemas = async (catalog: string) => {
    const res = await apiClient.get('/api/settings/databricks/schemas', { params: { catalog } });
    setSchemas(res.data?.data?.schemas || []);
  };

  const loadTables = async (catalog: string, schema: string) => {
    const res = await apiClient.get('/api/settings/databricks/tables', { params: { catalog, schema } });
    setTables(res.data?.data?.tables || []);
  };

  const sync = async () => {
    if (!selectedDefId) return;
    await apiClient.post(`/api/applications/data-definitions/${selectedDefId}/sync-metadata`, draft);
    setStatus('Metadata sync completed.');
  };

  return (
    <Layout>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Object Metadata</Typography>
        <ObjectPageTabs objectId={objectId} />

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Databricks Metadata Sync</Typography>
            <Stack spacing={1.2}>
              <TextField
                select
                size="small"
                label="Application Data Definition"
                value={selectedDefId}
                onChange={(e) => setSelectedDefId(e.target.value)}
              >
                {dataDefinitions.map((dd) => (
                  <MenuItem key={dd.id} value={dd.id}>{dd.application_name}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Catalog"
                value={draft.catalog}
                onChange={async (e) => {
                  const catalog = e.target.value;
                  setDraft({ catalog, schema: '', table: '' });
                  setTables([]);
                  await loadSchemas(catalog);
                }}
              >
                {catalogs.map((catalog) => (
                  <MenuItem key={catalog} value={catalog}>{catalog}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Schema"
                value={draft.schema}
                onChange={async (e) => {
                  const schema = e.target.value;
                  setDraft((prev) => ({ ...prev, schema, table: '' }));
                  await loadTables(draft.catalog, schema);
                }}
              >
                {schemas.map((schema) => (
                  <MenuItem key={schema} value={schema}>{schema}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Table"
                value={draft.table}
                onChange={(e) => setDraft((prev) => ({ ...prev, table: e.target.value }))}
              >
                {tables.map((table) => (
                  <MenuItem key={table} value={table}>{table}</MenuItem>
                ))}
              </TextField>
              <Button variant="contained" onClick={sync} sx={{ textTransform: 'none', width: 'fit-content' }}>
                Pull Metadata from Databricks
              </Button>
            </Stack>

            <Alert severity="info" sx={{ mt: 2 }}>
              Metadata sync is now page-based and no longer launched from modal object editing.
            </Alert>
            {status && <Alert severity="success" sx={{ mt: 1 }}>{status}</Alert>}
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
};

export default ObjectMetadataPage;
