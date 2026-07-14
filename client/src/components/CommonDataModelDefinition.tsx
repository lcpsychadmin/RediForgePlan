import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LayersIcon from '@mui/icons-material/Layers';
import type { CanonicalAttribute } from '../types/commonDataModel';

interface CommonDataModelDefinitionProps {
  open: boolean;
  objectLabel: string;
  attributes: CanonicalAttribute[];
  saving: boolean;
  onClose: () => void;
  onCreateAttribute: (draft: Omit<CanonicalAttribute, 'id' | 'commonDataModelId'>) => Promise<void>;
  onUpdateAttribute: (attributeId: string, draft: Omit<CanonicalAttribute, 'id' | 'commonDataModelId'>) => Promise<void>;
  onDeleteAttribute: (attributeId: string) => Promise<void>;
}

const emptyDraft = (): Omit<CanonicalAttribute, 'id' | 'commonDataModelId'> => ({
  canonicalAttributeName: '',
  canonicalDescription: '',
  canonicalDataType: '',
  canonicalLength: null,
  canonicalBusinessRules: '',
  relationships: '',
  sortOrder: 0,
});

const CommonDataModelDefinition: React.FC<CommonDataModelDefinitionProps> = ({
  open,
  objectLabel,
  attributes,
  saving,
  onClose,
  onCreateAttribute,
  onUpdateAttribute,
  onDeleteAttribute,
}) => {
  const [adding, setAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Omit<CanonicalAttribute, 'id' | 'commonDataModelId'>>(emptyDraft());

  const startAdd = () => {
    setAdding(true);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const startEdit = (attribute: CanonicalAttribute) => {
    setAdding(false);
    setEditingId(attribute.id);
    setDraft({
      canonicalAttributeName: attribute.canonicalAttributeName || '',
      canonicalDescription: attribute.canonicalDescription || '',
      canonicalDataType: attribute.canonicalDataType || '',
      canonicalLength: attribute.canonicalLength ?? null,
      canonicalBusinessRules: attribute.canonicalBusinessRules || '',
      relationships: attribute.relationships || '',
      sortOrder: attribute.sortOrder || 0,
    });
  };

  const cancelEdit = () => {
    setAdding(false);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const saveAdd = async () => {
    if (!draft.canonicalAttributeName?.trim()) return;
    await onCreateAttribute({
      ...draft,
      canonicalAttributeName: draft.canonicalAttributeName.trim(),
    });
    cancelEdit();
  };

  const saveEdit = async () => {
    if (!editingId || !draft.canonicalAttributeName?.trim()) return;
    await onUpdateAttribute(editingId, {
      ...draft,
      canonicalAttributeName: draft.canonicalAttributeName.trim(),
    });
    cancelEdit();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LayersIcon sx={{ color: '#90A4AE' }} />
        <Box>
          <Typography sx={{ fontWeight: 700 }}>Common Data Model Definition</Typography>
          <Typography variant="caption" color="text.secondary">{objectLabel}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} sx={{ textTransform: 'none' }} onClick={startAdd}>
            Add Canonical Attribute
          </Button>
        </Box>

        <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 0.85fr 0.45fr 1.3fr 1fr 0.45fr', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            {['Canonical Attribute Name', 'Canonical Description', 'Canonical Data Type', 'Canonical Length', 'Canonical Business Rules', 'Relationships', 'Actions'].map((head) => (
              <Box key={head} sx={{ px: 0.8, py: 0.55, fontSize: '0.66rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 700 }}>
                {head}
              </Box>
            ))}
          </Box>

          {adding && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 0.85fr 0.45fr 1.3fr 1fr 0.45fr', borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(102,126,234,0.08)' }}>
              <Box sx={{ px: 0.65, py: 0.35 }}><input autoFocus value={draft.canonicalAttributeName || ''} onChange={(e) => setDraft((prev) => ({ ...prev, canonicalAttributeName: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={draft.canonicalDescription || ''} onChange={(e) => setDraft((prev) => ({ ...prev, canonicalDescription: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={draft.canonicalDataType || ''} onChange={(e) => setDraft((prev) => ({ ...prev, canonicalDataType: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={draft.canonicalLength ?? ''} onChange={(e) => setDraft((prev) => ({ ...prev, canonicalLength: e.target.value === '' ? null : Number(e.target.value.replace(/[^0-9]/g, '')) }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={draft.canonicalBusinessRules || ''} onChange={(e) => setDraft((prev) => ({ ...prev, canonicalBusinessRules: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={draft.relationships || ''} onChange={(e) => setDraft((prev) => ({ ...prev, relationships: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.35, py: 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Button size="small" onClick={saveAdd} disabled={saving || !draft.canonicalAttributeName?.trim()}>Save</Button>
                <Button size="small" onClick={cancelEdit}>Cancel</Button>
              </Box>
            </Box>
          )}

          {attributes.length === 0 && !adding && (
            <Box sx={{ px: 1, py: 1.1 }}>
              <Typography variant="caption" color="text.secondary">No canonical attributes defined yet.</Typography>
            </Box>
          )}

          {attributes.map((attribute) => {
            const isEditing = editingId === attribute.id;
            if (isEditing) {
              return (
                <Box key={attribute.id} sx={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 0.85fr 0.45fr 1.3fr 1fr 0.45fr', borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(102,126,234,0.08)' }}>
                  <Box sx={{ px: 0.65, py: 0.35 }}><input value={draft.canonicalAttributeName || ''} onChange={(e) => setDraft((prev) => ({ ...prev, canonicalAttributeName: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
                  <Box sx={{ px: 0.65, py: 0.35 }}><input value={draft.canonicalDescription || ''} onChange={(e) => setDraft((prev) => ({ ...prev, canonicalDescription: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
                  <Box sx={{ px: 0.65, py: 0.35 }}><input value={draft.canonicalDataType || ''} onChange={(e) => setDraft((prev) => ({ ...prev, canonicalDataType: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
                  <Box sx={{ px: 0.65, py: 0.35 }}><input value={draft.canonicalLength ?? ''} onChange={(e) => setDraft((prev) => ({ ...prev, canonicalLength: e.target.value === '' ? null : Number(e.target.value.replace(/[^0-9]/g, '')) }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
                  <Box sx={{ px: 0.65, py: 0.35 }}><input value={draft.canonicalBusinessRules || ''} onChange={(e) => setDraft((prev) => ({ ...prev, canonicalBusinessRules: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
                  <Box sx={{ px: 0.65, py: 0.35 }}><input value={draft.relationships || ''} onChange={(e) => setDraft((prev) => ({ ...prev, relationships: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
                  <Box sx={{ px: 0.35, py: 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Button size="small" onClick={saveEdit} disabled={saving || !draft.canonicalAttributeName?.trim()}>Save</Button>
                    <Button size="small" onClick={cancelEdit}>Cancel</Button>
                  </Box>
                </Box>
              );
            }

            return (
              <Box key={attribute.id} sx={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 0.85fr 0.45fr 1.3fr 1fr 0.45fr', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <Box sx={{ px: 0.8, py: 0.5, fontWeight: 700, fontFamily: 'monospace', fontSize: '0.77rem' }}>{attribute.canonicalAttributeName}</Box>
                <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{attribute.canonicalDescription || '-'}</Box>
                <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{attribute.canonicalDataType || '-'}</Box>
                <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{attribute.canonicalLength ?? '-'}</Box>
                <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{attribute.canonicalBusinessRules || '-'}</Box>
                <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{attribute.relationships || '-'}</Box>
                <Box sx={{ px: 0.3, py: 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Button size="small" onClick={() => startEdit(attribute)}>Edit</Button>
                  <IconButton size="small" onClick={() => onDeleteAttribute(attribute.id)}>
                    <DeleteIcon sx={{ fontSize: '0.85rem' }} />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CommonDataModelDefinition;
