import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import type { AiDataDefinitionProposalField } from '../../types/dataDefinitions';
import {
  FIELD_TYPE_OPTIONS,
  PII_TYPE_OPTIONS,
  SECURITY_CLASSIFICATION_OPTIONS,
} from '../../types/dataDefinitions';

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
          <Box sx={{ minWidth: 1680, display: 'grid', gridTemplateColumns: '0.55fr 1.0fr 1.15fr 0.95fr 1.05fr 1.35fr 0.9fr 0.7fr 0.7fr 0.55fr 0.55fr 0.75fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
            {['Select', 'Field Name', 'Label', 'Table', 'Table Name', 'Field Description', 'Type', 'Length', 'Decimals', 'Key', 'Req', 'Actions'].map((header) => (
              <Box key={header} sx={{ px: 1, py: 0.75, fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{header}</Box>
            ))}
          </Box>

          {rows.length === 0 ? (
            <Box sx={{ p: 1.2 }}><Typography color="text.secondary" variant="body2">No proposals returned.</Typography></Box>
          ) : rows.map((row, index) => (
            <Box key={row.id} sx={{ minWidth: 1680, borderTop: '1px solid rgba(255,255,255,0.08)', opacity: row.rejected ? 0.45 : 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '0.55fr 1.0fr 1.15fr 0.95fr 1.05fr 1.35fr 0.9fr 0.7fr 0.7fr 0.55fr 0.55fr 0.75fr' }}>
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
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.label} onChange={(e) => setRow(index, { label: e.target.value })} fullWidth /></Box>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.table} onChange={(e) => setRow(index, { table: e.target.value })} fullWidth /></Box>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.tableName} onChange={(e) => setRow(index, { tableName: e.target.value })} fullWidth /></Box>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.fieldDescription} onChange={(e) => setRow(index, { fieldDescription: e.target.value })} fullWidth /></Box>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.fieldType} onChange={(e) => setRow(index, { fieldType: e.target.value })} select fullWidth>{FIELD_TYPE_OPTIONS.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField></Box>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.fieldLength ?? ''} onChange={(e) => setRow(index, { fieldLength: e.target.value === '' ? null : Number(e.target.value.replace(/[^0-9]/g, '')) })} fullWidth /></Box>
                  <Box sx={{ px: 1, py: 0.45 }}><TextField size="small" value={row.decimalPlaces ?? ''} onChange={(e) => setRow(index, { decimalPlaces: e.target.value === '' ? null : Number(e.target.value.replace(/[^0-9]/g, '')) })} fullWidth /></Box>
                  <Box sx={{ px: 1, py: 0.55, display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={row.systemRequired} onChange={(e) => setRow(index, { systemRequired: e.target.checked })} /></Box>
                  <Box sx={{ px: 1, py: 0.55, display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={row.businessProcessRequired} onChange={(e) => setRow(index, { businessProcessRequired: e.target.checked })} /></Box>
                </>
              ) : (
                <>
                  <Box sx={{ px: 1, py: 0.75 }}>{row.fieldName || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75, color: 'text.secondary' }}>{row.label || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75, color: 'text.secondary' }}>{row.table || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75, color: 'text.secondary' }}>{row.tableName || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75, color: 'text.secondary' }}>{row.fieldDescription || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75 }}>{row.fieldType || '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75 }}>{row.fieldLength ?? '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75 }}>{row.decimalPlaces ?? '-'}</Box>
                  <Box sx={{ px: 1, py: 0.75, textAlign: 'center', color: row.systemRequired ? '#ffca28' : 'text.disabled' }}>{row.systemRequired ? '●' : '○'}</Box>
                  <Box sx={{ px: 1, py: 0.75, textAlign: 'center', color: row.businessProcessRequired ? '#ef5350' : 'text.disabled' }}>{row.businessProcessRequired ? '●' : '○'}</Box>
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

              {row.editing && (
                <Box sx={{ px: 1, pb: 1.2, pt: 0.5, borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.1 }}>
                    <TextField size="small" label="Application Usage" value={row.applicationUsage} onChange={(e) => setRow(index, { applicationUsage: e.target.value })} multiline minRows={2} fullWidth />
                    <TextField size="small" label="Business Definition" value={row.businessDefinition} onChange={(e) => setRow(index, { businessDefinition: e.target.value })} multiline minRows={2} fullWidth />
                    <TextField size="small" label="Business Rules" value={row.businessRules} onChange={(e) => setRow(index, { businessRules: e.target.value })} multiline minRows={2} fullWidth />
                    <TextField size="small" label="Legal/Regulatory Implications" value={row.legalRegulatoryImplications} onChange={(e) => setRow(index, { legalRegulatoryImplications: e.target.value })} multiline minRows={2} fullWidth />
                    <TextField size="small" label="Security Classification" select value={row.securityClassification} onChange={(e) => setRow(index, { securityClassification: e.target.value })} fullWidth>
                      <MenuItem value=""><em>None</em></MenuItem>
                      {SECURITY_CLASSIFICATION_OPTIONS.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                    </TextField>
                    <TextField size="small" label="PII Type" select value={row.piiType} onChange={(e) => setRow(index, { piiType: e.target.value })} fullWidth>
                      <MenuItem value=""><em>None</em></MenuItem>
                      {PII_TYPE_OPTIONS.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                    </TextField>
                    <TextField size="small" label="Reference Table" value={row.referenceTable} onChange={(e) => setRow(index, { referenceTable: e.target.value })} fullWidth />
                    <TextField size="small" label="Grouping/Tab" value={row.groupingTab} onChange={(e) => setRow(index, { groupingTab: e.target.value })} fullWidth />
                    <TextField size="small" label="Security Controls" value={row.securityControls} onChange={(e) => setRow(index, { securityControls: e.target.value })} multiline minRows={2} fullWidth />
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.1, mt: 1.1 }}>
                    <TextField size="small" label="Table Name" value={row.tableName} onChange={(e) => setRow(index, { tableName: e.target.value })} fullWidth />
                    <TextField size="small" label="Table" value={row.table} onChange={(e) => setRow(index, { table: e.target.value })} fullWidth />
                  </Box>
                </Box>
              )}
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
