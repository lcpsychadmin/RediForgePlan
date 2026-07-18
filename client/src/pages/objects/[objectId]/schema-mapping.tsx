import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import ObjectSubObjectSelector from '../../../components/objects/ObjectSubObjectSelector';
import useObjectSubObjectSelection from '../../../components/objects/useObjectSubObjectSelection';
import apiClient from '../../../api/client';
import DataDefinitionAiProposalModal from '../../../components/objects/DataDefinitionAiProposalModal';
import type { AiDataDefinitionProposalField } from '../../../types/dataDefinitions';

type ViewTab = 'schema' | 'mapping';

const ObjectSchemaMappingPage: React.FC = () => {
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
  const [viewTab, setViewTab] = React.useState<ViewTab>('schema');
  const [isGeneratingAiFields, setIsGeneratingAiFields] = React.useState(false);
  const [isSavingAiFields, setIsSavingAiFields] = React.useState(false);
  const [aiProposalOpen, setAiProposalOpen] = React.useState(false);
  const [aiProposalFields, setAiProposalFields] = React.useState<AiDataDefinitionProposalField[]>([]);

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

  const getFieldMetadata = (field: any) => (
    field?.field_metadata && typeof field.field_metadata === 'object' ? field.field_metadata : {}
  );

  const getApplicationTableValue = (field: any): string => {
    const metadataApplicationTable = String(
      field?.field_metadata?.application?.table || field?.field_metadata?.applicationTable || ''
    ).trim();
    if (metadataApplicationTable) return metadataApplicationTable;

    const rawTableName = String(field?.table_name || '').trim();
    const appName = String(selectedDefinition?.application_name || '').trim();
    if (!rawTableName) return '';

    if (appName && rawTableName.toLowerCase() === appName.toLowerCase()) {
      return '';
    }

    return rawTableName;
  };

  const resolveFieldSource = (field: any): 'application' | 'databricks' => {
    const sourceType = String(field?.field_metadata?.sourceType || '').toLowerCase();
    if (sourceType === 'databricks' || field?.field_metadata?.metadataSync) return 'databricks';
    return 'application';
  };

  const applicationFields = dataDefFields.filter((field: any) => resolveFieldSource(field) === 'application');

  const objectTableRows = React.useMemo(() => {
    const grouped = new Map<string, { table: string; tableName: string; fieldCount: number }>();
    applicationFields.forEach((field: any) => {
      const table = getApplicationTableValue(field);
      const tableName = String(field?.table_name || '').trim();
      const key = `${table.toLowerCase()}::${tableName.toLowerCase()}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.fieldCount += 1;
      } else {
        grouped.set(key, { table, tableName, fieldCount: 1 });
      }
    });
    return Array.from(grouped.values()).sort((a, b) => `${a.table}|${a.tableName}`.localeCompare(`${b.table}|${b.tableName}`));
  }, [applicationFields]);

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

  const handleGenerateAiFields = async () => {
    if (!selectedDataDefId || (hasSubObjects && !selectedSubObjectId)) {
      setStatus(hasSubObjects
        ? 'Select a sub-object and linked application before generating AI fields.'
        : 'Select a linked application before generating AI fields.');
      return;
    }

    setIsGeneratingAiFields(true);
    try {
      const response = await apiClient.post(
        `/api/applications/data-definitions/${selectedDataDefId}/ai-generate-fields`,
        {},
        { timeout: 120000 }
      );
      const payload = response.data?.data || {};
      setAiProposalFields(Array.isArray(payload.proposals) ? payload.proposals : []);
      setAiProposalOpen(true);
    } catch (error: any) {
      setStatus(
        error?.response?.data?.error
        || error?.response?.data?.message
        || error?.message
        || 'Failed to generate AI data definition fields.'
      );
    } finally {
      setIsGeneratingAiFields(false);
    }
  };

  const handleAcceptAiFields = async (acceptedFields: AiDataDefinitionProposalField[]) => {
    if (!selectedDataDefId || acceptedFields.length === 0) return;

    setIsSavingAiFields(true);
    try {
      const existingKey = new Set(
        applicationFields.map((field: any) => `${String(field.field_name || '').trim().toLowerCase()}::${String(getApplicationTableValue(field) || '').trim().toLowerCase()}`)
      );

      for (const field of acceptedFields) {
        const applicationTableName = String(field.tableName || field.table || '').trim();
        const dedupeKey = `${String(field.fieldName || '').trim().toLowerCase()}::${applicationTableName.toLowerCase()}`;
        if (existingKey.has(dedupeKey)) {
          continue;
        }

        await apiClient.post(`/api/applications/data-definitions/${selectedDataDefId}/fields`, {
          tableName: applicationTableName,
          fieldName: field.fieldName,
          fieldLabel: field.fieldLabel,
          dataType: field.dataType,
          length: field.length,
          decimals: field.decimals,
          description: field.description,
          fieldMetadata: {
            ...getFieldMetadata(field),
            application: {
              table: applicationTableName,
            },
          },
        });
      }

      await loadSelectedFields(selectedDataDefId);
      setAiProposalOpen(false);
      setStatusSeverity('success');
      setStatus('Application fields accepted and saved.');
    } catch (error: any) {
      setStatusSeverity('error');
      setStatus(error?.response?.data?.message || 'Failed to accept AI fields.');
    } finally {
      setIsSavingAiFields(false);
    }
  };

  const selectedDefinition = linked.find((row: any) => row.id === selectedDataDefId) || null;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader
          objectId={objectId}
          title="Schema & Mapping"
          breadcrumbLabel="Schema & Mapping"
        />

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Layer 3: Schema & Mapping
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Manage application schema and map application fields to this object.
            </Typography>

            {isLoadingSubObjects ? (
              <Typography variant="body2" color="text.secondary">Loading sub-objects...</Typography>
            ) : hasSubObjects ? (
              <ObjectSubObjectSelector
                subObjects={subObjects}
                selectedSubObjectId={selectedSubObjectId}
                onChange={setSelectedSubObjectId}
                helperText="Schema and mapping are scoped by selected sub-object."
              />
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>This object has no sub-objects. Schema and mapping are at object-level.</Alert>
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2, mb: 1.2 }}>
              <TextField
                select
                size="small"
                label="Assigned Application"
                value={selectedDataDefId}
                onChange={(e) => setSelectedDataDefId(e.target.value)}
                sx={{ minWidth: 280 }}
              >
                {linked.map((row) => (
                  <MenuItem key={row.id} value={row.id}>{row.applicationName || row.application_name}</MenuItem>
                ))}
              </TextField>
            </Stack>

            {/* Tabs for Schema vs Mapping */}
            <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.12)', mb: 2 }}>
              <Tabs value={viewTab} onChange={(_e, tab) => setViewTab(tab)}>
                <Tab label="Schema" value="schema" />
                <Tab label="Mapping" value="mapping" />
              </Tabs>
            </Box>

            {/* Schema Tab */}
            {viewTab === 'schema' && selectedDefinition && (
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Pull application tables and fields from Databricks or manage in Application settings.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    select
                    size="small"
                    label="Catalog"
                    value={metadataDraft.catalog}
                    onChange={(e) => {
                      setMetadataBySubObject((prev) => ({
                        ...prev,
                        [selectedSubObjectId]: { ...metadataDraft, catalog: e.target.value },
                      }));
                      loadMetadataSchemas(e.target.value);
                    }}
                    sx={{ minWidth: 180 }}
                  >
                    {catalogs.map((cat) => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Schema"
                    value={metadataDraft.schema}
                    onChange={(e) => {
                      setMetadataBySubObject((prev) => ({
                        ...prev,
                        [selectedSubObjectId]: { ...metadataDraft, schema: e.target.value },
                      }));
                      loadMetadataTables(metadataDraft.catalog, e.target.value);
                    }}
                    sx={{ minWidth: 180 }}
                  >
                    {schemas.map((sch) => (
                      <MenuItem key={sch} value={sch}>{sch}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Table"
                    value={metadataDraft.table}
                    onChange={(e) => {
                      setMetadataBySubObject((prev) => ({
                        ...prev,
                        [selectedSubObjectId]: { ...metadataDraft, table: e.target.value },
                      }));
                    }}
                    sx={{ minWidth: 180 }}
                  >
                    {tables.map((tbl) => (
                      <MenuItem key={tbl} value={tbl}>{tbl}</MenuItem>
                    ))}
                  </TextField>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleMetadataSync}
                    disabled={isSyncingMetadata}
                    sx={{ textTransform: 'none' }}
                  >
                    {isSyncingMetadata ? 'Syncing...' : 'Sync Schema'}
                  </Button>
                </Stack>

                <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 0.8fr 0.8fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    {['Field Name', 'Label', 'Table', 'Data Type', 'Length', 'Key', 'Required'].map((header) => (
                      <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                    ))}
                  </Box>
                  {dataDefFields.length === 0 ? (
                    <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No schema fields loaded for this scope.</Typography></Box>
                  ) : dataDefFields.map((field) => (
                    <Box key={field.id} sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 0.8fr 0.8fr', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <Box sx={{ px: 1, py: 0.8 }}>{field.field_name}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary', fontSize: '0.9rem' }}>{field.field_label || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary', fontSize: '0.9rem' }}>{field.table_name || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary', fontSize: '0.9rem' }}>{field.data_type || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary', fontSize: '0.9rem' }}>{field.length || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8, fontSize: '0.9rem' }}>{field.is_key ? '✓' : '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8, fontSize: '0.9rem' }}>{field.is_required ? '✓' : '-'}</Box>
                    </Box>
                  ))}
                </Box>
              </Stack>
            )}

            {/* Mapping Tab */}
            {viewTab === 'mapping' && selectedDefinition && (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={handleGenerateAiFields}
                    disabled={isGeneratingAiFields}
                    sx={{ textTransform: 'none' }}
                  >
                    {isGeneratingAiFields ? 'Generating...' : 'Generate Field Mapping (AI)'}
                  </Button>
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  Object table mapping: {objectTableRows.length} table(s), {applicationFields.length} field(s)
                </Typography>

                <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr 1fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    {['Application Table', 'Table Name', 'Fields', 'Source'].map((header) => (
                      <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                    ))}
                  </Box>
                  {objectTableRows.length === 0 ? (
                    <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No application fields mapped yet.</Typography></Box>
                  ) : objectTableRows.map((row, idx) => (
                    <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr 1fr', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <Box sx={{ px: 1, py: 0.8, fontWeight: 600 }}>{row.table || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.tableName}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.fieldCount} field(s)</Box>
                      <Box sx={{ px: 1, py: 0.8, fontSize: '0.9rem' }}>Application</Box>
                    </Box>
                  ))}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Active application scope: {selectedDefinition?.applicationName || selectedDefinition?.application_name}
                </Typography>
              </Stack>
            )}

            {status && <Alert severity={statusSeverity} sx={{ mt: 2 }}>{status}</Alert>}

            {aiProposalOpen && (
              <DataDefinitionAiProposalModal
                open={aiProposalOpen}
                onClose={() => setAiProposalOpen(false)}
                proposals={aiProposalFields}
                isLoading={isSavingAiFields}
                onAccept={handleAcceptAiFields}
              />
            )}
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
};

export default ObjectSchemaMappingPage;
