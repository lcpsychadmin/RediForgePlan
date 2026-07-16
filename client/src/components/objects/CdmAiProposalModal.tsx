import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddEditCdmAttributeModal from './AddEditCdmAttributeModal';
import type {
  CdmAiProposalAttribute,
  CdmAiProposalRelationship,
  CdmAttributeFormValues,
} from '../../types/commonDataModel';

interface EditableProposalAttribute extends CdmAiProposalAttribute {
  accepted: boolean;
}

interface EditableProposalRelationship extends CdmAiProposalRelationship {
  accepted: boolean;
}

interface CdmAiProposalModalProps {
  open: boolean;
  attributes: CdmAiProposalAttribute[];
  relationships: CdmAiProposalRelationship[];
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: {
    attributes: CdmAiProposalAttribute[];
    relationships: CdmAiProposalRelationship[];
  }) => Promise<void> | void;
}

const mapAttributeToFormValues = (attribute: CdmAiProposalAttribute): CdmAttributeFormValues => ({
  attributeName: attribute.attributeName || '',
  attributeDescription: attribute.attributeDescription || '',
  dataType: attribute.dataType || '',
  length: attribute.length == null ? '' : String(attribute.length),
  businessRules: attribute.businessRules || '',
});

const CdmAiProposalModal: React.FC<CdmAiProposalModalProps> = ({
  open,
  attributes,
  relationships,
  saving = false,
  onClose,
  onSave,
}) => {
  const [attributeRows, setAttributeRows] = React.useState<EditableProposalAttribute[]>([]);
  const [relationshipRows, setRelationshipRows] = React.useState<EditableProposalRelationship[]>([]);
  const [editingAttributeIndex, setEditingAttributeIndex] = React.useState<number | null>(null);
  const [editingRelationshipIndex, setEditingRelationshipIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    setAttributeRows(attributes.map((row) => ({ ...row, accepted: true })));
    setRelationshipRows(relationships.map((row) => ({ ...row, accepted: true })));
    setEditingAttributeIndex(null);
    setEditingRelationshipIndex(null);
  }, [open, attributes, relationships]);

  const acceptAll = () => {
    setAttributeRows((prev) => prev.map((row) => ({ ...row, accepted: true })));
    setRelationshipRows((prev) => prev.map((row) => ({ ...row, accepted: true })));
  };

  const rejectAll = () => {
    setAttributeRows((prev) => prev.map((row) => ({ ...row, accepted: false })));
    setRelationshipRows((prev) => prev.map((row) => ({ ...row, accepted: false })));
  };

  const handleSave = async () => {
    await onSave({
      attributes: attributeRows
        .filter((row) => row.accepted)
        .map(({ accepted, ...row }) => row),
      relationships: relationshipRows
        .filter((row) => row.accepted)
        .map(({ accepted, ...row }) => row),
    });
  };

  const editAttribute = editingAttributeIndex == null ? null : attributeRows[editingAttributeIndex];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>Auto-Build CDM (AI)</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Proposed Attributes</Typography>
            <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
              <Box sx={{ minWidth: 860, display: 'grid', gridTemplateColumns: '1.1fr 1.5fr 0.9fr 0.6fr 1.4fr 0.9fr 0.9fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {['Attribute Name', 'Description', 'Data Type', 'Length', 'Business Rules', 'Decision', 'Actions'].map((header) => (
                  <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                ))}
              </Box>
              {attributeRows.length === 0 ? (
                <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No attribute proposals returned.</Typography></Box>
              ) : attributeRows.map((row, index) => (
                <Box key={row.id} sx={{ minWidth: 860, display: 'grid', gridTemplateColumns: '1.1fr 1.5fr 0.9fr 0.6fr 1.4fr 0.9fr 0.9fr', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.attributeName}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.attributeDescription || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.dataType || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8 }}>{row.length ?? '-'}</Box>
                  <Box sx={{ px: 1, py: 0.8, color: 'text.secondary' }}>{row.businessRules || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Button size="small" variant={row.accepted ? 'contained' : 'outlined'} onClick={() => setAttributeRows((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, accepted: true } : entry))} sx={{ textTransform: 'none', minWidth: 64 }}>
                      Accept
                    </Button>
                    <Button size="small" color="inherit" variant={!row.accepted ? 'contained' : 'outlined'} onClick={() => setAttributeRows((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, accepted: false } : entry))} sx={{ textTransform: 'none', minWidth: 64 }}>
                      Reject
                    </Button>
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center' }}>
                    <Button size="small" variant="text" onClick={() => setEditingAttributeIndex(index)} sx={{ textTransform: 'none' }}>
                      Edit
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Proposed Relationships</Typography>
            <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
              <Box sx={{ minWidth: 980, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.9fr 1.4fr 0.9fr 0.9fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {['Source Attribute', 'Target Object', 'Target Attribute', 'Relationship Type', 'Business Rules', 'Decision', 'Actions'].map((header) => (
                  <Box key={header} sx={{ px: 1, py: 0.8, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
                ))}
              </Box>
              {relationshipRows.length === 0 ? (
                <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No relationship proposals returned.</Typography></Box>
              ) : relationshipRows.map((row, index) => {
                const isEditing = editingRelationshipIndex === index;
                return (
                  <Box key={row.id} sx={{ minWidth: 980, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.9fr 1.4fr 0.9fr 0.9fr', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ px: 1, py: 0.8 }}>
                      {isEditing ? (
                        <TextField size="small" value={row.sourceAttributeName} onChange={(e) => setRelationshipRows((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, sourceAttributeName: e.target.value } : entry))} fullWidth />
                      ) : row.sourceAttributeName}
                    </Box>
                    <Box sx={{ px: 1, py: 0.8 }}>
                      {isEditing ? (
                        <TextField size="small" value={row.targetObjectName} onChange={(e) => setRelationshipRows((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, targetObjectName: e.target.value } : entry))} fullWidth />
                      ) : row.targetObjectName}
                    </Box>
                    <Box sx={{ px: 1, py: 0.8 }}>
                      {isEditing ? (
                        <TextField size="small" value={row.targetAttributeName || ''} onChange={(e) => setRelationshipRows((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, targetAttributeName: e.target.value } : entry))} fullWidth />
                      ) : row.targetAttributeName || '-'}
                    </Box>
                    <Box sx={{ px: 1, py: 0.8 }}>
                      {isEditing ? (
                        <TextField size="small" value={row.relationshipType || ''} onChange={(e) => setRelationshipRows((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, relationshipType: e.target.value } : entry))} fullWidth />
                      ) : row.relationshipType || '-'}
                    </Box>
                    <Box sx={{ px: 1, py: 0.8 }}>
                      {isEditing ? (
                        <TextField size="small" value={row.businessRules || ''} onChange={(e) => setRelationshipRows((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, businessRules: e.target.value } : entry))} multiline minRows={2} fullWidth />
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{row.businessRules || '-'}</Typography>
                      )}
                    </Box>
                    <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Button size="small" variant={row.accepted ? 'contained' : 'outlined'} onClick={() => setRelationshipRows((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, accepted: true } : entry))} sx={{ textTransform: 'none', minWidth: 64 }}>
                        Accept
                      </Button>
                      <Button size="small" color="inherit" variant={!row.accepted ? 'contained' : 'outlined'} onClick={() => setRelationshipRows((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, accepted: false } : entry))} sx={{ textTransform: 'none', minWidth: 64 }}>
                        Reject
                      </Button>
                    </Box>
                    <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center' }}>
                      <Button size="small" variant="text" onClick={() => setEditingRelationshipIndex(isEditing ? null : index)} sx={{ textTransform: 'none' }}>
                        {isEditing ? 'Done' : 'Edit'}
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Stack direction="row" spacing={1}>
            <Button onClick={acceptAll} sx={{ textTransform: 'none' }}>Accept All</Button>
            <Button onClick={rejectAll} sx={{ textTransform: 'none' }}>Reject All</Button>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: 'none' }}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <AddEditCdmAttributeModal
        open={editingAttributeIndex != null && !!editAttribute}
        initialValues={editAttribute ? mapAttributeToFormValues(editAttribute) : undefined}
        onClose={() => setEditingAttributeIndex(null)}
        onSave={async (values) => {
          if (editingAttributeIndex == null) {
            return;
          }
          setAttributeRows((prev) => prev.map((row, index) => index === editingAttributeIndex ? {
            ...row,
            attributeName: values.attributeName,
            attributeDescription: values.attributeDescription,
            dataType: values.dataType,
            length: values.length === '' ? null : Number(values.length),
            businessRules: values.businessRules,
          } : row));
          setEditingAttributeIndex(null);
        }}
        title="Edit Proposed Attribute"
      />
    </>
  );
};

export default CdmAiProposalModal;