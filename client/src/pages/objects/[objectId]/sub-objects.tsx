import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import ObjectWorkspaceHeader from '../../../components/objects/ObjectWorkspaceHeader';
import ObjectSubObjectSelector from '../../../components/objects/ObjectSubObjectSelector';
import useObjectSubObjectSelection, { type ObjectSubObjectRow } from '../../../components/objects/useObjectSubObjectSelection';
import apiClient from '../../../api/client';
import AiSubObjectProposalPanel from '../../../components/objects/AiSubObjectProposalPanel';
import { useAiSubObjectProposals } from '../../../hooks/useObjectAiActions';
import type { AiSubObjectProposal } from '../../../types/objectAi';

interface SubObjectDraft {
  name: string;
  description: string;
}

const emptyDraft: SubObjectDraft = {
  name: '',
  description: '',
};

const ObjectSubObjectsPage: React.FC = () => {
  const { objectId = '' } = useParams();
  const {
    subObjects,
    selectedSubObjectId,
    setSelectedSubObjectId,
    reloadSubObjects,
    selectedSubObject,
  } = useObjectSubObjectSelection(objectId);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState<ObjectSubObjectRow | null>(null);
  const [draft, setDraft] = React.useState<SubObjectDraft>(emptyDraft);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const [aiPanelOpen, setAiPanelOpen] = React.useState(false);
  const [aiProposals, setAiProposals] = React.useState<AiSubObjectProposal[]>([]);

  const {
    run: runAiProposals,
    loading: aiLoading,
    error: aiError,
  } = useAiSubObjectProposals();

  const openCreate = () => {
    setEditingRow(null);
    setDraft(emptyDraft);
    setModalOpen(true);
  };

  const openEdit = (row: ObjectSubObjectRow) => {
    setEditingRow(row);
    setDraft({
      name: row.name,
      description: row.description || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      return;
    }

    setSaving(true);
    setError('');
    setStatus('');

    try {
      if (editingRow) {
        await apiClient.put(`/api/global-objects/sub-objects/${editingRow.id}`, {
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          sortOrder: editingRow.sortOrder || 0,
        });
        setStatus('Sub-object updated.');
      } else {
        const response = await apiClient.post(`/api/global-objects/${objectId}/sub-objects`, {
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          sortOrder: subObjects.length,
        });
        setStatus('Sub-object added.');
        const createdId = response.data?.data?.id;
        if (createdId) {
          setSelectedSubObjectId(String(createdId));
        }
      }

      await reloadSubObjects();
      setModalOpen(false);
      setEditingRow(null);
      setDraft(emptyDraft);
    } catch {
      setError('Failed to save sub-object. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: ObjectSubObjectRow) => {
    setError('');
    setStatus('');
    try {
      await apiClient.delete(`/api/global-objects/sub-objects/${row.id}`);
      if (selectedSubObjectId === row.id) {
        setSelectedSubObjectId('');
      }
      await reloadSubObjects();
      setStatus('Sub-object deleted.');
    } catch {
      setError('Failed to delete sub-object. Please try again.');
    }
  };

  const handleAiProposeSubObjects = async () => {
    setError('');
    setStatus('');
    try {
      const result = await runAiProposals(objectId, 8);
      setAiProposals(result.proposals || []);
      setAiPanelOpen(true);
      if ((result.proposals || []).length === 0) {
        setStatus('AI returned no proposals for this object.');
      }
    } catch {
      // Hook already captures and exposes error.
    }
  };

  const handleApplyAiProposals = async (accepted: AiSubObjectProposal[]) => {
    if (!accepted.length) {
      setAiPanelOpen(false);
      return;
    }

    setSaving(true);
    setError('');
    setStatus('');
    try {
      const existingNames = new Set(subObjects.map((row) => row.name.trim().toLowerCase()));
      for (const proposal of accepted) {
        const name = String(proposal.name || '').trim();
        if (!name || existingNames.has(name.toLowerCase())) {
          continue;
        }
        await apiClient.post(`/api/global-objects/${objectId}/sub-objects`, {
          name,
          description: proposal.description || proposal.explanation || null,
          sortOrder: subObjects.length,
        });
      }
      await reloadSubObjects();
      setAiPanelOpen(false);
      setStatus('AI sub-object proposals applied.');
      setStatusSeverity('success');
    } catch {
      setError('Failed to apply AI sub-object proposals.');
    } finally {
      setSaving(false);
    }
  };

  const [statusSeverity, setStatusSeverity] = React.useState<'success' | 'error' | 'info'>('success');

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <ObjectWorkspaceHeader objectId={objectId} title="Sub Objects" breadcrumbLabel="Sub Objects" />

        {(status || error || aiError) && (
          <Alert severity={error || aiError ? 'error' : statusSeverity} sx={{ mb: 2 }}>
            {error || aiError || status}
          </Alert>
        )}

        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 1.5 }}>
              <Typography sx={{ fontWeight: 700 }}>Object Sub-objects</Typography>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="outlined"
                onClick={handleAiProposeSubObjects}
                disabled={aiLoading || saving}
                sx={{ textTransform: 'none' }}
              >
                {aiLoading ? 'Analyzing...' : 'AI Propose Sub-Objects'}
              </Button>
              <Button variant="contained" onClick={openCreate} sx={{ textTransform: 'none' }}>
                + Add Sub-object
              </Button>
            </Stack>

            {subObjects.length > 0 && (
              <ObjectSubObjectSelector
                subObjects={subObjects}
                selectedSubObjectId={selectedSubObjectId}
                onChange={setSelectedSubObjectId}
                helperText={selectedSubObject ? `Selected: ${selectedSubObject.name}` : ''}
              />
            )}

            <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ minWidth: 760, display: 'grid', gridTemplateColumns: '1.2fr 2fr 0.8fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {['Name', 'Description', 'Actions'].map((header) => (
                  <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                ))}
              </Box>

              {subObjects.length === 0 ? (
                <Box sx={{ p: 1.2 }}>
                  <Typography color="text.secondary" variant="body2">No sub-objects defined.</Typography>
                </Box>
              ) : subObjects.map((row) => (
                <Box
                  key={row.id}
                  sx={{
                    minWidth: 760,
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 2fr 0.8fr',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: row.id === selectedSubObjectId ? 'rgba(102,126,234,0.14)' : 'transparent',
                  }}
                >
                  <Box sx={{ px: 1, py: 0.8, fontWeight: row.id === selectedSubObjectId ? 700 : 500 }}>{row.name}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.description || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.45, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedSubObjectId(row.id);
                        openEdit(row);
                      }}
                      title="Edit sub-object"
                    >
                      <EditIcon sx={{ fontSize: '0.95rem' }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(row)}
                      title="Delete sub-object"
                    >
                      <DeleteIcon sx={{ fontSize: '0.95rem' }} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>

            {aiPanelOpen && (
              <AiSubObjectProposalPanel
                proposals={aiProposals}
                loading={saving}
                onApply={handleApplyAiProposals}
                onClose={() => setAiPanelOpen(false)}
              />
            )}
          </CardContent>
        </Card>

        <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingRow ? 'Edit Sub-object' : 'Add Sub-object'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2 }}>
            <TextField
              label="Name"
              size="small"
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              autoFocus
              fullWidth
            />
            <TextField
              label="Description"
              size="small"
              value={draft.description}
              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving || !draft.name.trim()} sx={{ textTransform: 'none' }}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default ObjectSubObjectsPage;