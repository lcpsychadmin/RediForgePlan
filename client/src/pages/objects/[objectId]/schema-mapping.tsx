import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import ObjectSubObjectSelector from '../../../components/objects/ObjectSubObjectSelector';
import useObjectSubObjectSelection from '../../../components/objects/useObjectSubObjectSelection';
import apiClient from '../../../api/client';
import DataDefinitionAiProposalModal from '../../../components/objects/DataDefinitionAiProposalModal';
import type { AiDataDefinitionProposalField } from '../../../types/dataDefinitions';
import AiMappingSuggestionPanel from '../../../components/objects/AiMappingSuggestionPanel';
import { useAiMappingSuggestions } from '../../../hooks/useObjectAiActions';
import type { AiMappingSuggestion, CdmFieldInput, SourceFieldInput } from '../../../types/objectAi';

type ViewTab = 'schema' | 'mapping';

interface AppTable {
  tableName: string;
  description: string;
  purpose: string;
}

interface AiTableProposal {
  tableName: string;
  description: string;
  purpose: string;
}

interface FieldDraft {
  fieldName: string;
  fieldLabel: string;
  dataType: string;
  length: string;
  decimals: string;
  isKey: boolean;
  isRequired: boolean;
  description: string;
}

const emptyFieldDraft = (): FieldDraft => ({
  fieldName: '',
  fieldLabel: '',
  dataType: '',
  length: '',
  decimals: '',
  isKey: false,
  isRequired: false,
  description: '',
});

const GRID_SCHEMA = '2fr 3fr 1fr 80px 80px 80px';
const GRID_FIELDS = '1.8fr 1.4fr 1fr 0.7fr 0.7fr 0.6fr 0.6fr 100px';

