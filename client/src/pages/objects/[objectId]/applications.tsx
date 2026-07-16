import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import ObjectSubObjectSelector from '../../../components/objects/ObjectSubObjectSelector';
import useObjectSubObjectSelection from '../../../components/objects/useObjectSubObjectSelection';
import apiClient from '../../../api/client';
import DataDefinitionAiProposalModal, { type AiDataDefinitionProposalField } from '../../../components/objects/DataDefinitionAiProposalModal';

interface DataDefinitionFieldDraft {
  subObjectId: string;
  sourceType: 'application' | 'databricks' | 'ai';
  tableName: string;
  databricksTable: string;
  databricksField: string;
  fieldName: string;
  fieldLabel: string;
  dataType: string;
  length: string;
  decimals: string;
  isKey: boolean;
  isRequired: boolean;
  description: string;
  businessRules: string;
}

const emptyFieldDraft = (): DataDefinitionFieldDraft => ({
  subObjectId: '',
  sourceType: 'application',
  tableName: '',
  databricksTable: '',
  databricksField: '',
  fieldName: '',
  fieldLabel: '',
  dataType: '',
  length: '',
  decimals: '',
  isKey: false,
  isRequired: false,
  description: '',
  businessRules: '',
});

const ObjectApplicationsPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [apps, setApps] = React.useState<any[]>([]);
  const [linked, setLinked] = React.useState<any[]>([]);
  const [linkAppId, setLinkAppId] = React.useState('');
  const [selectedDataDefId, setSelectedDataDefId] = React.useState('');
  const [dataDefFields, setDataDefFields] = React.useState<any[]>([]);
  const [editingFieldId, setEditingFieldId] = React.useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = React.useState<DataDefinitionFieldDraft>(emptyFieldDraft());
  const [catalogs, setCatalogs] = React.useState<string[]>([]);
  const [schemas, setSchemas] = React.useState<string[]>([]);
  const [tables, setTables] = React.useState<string[]>([]);
  const [metadataBySubObject, setMetadataBySubObject] = React.useState<Record<string, { catalog: string; schema: string; table: string }>>({});
  const [isSyncingMetadata, setIsSyncingMetadata] = React.useState(false);
  const [lastSyncedBySubObject, setLastSyncedBySubObject] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState('');
  const [fieldMetadataBase, setFieldMetadataBase] = React.useState<Record<string, any>>({});
  const [isGeneratingAiFields, setIsGeneratingAiFields] = React.useState(false);
  const [isSavingAiFields, setIsSavingAiFields] = React.useState(false);
  const [aiProposalOpen, setAiProposalOpen] = React.useState(false);
  const [aiProposalFields, setAiProposalFields] = React.useState<AiDataDefinitionProposalField[]>([]);
  const [sourceSectionOpen, setSourceSectionOpen] = React.useState<Record<'application', boolean>>({
    application: true,
  });

  const {
    subObjects,
    selectedSubObject,
    selectedSubObjectId,
    setSelectedSubObjectId,
    isLoading: isLoadingSubObjects,
  } = useObjectSubObjectSelection(objectId);

  const load = React.useCallback(async (currentSelectedId?: string) => {
    if (!selectedSubObjectId) {
      setApps([]);
      setLinked([]);
      setSelectedDataDefId('');
      return;
    }

    const [appsRes, linkedRes] = await Promise.all([
      apiClient.get('/api/applications'),
      apiClient.get(`/api/applications/data-definitions/object/${objectId}`, {
        params: { subObjectId: selectedSubObjectId },
      }),
    ]);
    const appsPayload = appsRes.data?.data || [];
    const linkedPayload = linkedRes.data?.data || [];
    setApps(appsPayload);
    setLinked(linkedPayload);

    const activeId = currentSelectedId || selectedDataDefId;
    if (!activeId || !linkedPayload.some((row: any) => row.id === activeId)) {
      setSelectedDataDefId(linkedPayload[0]?.id || '');
    }
  }, [objectId, selectedDataDefId, selectedSubObjectId]);

  const loadSelectedDefinition = React.useCallback(async (definitionId: string) => {
    if (!definitionId) {
      setDataDefFields([]);
      setLastSyncedBySubObject({});
      return;
    }

    const fieldsRes = await apiClient.get(`/api/applications/data-definitions/${definitionId}/fields`);
    const fields = fieldsRes.data?.data || [];
    setDataDefFields(fields);

    const perSubSync: Record<string, string> = {};
    fields.forEach((field: any) => {
      const sid = field.sub_object_id || selectedSubObjectId || '';
      if (!sid) return;
      const syncedAt = field?.field_metadata?.metadataSync?.syncedAt;
      if (!syncedAt) return;
      if (!perSubSync[sid] || new Date(syncedAt).getTime() > new Date(perSubSync[sid]).getTime()) {
        perSubSync[sid] = syncedAt;
      }
    });
    setLastSyncedBySubObject(perSubSync);
  }, [selectedSubObjectId]);

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
    load().catch(() => {
      setApps([]);
      setLinked([]);
    });
  }, [load]);

  React.useEffect(() => {
    if (!selectedSubObjectId) {
      setSelectedDataDefId('');
      setDataDefFields([]);
      return;
    }
    load().catch(() => {
      setApps([]);
      setLinked([]);
    });
  }, [selectedSubObjectId, load]);

  React.useEffect(() => {
    loadSelectedDefinition(selectedDataDefId).catch(() => {
      setDataDefFields([]);
      setLastSyncedBySubObject({});
    });
  }, [selectedDataDefId, loadSelectedDefinition]);

  React.useEffect(() => {
    loadMetadataCatalogs().catch(() => {
      setCatalogs([]);
    });
  }, [loadMetadataCatalogs]);

  const selectedDefinition = linked.find((row: any) => row.id === selectedDataDefId) || null;
  const selectedSubObjectFields = dataDefFields;
  const metadataDraft = metadataBySubObject[selectedSubObjectId] || { catalog: '', schema: '', table: '' };

  const resolveFieldSource = (field: any): 'application' | 'databricks' => {
    const sourceType = String(field?.field_metadata?.sourceType || '').toLowerCase();
    if (sourceType === 'databricks' || field?.field_metadata?.metadataSync) return 'databricks';
    return 'application';
  };

  const applicationFields = selectedSubObjectFields.filter((field: any) => resolveFieldSource(field) === 'application');

  const getApplicationTableValue = (field: any): string => {
    const metadataApplicationTable = String(
      field?.field_metadata?.application?.table || field?.field_metadata?.applicationTable || ''
    ).trim();
    if (metadataApplicationTable) return metadataApplicationTable;

    const rawTableName = String(field?.table_name || '').trim();
    const appName = String(selectedDefinition?.application_name || '').trim();
    if (!rawTableName) return '';

    // Legacy rows can carry app name as table_name; hide that fallback in the UI.
    if (appName && rawTableName.toLowerCase() === appName.toLowerCase()) {
      return '';
    }

    return rawTableName;
  };

  const handleLink = async () => {
    if (!linkAppId || !selectedSubObjectId) return;
    await apiClient.post('/api/applications/data-definitions', {
      globalObjectId: objectId,
      applicationId: linkAppId,
      subObjectId: selectedSubObjectId,
    });
    setLinkAppId('');
    setStatus('Application linked.');
    await load(selectedDataDefId);
  };

  const startCreateField = () => {
    setEditingFieldId('new');
    setFieldMetadataBase({});
    setFieldDraft({
      ...emptyFieldDraft(),
      subObjectId: '',
      sourceType: 'application',
      tableName: '',
    });
  };

  const startEditField = (field: any) => {
    setEditingFieldId(field.id);
    setFieldDraft({
      subObjectId: field.sub_object_id || '',
      sourceType: resolveFieldSource(field),
      tableName: getApplicationTableValue(field),
      databricksTable: field.field_metadata?.databricks?.table || '',
      databricksField: field.field_metadata?.databricks?.field || '',
      fieldName: field.field_name || '',
      fieldLabel: field.field_label || '',
      dataType: field.data_type || '',
      length: field.length != null ? String(field.length) : '',
      decimals: field.decimals != null ? String(field.decimals) : '',
      isKey: !!field.is_key,
      isRequired: !!field.is_required,
      description: field.description || '',
      businessRules: field.field_metadata?.businessRules || '',
    });
    setFieldMetadataBase((field?.field_metadata && typeof field.field_metadata === 'object') ? field.field_metadata : {});
  };

  const cancelFieldEdit = () => {
    setEditingFieldId(null);
    setFieldMetadataBase({});
    setFieldDraft(emptyFieldDraft());
  };

  const saveField = async () => {
    if (!selectedDataDefId || !fieldDraft.fieldName.trim()) return;

    const payload = {
      subObjectId: null,
      tableName: fieldDraft.tableName || null,
      fieldName: fieldDraft.fieldName.trim(),
      fieldLabel: fieldDraft.fieldLabel || null,
      dataType: fieldDraft.dataType || null,
      length: fieldDraft.length ? Number(fieldDraft.length) : null,
      decimals: fieldDraft.decimals ? Number(fieldDraft.decimals) : null,
      isKey: fieldDraft.isKey,
      isRequired: fieldDraft.isRequired,
      businessProcessRequired: false,
      description: fieldDraft.description || null,
      fieldMetadata: {
        ...fieldMetadataBase,
        businessRules: fieldDraft.businessRules || '',
        sourceType: 'application',
        application: {
          table: fieldDraft.tableName || null,
        },
        databricks: {
          table: fieldDraft.databricksTable || null,
          field: fieldDraft.databricksField || null,
        },
      },
      sortOrder: 0,
    };

    if (editingFieldId === 'new') {
      await apiClient.post(`/api/applications/data-definitions/${selectedDataDefId}/fields`, payload);
    } else if (editingFieldId) {
      await apiClient.put(`/api/applications/data-definitions/fields/${editingFieldId}`, payload);
    }

    await loadSelectedDefinition(selectedDataDefId);
    setStatus('Field definition saved.');
    cancelFieldEdit();
  };

  const handleDeleteField = async (fieldId: string) => {
    await apiClient.delete(`/api/applications/data-definitions/fields/${fieldId}`);
    await loadSelectedDefinition(selectedDataDefId);
    setStatus('Field definition deleted.');
  };

  const handleMetadataSync = async () => {
    if (!selectedDataDefId || !metadataDraft.catalog || !metadataDraft.schema || !metadataDraft.table) {
      setStatus('Catalog, schema, and table are required for metadata sync.');
      return;
    }

    setIsSyncingMetadata(true);
    try {
      const response = await apiClient.post(`/api/applications/data-definitions/${selectedDataDefId}/metadata-sync`, {
        catalog: metadataDraft.catalog,
        schema: metadataDraft.schema,
        table: metadataDraft.table,
        subObjectId: null,
      });
      const payload = response.data?.data || {};
      setDataDefFields(payload.fields || []);
      setLastSyncedBySubObject((prev) => ({
        ...prev,
        [selectedSubObjectId]: payload.syncedAt || new Date().toISOString(),
      }));
      setStatus('Metadata pulled from Databricks and field definitions updated.');
      await maybePromptCdmUpdate('databricks');
    } catch {
      setStatus('Failed to pull metadata from Databricks. Check your Databricks settings and try again.');
    } finally {
      setIsSyncingMetadata(false);
    }
  };

  const maybePromptCdmUpdate = async (reason: 'databricks' | 'ai') => {
    if (!selectedSubObjectId || !selectedDataDefId) return;
    const shouldUpdate = window.confirm('Update CDM based on new fields?');
    if (!shouldUpdate) return;

    try {
      await apiClient.post(`/api/cdm/${objectId}/ai-proposal`, { subObjectId: selectedSubObjectId });
      setStatus(reason === 'ai'
        ? 'AI fields saved. CDM proposal regenerated for this sub-object.'
        : 'Databricks fields synced. CDM proposal regenerated for this sub-object.');
    } catch {
      setStatus('Fields were saved, but CDM auto-update could not be generated.');
    }
  };

  const handleGenerateAiFields = async () => {
    if (!selectedDataDefId || !selectedSubObjectId) {
      setStatus('Select a sub-object and linked application before generating AI fields.');
      return;
    }

    setIsGeneratingAiFields(true);
    try {
      const response = await apiClient.post(`/api/applications/data-definitions/${selectedDataDefId}/ai-generate-fields`);
      const payload = response.data?.data || {};
      setAiProposalFields(Array.isArray(payload.proposals) ? payload.proposals : []);
      setAiProposalOpen(true);
    } catch (error: any) {
      setStatus(error?.response?.data?.error?.message || 'Failed to generate AI data definition fields.');
    } finally {
      setIsGeneratingAiFields(false);
    }
  };

  const handleAcceptAiFields = async (acceptedFields: AiDataDefinitionProposalField[]) => {
    if (!selectedDataDefId || !selectedSubObjectId || acceptedFields.length === 0) return;

    setIsSavingAiFields(true);
    try {
      const existingKey = new Set(
        selectedSubObjectFields.map((field: any) => `${String(field.field_name || '').trim().toLowerCase()}::${String(field.table_name || '').trim().toLowerCase()}`)
      );

      for (const field of acceptedFields) {
        const dedupeKey = `${String(field.fieldName || '').trim().toLowerCase()}::${String(selectedDefinition?.application_name || '').trim().toLowerCase()}`;
        if (existingKey.has(dedupeKey)) {
          continue;
        }

        await apiClient.post(`/api/applications/data-definitions/${selectedDataDefId}/fields`, {
          subObjectId: null,
          tableName: null,
          fieldName: field.fieldName,
          fieldLabel: field.fieldLabel || null,
          dataType: field.dataType || null,
          length: field.length ?? null,
          decimals: field.decimals ?? null,
          isKey: !!field.isKey,
          isRequired: !!field.isRequired,
          businessProcessRequired: false,
          description: field.description || null,
          fieldMetadata: {
            sourceType: 'application',
            aiGenerated: true,
            application: {
              table: null,
            },
            businessRules: field.businessRules || '',
            databricks: {
              table: null,
              field: null,
            },
          },
          sortOrder: 0,
        });
      }

      await loadSelectedDefinition(selectedDataDefId);
      setAiProposalOpen(false);
      setStatus('AI-generated fields added to Application Fields.');
      await maybePromptCdmUpdate('ai');
    } catch {
      setStatus('Failed to save AI-generated fields.');
    } finally {
      setIsSavingAiFields(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Object Applications" breadcrumbLabel="Applications" />

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Linked Applications</Typography>

            {isLoadingSubObjects ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Loading sub-objects...</Typography>
            ) : subObjects.length === 0 ? (
              <Alert severity="info" sx={{ mb: 1.5 }}>
                Create sub-objects on the Sub Objects tab before linking applications.
              </Alert>
            ) : (
              <ObjectSubObjectSelector
                subObjects={subObjects}
                selectedSubObjectId={selectedSubObjectId}
                onChange={setSelectedSubObjectId}
                helperText="Only sub-objects created on the Sub Objects tab can be assigned here."
              />
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
              <TextField
                select
                size="small"
                label="Application"
                value={linkAppId}
                onChange={(e) => setLinkAppId(e.target.value)}
                sx={{ minWidth: 280 }}
                disabled={!selectedSubObjectId}
              >
                {apps.map((app) => (
                  <MenuItem key={app.id} value={app.id}>{app.name}</MenuItem>
                ))}
              </TextField>
              <Button variant="contained" onClick={handleLink} sx={{ textTransform: 'none' }} disabled={!selectedSubObjectId || !linkAppId}>Link Application</Button>
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
                <Box
                  key={row.id}
                  onClick={() => setSelectedDataDefId(row.id)}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 0.8fr',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    backgroundColor: selectedDataDefId === row.id ? 'rgba(102,126,234,0.18)' : 'transparent',
                    '&:hover': { backgroundColor: selectedDataDefId === row.id ? 'rgba(102,126,234,0.22)' : 'rgba(255,255,255,0.03)' },
                  }}
                >
                  <Box sx={{ px: 1, py: 0.8, fontWeight: selectedDataDefId === row.id ? 700 : 500 }}>{row.application_name}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.vendor || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>
                    <Button
                      size="small"
                      color="error"
                      sx={{ textTransform: 'none' }}
                      onClick={async () => {
                        const deletedId = row.id;
                        await apiClient.delete(`/api/applications/data-definitions/${row.id}`);
                        const nextSelected = selectedDataDefId === deletedId ? '' : selectedDataDefId;
                        await load(nextSelected);
                        if (selectedDataDefId === deletedId) {
                          setSelectedDataDefId('');
                          setDataDefFields([]);
                          setMetadataBySubObject({});
                          setLastSyncedBySubObject({});
                        }
                      }}
                    >
                      Unlink
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
            {status && <Alert severity="success" sx={{ mt: 1 }}>{status}</Alert>}
          </CardContent>
        </Card>

        {selectedDefinition && (
          <Card sx={{ mt: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Application Details</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedDefinition.application_name}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleGenerateAiFields}
                  disabled={isGeneratingAiFields}
                  sx={{ textTransform: 'none' }}
                >
                  {isGeneratingAiFields ? 'Generating...' : 'Generate Data Definition (AI)'}
                </Button>
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              <Box sx={{ mb: 2, p: 1.25, borderRadius: 1, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {selectedSubObject ? `${selectedSubObject.name} Field Definitions` : 'Application Field Definitions'}
                  </Typography>
                  <Button size="small" variant="outlined" sx={{ textTransform: 'none' }} onClick={() => startCreateField()}>
                    Add Field
                  </Button>
                </Box>
                {lastSyncedBySubObject[selectedSubObjectId] && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Last synced: {new Date(lastSyncedBySubObject[selectedSubObjectId]).toLocaleString()}
                  </Typography>
                )}
                <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: 'text.secondary', mb: 1 }}>Pull Metadata from Databricks</Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
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
                    sx={{ minWidth: 190 }}
                  >
                    {tables.map((table) => (
                      <MenuItem key={`table-${table}`} value={table}>{table}</MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleMetadataSync}
                    disabled={isSyncingMetadata}
                    sx={{ textTransform: 'none', alignSelf: { xs: 'stretch', md: 'center' } }}
                  >
                    {isSyncingMetadata ? 'Syncing...' : 'Pull Metadata from Databricks'}
                  </Button>
                </Stack>
              </Box>

              {editingFieldId && (
                <Box sx={{ mb: 2, p: 1.25, borderRadius: 1, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: 'text.secondary', mb: 1 }}>
                    {editingFieldId === 'new' ? 'Add Field Definition' : 'Edit Field Definition'}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1.2fr 0.9fr 0.7fr 0.7fr 1fr' }, gap: 1 }}>
                    <TextField size="small" label="Field Name" value={fieldDraft.fieldName} onChange={(e) => setFieldDraft((prev) => ({ ...prev, fieldName: e.target.value }))} />
                    <TextField size="small" label="Label" value={fieldDraft.fieldLabel} onChange={(e) => setFieldDraft((prev) => ({ ...prev, fieldLabel: e.target.value }))} />
                    <TextField size="small" label="Table" value={fieldDraft.tableName} onChange={(e) => setFieldDraft((prev) => ({ ...prev, tableName: e.target.value }))} />
                    <TextField size="small" label="Type" value={fieldDraft.dataType} onChange={(e) => setFieldDraft((prev) => ({ ...prev, dataType: e.target.value }))} />
                    <TextField size="small" label="Length" value={fieldDraft.length} onChange={(e) => setFieldDraft((prev) => ({ ...prev, length: e.target.value.replace(/[^0-9]/g, '') }))} />
                    <TextField size="small" label="Decimal" value={fieldDraft.decimals} onChange={(e) => setFieldDraft((prev) => ({ ...prev, decimals: e.target.value.replace(/[^0-9]/g, '') }))} />
                    <TextField size="small" label="Databricks Table" value={fieldDraft.databricksTable} onChange={(e) => setFieldDraft((prev) => ({ ...prev, databricksTable: e.target.value }))} sx={{ display: 'none' }} />
                    <TextField size="small" label="Databricks Field" value={fieldDraft.databricksField} onChange={(e) => setFieldDraft((prev) => ({ ...prev, databricksField: e.target.value }))} sx={{ display: 'none' }} />
                    <TextField size="small" label="Sub-object" value={selectedSubObject?.name || 'Root'} disabled />
                  </Box>
                  <TextField
                    sx={{ mt: 1, width: '100%' }}
                    size="small"
                    label="Description"
                    value={fieldDraft.description}
                    onChange={(e) => setFieldDraft((prev) => ({ ...prev, description: e.target.value }))}
                  />
                  <TextField
                    sx={{ mt: 1, width: '100%' }}
                    size="small"
                    label="Business Rules"
                    multiline
                    minRows={2}
                    value={fieldDraft.businessRules}
                    onChange={(e) => setFieldDraft((prev) => ({ ...prev, businessRules: e.target.value }))}
                  />
                  <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                      <Checkbox checked={fieldDraft.isKey} onChange={(e) => setFieldDraft((prev) => ({ ...prev, isKey: e.target.checked }))} />
                      <Typography variant="body2">Key</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                      <Checkbox checked={fieldDraft.isRequired} onChange={(e) => setFieldDraft((prev) => ({ ...prev, isRequired: e.target.checked }))} />
                      <Typography variant="body2">Required</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" variant="outlined" onClick={cancelFieldEdit} startIcon={<CloseIcon />} sx={{ textTransform: 'none' }}>
                      Cancel
                    </Button>
                    <Button size="small" variant="contained" onClick={saveField} startIcon={<SaveIcon />} sx={{ textTransform: 'none' }}>
                      Save
                    </Button>
                  </Stack>
                </Box>
              )}

              {[
                { key: 'application' as const, title: 'Application Fields', rows: applicationFields },
              ].map((section) => (
                <Accordion
                  key={`field-section-${section.key}`}
                  expanded={sourceSectionOpen[section.key]}
                  onChange={(_e, expanded) => setSourceSectionOpen((prev) => ({ ...prev, [section.key]: expanded }))}
                  sx={{
                    mb: 1,
                    border: '1px solid rgba(255,255,255,0.12)',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.84rem' }}>{section.title} ({section.rows.length})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
                      <Box sx={{ minWidth: 1110, display: 'grid', gridTemplateColumns: '1.25fr 1.15fr 1.35fr 0.9fr 0.7fr 0.7fr 0.62fr 0.72fr 1.9fr 0.85fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        {['Field Name', 'Label', 'Table', 'Type', 'Length', 'Decimal', 'Key', 'Required', 'Description', 'Actions'].map((header) => (
                          <Box key={`${section.key}-${header}`} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            {header}
                          </Box>
                        ))}
                      </Box>
                      {section.rows.length === 0 ? (
                        <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No fields in this section.</Typography></Box>
                      ) : section.rows.map((field: any, idx: number) => (
                        <Box key={field.id} sx={{ minWidth: 1110, display: 'grid', gridTemplateColumns: '1.25fr 1.15fr 1.35fr 0.9fr 0.7fr 0.7fr 0.62fr 0.72fr 1.9fr 0.85fr', borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                          <Box sx={{ px: 1, py: 0.8, fontFamily: 'monospace', fontWeight: 700 }}>
                            {field.field_name || '-'}
                          </Box>
                          <Box sx={{ px: 1, py: 0.8 }}>{field.field_label || '-'}</Box>
                          <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getApplicationTableValue(field) || '-'}</Box>
                          <Box sx={{ px: 1, py: 0.8 }}>{field.data_type || '-'}</Box>
                          <Box sx={{ px: 1, py: 0.8 }}>{field.length ?? '-'}</Box>
                          <Box sx={{ px: 1, py: 0.8 }}>{field.decimals ?? '-'}</Box>
                          <Box sx={{ px: 1, py: 0.8, textAlign: 'center', color: field.is_key ? '#ffca28' : 'text.disabled' }}>{field.is_key ? '●' : '○'}</Box>
                          <Box sx={{ px: 1, py: 0.8, textAlign: 'center', color: field.is_required ? '#ef5350' : 'text.disabled' }}>{field.is_required ? '●' : '○'}</Box>
                          <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>
                            <Typography variant="body2" sx={{ fontSize: '0.79rem' }}>{field.description || '-'}</Typography>
                            {field.field_metadata?.businessRules && (
                              <Typography variant="caption" sx={{ color: 'rgba(144,202,249,0.95)' }}>
                                Rules: {field.field_metadata.businessRules}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <IconButton size="small" onClick={() => startEditField(field)} title="Edit field">
                              <EditIcon sx={{ fontSize: '0.9rem' }} />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteField(field.id)} title="Delete field">
                              <DeleteIcon sx={{ fontSize: '0.9rem' }} />
                            </IconButton>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        )}

        <DataDefinitionAiProposalModal
          open={aiProposalOpen}
          proposals={aiProposalFields}
          onClose={() => {
            if (isSavingAiFields) return;
            setAiProposalOpen(false);
          }}
          onAccept={handleAcceptAiFields}
          saving={isSavingAiFields}
        />
      </Box>
    </Layout>
  );
};

export default ObjectApplicationsPage;
