import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LayersIcon from '@mui/icons-material/Layers';
import type { CDMAttribute, CDMRelationship } from '../types/commonDataModel';

interface CommonDataModelModalProps {
  open: boolean;
  objectLabel: string;
  attributes: CDMAttribute[];
  relationships: CDMRelationship[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: { attributes: CDMAttribute[]; relationships: CDMRelationship[] }) => Promise<void>;
}

const emptyAttributeDraft = (): CDMAttribute => ({
  id: '',
  commonDataModelId: '',
  attributeName: '',
  attributeDescription: '',
  dataType: '',
  length: null,
  businessRules: '',
  sortOrder: 0,
});

const emptyRelationshipDraft = (): CDMRelationship => ({
  id: '',
  commonDataModelId: '',
  sourceAttributeId: null,
  sourceAttributeName: '',
  targetObjectName: '',
  targetAttributeName: '',
  relationshipType: '',
  businessRules: '',
  sortOrder: 0,
});

const CommonDataModelModal: React.FC<CommonDataModelModalProps> = ({
  open,
  objectLabel,
  attributes,
  relationships,
  saving,
  onClose,
  onSave,
}) => {
  const [attributeRows, setAttributeRows] = React.useState<CDMAttribute[]>([]);
  const [relationshipRows, setRelationshipRows] = React.useState<CDMRelationship[]>([]);
  const [addingAttribute, setAddingAttribute] = React.useState(false);
  const [attributeDraft, setAttributeDraft] = React.useState<CDMAttribute>(emptyAttributeDraft());
  const [addingRelationship, setAddingRelationship] = React.useState(false);
  const [relationshipDraft, setRelationshipDraft] = React.useState<CDMRelationship>(emptyRelationshipDraft());

  React.useEffect(() => {
    if (!open) return;
    setAttributeRows(attributes || []);
    setRelationshipRows(relationships || []);
    setAddingAttribute(false);
    setAddingRelationship(false);
    setAttributeDraft(emptyAttributeDraft());
    setRelationshipDraft(emptyRelationshipDraft());
  }, [open, attributes, relationships]);

  const saveChanges = async () => {
    await onSave({
      attributes: attributeRows.map((row, index) => ({ ...row, sortOrder: index })),
      relationships: relationshipRows.map((row, index) => ({ ...row, sortOrder: index })),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LayersIcon sx={{ color: '#90A4AE' }} />
        <Box>
          <Typography sx={{ fontWeight: 700 }}>Common Data Model</Typography>
          <Typography variant="caption" color="text.secondary">{objectLabel}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>CDM Attributes</Typography>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} sx={{ textTransform: 'none' }} onClick={() => { setAddingAttribute(true); setAttributeDraft(emptyAttributeDraft()); }}>
            Add CDM Attribute
          </Button>
        </Box>

        <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden', mb: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 0.75fr 0.45fr 1fr 0.4fr', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            {['CDM Attribute', 'Description', 'Type', 'Length', 'Business Rules', 'Actions'].map((head) => (
              <Box key={head} sx={{ px: 0.8, py: 0.55, fontSize: '0.66rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 700 }}>
                {head}
              </Box>
            ))}
          </Box>

          {addingAttribute && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 0.75fr 0.45fr 1fr 0.4fr', borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(102,126,234,0.08)' }}>
              <Box sx={{ px: 0.65, py: 0.35 }}><input autoFocus value={attributeDraft.attributeName || ''} onChange={(e) => setAttributeDraft((prev) => ({ ...prev, attributeName: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={attributeDraft.attributeDescription || ''} onChange={(e) => setAttributeDraft((prev) => ({ ...prev, attributeDescription: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={attributeDraft.dataType || ''} onChange={(e) => setAttributeDraft((prev) => ({ ...prev, dataType: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={attributeDraft.length ?? ''} onChange={(e) => setAttributeDraft((prev) => ({ ...prev, length: e.target.value === '' ? null : Number(e.target.value.replace(/[^0-9]/g, '')) }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={attributeDraft.businessRules || ''} onChange={(e) => setAttributeDraft((prev) => ({ ...prev, businessRules: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.35, py: 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Button size="small" onClick={() => {
                  if (!attributeDraft.attributeName.trim()) return;
                  setAttributeRows((prev) => [...prev, {
                    ...attributeDraft,
                    id: `cdm-attr-${Date.now()}-${Math.round(Math.random() * 10000)}`,
                  }]);
                  setAddingAttribute(false);
                  setAttributeDraft(emptyAttributeDraft());
                }}>Add</Button>
                <Button size="small" onClick={() => { setAddingAttribute(false); setAttributeDraft(emptyAttributeDraft()); }}>Cancel</Button>
              </Box>
            </Box>
          )}

          {attributeRows.length === 0 && !addingAttribute && (
            <Box sx={{ px: 1, py: 1.1 }}>
              <Typography variant="caption" color="text.secondary">No CDM attributes defined yet.</Typography>
            </Box>
          )}

          {attributeRows.map((attribute) => (
            <Box key={attribute.id} sx={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 0.75fr 0.45fr 1fr 0.4fr', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Box sx={{ px: 0.8, py: 0.5, fontWeight: 700, fontFamily: 'monospace', fontSize: '0.77rem' }}>{attribute.attributeName}</Box>
              <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{attribute.attributeDescription || '-'}</Box>
              <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{attribute.dataType || '-'}</Box>
              <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{attribute.length ?? '-'}</Box>
              <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{attribute.businessRules || '-'}</Box>
              <Box sx={{ px: 0.3, py: 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconButton size="small" onClick={() => setAttributeRows((prev) => prev.filter((entry) => entry.id !== attribute.id))}>
                  <DeleteIcon sx={{ fontSize: '0.85rem' }} />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>CDM Relationships</Typography>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} sx={{ textTransform: 'none' }} onClick={() => { setAddingRelationship(true); setRelationshipDraft(emptyRelationshipDraft()); }}>
            Add Relationship
          </Button>
        </Box>

        <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '0.95fr 1fr 0.95fr 0.7fr 1fr 0.4fr', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            {['Source Attribute', 'Target Object', 'Target Attribute', 'Type', 'Business Rules', 'Actions'].map((head) => (
              <Box key={head} sx={{ px: 0.8, py: 0.55, fontSize: '0.66rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', fontWeight: 700 }}>
                {head}
              </Box>
            ))}
          </Box>

          {addingRelationship && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '0.95fr 1fr 0.95fr 0.7fr 1fr 0.4fr', borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(102,126,234,0.08)' }}>
              <Box sx={{ px: 0.65, py: 0.35 }}><input autoFocus value={relationshipDraft.sourceAttributeName || ''} onChange={(e) => setRelationshipDraft((prev) => ({ ...prev, sourceAttributeName: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={relationshipDraft.targetObjectName || ''} onChange={(e) => setRelationshipDraft((prev) => ({ ...prev, targetObjectName: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={relationshipDraft.targetAttributeName || ''} onChange={(e) => setRelationshipDraft((prev) => ({ ...prev, targetAttributeName: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={relationshipDraft.relationshipType || ''} onChange={(e) => setRelationshipDraft((prev) => ({ ...prev, relationshipType: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.65, py: 0.35 }}><input value={relationshipDraft.businessRules || ''} onChange={(e) => setRelationshipDraft((prev) => ({ ...prev, businessRules: e.target.value }))} style={{ width: '100%', fontSize: '0.75rem' }} /></Box>
              <Box sx={{ px: 0.35, py: 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Button size="small" onClick={() => {
                  if (!relationshipDraft.sourceAttributeName?.trim() || !relationshipDraft.targetObjectName?.trim()) return;
                  setRelationshipRows((prev) => [...prev, {
                    ...relationshipDraft,
                    id: `cdm-rel-${Date.now()}-${Math.round(Math.random() * 10000)}`,
                  }]);
                  setAddingRelationship(false);
                  setRelationshipDraft(emptyRelationshipDraft());
                }}>Add</Button>
                <Button size="small" onClick={() => { setAddingRelationship(false); setRelationshipDraft(emptyRelationshipDraft()); }}>Cancel</Button>
              </Box>
            </Box>
          )}

          {relationshipRows.length === 0 && !addingRelationship && (
            <Box sx={{ px: 1, py: 1.1 }}>
              <Typography variant="caption" color="text.secondary">No CDM relationships defined yet.</Typography>
            </Box>
          )}

          {relationshipRows.map((relationship) => (
            <Box key={relationship.id} sx={{ display: 'grid', gridTemplateColumns: '0.95fr 1fr 0.95fr 0.7fr 1fr 0.4fr', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Box sx={{ px: 0.8, py: 0.5, fontWeight: 700, fontFamily: 'monospace', fontSize: '0.77rem' }}>{relationship.sourceAttributeName || '-'}</Box>
              <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{relationship.targetObjectName || '-'}</Box>
              <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{relationship.targetAttributeName || '-'}</Box>
              <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{relationship.relationshipType || '-'}</Box>
              <Box sx={{ px: 0.8, py: 0.5, fontSize: '0.77rem', color: 'text.secondary' }}>{relationship.businessRules || '-'}</Box>
              <Box sx={{ px: 0.3, py: 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconButton size="small" onClick={() => setRelationshipRows((prev) => prev.filter((entry) => entry.id !== relationship.id))}>
                  <DeleteIcon sx={{ fontSize: '0.85rem' }} />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={saveChanges} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        <Button onClick={onClose} disabled={saving}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CommonDataModelModal;