const ObjectSchemaMappingPage: React.FC = () => {
  const { objectId = '' } = useParams();

  // ── shared state ───────────────────────────────────────────────────────────
  const [apps, setApps] = React.useState<any[]>([]);
  const [linkAppId, setLinkAppId] = React.useState('');
  const [isAssigningApp, setIsAssigningApp] = React.useState(false);
  const [isLoadingLinked, setIsLoadingLinked] = React.useState(false);
  const [linked, setLinked] = React.useState<any[]>([]);
  const [selectedDataDefId, setSelectedDataDefId] = React.useState('');
  const [viewTab, setViewTab] = React.useState<ViewTab>('schema');
  const [status, setStatus] = React.useState('');
  const [statusSeverity, setStatusSeverity] = React.useState<'success' | 'error' | 'info'>('info');

  // ── schema (table management) state ───────────────────────────────────────
  const [applicationTables, setApplicationTables] = React.useState<AppTable[]>([]);
  const [tableProposals, setTableProposals] = React.useState<AiTableProposal[]>([]);
  const [proposalOpen, setProposalOpen] = React.useState(false);
  const [acceptedProposalNames, setAcceptedProposalNames] = React.useState<Set<string>>(new Set());
  const [isGeneratingTables, setIsGeneratingTables] = React.useState(false);
  const [isSavingTables, setIsSavingTables] = React.useState(false);
  const [addingTable, setAddingTable] = React.useState(false);
  const [newTableDraft, setNewTableDraft] = React.useState<AppTable>({ tableName: '', description: '', purpose: '' });
  const [editTableIdx, setEditTableIdx] = React.useState<number | null>(null);
  const [editTableDraft, setEditTableDraft] = React.useState<AppTable | null>(null);

  // ── mapping (field management) state ──────────────────────────────────────
  const [selectedMappingTable, setSelectedMappingTable] = React.useState('');
  const [dataDefFields, setDataDefFields] = React.useState<any[]>([]);
  const [isGeneratingFields, setIsGeneratingFields] = React.useState(false);
  const [isSavingFields, setIsSavingFields] = React.useState(false);
  const [aiFieldProposals, setAiFieldProposals] = React.useState<AiDataDefinitionProposalField[]>([]);
  const [aiFieldProposalOpen, setAiFieldProposalOpen] = React.useState(false);
  const [aiMappingSuggestionsOpen, setAiMappingSuggestionsOpen] = React.useState(false);
  const [aiMappingSuggestions, setAiMappingSuggestions] = React.useState<AiMappingSuggestion[]>([]);
  const [aiMappingAverageConfidence, setAiMappingAverageConfidence] = React.useState(0);
  const [isApplyingMappings, setIsApplyingMappings] = React.useState(false);
  const [addingField, setAddingField] = React.useState(false);
  const [newFieldDraft, setNewFieldDraft] = React.useState<FieldDraft>(emptyFieldDraft());
  const [editFieldId, setEditFieldId] = React.useState<string | null>(null);
  const [editFieldDraft, setEditFieldDraft] = React.useState<FieldDraft>(emptyFieldDraft());

  const {
    subObjects,
    hasSubObjects,
    selectedSubObjectId,
    setSelectedSubObjectId,
    isLoading: isLoadingSubObjects,
  } = useObjectSubObjectSelection(objectId);

  const scopeSubObjectId = hasSubObjects ? selectedSubObjectId : '';

  const {
    run: runAiMappingSuggestions,
    loading: isGeneratingMappingSuggestions,
    error: aiMappingError,
  } = useAiMappingSuggestions();

  const loadApplications = React.useCallback(async () => {
    const res = await apiClient.get('/api/applications');
    setApps(res.data?.data || []);
  }, []);

  // ── load linked applications ───────────────────────────────────────────────
  const loadLinkedDefinitions = React.useCallback(async () => {
    setIsLoadingLinked(true);
    if (hasSubObjects && !scopeSubObjectId) {
      setLinked([]);
      setSelectedDataDefId('');
      setIsLoadingLinked(false);
      return;
    }
    try {
      const res = await apiClient.get(`/api/applications/data-definitions/object/${objectId}`, {
        params: { subObjectId: scopeSubObjectId },
      });
      const rows = res.data?.data || [];
      setLinked(rows);
      setSelectedDataDefId((prev) =>
        prev && rows.some((r: any) => r.id === prev) ? prev : (rows[0]?.id || '')
      );
    } finally {
      setIsLoadingLinked(false);
    }
  }, [hasSubObjects, objectId, scopeSubObjectId]);

  React.useEffect(() => {
    loadLinkedDefinitions().catch(() => {
      setLinked([]);
      setSelectedDataDefId('');
    });
  }, [loadLinkedDefinitions]);

  React.useEffect(() => {
    loadApplications().catch(() => setApps([]));
  }, [loadApplications]);

  // ── sync tables from definition when selection changes ────────────────────
  const selectedDefinition = linked.find((r: any) => r.id === selectedDataDefId) || null;

  React.useEffect(() => {
    const tables: AppTable[] = Array.isArray(selectedDefinition?.mappedTables)
      ? selectedDefinition.mappedTables.map((t: any) => ({
          tableName: String(t?.tableName || t?.table_name || ''),
          description: String(t?.description || ''),
          purpose: String(t?.purpose || ''),
        }))
      : [];
    setApplicationTables(tables);
    setSelectedMappingTable((prev) => {
      const stillValid = tables.some((t) => t.tableName === prev);
      return stillValid ? prev : (tables[0]?.tableName || '');
    });
  }, [selectedDataDefId, linked]);

  // ── load fields ───────────────────────────────────────────────────────────
  const loadFields = React.useCallback(async (defId: string) => {
    if (!defId) { setDataDefFields([]); return; }
    const res = await apiClient.get(`/api/applications/data-definitions/${defId}/fields`);
    setDataDefFields(res.data?.data || []);
  }, []);

  React.useEffect(() => {
    loadFields(selectedDataDefId).catch(() => setDataDefFields([]));
  }, [selectedDataDefId, loadFields]);

  // ── derived: fields for selected mapping table ────────────────────────────
  const fieldsForTable = dataDefFields.filter((f: any) =>
    String(f?.table_name || '').trim().toLowerCase() === selectedMappingTable.trim().toLowerCase()
  );

  // ── schema tab: AI table generation ───────────────────────────────────────
  const handleGenerateTables = async () => {
    if (!selectedDataDefId) return;
    setIsGeneratingTables(true);
    setStatus('');
    try {
      const res = await apiClient.post(
        `/api/applications/data-definitions/${selectedDataDefId}/ai-generate-tables`,
        {},
        { timeout: 30000 }
      );
      const proposals: AiTableProposal[] = res.data?.data?.proposals || [];
      // Pre-select proposals not already in the table list
      const existingNames = new Set(applicationTables.map((t) => t.tableName.toLowerCase()));
      setAcceptedProposalNames(
        new Set(proposals.filter((p) => !existingNames.has(p.tableName.toLowerCase())).map((p) => p.tableName))
      );
      setTableProposals(proposals);
      setProposalOpen(true);
    } catch (err: any) {
      setStatusSeverity('error');
      setStatus(err?.response?.data?.message || err?.message || 'Failed to generate tables.');
    } finally {
      setIsGeneratingTables(false);
    }
  };

  const handleAssignApplication = async () => {
    if (!linkAppId) return;
    setIsAssigningApp(true);
    setStatus('');
    try {
      const res = await apiClient.post('/api/applications/data-definitions', {
        globalObjectId: objectId,
        applicationId: linkAppId,
        subObjectId: hasSubObjects ? scopeSubObjectId || null : null,
      });
      await loadLinkedDefinitions();
      setSelectedDataDefId(res.data?.data?.id || '');
      setLinkAppId('');
      setStatusSeverity('success');
      setStatus('Application assigned to selected scope. You can now discover tables.');
    } catch (err: any) {
      setStatusSeverity('error');
      setStatus(err?.response?.data?.message || 'Failed to assign application.');
    } finally {
      setIsAssigningApp(false);
    }
  };

  const handleAcceptTableProposals = async () => {
    const toAdd = tableProposals.filter((p) => acceptedProposalNames.has(p.tableName));
    const existingNames = new Set(applicationTables.map((t) => t.tableName.toLowerCase()));
    const merged = [
      ...applicationTables,
      ...toAdd.filter((p) => !existingNames.has(p.tableName.toLowerCase())),
    ];
    await saveTables(merged);
    setProposalOpen(false);
  };

  // ── schema tab: save tables to DB ─────────────────────────────────────────
  const saveTables = async (tables: AppTable[]) => {
    if (!selectedDataDefId) return;
    setIsSavingTables(true);
    try {
      const persist = async (definitionId: string) => {
        await apiClient.put(`/api/applications/data-definitions/${definitionId}`, {
          mappedTables: tables,
        });
        return definitionId;
      };

      let persistedDefinitionId = selectedDataDefId;
      try {
        persistedDefinitionId = await persist(selectedDataDefId);
      } catch (err: any) {
        const isConflict = Number(err?.response?.status) === 409;
        if (!isConflict) throw err;

        // Re-resolve current scope mapping and retry once using the scoped row ID.
        const refreshed = await apiClient.get(`/api/applications/data-definitions/object/${objectId}`, {
          params: { subObjectId: scopeSubObjectId },
        });
        const rows = refreshed.data?.data || [];
        setLinked(rows);

        const targetApplicationId = String(
          selectedDefinition?.applicationId || selectedDefinition?.application_id || ''
        );
        const resolved = rows.find((row: any) => String(row?.applicationId || row?.application_id || '') === targetApplicationId);
        const retryId = resolved?.id || selectedDataDefId;

        persistedDefinitionId = await persist(retryId);
        if (retryId !== selectedDataDefId) {
          setSelectedDataDefId(retryId);
        }
      }

      setApplicationTables(tables);
      // update linked cache
      setLinked((prev) =>
        prev.map((r) => r.id === persistedDefinitionId ? { ...r, mappedTables: tables } : r)
      );
      setStatusSeverity('success');
      setStatus('Tables saved.');
    } catch (err: any) {
      setStatusSeverity('error');
      setStatus(err?.response?.data?.error || err?.response?.data?.message || 'Failed to save tables.');
    } finally {
      setIsSavingTables(false);
    }
  };

  const handleAddTable = async () => {
    if (!newTableDraft.tableName.trim()) return;
    const updated = [...applicationTables, { ...newTableDraft, tableName: newTableDraft.tableName.trim() }];
    await saveTables(updated);
    setNewTableDraft({ tableName: '', description: '', purpose: '' });
    setAddingTable(false);
  };

  const handleSaveEditTable = async (idx: number) => {
    if (!editTableDraft) return;
    const updated = applicationTables.map((t, i) => (i === idx ? { ...editTableDraft } : t));
    await saveTables(updated);
    setEditTableIdx(null);
    setEditTableDraft(null);
  };

  const handleDeleteTable = async (idx: number) => {
    const updated = applicationTables.filter((_, i) => i !== idx);
    await saveTables(updated);
  };

  // ── mapping tab: AI field generation ──────────────────────────────────────
  const handleGenerateFields = async () => {
    if (!selectedDataDefId || !selectedMappingTable) return;
    setIsGeneratingFields(true);
    setStatus('');
    try {
      const res = await apiClient.post(
        `/api/applications/data-definitions/${selectedDataDefId}/ai-generate-fields`,
        { targetTableName: selectedMappingTable },
        { timeout: 120000 }
      );
      const proposals = res.data?.data?.proposals || [];
      setAiFieldProposals(Array.isArray(proposals) ? proposals : []);
      setAiFieldProposalOpen(true);
    } catch (err: any) {
      setStatusSeverity('error');
      setStatus(err?.response?.data?.message || err?.message || 'Failed to generate fields.');
    } finally {
      setIsGeneratingFields(false);
    }
  };

  const handleAcceptAiFields = async (accepted: AiDataDefinitionProposalField[]) => {
    if (!selectedDataDefId || accepted.length === 0) return;
    setIsSavingFields(true);
    try {
      const existingKeys = new Set(
        fieldsForTable.map((f: any) => String(f?.field_name || '').trim().toLowerCase())
      );
      for (const field of accepted) {
        const key = String(field.fieldName || '').trim().toLowerCase();
        if (existingKeys.has(key)) continue;
        await apiClient.post(`/api/applications/data-definitions/${selectedDataDefId}/fields`, {
          tableName: selectedMappingTable,
          fieldName: field.fieldName,
          fieldLabel: field.label,
          dataType: field.fieldType,
          length: field.fieldLength,
          decimals: field.decimalPlaces,
          isKey: field.isKey || field.systemRequired,
          isRequired: field.businessProcessRequired,
          description: field.fieldDescription,
          fieldMetadata: { application: { table: selectedMappingTable } },
        });
      }
      await loadFields(selectedDataDefId);
      setAiFieldProposalOpen(false);
      setStatusSeverity('success');
      setStatus('Fields added.');
    } catch (err: any) {
      setStatusSeverity('error');
      setStatus(err?.response?.data?.message || 'Failed to save fields.');
    } finally {
      setIsSavingFields(false);
    }
  };

  // ── mapping tab: manual add field ─────────────────────────────────────────
  const handleAddField = async () => {
    if (!newFieldDraft.fieldName.trim() || !selectedDataDefId || !selectedMappingTable) return;
    try {
      await apiClient.post(`/api/applications/data-definitions/${selectedDataDefId}/fields`, {
        tableName: selectedMappingTable,
        fieldName: newFieldDraft.fieldName.trim(),
        fieldLabel: newFieldDraft.fieldLabel,
        dataType: newFieldDraft.dataType,
        length: newFieldDraft.length ? Number(newFieldDraft.length) : null,
        decimals: newFieldDraft.decimals ? Number(newFieldDraft.decimals) : null,
        isKey: newFieldDraft.isKey,
        isRequired: newFieldDraft.isRequired,
        description: newFieldDraft.description,
        fieldMetadata: { application: { table: selectedMappingTable } },
      });
      await loadFields(selectedDataDefId);
      setNewFieldDraft(emptyFieldDraft());
      setAddingField(false);
    } catch (err: any) {
      setStatusSeverity('error');
      setStatus(err?.response?.data?.message || 'Failed to add field.');
    }
  };

  const handleSaveEditField = async (fieldId: string) => {
    try {
      await apiClient.put(`/api/applications/data-definitions/fields/${fieldId}`, {
        tableName: selectedMappingTable,
        fieldName: editFieldDraft.fieldName,
        fieldLabel: editFieldDraft.fieldLabel,
        dataType: editFieldDraft.dataType,
        length: editFieldDraft.length ? Number(editFieldDraft.length) : null,
        decimals: editFieldDraft.decimals ? Number(editFieldDraft.decimals) : null,
        isKey: editFieldDraft.isKey,
        isRequired: editFieldDraft.isRequired,
        description: editFieldDraft.description,
      });
      await loadFields(selectedDataDefId);
      setEditFieldId(null);
    } catch (err: any) {
      setStatusSeverity('error');
      setStatus(err?.response?.data?.message || 'Failed to update field.');
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    try {
      await apiClient.delete(`/api/applications/data-definitions/fields/${fieldId}`);
      await loadFields(selectedDataDefId);
    } catch (err: any) {
      setStatusSeverity('error');
      setStatus(err?.response?.data?.message || 'Failed to delete field.');
    }
  };

  const handleSuggestMappings = async () => {
    if (!selectedMappingTable || fieldsForTable.length === 0) {
      setStatusSeverity('info');
      setStatus('Add fields to the selected table before requesting AI mapping suggestions.');
      return;
    }

    try {
      const cdmRes = await apiClient.get(`/api/cdm/${objectId}`, {
        params: { subObjectId: scopeSubObjectId || undefined },
      });

      const cdmAttributes = Array.isArray(cdmRes.data?.data?.attributes) ? cdmRes.data.data.attributes : [];
      if (cdmAttributes.length === 0) {
        setStatusSeverity('info');
        setStatus('No CDM fields found for this scope. Derive or define CDM first.');
        return;
      }

      const sourceFields: SourceFieldInput[] = fieldsForTable.map((field: any) => ({
        applicationId: String(selectedDefinition?.application_id || selectedDefinition?.applicationId || ''),
        applicationName: String(selectedDefinition?.application_name || selectedDefinition?.applicationName || ''),
        tableName: String(field.table_name || selectedMappingTable),
        fieldName: String(field.field_name || ''),
        fieldLabel: String(field.field_label || ''),
        dataType: String(field.data_type || ''),
        length: field.length == null ? null : Number(field.length),
        decimals: field.decimals == null ? null : Number(field.decimals),
        description: String(field.description || ''),
      }));

      const cdmFields: CdmFieldInput[] = cdmAttributes.map((attr: any) => ({
        fieldName: String(attr.attributeName || attr.name || ''),
        description: String(attr.attributeDescription || attr.definition || ''),
        dataType: String(attr.dataType || 'string'),
        length: attr.length == null ? null : Number(attr.length),
        required: Boolean(attr.required),
        aliases: [],
        sourceFields: [],
      })).filter((row) => row.fieldName);

      const result = await runAiMappingSuggestions({
        objectName: String(objectId),
        subObjectId: scopeSubObjectId || undefined,
        sourceFields,
        cdmFields,
      });

      setAiMappingSuggestions(result.suggestions || []);
      setAiMappingAverageConfidence(result.averageConfidenceScore || 0);
      setAiMappingSuggestionsOpen(true);
    } catch {
      // Hook exposes error message.
    }
  };

  const handleApplyMappingSuggestions = async (accepted: AiMappingSuggestion[]) => {
    if (!accepted.length || !selectedDataDefId) {
      setAiMappingSuggestionsOpen(false);
      return;
    }

    setIsApplyingMappings(true);
    try {
      for (const suggestion of accepted) {
        const match = fieldsForTable.find((field: any) =>
          String(field.field_name || '').trim().toLowerCase() === String(suggestion.sourceFieldName || '').trim().toLowerCase()
        );

        if (!match?.id) {
          continue;
        }

        const metadata = (match.field_metadata && typeof match.field_metadata === 'object') ? { ...match.field_metadata } : {};
        metadata.aiMapping = {
          cdmFieldName: suggestion.cdmFieldName,
          confidenceScore: suggestion.confidenceScore,
          explanation: suggestion.explanation,
          transformRule: suggestion.transformRule,
          matchType: suggestion.matchType,
          suggestedAt: new Date().toISOString(),
        };

        await apiClient.put(`/api/applications/data-definitions/fields/${match.id}`, {
          tableName: selectedMappingTable,
          fieldName: match.field_name,
          fieldLabel: match.field_label,
          dataType: match.data_type,
          length: match.length,
          decimals: match.decimals,
          isKey: Boolean(match.is_key),
          isRequired: Boolean(match.is_required),
          description: match.description,
          fieldMetadata: metadata,
        });
      }

      await loadFields(selectedDataDefId);
      setAiMappingSuggestionsOpen(false);
      setStatusSeverity('success');
      setStatus('AI mapping suggestions applied to field metadata.');
    } catch (err: any) {
      setStatusSeverity('error');
      setStatus(err?.response?.data?.message || 'Failed to apply mapping suggestions.');
    } finally {
      setIsApplyingMappings(false);
    }
  };

  const startEditField = (field: any) => {
    setEditFieldId(String(field.id));
    setEditFieldDraft({
      fieldName: String(field.field_name || ''),
      fieldLabel: String(field.field_label || ''),
      dataType: String(field.data_type || ''),
      length: String(field.length ?? ''),
      decimals: String(field.decimals ?? ''),
      isKey: Boolean(field.is_key),
      isRequired: Boolean(field.is_required),
      description: String(field.description || ''),
    });
  };

  // ── table header helper ───────────────────────────────────────────────────
  const GridHeader: React.FC<{ cols: string; labels: string[] }> = ({ cols, labels }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: cols, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px 4px 0 0' }}>
      {labels.map((l) => (
        <Box key={l} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{l}</Box>
      ))}
    </Box>
  );

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Schema & Mapping" breadcrumbLabel="Schema & Mapping" />

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            {/* Sub-object selector */}
            {isLoadingSubObjects ? (
              <Typography variant="body2" color="text.secondary">Loading...</Typography>
            ) : hasSubObjects ? (
              <ObjectSubObjectSelector
                subObjects={subObjects}
                selectedSubObjectId={selectedSubObjectId}
                onChange={setSelectedSubObjectId}
                helperText="Schema and mapping are scoped by selected sub-object."
              />
            ) : null}

            {/* Application selector */}
            <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 2, alignItems: 'center' }}>
              <TextField
                select
                size="small"
                label="Application"
                value={selectedDataDefId}
                onChange={(e) => setSelectedDataDefId(e.target.value)}
                sx={{ minWidth: 260 }}
              >
                {linked.map((row) => (
                  <MenuItem key={row.id} value={row.id}>{row.applicationName || row.application_name}</MenuItem>
                ))}
              </TextField>
              {selectedDefinition && (
                <Typography variant="caption" color="text.secondary">
                  {applicationTables.length} table(s) defined
                </Typography>
              )}
            </Stack>

            {!isLoadingLinked && linked.length === 0 && (
              <Stack spacing={1.2} sx={{ mb: 2 }}>
                <Alert severity="info">
                  No application is assigned for this sub-object scope yet. Assign one below to enable AI table discovery.
                </Alert>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    select
                    size="small"
                    label="Assign Application"
                    value={linkAppId}
                    onChange={(e) => setLinkAppId(e.target.value)}
                    sx={{ minWidth: 260 }}
                  >
                    {apps.map((app) => (
                      <MenuItem key={app.id} value={app.id}>{app.name}</MenuItem>
                    ))}
                  </TextField>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleAssignApplication}
                    disabled={!linkAppId || isAssigningApp || (hasSubObjects && !scopeSubObjectId)}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                  >
                    {isAssigningApp ? 'Assigning...' : 'Assign & Continue'}
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* View tabs */}
            <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.12)', mb: 2 }}>
              <Tabs value={viewTab} onChange={(_e, v) => setViewTab(v)}>
                <Tab label="Schema" value="schema" />
                <Tab label="Mapping" value="mapping" />
              </Tabs>
            </Box>

            {/* ── SCHEMA TAB ─────────────────────────────────────────────── */}
            {viewTab === 'schema' && (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    Define the application tables relevant to this object. Use AI to discover tables or add them manually.
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={handleGenerateTables}
                    disabled={isGeneratingTables || !selectedDefinition}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                  >
                    {isGeneratingTables ? 'Generating...' : 'Discover Tables (AI)'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => { setAddingTable(true); setNewTableDraft({ tableName: '', description: '', purpose: '' }); }}
                    disabled={!selectedDefinition}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                  >
                    Add Table
                  </Button>
                </Stack>

                {!selectedDefinition && (
                  <Alert severity="info">
                    Select or assign an application for this scope to enable AI table discovery and manual table entry.
                  </Alert>
                )}

                {selectedDefinition && (
                <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
                  <GridHeader cols={GRID_SCHEMA} labels={['Table Name', 'Description', 'Purpose', '', '', '']} />

                  {applicationTables.length === 0 && !addingTable && (
                    <Box sx={{ p: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">No tables defined yet. Use "Discover Tables (AI)" or "Add Table" to get started.</Typography>
                    </Box>
                  )}

                  {applicationTables.map((table, idx) => (
                    editTableIdx === idx && editTableDraft ? (
                      <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: GRID_SCHEMA, borderTop: '1px solid rgba(255,255,255,0.08)', alignItems: 'center', p: 0.5, gap: 0.5 }}>
                        <TextField size="small" value={editTableDraft.tableName} onChange={(e) => setEditTableDraft({ ...editTableDraft, tableName: e.target.value })} />
                        <TextField size="small" value={editTableDraft.description} onChange={(e) => setEditTableDraft({ ...editTableDraft, description: e.target.value })} />
                        <TextField size="small" value={editTableDraft.purpose} onChange={(e) => setEditTableDraft({ ...editTableDraft, purpose: e.target.value })} placeholder="Primary/Ref/Ext" />
                        <IconButton size="small" onClick={() => handleSaveEditTable(idx)} disabled={isSavingTables}><CheckIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => { setEditTableIdx(null); setEditTableDraft(null); }}><CloseIcon fontSize="small" /></IconButton>
                        <Box />
                      </Box>
                    ) : (
                      <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: GRID_SCHEMA, borderTop: '1px solid rgba(255,255,255,0.08)', alignItems: 'center' }}>
                        <Box sx={{ px: 1, py: 0.8, fontWeight: 600, fontFamily: 'monospace', fontSize: '0.88rem' }}>{table.tableName}</Box>
                        <Box sx={{ px: 1, py: 0.8, color: 'text.secondary', fontSize: '0.85rem' }}>{table.description || '-'}</Box>
                        <Box sx={{ px: 1, py: 0.8 }}>
                          {table.purpose ? <Chip label={table.purpose} size="small" sx={{ fontSize: '0.7rem', height: 20 }} /> : '-'}
                        </Box>
                        <IconButton size="small" onClick={() => { setEditTableIdx(idx); setEditTableDraft({ ...table }); }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteTable(idx)} disabled={isSavingTables}><DeleteIcon fontSize="small" /></IconButton>
                        <Box />
                      </Box>
                    )
                  ))}

                  {addingTable && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: GRID_SCHEMA, borderTop: '1px solid rgba(255,255,255,0.08)', alignItems: 'center', p: 0.5, gap: 0.5 }}>
                      <TextField size="small" placeholder="Table name" value={newTableDraft.tableName} onChange={(e) => setNewTableDraft({ ...newTableDraft, tableName: e.target.value })} autoFocus />
                      <TextField size="small" placeholder="Description" value={newTableDraft.description} onChange={(e) => setNewTableDraft({ ...newTableDraft, description: e.target.value })} />
                      <TextField size="small" placeholder="Purpose" value={newTableDraft.purpose} onChange={(e) => setNewTableDraft({ ...newTableDraft, purpose: e.target.value })} />
                      <IconButton size="small" onClick={handleAddTable} disabled={!newTableDraft.tableName.trim() || isSavingTables}><CheckIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => setAddingTable(false)}><CloseIcon fontSize="small" /></IconButton>
                      <Box />
                    </Box>
                  )}
                </Box>
                )}
              </Stack>
            )}

            {/* ── MAPPING TAB ────────────────────────────────────────────── */}
            {viewTab === 'mapping' && selectedDefinition && (
              <Stack spacing={2}>
                {applicationTables.length === 0 ? (
                  <Alert severity="info">Define tables on the Schema tab first, then map fields per table here.</Alert>
                ) : (
                  <>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        select
                        size="small"
                        label="Table"
                        value={selectedMappingTable}
                        onChange={(e) => setSelectedMappingTable(e.target.value)}
                        sx={{ minWidth: 220 }}
                      >
                        {applicationTables.map((t) => (
                          <MenuItem key={t.tableName} value={t.tableName}>{t.tableName}</MenuItem>
                        ))}
                      </TextField>
                      {selectedMappingTable && (
                        <Typography variant="caption" color="text.secondary">
                          {fieldsForTable.length} field(s)
                        </Typography>
                      )}
                      <Box sx={{ flexGrow: 1 }} />
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AutoAwesomeIcon />}
                        onClick={handleGenerateFields}
                        disabled={isGeneratingFields || !selectedMappingTable}
                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                      >
                        {isGeneratingFields ? 'Generating...' : 'Generate Fields (AI)'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AutoAwesomeIcon />}
                        onClick={handleSuggestMappings}
                        disabled={isGeneratingMappingSuggestions || !selectedMappingTable || fieldsForTable.length === 0}
                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                      >
                        {isGeneratingMappingSuggestions ? 'Suggesting...' : 'AI Suggest Mappings'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => { setAddingField(true); setNewFieldDraft(emptyFieldDraft()); }}
                        disabled={!selectedMappingTable}
                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                      >
                        Add Field
                      </Button>
                    </Stack>

                    {selectedMappingTable && (
                      <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
                        <GridHeader cols={GRID_FIELDS} labels={['Field Name', 'Label', 'Type', 'Len', 'Dec', 'Key', 'Req', 'Actions']} />

                        {fieldsForTable.length === 0 && !addingField && (
                          <Box sx={{ p: 1.5 }}>
                            <Typography variant="body2" color="text.secondary">No fields for this table yet.</Typography>
                          </Box>
                        )}

                        {fieldsForTable.map((field: any) => (
                          editFieldId === String(field.id) ? (
                            <Box key={field.id} sx={{ display: 'grid', gridTemplateColumns: GRID_FIELDS, borderTop: '1px solid rgba(255,255,255,0.08)', alignItems: 'center', p: 0.5, gap: 0.5 }}>
                              <TextField size="small" value={editFieldDraft.fieldName} onChange={(e) => setEditFieldDraft({ ...editFieldDraft, fieldName: e.target.value })} />
                              <TextField size="small" value={editFieldDraft.fieldLabel} onChange={(e) => setEditFieldDraft({ ...editFieldDraft, fieldLabel: e.target.value })} />
                              <TextField size="small" value={editFieldDraft.dataType} onChange={(e) => setEditFieldDraft({ ...editFieldDraft, dataType: e.target.value })} />
                              <TextField size="small" value={editFieldDraft.length} onChange={(e) => setEditFieldDraft({ ...editFieldDraft, length: e.target.value })} />
                              <TextField size="small" value={editFieldDraft.decimals} onChange={(e) => setEditFieldDraft({ ...editFieldDraft, decimals: e.target.value })} />
                              <Checkbox size="small" checked={editFieldDraft.isKey} onChange={(e) => setEditFieldDraft({ ...editFieldDraft, isKey: e.target.checked })} />
                              <Checkbox size="small" checked={editFieldDraft.isRequired} onChange={(e) => setEditFieldDraft({ ...editFieldDraft, isRequired: e.target.checked })} />
                              <Stack direction="row" spacing={0}>
                                <IconButton size="small" onClick={() => handleSaveEditField(String(field.id))}><CheckIcon fontSize="small" /></IconButton>
                                <IconButton size="small" onClick={() => setEditFieldId(null)}><CloseIcon fontSize="small" /></IconButton>
                              </Stack>
                            </Box>
                          ) : (
                            <Box key={field.id} sx={{ display: 'grid', gridTemplateColumns: GRID_FIELDS, borderTop: '1px solid rgba(255,255,255,0.08)', alignItems: 'center' }}>
                              <Box sx={{ px: 1, py: 0.7, fontFamily: 'monospace', fontSize: '0.85rem' }}>{field.field_name}</Box>
                              <Box sx={{ px: 1, py: 0.7, color: 'text.secondary', fontSize: '0.83rem' }}>{field.field_label || '-'}</Box>
                              <Box sx={{ px: 1, py: 0.7, color: 'text.secondary', fontSize: '0.83rem' }}>{field.data_type || '-'}</Box>
                              <Box sx={{ px: 1, py: 0.7, color: 'text.secondary', fontSize: '0.83rem' }}>{field.length ?? '-'}</Box>
                              <Box sx={{ px: 1, py: 0.7, color: 'text.secondary', fontSize: '0.83rem' }}>{field.decimals ?? '-'}</Box>
                              <Box sx={{ px: 1, py: 0.7, fontSize: '0.83rem' }}>{field.is_key ? '✓' : '-'}</Box>
                              <Box sx={{ px: 1, py: 0.7, fontSize: '0.83rem' }}>{field.is_required ? '✓' : '-'}</Box>
                              <Stack direction="row" spacing={0} sx={{ px: 0.5 }}>
                                <Tooltip title="Edit"><IconButton size="small" onClick={() => startEditField(field)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDeleteField(String(field.id))}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                              </Stack>
                            </Box>
                          )
                        ))}

                        {addingField && (
                          <Box sx={{ display: 'grid', gridTemplateColumns: GRID_FIELDS, borderTop: '1px solid rgba(255,255,255,0.08)', alignItems: 'center', p: 0.5, gap: 0.5 }}>
                            <TextField size="small" placeholder="Field name*" value={newFieldDraft.fieldName} onChange={(e) => setNewFieldDraft({ ...newFieldDraft, fieldName: e.target.value })} autoFocus />
                            <TextField size="small" placeholder="Label" value={newFieldDraft.fieldLabel} onChange={(e) => setNewFieldDraft({ ...newFieldDraft, fieldLabel: e.target.value })} />
                            <TextField size="small" placeholder="Type" value={newFieldDraft.dataType} onChange={(e) => setNewFieldDraft({ ...newFieldDraft, dataType: e.target.value })} />
                            <TextField size="small" placeholder="Len" value={newFieldDraft.length} onChange={(e) => setNewFieldDraft({ ...newFieldDraft, length: e.target.value })} />
                            <TextField size="small" placeholder="Dec" value={newFieldDraft.decimals} onChange={(e) => setNewFieldDraft({ ...newFieldDraft, decimals: e.target.value })} />
                            <Checkbox size="small" checked={newFieldDraft.isKey} onChange={(e) => setNewFieldDraft({ ...newFieldDraft, isKey: e.target.checked })} />
                            <Checkbox size="small" checked={newFieldDraft.isRequired} onChange={(e) => setNewFieldDraft({ ...newFieldDraft, isRequired: e.target.checked })} />
                            <Stack direction="row" spacing={0}>
                              <IconButton size="small" onClick={handleAddField} disabled={!newFieldDraft.fieldName.trim()}><CheckIcon fontSize="small" /></IconButton>
                              <IconButton size="small" onClick={() => setAddingField(false)}><CloseIcon fontSize="small" /></IconButton>
                            </Stack>
                          </Box>
                        )}
                      </Box>
                    )}

                    {aiMappingSuggestionsOpen && (
                      <AiMappingSuggestionPanel
                        suggestions={aiMappingSuggestions}
                        averageConfidenceScore={aiMappingAverageConfidence}
                        loading={isApplyingMappings}
                        onApply={handleApplyMappingSuggestions}
                        onClose={() => setAiMappingSuggestionsOpen(false)}
                      />
                    )}
                  </>
                )}
              </Stack>
            )}

            {viewTab === 'mapping' && !selectedDefinition && (
              <Typography variant="body2" color="text.secondary">Select an application to map fields.</Typography>
            )}

            {/* Status message */}
            {(status || aiMappingError) && <Alert severity={aiMappingError ? 'error' : statusSeverity} sx={{ mt: 2 }} onClose={() => setStatus('')}>{aiMappingError || status}</Alert>}

            {/* AI Table Proposal Panel */}
            {proposalOpen && (
              <Box sx={{ mt: 2, border: '1px solid rgba(255,255,255,0.18)', borderRadius: 1, p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <AutoAwesomeIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle2">AI-Proposed Tables</Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Button size="small" variant="contained" onClick={handleAcceptTableProposals} disabled={isSavingTables || acceptedProposalNames.size === 0} sx={{ textTransform: 'none' }}>
                    {isSavingTables ? 'Saving...' : `Add ${acceptedProposalNames.size} Selected`}
                  </Button>
                  <IconButton size="small" onClick={() => setProposalOpen(false)}><CloseIcon fontSize="small" /></IconButton>
                </Stack>
                <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
                  <GridHeader cols={GRID_SCHEMA} labels={['', 'Table Name', 'Description', 'Purpose', '', '']} />
                  {tableProposals.map((p) => (
                    <Box key={p.tableName} sx={{ display: 'grid', gridTemplateColumns: GRID_SCHEMA, borderTop: '1px solid rgba(255,255,255,0.08)', alignItems: 'center' }}>
                      <Checkbox
                        size="small"
                        checked={acceptedProposalNames.has(p.tableName)}
                        onChange={(e) => {
                          setAcceptedProposalNames((prev) => {
                            const next = new Set(prev);
                            e.target.checked ? next.add(p.tableName) : next.delete(p.tableName);
                            return next;
                          });
                        }}
                        disabled={applicationTables.some((t) => t.tableName.toLowerCase() === p.tableName.toLowerCase())}
                      />
                      <Box sx={{ px: 1, py: 0.7, fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 600 }}>{p.tableName}</Box>
                      <Box sx={{ px: 1, py: 0.7, color: 'text.secondary', fontSize: '0.85rem' }}>{p.description}</Box>
                      <Box sx={{ px: 1, py: 0.7 }}>
                        {p.purpose ? <Chip label={p.purpose} size="small" sx={{ fontSize: '0.7rem', height: 20 }} /> : '-'}
                      </Box>
                      <Box />
                      <Box sx={{ px: 1, py: 0.7, fontSize: '0.75rem', color: 'text.disabled' }}>
                        {applicationTables.some((t) => t.tableName.toLowerCase() === p.tableName.toLowerCase()) ? 'Already added' : ''}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* AI Field Proposal Modal (reuses existing component) */}
            {aiFieldProposalOpen && (
              <DataDefinitionAiProposalModal
                open={aiFieldProposalOpen}
                onClose={() => setAiFieldProposalOpen(false)}
                proposals={aiFieldProposals}
                isLoading={isSavingFields}
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
