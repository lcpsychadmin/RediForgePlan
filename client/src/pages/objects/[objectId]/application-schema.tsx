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

const ObjectApplicationSchemaPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [linked, setLinked] = React.useState<any[]>([]);
  const [selectedDataDefId, setSelectedDataDefId] = React.useState('');
  const [dataDefFields, setDataDefFields] = React.useState<any[]>([]);
  const [catalogs, setCatalogs] = React.useState<string[]>([]);
  const [schemas, setSchemas] = React.useState<string[]>([]);
  const [tables, setTables] = React.useState<string[]>([]);
  const [metadataBySubObject, setMetadataBySubObject] = React.useState<Record<string, { catalog: string; schema: string; table: string }>>({});
  const [isSyncingMetadata, setIsSyncingMetadata] = React.useState(false);
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
  const metadataDraft = metadataBySubObject[selectedSubObjectId] || { catalog: '', schema: '', table: '' };

  const resolveSource = (field: any): string => {
    const sourceType = String(field?.field_metadata?.sourceType || '').toLowerCase();
    if (sourceType === 'databricks' || field?.field_metadata?.metadataSync) return 'Databricks';
    if (sourceType) return sourceType;
    return 'Application';
  };

  const loadLinkedDefinitions = React.useCallback(async () => {
    if (hasSubObjects && !scopeSubObjectId) {
      setLinked([]);
      setSelectedDataDefId('');
      setDataDefFields([]);
      return;
    }

    const linkedRes = await apiClient.get(`/api/applications/data-definitions/object/${objectId}`, {
      params: { subObjectId: scopeSubObjectId },
    });

    const linkedPayload = linkedRes.data?.data || [];
    setLinked(linkedPayload);

    setSelectedDataDefId((prev) => {
      const next = prev && linkedPayload.some((row: any) => row.id === prev) ? prev : (linkedPayload[0]?.id || '');
      return next;
    });
  }, [hasSubObjects, objectId, scopeSubObjectId]);

  const loadSelectedFields = React.useCallback(async (definitionId: string) => {
    if (!definitionId) {
      setDataDefFields([]);
      return;
    }
    const fieldsRes = await apiClient.get(`/api/applications/data-definitions/${definitionId}/fields`);
    setDataDefFields(fieldsRes.data?.data || []);
  }, []);

  const loadMetadataCatalogs = React.useCallback(async () => {
    try {
      const res = await apiClient.get('/api/settings/databricks/catalogs');
      setCatalogs(res.data?.data?.catalogs || []);
    } catch {
      setCatalogs([]);
    }
  }, []);

  const loadMetadataSchemas = async (catalog: string) => {
    if (!catalog) {
      setSchemas([]);
      return;
    }
    try {
      const res = await apiClient.get('/api/settings/databricks/schemas', { params: { catalog } });
      setSchemas(res.data?.data?.schemas || []);
    } catch {
      setSchemas([]);
    }
  };

  const loadMetadataTables = async (catalog: string, schema: string) => {
    if (!catalog || !schema) {
      setTables([]);
      return;
    }
    try {
      const res = await apiClient.get('/api/settings/databricks/tables', { params: { catalog, schema } });
      setTables(res.data?.data?.tables || []);
    } catch {
      setTables([]);
    }
  };

  React.useEffect(() => {
    loadLinkedDefinitions().catch(() => {
      setLinked([]);
      setSelectedDataDefId('');
      setDataDefFields([]);
    });
  }, [loadLinkedDefinitions]);

  React.useEffect(() => {
    loadSelectedFields(selectedDataDefId).catch(() => setDataDefFields([]));
  }, [selectedDataDefId, loadSelectedFields]);

  React.useEffect(() => {
    loadMetadataCatalogs().catch(() => setCatalogs([]));
  }, [loadMetadataCatalogs]);

  const handleMetadataSync = async () => {
    if (!selectedDataDefId || !metadataDraft.catalog || !metadataDraft.schema || !metadataDraft.table) {
      setStatusSeverity('error');
      setStatus('Catalog, schema, and table are required for metadata sync.');
      return;
    }

    setIsSyncingMetadata(true);
    try {
      await apiClient.post(`/api/applications/data-definitions/${selectedDataDefId}/metadata-sync`, {
        catalog: metadataDraft.catalog,
        schema: metadataDraft.schema,
        table: metadataDraft.table,
        subObjectId: hasSubObjects ? selectedSubObjectId : null,
      });

      await loadSelectedFields(selectedDataDefId);
      setStatusSeverity('success');
      setStatus('Application schema pulled from Databricks.');
    } catch {
      setStatusSeverity('error');
      setStatus('Failed to pull schema from Databricks. Check integration settings and retry.');
    } finally {
      setIsSyncingMetadata(false);
    }
  };

  const selectedDefinition = linked.find((row: any) => row.id === selectedDataDefId) || null;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader
          objectId={objectId}
          title="Application Schema"
          breadcrumbLabel="Application Schema"
        />

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Layer 3: Application Schema
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Pull and review source tables and fields from Databricks for the selected assigned application scope.
            </Typography>

            {isLoadingSubObjects ? (
              <Typography variant="body2" color="text.secondary">Loading sub-objects...</Typography>
            ) : hasSubObjects ? (
              <ObjectSubObjectSelector
                subObjects={subObjects}
                selectedSubObjectId={selectedSubObjectId}
                onChange={setSelectedSubObjectId}
                helperText="Schema view is scoped by selected sub-object assignment."
              />
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>This object has no sub-objects. Schema scope is object-level.</Alert>
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2, mb: 2 }}>
              <TextField
                select
                size="small"
                label="Assigned Application"
                value={selectedDataDefId}
                onChange={(e) => setSelectedDataDefId(e.target.value)}
                sx={{ minWidth: 280 }}
              >
                {linked.map((row) => (
                  <MenuItem key={row.id} value={row.id}>{row.application_name}</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Catalog"
                value={metadataDraft.catalog}
                onChange={async (e) => {
                  const catalog = e.target.value;
                  setMetadataBySubObject((prev) => ({
                    ...prev,
                    [selectedSubObjectId]: { catalog, schema: '', table: '' },
                  }));
                  setTables([]);
                  await loadMetadataSchemas(catalog);
                }}
                sx={{ minWidth: 170 }}
              >
                {catalogs.map((catalog) => (
                  <MenuItem key={`catalog-${catalog}`} value={catalog}>{catalog}</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Schema"
                value={metadataDraft.schema}
                onChange={async (e) => {
                  const schema = e.target.value;
                  setMetadataBySubObject((prev) => ({
                    ...prev,
                    [selectedSubObjectId]: { ...metadataDraft, schema, table: '' },
                  }));
                  await loadMetadataTables(metadataDraft.catalog, schema);
                }}
                sx={{ minWidth: 170 }}
              >
                {schemas.map((schema) => (
                  <MenuItem key={`schema-${schema}`} value={schema}>{schema}</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Table"
                value={metadataDraft.table}
                onChange={(e) => setMetadataBySubObject((prev) => ({
                  ...prev,
                  [selectedSubObjectId]: { ...metadataDraft, table: e.target.value },
                }))}
                sx={{ minWidth: 180 }}
              >
                {tables.map((table) => (
                  <MenuItem key={`table-${table}`} value={table}>{table}</MenuItem>
                ))}
              </TextField>

              <Button
                variant="outlined"
                size="small"
                onClick={handleMetadataSync}
                disabled={isSyncingMetadata || !selectedDataDefId}
                sx={{ textTransform: 'none', alignSelf: { xs: 'stretch', md: 'center' } }}
              >
                {isSyncingMetadata ? 'Syncing...' : 'Pull Schema'}
              </Button>
            </Stack>

            {selectedDefinition && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.2 }}>
                Active application scope: {selectedDefinition.application_name}
                {selectedSubObject ? ` (${selectedSubObject.name})` : ''}
              </Typography>
            )}

            <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
              <Box sx={{ minWidth: 1200, display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 0.9fr 0.7fr 0.7fr 0.8fr 0.8fr 1fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {['Field Name', 'Label', 'Table', 'Data Type', 'Length', 'Decimals', 'Is Key', 'Required', 'Source'].map((header) => (
                  <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                ))}
              </Box>
              {dataDefFields.length === 0 ? (
                <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No schema fields loaded for this scope.</Typography></Box>
              ) : dataDefFields.map((field: any) => (
                <Box key={field.id} sx={{ minWidth: 1200, display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 0.9fr 0.7fr 0.7fr 0.8fr 0.8fr 1fr', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Box sx={{ px: 1, py: 0.8, fontFamily: 'monospace', fontWeight: 700 }}>{field.field_name || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{field.field_label || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{field.table_name || field?.field_metadata?.table || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>{field.data_type || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>{field.length ?? '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>{field.decimals ?? '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8, textAlign: 'center' }}>{field.is_key ? '●' : '○'}</Box>
                  <Box sx={{ px: 1, py: 0.8, textAlign: 'center' }}>{field.is_required ? '●' : '○'}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{resolveSource(field)}</Box>
                </Box>
              ))}
            </Box>

            {status && <Alert severity={statusSeverity} sx={{ mt: 2 }}>{status}</Alert>}
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
};

export default ObjectApplicationSchemaPage;
