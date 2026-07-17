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

type MappingTab = 'object-table' | 'field-object';

const ObjectApplicationMappingPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [linked, setLinked] = React.useState<any[]>([]);
  const [selectedDataDefId, setSelectedDataDefId] = React.useState('');
  const [dataDefFields, setDataDefFields] = React.useState<any[]>([]);
  const [status, setStatus] = React.useState('');
  const [isGeneratingAiFields, setIsGeneratingAiFields] = React.useState(false);
  const [isSavingAiFields, setIsSavingAiFields] = React.useState(false);
  const [aiProposalOpen, setAiProposalOpen] = React.useState(false);
  const [aiProposalFields, setAiProposalFields] = React.useState<AiDataDefinitionProposalField[]>([]);
  const [mappingTab, setMappingTab] = React.useState<MappingTab>('object-table');

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
      setLinked([]);
      setSelectedDataDefId('');
      setDataDefFields([]);
      return;
    }

    const linkedRes = await apiClient.get(`/api/applications/data-definitions/object/${objectId}`, {
      params: { subObjectId: scopedSubObjectId },
    });

    const linkedPayload = linkedRes.data?.data || [];
    setLinked(linkedPayload);

    const activeId = currentSelectedId || selectedDataDefId;
    if (!activeId || !linkedPayload.some((row: any) => row.id === activeId)) {
      setSelectedDataDefId(linkedPayload[0]?.id || '');
    }
  }, [hasSubObjects, objectId, scopedSubObjectId, selectedDataDefId]);

  const loadSelectedDefinition = React.useCallback(async (definitionId: string) => {
    if (!definitionId) {
      setDataDefFields([]);
      return;
    }

    const fieldsRes = await apiClient.get(`/api/applications/data-definitions/${definitionId}/fields`);
    setDataDefFields(fieldsRes.data?.data || []);
  }, []);

  React.useEffect(() => {
    load().catch(() => {
      setLinked([]);
      setDataDefFields([]);
    });
  }, [load]);

  React.useEffect(() => {
    if (hasSubObjects && !selectedSubObjectId) {
      setSelectedDataDefId('');
      setDataDefFields([]);
      return;
    }
    load().catch(() => {
      setLinked([]);
      setDataDefFields([]);
    });
  }, [hasSubObjects, selectedSubObjectId, load]);

  React.useEffect(() => {
    loadSelectedDefinition(selectedDataDefId).catch(() => {
      setDataDefFields([]);
    });
  }, [selectedDataDefId, loadSelectedDefinition]);

  const selectedDefinition = linked.find((row: any) => row.id === selectedDataDefId) || null;

  const getFieldMetadata = (field: any) => (
    field?.field_metadata && typeof field.field_metadata === 'object' ? field.field_metadata : {}
  );

  const getFieldMetaText = (field: any, key: string) => String(getFieldMetadata(field)?.[key] || '').trim();

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
      setStatus('AI-generated fields added to Field → Object Mapping.');
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
              Map selected object scope to application tables and fields.
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
                label="Selected Application"
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
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Mapping Context</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Selected Object: {objectId}{selectedSubObject ? ` / ${selectedSubObject.name}` : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Selected Application: {selectedDefinition.application_name}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleGenerateAiFields}
                  disabled={isGeneratingAiFields || !selectedDataDefId}
                  sx={{ textTransform: 'none', mt: 0.25 }}
                >
                  {isGeneratingAiFields ? 'Generating...' : 'Generate Data Definition (AI)'}
                </Button>
              </Box>

              <Divider sx={{ mb: 1.25 }} />

              <Tabs
                value={mappingTab}
                onChange={(_event, value) => setMappingTab(value as MappingTab)}
                sx={{ borderBottom: '1px solid rgba(255,255,255,0.12)', mb: 1.25 }}
              >
                <Tab value="object-table" label="Object → Table Mapping" sx={{ textTransform: 'none' }} />
                <Tab value="field-object" label="Field → Object Mapping" sx={{ textTransform: 'none' }} />
              </Tabs>

              {mappingTab === 'object-table' && (
                <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
                  <Box sx={{ minWidth: 900, display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1.3fr 1.3fr 0.8fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    {['Object Scope', 'Application', 'Mapped Table', 'Table Name', 'Field Count'].map((header) => (
                      <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                    ))}
                  </Box>
                  {objectTableRows.length === 0 ? (
                    <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No table mappings available for this scope.</Typography></Box>
                  ) : objectTableRows.map((row, idx) => (
                    <Box key={`${row.table}-${row.tableName}-${idx}`} sx={{ minWidth: 900, display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1.3fr 1.3fr 0.8fr', borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                      <Box sx={{ px: 1, py: 0.8 }}>{objectId}{selectedSubObject ? ` / ${selectedSubObject.name}` : ''}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{selectedDefinition.application_name}</Box>
                      <Box sx={{ px: 1, py: 0.8, fontFamily: 'monospace', fontWeight: 700 }}>{row.table || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.tableName || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8 }}>{row.fieldCount}</Box>
                    </Box>
                  ))}
                </Box>
              )}

              {mappingTab === 'field-object' && (
                <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
                  <Box sx={{ minWidth: 1600, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 1.2fr 1.4fr 1.4fr 1.4fr 1.2fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    {['Field Name', 'Label', 'Mapped Object Scope', 'Mapped Table', 'Field Description', 'Application Usage', 'Business Rules', 'Data Type'].map((header) => (
                      <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                    ))}
                  </Box>
                  {applicationFields.length === 0 ? (
                    <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No field mappings available for this scope.</Typography></Box>
                  ) : applicationFields.map((field: any, idx: number) => (
                    <Box key={field.id} sx={{ minWidth: 1600, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr 1.2fr 1.4fr 1.4fr 1.4fr 1.2fr', borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                      <Box sx={{ px: 1, py: 0.8, fontFamily: 'monospace', fontWeight: 700 }}>{field.field_name || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{field.field_label || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8 }}>{objectId}{selectedSubObject ? ` / ${selectedSubObject.name}` : ''}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getApplicationTableValue(field) || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'fieldDescription') || field.description || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'applicationUsage') || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{getFieldMetaText(field, 'businessRules') || '-'}</Box>
                      <Box sx={{ px: 1, py: 0.8 }}>{getFieldMetaText(field, 'fieldType') || field.data_type || '-'}</Box>
                    </Box>
                  ))}
                </Box>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.1 }}>
                Table and field metadata input is not editable on this page.
              </Typography>
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

export default ObjectApplicationMappingPage;
