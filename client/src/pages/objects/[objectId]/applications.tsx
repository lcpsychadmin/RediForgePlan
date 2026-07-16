import React from 'react';
import {
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
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import apiClient from '../../../api/client';

interface DataDefinitionFieldDraft {
  subObjectId: string;
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
  const [dataDefSubObjects, setDataDefSubObjects] = React.useState<any[]>([]);
  const [dataDefFields, setDataDefFields] = React.useState<any[]>([]);
  const [selectedSubObjectId, setSelectedSubObjectId] = React.useState('');
  const [addingSubObj, setAddingSubObj] = React.useState(false);
  const [newSubObjName, setNewSubObjName] = React.useState('');
  const [editingFieldId, setEditingFieldId] = React.useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = React.useState<DataDefinitionFieldDraft>(emptyFieldDraft());
  const [catalogs, setCatalogs] = React.useState<string[]>([]);
  const [schemas, setSchemas] = React.useState<string[]>([]);
  const [tables, setTables] = React.useState<string[]>([]);
  const [metadataBySubObject, setMetadataBySubObject] = React.useState<Record<string, { catalog: string; schema: string; table: string }>>({});
  const [isSyncingMetadata, setIsSyncingMetadata] = React.useState(false);
  const [lastSyncedBySubObject, setLastSyncedBySubObject] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState('');

  const load = React.useCallback(async (currentSelectedId?: string) => {
    const [appsRes, linkedRes] = await Promise.all([
      apiClient.get('/api/applications'),
      apiClient.get(`/api/applications/data-definitions/object/${objectId}`),
    ]);
    const appsPayload = appsRes.data?.data || [];
    const linkedPayload = linkedRes.data?.data || [];
    setApps(appsPayload);
    setLinked(linkedPayload);

    const activeId = currentSelectedId || selectedDataDefId;
    if (!activeId || !linkedPayload.some((row: any) => row.id === activeId)) {
      setSelectedDataDefId(linkedPayload[0]?.id || '');
    }
  }, [objectId]);

  const loadSelectedDefinition = React.useCallback(async (definitionId: string) => {
    if (!definitionId) {
      setDataDefSubObjects([]);
      setDataDefFields([]);
      setSelectedSubObjectId('');
      setLastSyncedBySubObject({});
      return;
    }

    const [subRes, fieldsRes] = await Promise.all([
      apiClient.get(`/api/applications/data-definitions/${definitionId}/sub-objects`),
      apiClient.get(`/api/applications/data-definitions/${definitionId}/fields`),
    ]);

    const subObjects = subRes.data?.data || [];
    const fields = fieldsRes.data?.data || [];
    setDataDefSubObjects(subObjects);
    setDataDefFields(fields);

    if (!subObjects.some((sub: any) => sub.id === selectedSubObjectId)) {
      setSelectedSubObjectId(subObjects[0]?.id || '');
    }

    const perSubSync: Record<string, string> = {};
    fields.forEach((field: any) => {
      const sid = field.sub_object_id || '';
      if (!sid) return;
      const syncedAt = field?.field_metadata?.metadataSync?.syncedAt;
      if (!syncedAt) return;
      if (!perSubSync[sid] || new Date(syncedAt).getTime() > new Date(perSubSync[sid]).getTime()) {
        perSubSync[sid] = syncedAt;
      }
    });
    setLastSyncedBySubObject(perSubSync);
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
    load().catch(() => {
      setApps([]);
      setLinked([]);
    });
  }, [load]);

  React.useEffect(() => {
    loadSelectedDefinition(selectedDataDefId).catch(() => {
      setDataDefSubObjects([]);
      setDataDefFields([]);
      setSelectedSubObjectId('');
      setLastSyncedBySubObject({});
    });
  }, [selectedDataDefId, loadSelectedDefinition]);

  React.useEffect(() => {
    loadMetadataCatalogs().catch(() => {
      setCatalogs([]);
    });
  }, [loadMetadataCatalogs]);

  const selectedDefinition = linked.find((row: any) => row.id === selectedDataDefId) || null;
  const selectedSubObject = dataDefSubObjects.find((sub: any) => sub.id === selectedSubObjectId) || null;
  const selectedSubObjectFields = dataDefFields.filter((field: any) => field.sub_object_id === selectedSubObjectId);
  const metadataDraft = metadataBySubObject[selectedSubObjectId] || { catalog: '', schema: '', table: '' };

  const handleLink = async () => {
    if (!linkAppId) return;
    await apiClient.post('/api/applications/data-definitions', { globalObjectId: objectId, applicationId: linkAppId });
    setLinkAppId('');
    setStatus('Application linked.');
    await load(selectedDataDefId);
  };

  const startCreateField = (subObjectId: string) => {
    setEditingFieldId('new');
    setFieldDraft({ ...emptyFieldDraft(), subObjectId });
  };

  const startEditField = (field: any) => {
    setEditingFieldId(field.id);
    setFieldDraft({
      subObjectId: field.sub_object_id || '',
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
  };

  const cancelFieldEdit = () => {
    setEditingFieldId(null);
    setFieldDraft(emptyFieldDraft());
  };

  const saveField = async () => {
    if (!selectedDataDefId || !fieldDraft.fieldName.trim()) return;

    const payload = {
      subObjectId: fieldDraft.subObjectId || null,
      tableName: selectedDefinition?.application_name || null,
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
        businessRules: fieldDraft.businessRules || '',
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

  const handleAddSubObject = async () => {
    if (!selectedDataDefId || !newSubObjName.trim()) return;
    await apiClient.post(`/api/applications/data-definitions/${selectedDataDefId}/sub-objects`, {
      name: newSubObjName.trim(),
      sortOrder: dataDefSubObjects.length,
    });
    setNewSubObjName('');
    setAddingSubObj(false);
    await loadSelectedDefinition(selectedDataDefId);
    setStatus('Sub-object added.');
  };

  const handleDeleteSubObject = async (subObjectId: string) => {
    await apiClient.delete(`/api/applications/data-definitions/sub-objects/${subObjectId}`);
    await loadSelectedDefinition(selectedDataDefId);
    if (selectedSubObjectId === subObjectId) {
      setSelectedSubObjectId('');
    }
    setStatus('Sub-object deleted.');
  };

  const handleMetadataSync = async () => {
    if (!selectedDataDefId || !selectedSubObjectId || !metadataDraft.catalog || !metadataDraft.schema || !metadataDraft.table) {
      setStatus('Catalog, schema, and table are required for metadata sync.');
      return;
    }

    setIsSyncingMetadata(true);
    try {
      const response = await apiClient.post(`/api/applications/data-definitions/${selectedDataDefId}/metadata-sync`, {
        catalog: metadataDraft.catalog,
        schema: metadataDraft.schema,
        table: metadataDraft.table,
        subObjectId: selectedSubObjectId,
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

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Object Applications" breadcrumbLabel="Applications" />

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Linked Applications</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
              <TextField
                select
                size="small"
                label="Application"
                value={linkAppId}
                onChange={(e) => setLinkAppId(e.target.value)}
                sx={{ minWidth: 280 }}
              >
                {apps.map((app) => (
                  <MenuItem key={app.id} value={app.id}>{app.name}</MenuItem>
                ))}
              </TextField>
              <Button variant="contained" onClick={handleLink} sx={{ textTransform: 'none' }}>Link Application</Button>
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
                          setDataDefSubObjects([]);
                          setDataDefFields([]);
                          setSelectedSubObjectId('');
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
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: 'text.secondary', mb: 0.8 }}>Sub-objects</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                  {dataDefSubObjects.map((sub: any) => (
                    <Box
                      key={sub.id}
                      onClick={() => {
                        setSelectedSubObjectId(sub.id);
                        cancelFieldEdit();
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25,
                        px: 0.75,
                        py: 0.35,
                        borderRadius: 1,
                        border: '1px solid rgba(255,255,255,0.18)',
                        backgroundColor: selectedSubObjectId === sub.id ? 'rgba(102,126,234,0.2)' : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                      }}
                    >
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{sub.name}</Typography>
                      <IconButton size="small" sx={{ p: 0.2 }} onClick={() => handleDeleteSubObject(sub.id)} title="Delete sub-object">
                        <DeleteIcon sx={{ fontSize: '0.8rem' }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
                {addingSubObj ? (
                  <Stack direction="row" spacing={1}>
                    <TextField size="small" label="Sub-object name" value={newSubObjName} onChange={(e) => setNewSubObjName(e.target.value)} sx={{ minWidth: 230 }} />
                    <Button variant="contained" size="small" sx={{ textTransform: 'none' }} onClick={handleAddSubObject}>Save</Button>
                    <Button variant="text" size="small" sx={{ textTransform: 'none' }} onClick={() => { setAddingSubObj(false); setNewSubObjName(''); }}>Cancel</Button>
                  </Stack>
                ) : (
                  <Button size="small" variant="text" sx={{ textTransform: 'none', px: 0 }} onClick={() => setAddingSubObj(true)}>
                    + Add Sub-object
                  </Button>
                )}
              </Box>

              {!selectedSubObject ? (
                <Alert severity="info" sx={{ mb: 2 }}>Create and select a sub-object to edit its data definition fields.</Alert>
              ) : (
                <>
                  <Box sx={{ mb: 2, p: 1.25, borderRadius: 1, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {selectedSubObject.name} Field Definitions
                      </Typography>
                      <Button size="small" variant="outlined" sx={{ textTransform: 'none' }} onClick={() => startCreateField(selectedSubObject.id)}>
                        Add Field
                      </Button>
                    </Box>
                    {lastSyncedBySubObject[selectedSubObject.id] && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Last synced: {new Date(lastSyncedBySubObject[selectedSubObject.id]).toLocaleString()}
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
                            [selectedSubObject.id]: { catalog, schema: '', table: '' },
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
                            [selectedSubObject.id]: { ...metadataDraft, schema, table: '' },
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
                          [selectedSubObject.id]: { ...metadataDraft, table: e.target.value },
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
                </>
              )}

              {editingFieldId && (
                <Box sx={{ mb: 2, p: 1.25, borderRadius: 1, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', color: 'text.secondary', mb: 1 }}>
                    {editingFieldId === 'new' ? 'Add Field Definition' : 'Edit Field Definition'}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1.2fr 0.9fr 0.7fr 0.7fr 1fr' }, gap: 1 }}>
                    <TextField size="small" label="Field Name" value={fieldDraft.fieldName} onChange={(e) => setFieldDraft((prev) => ({ ...prev, fieldName: e.target.value }))} />
                    <TextField size="small" label="Label" value={fieldDraft.fieldLabel} onChange={(e) => setFieldDraft((prev) => ({ ...prev, fieldLabel: e.target.value }))} />
                    <TextField size="small" label="Type" value={fieldDraft.dataType} onChange={(e) => setFieldDraft((prev) => ({ ...prev, dataType: e.target.value }))} />
                    <TextField size="small" label="Length" value={fieldDraft.length} onChange={(e) => setFieldDraft((prev) => ({ ...prev, length: e.target.value.replace(/[^0-9]/g, '') }))} />
                    <TextField size="small" label="Decimal" value={fieldDraft.decimals} onChange={(e) => setFieldDraft((prev) => ({ ...prev, decimals: e.target.value.replace(/[^0-9]/g, '') }))} />
                    <TextField size="small" label="Sub-object" value={selectedSubObject?.name || '-'} disabled />
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

              <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
                <Box sx={{ minWidth: 980, display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 0.95fr 0.75fr 0.75fr 0.65fr 0.75fr 2fr 0.9fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  {['Field Name', 'Label', 'Type', 'Length', 'Decimal', 'Key', 'Required', 'Description', 'Actions'].map((header) => (
                    <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {header}
                    </Box>
                  ))}
                </Box>
                {!selectedSubObject ? (
                  <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">Select a sub-object to view fields.</Typography></Box>
                ) : selectedSubObjectFields.length === 0 ? (
                  <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No field definitions yet.</Typography></Box>
                ) : selectedSubObjectFields.map((field: any, idx: number) => (
                  <Box key={field.id} sx={{ minWidth: 980, display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 0.95fr 0.75fr 0.75fr 0.65fr 0.75fr 2fr 0.9fr', borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ px: 1, py: 0.8, fontFamily: 'monospace', fontWeight: 700 }}>
                      {field.field_name || '-'}
                    </Box>
                    <Box sx={{ px: 1, py: 0.8 }}>{field.field_label || '-'}</Box>
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
            </CardContent>
          </Card>
        )}
      </Box>
    </Layout>
  );
};

export default ObjectApplicationsPage;
