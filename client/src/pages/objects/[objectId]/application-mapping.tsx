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
import DataDefinitionFieldModal from '../../../components/objects/DataDefinitionFieldModal';
import DataDefinitionAiProposalModal from '../../../components/objects/DataDefinitionAiProposalModal';
import type { AiDataDefinitionProposalField, DataDefinitionFieldFormValues } from '../../../types/dataDefinitions';

const emptyFieldDraft = (): DataDefinitionFieldFormValues => ({
  fieldName: '',
  label: '',
  table: '',
  tableName: '',
  fieldDescription: '',
  applicationUsage: '',
  businessDefinition: '',
  businessRules: '',
  fieldType: '',
  fieldLength: '',
  decimalPlaces: '',
  isKey: false,
  systemRequired: false,
  businessProcessRequired: false,
  suppressedField: false,
  legalRegulatoryImplications: '',
  securityClassification: '',
  referenceTable: '',
  groupingTab: '',
  piiType: '',
  securityControls: '',
  databricksTable: '',
  databricksField: '',
});

const ObjectApplicationMappingPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [apps, setApps] = React.useState<any[]>([]);
  const [linked, setLinked] = React.useState<any[]>([]);
  const [linkAppId, setLinkAppId] = React.useState('');
  const [selectedDataDefId, setSelectedDataDefId] = React.useState('');
  const [dataDefFields, setDataDefFields] = React.useState<any[]>([]);
  const [editingFieldId, setEditingFieldId] = React.useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = React.useState<DataDefinitionFieldFormValues>(emptyFieldDraft());
  const [isSavingField, setIsSavingField] = React.useState(false);
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

  const {
    subObjects,
    hasSubObjects,
    selectedSubObject,
    selectedSubObjectId,
    setSelectedSubObjectId,
    isLoading: isLoadingSubObjects,
  } = useObjectSubObjectSelection(objectId);

  const scopedSubObjectId = hasSubObjects ? selectedSubObjectId : '';

  const load = React.useCallback(async (currentSelectedId?: string) => {
    if (hasSubObjects && !scopedSubObjectId) {
      setApps([]);
      setLinked([]);
      setSelectedDataDefId('');
      return;
    }

    const [appsRes, linkedRes] = await Promise.all([
      apiClient.get('/api/applications'),
      apiClient.get(`/api/applications/data-definitions/object/${objectId}`, {
        params: { subObjectId: scopedSubObjectId },
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
  }, [hasSubObjects, objectId, scopedSubObjectId, selectedDataDefId]);

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
      const sid = field.sub_object_id || scopedSubObjectId || '';
      if (!sid) return;
      const syncedAt = field?.field_metadata?.metadataSync?.syncedAt;
      if (!syncedAt) return;
      if (!perSubSync[sid] || new Date(syncedAt).getTime() > new Date(perSubSync[sid]).getTime()) {
        perSubSync[sid] = syncedAt;
      }
    });
    setLastSyncedBySubObject(perSubSync);
  }, [scopedSubObjectId]);

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
    if (hasSubObjects && !selectedSubObjectId) {
      setSelectedDataDefId('');
      setDataDefFields([]);
      return;
    }
    load().catch(() => {
      setApps([]);
      setLinked([]);
    });
  }, [hasSubObjects, selectedSubObjectId, load]);

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

  const getFieldMetadata = (field: any) => (field?.field_metadata && typeof field.field_metadata === 'object' ? field.field_metadata : {});
  const getFieldMetaText = (field: any, key: string) => String(getFieldMetadata(field)?.[key] || '').trim();
  const getFieldMetaBoolean = (field: any, key: string) => Boolean(getFieldMetadata(field)?.[key]);

  const handleLink = async () => {
    if (!linkAppId) return;
    await apiClient.post('/api/applications/data-definitions', {
      globalObjectId: objectId,
      applicationId: linkAppId,
      subObjectId: hasSubObjects ? selectedSubObjectId : null,
    });
    setLinkAppId('');
    setStatus('Application linked.');
    await load(selectedDataDefId);
  };

  const startCreateField = () => {
    setEditingFieldId('new');
    setFieldMetadataBase({});
    setFieldDraft(emptyFieldDraft());
  };

  const startEditField = (field: any) => {
    setEditingFieldId(field.id);
    setFieldDraft({
      fieldName: field.field_name || '',
      label: field.field_label || '',
      table: String(field.field_metadata?.application?.table || field.field_metadata?.applicationTable || field.table_name || '').trim(),
      tableName: String(field.table_name || '').trim(),
      fieldDescription: String(field.field_metadata?.fieldDescription || field.description || '').trim(),
      applicationUsage: String(field.field_metadata?.applicationUsage || '').trim(),
      businessDefinition: String(field.field_metadata?.businessDefinition || '').trim(),
      businessRules: String(field.field_metadata?.businessRules || field.field_metadata?.business_rules || '').trim(),
      fieldType: String(field.field_metadata?.fieldType || field.data_type || '').trim(),
      fieldLength: field.field_metadata?.fieldLength != null ? String(field.field_metadata.fieldLength) : (field.length != null ? String(field.length) : ''),
      decimalPlaces: field.field_metadata?.decimalPlaces != null ? String(field.field_metadata.decimalPlaces) : (field.decimals != null ? String(field.decimals) : ''),
      isKey: !!field.is_key,
      systemRequired: !!field.is_required,
      businessProcessRequired: !!field.business_process_required,
      suppressedField: !!field.field_metadata?.suppressedField,
      legalRegulatoryImplications: String(field.field_metadata?.legalRegulatoryImplications || '').trim(),
      securityClassification: String(field.field_metadata?.securityClassification || '').trim(),
      referenceTable: String(field.field_metadata?.referenceTable || '').trim(),
      groupingTab: String(field.field_metadata?.groupingTab || '').trim(),
      piiType: String(field.field_metadata?.piiType || '').trim(),
      securityControls: String(field.field_metadata?.securityControls || '').trim(),
      databricksTable: String(field.field_metadata?.databricks?.table || '').trim(),
      databricksField: String(field.field_metadata?.databricks?.field || '').trim(),
    });
    setFieldMetadataBase((field?.field_metadata && typeof field.field_metadata === 'object') ? field.field_metadata : {});
  };

  const cancelFieldEdit = () => {
    setEditingFieldId(null);
    setFieldMetadataBase({});
    setFieldDraft(emptyFieldDraft());
  };

  const saveField = async (values: DataDefinitionFieldFormValues) => {
    if (!selectedDataDefId || !values.fieldName.trim()) return;

    setIsSavingField(true);
    try {
      const fieldLength = values.fieldLength ? Number(values.fieldLength) : null;
      const decimalPlaces = values.decimalPlaces ? Number(values.decimalPlaces) : null;

      const payload = {
        subObjectId: hasSubObjects ? selectedSubObjectId : null,
        tableName: values.tableName || values.table || null,
        fieldName: values.fieldName.trim(),
        fieldLabel: values.label || null,
        dataType: values.fieldType || null,
        length: fieldLength,
        decimals: decimalPlaces,
        isKey: values.isKey,
        isRequired: values.systemRequired,
        businessProcessRequired: values.businessProcessRequired,
        description: values.fieldDescription || null,
        fieldMetadata: {
          ...fieldMetadataBase,
          table: values.table || null,
          tableName: values.tableName || null,
          fieldDescription: values.fieldDescription || '',
          applicationUsage: values.applicationUsage || '',
          businessDefinition: values.businessDefinition || '',
          businessRules: values.businessRules || '',
          fieldType: values.fieldType || '',
          fieldLength: values.fieldLength || null,
          decimalPlaces: values.decimalPlaces || null,
          isKey: values.isKey,
          systemRequired: values.systemRequired,
          businessProcessRequired: values.businessProcessRequired,
          suppressedField: values.suppressedField,
          legalRegulatoryImplications: values.legalRegulatoryImplications || '',
          securityClassification: values.securityClassification || '',
          referenceTable: values.referenceTable || '',
          groupingTab: values.groupingTab || '',
          piiType: values.piiType || '',
          securityControls: values.securityControls || '',
          sourceType: 'application',
          application: {
            table: values.table || null,
          },
          databricks: {
            table: values.databricksTable || null,
            field: values.databricksField || null,
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
    } finally {
      setIsSavingField(false);
    }
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
        subObjectId: hasSubObjects ? selectedSubObjectId : null,
      });
      const payload = response.data?.data || {};
      setDataDefFields(payload.fields || []);
      setLastSyncedBySubObject((prev) => ({
        ...prev,
        [selectedSubObjectId]: payload.syncedAt || new Date().toISOString(),
      }));
      setStatus('Metadata pulled from Databricks and field definitions updated.');
    } catch {
      setStatus('Failed to pull metadata from Databricks. Check your Databricks settings and try again.');
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
        selectedSubObjectFields.map((field: any) => `${String(field.field_name || '').trim().toLowerCase()}::${String(getApplicationTableValue(field) || '').trim().toLowerCase()}`)
      );

      for (const field of acceptedFields) {
        const applicationTableName = String(field.tableName || field.table || '').trim();
        const dedupeKey = `${String(field.fieldName || '').trim().toLowerCase()}::${applicationTableName.toLowerCase()}`;
        if (existingKey.has(dedupeKey)) {
          continue;
        }

        await apiClient.post(`/api/applications/data-definitions/${selectedDataDefId}/fields`, {
          subObjectId: hasSubObjects ? selectedSubObjectId : null,
          tableName: applicationTableName || null,
          fieldName: field.fieldName,
          fieldLabel: field.label || null,
          dataType: field.fieldType || null,
          length: field.fieldLength ?? null,
          decimals: field.decimalPlaces ?? null,
          isKey: !!field.isKey,
          isRequired: !!field.systemRequired,
          businessProcessRequired: !!field.businessProcessRequired,
          description: field.fieldDescription || null,
          fieldMetadata: {
            sourceType: 'application',
            aiGenerated: true,
            application: {
              table: applicationTableName || null,
            },
            table: field.table || applicationTableName || null,
            tableName: applicationTableName || null,
            fieldDescription: field.fieldDescription || '',
            applicationUsage: field.applicationUsage || '',
            businessDefinition: field.businessDefinition || '',
            businessRules: field.businessRules || '',
            fieldType: field.fieldType || '',
            fieldLength: field.fieldLength ?? null,
            decimalPlaces: field.decimalPlaces ?? null,
            systemRequired: !!field.systemRequired,
            businessProcessRequired: !!field.businessProcessRequired,
            suppressedField: !!field.suppressedField,
            legalRegulatoryImplications: field.legalRegulatoryImplications || '',
            securityClassification: field.securityClassification || '',
            referenceTable: field.referenceTable || '',
            groupingTab: field.groupingTab || '',
            piiType: field.piiType || '',
            securityControls: field.securityControls || '',
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
    } catch {
      setStatus('Failed to save AI-generated fields.');
    } finally {
      setIsSavingAiFields(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Object ↔ Application Mapping" breadcrumbLabel="Application Mapping" />

        <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.2 }}>Layer 4: Object ↔ Application Mapping</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Map application schema fields to object-level business meaning and run AI-assisted mapping proposals.
            </Typography>

            <Stack spacing={1.5}>
              {isLoadingSubObjects ? (
                <Typography variant="body2" color="text.secondary">Loading sub-objects...</Typography>
              ) : hasSubObjects ? (
                <ObjectSubObjectSelector
                  subObjects={subObjects}
                  selectedSubObjectId={selectedSubObjectId}
                  onChange={setSelectedSubObjectId}
                  helperText="Mapping is scoped by selected sub-object."
                />
              ) : (
                <Alert severity="info">This object has no sub-objects. Mapping runs at object scope.</Alert>
              )}

              <TextField
                select
                size="small"
                label="Assigned Application"
                value={selectedDataDefId}
                onChange={(e) => setSelectedDataDefId(e.target.value)}
                sx={{ maxWidth: 360 }}
              >
                {linked.map((row) => (
                  <MenuItem key={row.id} value={row.id}>{row.application_name}</MenuItem>
                ))}
              </TextField>

              {status && <Alert severity="success">{status}</Alert>}
            </Stack>
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
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              <Box sx={{ mb: 2, p: 1.25, borderRadius: 1, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} justifyContent="space-between">
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {hasSubObjects && selectedSubObject ? `${selectedSubObject.name} Field Definitions` : 'Application Field Definitions'}
                    </Typography>
                    {selectedDataDefId && lastSyncedBySubObject[scopedSubObjectId] && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Last synced: {new Date(lastSyncedBySubObject[scopedSubObjectId]).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: 'none' }}
                      onClick={() => startCreateField()}
                      disabled={!selectedDataDefId}
                    >
                      Add Field
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AutoAwesomeIcon />}
                      onClick={handleGenerateAiFields}
                      disabled={isGeneratingAiFields || !selectedDataDefId}
                      sx={{ textTransform: 'none' }}
                    >
                      {isGeneratingAiFields ? 'Generating...' : 'Generate Data Definition (AI)'}
                    </Button>
                  </Stack>
                </Stack>
              </Box>

              <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
                <Box sx={{ minWidth: 3200, display: 'grid', gridTemplateColumns: '1.3fr 1.1fr 1.1fr 1.1fr 1.6fr 1.3fr 1.7fr 1.6fr 0.95fr 0.8fr 0.9fr 0.7fr 0.95fr 0.8fr 1.4fr 1.1fr 1.0fr 1.0fr 1.0fr 1.5fr 0.8fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  {['Field Name', 'Label', 'Table', 'Table Name', 'Field Description', 'Application Usage', 'Business Definition', 'Business Rules', 'Field Type', 'Field Length', 'Decimal Places', 'System Req', 'Bus Proc Req', 'Suppressed', 'Legal/Regulatory Implications', 'Security Classification', 'Reference Table', 'Grouping/Tab', 'PII Type', 'Security Controls', 'Actions'].map((header) => (
                    <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{header}</Box>
                  ))}
                </Box>
                {applicationFields.length === 0 ? (
                  <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No fields defined.</Typography></Box>
                ) : applicationFields.map((field: any, idx: number) => (
                  <Box key={field.id} sx={{ minWidth: 3200, display: 'grid', gridTemplateColumns: '1.3fr 1.1fr 1.1fr 1.1fr 1.6fr 1.3fr 1.7fr 1.6fr 0.95fr 0.8fr 0.9fr 0.7fr 0.95fr 0.8fr 1.4fr 1.1fr 1.0fr 1.0fr 1.0fr 1.5fr 0.8fr', borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ px: 1, py: 0.8, fontFamily: 'monospace', fontWeight: 700 }}>{field.field_name || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{field.field_label || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getApplicationTableValue(field) || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{field.table_name || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'fieldDescription') || field.description || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'applicationUsage') || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'businessDefinition') || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'businessRules') || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8 }}>{getFieldMetaText(field, 'fieldType') || field.data_type || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8 }}>{getFieldMetaText(field, 'fieldLength') || (field.length ?? '-')}</Box>
                    <Box sx={{ px: 1, py: 0.8 }}>{getFieldMetaText(field, 'decimalPlaces') || (field.decimals ?? '-')}</Box>
                    <Box sx={{ px: 1, py: 0.8, textAlign: 'center', color: getFieldMetaBoolean(field, 'systemRequired') || field.is_required ? '#ffca28' : 'text.disabled' }}>{getFieldMetaBoolean(field, 'systemRequired') || field.is_required ? '●' : '○'}</Box>
                    <Box sx={{ px: 1, py: 0.8, textAlign: 'center', color: getFieldMetaBoolean(field, 'businessProcessRequired') || field.business_process_required ? '#ef5350' : 'text.disabled' }}>{getFieldMetaBoolean(field, 'businessProcessRequired') || field.business_process_required ? '●' : '○'}</Box>
                    <Box sx={{ px: 1, py: 0.8, textAlign: 'center', color: getFieldMetaBoolean(field, 'suppressedField') ? '#ff9800' : 'text.disabled' }}>{getFieldMetaBoolean(field, 'suppressedField') ? '●' : '○'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'legalRegulatoryImplications') || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'securityClassification') || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'referenceTable') || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'groupingTab') || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'piiType') || '-'}</Box>
                    <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'securityControls') || '-'}</Box>
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
            </CardContent>
          </Card>
        )}

        <DataDefinitionFieldModal
          open={editingFieldId != null}
          initialValues={editingFieldId ? fieldDraft : undefined}
          onClose={cancelFieldEdit}
          onSave={saveField}
          saving={isSavingField}
          title={editingFieldId === 'new' ? 'Add Field Definition' : 'Edit Field Definition'}
        />

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

export default ObjectApplicationMappingPage;
