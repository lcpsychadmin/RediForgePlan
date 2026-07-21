import React from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import ObjectSubObjectSelector from '../../../components/objects/ObjectSubObjectSelector';
import useObjectSubObjectSelection from '../../../components/objects/useObjectSubObjectSelection';
import apiClient from '../../../api/client';
import AiCdmFieldProposalPanel from '../../../components/objects/AiCdmFieldProposalPanel';
import { useAiCdmDerivation } from '../../../hooks/useObjectAiActions';
import type { AiCdmFieldProposal } from '../../../types/objectAi';
import CdmFieldsEditorTable from '../../../components/objects/CdmFieldsEditorTable';
import { mapAttributesToEditorRows, useCdmFieldsEditor } from '../../../hooks/useCdmFieldsEditor';
import type { CdmFieldEditorRow } from '../../../types/cdmEditor';

type FieldRow = {
  id: string;
  definitionId: string;
  applicationId: string;
  applicationName: string;
  field_name?: string;
  field_label?: string;
  table_name?: string;
  data_type?: string;
  length?: number | null;
  is_required?: boolean;
  description?: string | null;
  field_metadata?: any;
};

const resolveSourceType = (field: any): 'application' | 'databricks' | 'other' => {
  const sourceType = String(field?.field_metadata?.sourceType || '').toLowerCase();
  if (sourceType === 'application') return 'application';
  if (sourceType === 'databricks' || field?.field_metadata?.metadataSync) return 'databricks';
  return 'other';
};

const buildFallbackRowsFromMappedFields = (fields: FieldRow[]): CdmFieldEditorRow[] => {
  const seen = new Set<string>();
  const rows: CdmFieldEditorRow[] = [];

  for (const field of fields) {
    const name = String(field.field_label || field.field_name || '').trim();
    if (!name) {
      continue;
    }

    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    rows.push({
      id: `fallback-${field.id}`,
      selected: false,
      fieldName: name,
      dataType: String(field.data_type || 'string').trim(),
      lengthPrecision: field.length == null ? '' : String(field.length),
      nullable: !field.is_required,
      description: String(field.description || '').trim(),
      businessRule: '',
      transformationHint: '',
      sourceExamples: String(field.table_name || '').trim(),
    });
  }

  return rows;
};

const downloadTextFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const ObjectCdmPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const [objectSummary, setObjectSummary] = React.useState<any>(null);
  const [linkedDefs, setLinkedDefs] = React.useState<any[]>([]);
  const [allFields, setAllFields] = React.useState<FieldRow[]>([]);
  const [persistedCdmAttributes, setPersistedCdmAttributes] = React.useState<any[]>([]);
  const [persistedCdmRelationships, setPersistedCdmRelationships] = React.useState<any[]>([]);
  const [loadError, setLoadError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [status, setStatus] = React.useState('');
  const [statusSeverity, setStatusSeverity] = React.useState<'success' | 'error' | 'info'>('info');
  const [aiPanelOpen, setAiPanelOpen] = React.useState(false);
  const [aiCdmProposals, setAiCdmProposals] = React.useState<AiCdmFieldProposal[]>([]);
  const [isSavingCdmRows, setIsSavingCdmRows] = React.useState(false);

  const {
    subObjects,
    hasSubObjects,
    selectedSubObjectId,
    setSelectedSubObjectId,
    isLoading: isLoadingSubObjects,
  } = useObjectSubObjectSelection(objectId);

  const scopeSubObjectId = hasSubObjects ? selectedSubObjectId : '';

  const {
    run: runAiCdmDerivation,
    loading: aiDeriveLoading,
    error: aiDeriveError,
  } = useAiCdmDerivation();

  const {
    rows: cdmEditorRows,
    selectedCount,
    initializeRows,
    addRow,
    removeRow,
    updateRow,
    toggleRowSelection,
    toggleAllSelection,
    bulkDeleteSelected,
    bulkSetNullable,
    applyAiSuggestions,
    toJson,
    toSql,
  } = useCdmFieldsEditor();

  const load = React.useCallback(async () => {
    if (!objectId) return;
    if (hasSubObjects && !scopeSubObjectId) {
      setLinkedDefs([]);
      setAllFields([]);
      setPersistedCdmAttributes([]);
      setPersistedCdmRelationships([]);
      initializeRows([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      const [objectRes, linkedRes, cdmRes] = await Promise.all([
        apiClient.get(`/api/global-objects/${objectId}`),
        apiClient.get(`/api/applications/data-definitions/object/${objectId}`, {
          params: { subObjectId: scopeSubObjectId },
        }),
        apiClient.get(`/api/cdm/${objectId}`, {
          params: { subObjectId: scopeSubObjectId || undefined },
        }).catch(() => ({ data: { data: { attributes: [], relationships: [] } } })),
      ]);

      const objectData = objectRes.data?.data || null;
      const definitions = Array.isArray(linkedRes.data?.data) ? linkedRes.data.data : [];

      setObjectSummary(objectData);
      setLinkedDefs(definitions);
      setPersistedCdmAttributes(Array.isArray(cdmRes.data?.data?.attributes) ? cdmRes.data.data.attributes : []);
      setPersistedCdmRelationships(Array.isArray(cdmRes.data?.data?.relationships) ? cdmRes.data.data.relationships : []);

      const fieldResults = await Promise.all(
        definitions.map((definition: any) =>
          apiClient.get(`/api/applications/data-definitions/${definition.id}/fields`)
            .then((response) => ({ definition, rows: Array.isArray(response.data?.data) ? response.data.data : [] }))
            .catch(() => ({ definition, rows: [] }))
        )
      );

      const flattened: FieldRow[] = [];
      fieldResults.forEach(({ definition, rows }) => {
        rows.forEach((field: any) => {
          flattened.push({
            ...field,
            definitionId: definition.id,
            applicationId: definition.application_id,
            applicationName: definition.application_name,
          });
        });
      });

      setAllFields(flattened);
    } catch {
      setLoadError('Failed to load CDM Builder data.');
      setObjectSummary(null);
      setLinkedDefs([]);
      setAllFields([]);
      setPersistedCdmAttributes([]);
      setPersistedCdmRelationships([]);
    } finally {
      setIsLoading(false);
    }
  }, [hasSubObjects, initializeRows, objectId, scopeSubObjectId]);

  React.useEffect(() => {
    load().catch(() => {
      setLoadError('Failed to load CDM Builder data.');
      setIsLoading(false);
    });
  }, [load]);

  const mappingFields = React.useMemo(
    () => allFields.filter((field) => resolveSourceType(field) === 'application'),
    [allFields]
  );

  const schemaFields = React.useMemo(
    () => allFields.filter((field) => resolveSourceType(field) === 'databricks'),
    [allFields]
  );

  React.useEffect(() => {
    if (persistedCdmAttributes.length > 0) {
      initializeRows(mapAttributesToEditorRows(persistedCdmAttributes));
      return;
    }

    initializeRows(buildFallbackRowsFromMappedFields(mappingFields));
  }, [initializeRows, mappingFields, persistedCdmAttributes]);

  const handleDeriveCdmFromSources = async () => {
    if (!scopeSubObjectId) {
      setStatusSeverity('info');
      setStatus('Select a sub-object before deriving CDM fields.');
      return;
    }

    setStatus('');
    try {
      const result = await runAiCdmDerivation(scopeSubObjectId);
      setAiCdmProposals(result.proposals || []);
      setAiPanelOpen(true);
    } catch {
      // Hook exposes error via aiDeriveError.
    }
  };

  const handleApplyAiCdm = async (accepted: AiCdmFieldProposal[]) => {
    if (!accepted.length) {
      setAiPanelOpen(false);
      return;
    }

    applyAiSuggestions(accepted);
    setAiPanelOpen(false);
    setStatusSeverity('success');
    setStatus(`Added ${accepted.length} AI suggestion(s) to the CDM table. Save when ready.`);
  };

  const handleSaveCdmRows = async () => {
    if (hasSubObjects && !scopeSubObjectId) {
      setStatusSeverity('info');
      setStatus('Select a sub-object before saving CDM fields.');
      return;
    }

    setIsSavingCdmRows(true);
    setStatus('');
    try {
      await apiClient.post(`/api/cdm/${objectId}`, {
        subObjectId: scopeSubObjectId || null,
        objectName: objectSummary?.objectId || objectSummary?.object_id || null,
        notes: null,
        attributes: cdmEditorRows
          .filter((row) => row.fieldName.trim())
          .map((row, index) => {
            const lengthValue = Number(String(row.lengthPrecision || '').split(',')[0].trim());
            const validationRules = [
              row.businessRule ? row.businessRule.trim() : '',
              row.transformationHint ? `TRANSFORMATION_HINT:${row.transformationHint.trim()}` : '',
              row.sourceExamples ? `SOURCE_EXAMPLES:${row.sourceExamples.trim()}` : '',
            ].filter(Boolean);

            return {
              attributeName: row.fieldName.trim(),
              attributeDescription: row.description || null,
              dataType: row.dataType || null,
              length: Number.isFinite(lengthValue) ? lengthValue : null,
              businessRules: row.businessRule || null,
              required: !row.nullable,
              validationRules,
              sortOrder: index,
            };
          }),
        relationships: persistedCdmRelationships,
      });

      setStatusSeverity('success');
      setStatus('CDM fields saved.');
      await load();
    } catch {
      setStatusSeverity('error');
      setStatus('Failed to save CDM fields.');
    } finally {
      setIsSavingCdmRows(false);
    }
  };

  const handleExportJson = () => {
    downloadTextFile(toJson(), `cdm-fields-${objectId}.json`, 'application/json');
  };

  const handleExportSql = () => {
    downloadTextFile(toSql('cdm_fields_export'), `cdm-fields-${objectId}.sql`, 'text/sql');
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Common Data Model Builder" breadcrumbLabel="CDM Builder" />

        {(status || aiDeriveError || loadError) && (
          <Alert severity={aiDeriveError || loadError ? 'error' : statusSeverity} sx={{ mb: 2 }} onClose={() => setStatus('')}>
            {aiDeriveError || loadError || status}
          </Alert>
        )}

        <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>CDM Builder</Typography>
                <Typography variant="body2" color="text.secondary">Focus on deriving and editing canonical CDM fields for this object scope.</Typography>
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                size="medium"
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleDeriveCdmFromSources}
                disabled={aiDeriveLoading || isSavingCdmRows || (hasSubObjects && !scopeSubObjectId)}
                sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                {aiDeriveLoading ? 'Deriving...' : 'Derive CDM from Sources'}
              </Button>
            </Stack>

            <Box sx={{ mt: 1.5 }}>
              {isLoadingSubObjects ? (
                <Typography variant="body2" color="text.secondary">Loading sub-objects...</Typography>
              ) : hasSubObjects ? (
                <ObjectSubObjectSelector
                  subObjects={subObjects}
                  selectedSubObjectId={selectedSubObjectId}
                  onChange={setSelectedSubObjectId}
                  helperText="CDM Builder is scoped by selected sub-object."
                />
              ) : (
                <Alert severity="info">This object has no sub-objects. CDM Builder runs at object scope.</Alert>
              )}
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.2 }}>
              Summary
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
              <Chip size="small" label={`Linked Applications: ${linkedDefs.length}`} />
              <Chip size="small" label={`Schema Fields: ${schemaFields.length}`} />
              <Chip size="small" label={`Mapped Fields: ${mappingFields.length}`} />
              <Chip size="small" label={`CDM Attributes: ${cdmEditorRows.filter((row) => row.fieldName.trim()).length}`} />
              {objectSummary?.objectId || objectSummary?.object_id ? (
                <Chip size="small" label={`Object: ${objectSummary?.objectId || objectSummary?.object_id}`} />
              ) : null}
            </Box>
          </CardContent>
        </Card>

        {aiPanelOpen && (
          <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <CardContent>
              <AiCdmFieldProposalPanel
                proposals={aiCdmProposals}
                loading={isSavingCdmRows}
                onApply={handleApplyAiCdm}
                onClose={() => setAiPanelOpen(false)}
              />
            </CardContent>
          </Card>
        )}

        <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <CdmFieldsEditorTable
              rows={cdmEditorRows}
              selectedCount={selectedCount}
              saving={isSavingCdmRows || isLoading}
              onAddRow={addRow}
              onRemoveRow={removeRow}
              onUpdateRow={updateRow}
              onToggleRowSelection={toggleRowSelection}
              onToggleAllSelection={toggleAllSelection}
              onBulkDeleteSelected={bulkDeleteSelected}
              onBulkSetNullable={bulkSetNullable}
              onExportJson={handleExportJson}
              onExportSql={handleExportSql}
              onSave={handleSaveCdmRows}
            />
          </CardContent>
        </Card>
      </Box>
    </Layout>
  );
};

export default ObjectCdmPage;
