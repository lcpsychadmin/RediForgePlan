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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';

export interface AiDataDefinitionProposalField {
  id: string;
  fieldName: string;
  fieldLabel: string;
  dataType: string;
  length: number | null;
  decimals: number | null;
  isKey: boolean;
  isRequired: boolean;
  description: string;
  businessRules: string;
}

interface EditableProposalField extends AiDataDefinitionProposalField {
  selected: boolean;
  rejected: boolean;
  editing: boolean;
}

interface DataDefinitionAiProposalModalProps {
  open: boolean;
  proposals: AiDataDefinitionProposalField[];
  onClose: () => void;
  onAccept: (fields: AiDataDefinitionProposalField[]) => Promise<void> | void;
  saving?: boolean;
}

const DataDefinitionAiProposalModal: React.FC<DataDefinitionAiProposalModalProps> = ({
  open,
  proposals,
  onClose,
  onAccept,
  saving = false,
}) => {
  const [rows, setRows] = React.useState<EditableProposalField[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setRows((proposals || []).map((row) => ({
      ...row,
      selected: true,
      rejected: false,
      editing: false,
    })));
  }, [open, proposals]);

  const setRow = (index: number, update: Partial<EditableProposalField>) => {
    setRows((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, ...update } : row));
  };

  const acceptAll = async () => {
    const acceptedRows = rows.filter((row) => !row.rejected).map(({ selected, rejected, editing, ...row }) => row);
    if (acceptedRows.length === 0) return;
    await onAccept(acceptedRows);
  };

  const acceptSelected = async () => {
    const acceptedRows = rows
      .filter((row) => row.selected && !row.rejected)
      .map(({ selected, rejected, editing, ...row }) => row);
    if (acceptedRows.length === 0) return;
    await onAccept(acceptedRows);
  };

  const activeCount = rows.filter((row) => !row.rejected).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>Generate Data Definition (AI)</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          Review AI-proposed fields. Reject unwanted rows, edit as needed, then accept all or selected rows.
        </Typography>

        <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
          <Box sx={{ minWidth: 1320, display: 'grid', gridTemplateColumns: '0.6fr 1.2fr 1.2fr 0.9fr 0.7fr 0.7fr 0.55fr 0.75fr 1.6fr 1.6fr 0.8fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
            {['Select', 'Field Name', 'Label', 'Data Type', 'Length', 'Decimal', 'Key', 'Required', 'Description', 'Business Rules', 'Actions'].map((header) => (
              <Box key={header} sx={{ px: 1, py: 0.75, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
            ))}
          </Box>

          {rows.length === 0 ? (
            <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No proposals returned.</Typography></Box>
          ) : rows.map((row, index) => (
            <Box key={row.id} sx={{ minWidth: 1320, display: 'grid', gridTemplateColumns: '0.6fr 1.2fr 1.2fr 0.9fr 0.7fr 0.7fr 0.55fr 0.75fr 1.6fr 1.6fr 0.8fr', borderTop: '1px solid rgba(255,255,255,0.08)', opacity: row.rejected ? 0.45 : 1 }}>
              <Box sx={{ px: 1, py: 0.55, display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={row.selected}
                  disabled={row.rejected}
                  onChange={(e) => setRow(index, { selected: e.target.checked })}
                />
              </Box>

              {row.editing ? (
                <>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.fieldName} onChange={(e) => setRow(index, { fieldName: e.target.value })} fullWidth /></Box>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.fieldLabel} onChange={(e) => setRow(index, { fieldLabel: e.target.value })} fullWidth /></Box>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.dataType} onChange={(e) => setRow(index, { dataType: e.target.value })} fullWidth /></Box>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.length ?? ''} onChange={(e) => setRow(index, { length: e.target.value === '' ? null : Number(e.target.value.replace(/[^0-9]/g, '')) })} fullWidth /></Box>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.decimals ?? ''} onChange={(e) => setRow(index, { decimals: e.target.value === '' ? null : Number(e.target.value.replace(/[^0-9]/g, '')) })} fullWidth /></Box>
                  <Box sx={{ px: 1, py: 0.55, display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={row.isKey} onChange={(e) => setRow(index, { isKey: e.target.checked })} /></Box>
                  <Box sx={{ px: 1, py: 0.55, display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={row.isRequired} onChange={(e) => setRow(index, { isRequired: e.target.checked })} /></Box>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.description} onChange={(e) => setRow(index, { description: e.target.value })} fullWidth /></Box>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.businessRules} onChange={(e) => setRow(index, { businessRules: e.target.value })} fullWidth /></Box>
                </>
              ) : (
                <>
                  <Box sx={{ px: 1, py: 0.75 }}>{row.fieldName || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75, color: 'text.secondary' }}>{row.fieldLabel || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75 }}>{row.dataType || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75 }}>{row.length ?? '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75 }}>{row.decimals ?? '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75, textAlign: 'center', color: row.isKey ? '#ffca28' : 'text.disabled' }}>{row.isKey ? '●' : '○'}</Box>
                  <Box sx={{ px: 1, py: 0.75, textAlign: 'center', color: row.isRequired ? '#ef5350' : 'text.disabled' }}>{row.isRequired ? '●' : '○'}</Box>
                  <Box sx={{ px: 1, py: 0.75, color: 'text.secondary' }}>{row.description || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75, color: 'text.secondary' }}>{row.businessRules || '-'}</Box>
                </>
              )}

              <Box sx={{ px: 1, py: 0.4, display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <IconButton size="small" onClick={() => setRow(index, { editing: !row.editing })} title={row.editing ? 'Done editing' : 'Edit'}>
                  {row.editing ? <CheckIcon sx={{ fontSize: '0.95rem' }} /> : <EditIcon sx={{ fontSize: '0.95rem' }} />}
                </IconButton>
                <IconButton size="small" onClick={() => setRow(index, { rejected: !row.rejected, selected: row.rejected ? row.selected : false })} title={row.rejected ? 'Restore' : 'Reject'}>
                  <DeleteIcon sx={{ fontSize: '0.95rem' }} />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Active proposals: {activeCount}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
        <Button onClick={acceptSelected} disabled={saving || rows.every((row) => row.rejected || !row.selected)} sx={{ textTransform: 'none' }}>
          Accept Selected
        </Button>
        <Button variant="contained" onClick={acceptAll} disabled={saving || rows.every((row) => row.rejected)} sx={{ textTransform: 'none' }}>
          {saving ? 'Saving...' : 'Accept All'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataDefinitionAiProposalModal;
