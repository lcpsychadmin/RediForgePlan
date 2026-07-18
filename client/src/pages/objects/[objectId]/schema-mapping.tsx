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

  // ── load linked applications ───────────────────────────────────────────────
  const loadLinkedDefinitions = React.useCallback(async () => {
    if (hasSubObjects && !scopeSubObjectId) {
      setLinked([]);
      setSelectedDataDefId('');
      return;
    }
    const res = await apiClient.get(`/api/applications/data-definitions/object/${objectId}`, {
      params: { subObjectId: scopeSubObjectId },
    });
    const rows = res.data?.data || [];
    setLinked(rows);
    setSelectedDataDefId((prev) =>
      prev && rows.some((r: any) => r.id === prev) ? prev : (rows[0]?.id || '')
    );
  }, [hasSubObjects, objectId, scopeSubObjectId]);

  React.useEffect(() => {
    loadLinkedDefinitions().catch(() => {
      setLinked([]);
      setSelectedDataDefId('');
    });
  }, [loadLinkedDefinitions]);

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
      await apiClient.put(`/api/applications/data-definitions/${selectedDataDefId}`, {
        mappedTables: tables,
      });
      setApplicationTables(tables);
      // update linked cache
      setLinked((prev) =>
        prev.map((r) => r.id === selectedDataDefId ? { ...r, mappedTables: tables } : r)
      );
      setStatusSeverity('success');
      setStatus('Tables saved.');
    } catch (err: any) {
      setStatusSeverity('error');
      setStatus(err?.response?.data?.message || 'Failed to save tables.');
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

            {/* View tabs */}
            <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.12)', mb: 2 }}>
              <Tabs value={viewTab} onChange={(_e, v) => setViewTab(v)}>
                <Tab label="Schema" value="schema" />
                <Tab label="Mapping" value="mapping" />
              </Tabs>
            </Box>

            {/* ── SCHEMA TAB ─────────────────────────────────────────────── */}
            {viewTab === 'schema' && selectedDefinition && (
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
                    disabled={isGeneratingTables}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                  >
                    {isGeneratingTables ? 'Generating...' : 'Discover Tables (AI)'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => { setAddingTable(true); setNewTableDraft({ tableName: '', description: '', purpose: '' }); }}
                    sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                  >
                    Add Table
                  </Button>
                </Stack>

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
              </Stack>
            )}

            {viewTab === 'schema' && !selectedDefinition && (
              <Typography variant="body2" color="text.secondary">Select an application to manage its schema tables.</Typography>
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
                  </>
                )}
              </Stack>
            )}

            {viewTab === 'mapping' && !selectedDefinition && (
              <Typography variant="body2" color="text.secondary">Select an application to map fields.</Typography>
            )}

            {/* Status message */}
            {status && <Alert severity={statusSeverity} sx={{ mt: 2 }} onClose={() => setStatus('')}>{status}</Alert>}

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
