import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { CdmFieldEditorRow } from '../../types/cdmEditor';

interface CdmFieldsEditorTableProps {
  rows: CdmFieldEditorRow[];
  selectedCount: number;
  saving?: boolean;
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  onUpdateRow: (rowId: string, patch: Partial<CdmFieldEditorRow>) => void;
  onToggleRowSelection: (rowId: string, selected: boolean) => void;
  onToggleAllSelection: (selected: boolean) => void;
  onBulkDeleteSelected: () => void;
  onBulkSetNullable: (nullable: boolean) => void;
  onExportJson: () => void;
  onExportSql: () => void;
  onSave: () => void;
}

const GRID = '0.55fr 1.2fr 0.8fr 0.8fr 0.7fr 1.8fr 1.1fr 1.1fr 1.1fr 0.45fr';

const CdmFieldsEditorTable: React.FC<CdmFieldsEditorTableProps> = ({
  rows,
  selectedCount,
  saving = false,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onToggleRowSelection,
  onToggleAllSelection,
  onBulkDeleteSelected,
  onBulkSetNullable,
  onExportJson,
  onExportSql,
  onSave,
}) => {
  const allSelected = rows.length > 0 && rows.every((row) => row.selected);

  return (
    <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ p: 1.2, borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>CDM Fields Editor</Typography>
        <Typography variant="caption" color="text.secondary">{rows.length} row(s), {selectedCount} selected</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" variant="outlined" onClick={onAddRow} startIcon={<AddIcon />} sx={{ textTransform: 'none' }}>Add Row</Button>
        <Button size="small" variant="outlined" onClick={() => onBulkSetNullable(true)} disabled={selectedCount === 0} sx={{ textTransform: 'none' }}>Bulk Nullable</Button>
        <Button size="small" variant="outlined" onClick={() => onBulkSetNullable(false)} disabled={selectedCount === 0} sx={{ textTransform: 'none' }}>Bulk Not Null</Button>
        <Button size="small" variant="outlined" color="error" onClick={onBulkDeleteSelected} disabled={selectedCount === 0} sx={{ textTransform: 'none' }}>Delete Selected</Button>
        <Button size="small" variant="outlined" onClick={onExportJson} sx={{ textTransform: 'none' }}>Export JSON</Button>
        <Button size="small" variant="outlined" onClick={onExportSql} sx={{ textTransform: 'none' }}>Export SQL</Button>
        <Button size="small" variant="contained" onClick={onSave} disabled={saving} sx={{ textTransform: 'none' }}>{saving ? 'Saving...' : 'Save CDM Fields'}</Button>
      </Stack>

      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 1640, display: 'grid', gridTemplateColumns: GRID, backgroundColor: 'rgba(255,255,255,0.06)' }}>
          {['', 'Field Name', 'Data Type', 'Length/Precision', 'Nullable', 'Description', 'Business Rule', 'Transformation Hint', 'Source Examples', ''].map((header, idx) => (
            <Box key={`${header}-${idx}`} sx={{ px: 1, py: 0.75, fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>
              {idx === 0 ? (
                <Checkbox size="small" checked={allSelected} onChange={(e) => onToggleAllSelection(e.target.checked)} />
              ) : header}
            </Box>
          ))}
        </Box>

        {rows.length === 0 ? (
          <Box sx={{ p: 1.2 }}>
            <Typography variant="body2" color="text.secondary">No CDM field rows yet. Add a row or use AI derivation to populate this table.</Typography>
          </Box>
        ) : rows.map((row) => (
          <Box key={row.id} sx={{ minWidth: 1640, display: 'grid', gridTemplateColumns: GRID, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Box sx={{ px: 1, py: 0.55, display: 'flex', alignItems: 'center' }}>
              <Checkbox size="small" checked={row.selected} onChange={(e) => onToggleRowSelection(row.id, e.target.checked)} />
            </Box>
            <Box sx={{ px: 1, py: 0.55 }}>
              <TextField size="small" value={row.fieldName} onChange={(e) => onUpdateRow(row.id, { fieldName: e.target.value })} fullWidth />
            </Box>
            <Box sx={{ px: 1, py: 0.55 }}>
              <TextField size="small" value={row.dataType} onChange={(e) => onUpdateRow(row.id, { dataType: e.target.value })} fullWidth />
            </Box>
            <Box sx={{ px: 1, py: 0.55 }}>
              <TextField size="small" value={row.lengthPrecision} onChange={(e) => onUpdateRow(row.id, { lengthPrecision: e.target.value })} fullWidth />
            </Box>
            <Box sx={{ px: 1, py: 0.55, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Checkbox size="small" checked={row.nullable} onChange={(e) => onUpdateRow(row.id, { nullable: e.target.checked })} />
            </Box>
            <Box sx={{ px: 1, py: 0.55 }}>
              <TextField size="small" value={row.description} onChange={(e) => onUpdateRow(row.id, { description: e.target.value })} multiline minRows={2} fullWidth />
            </Box>
            <Box sx={{ px: 1, py: 0.55 }}>
              <TextField size="small" value={row.businessRule} onChange={(e) => onUpdateRow(row.id, { businessRule: e.target.value })} multiline minRows={2} fullWidth />
            </Box>
            <Box sx={{ px: 1, py: 0.55 }}>
              <TextField size="small" value={row.transformationHint} onChange={(e) => onUpdateRow(row.id, { transformationHint: e.target.value })} multiline minRows={2} fullWidth />
            </Box>
            <Box sx={{ px: 1, py: 0.55 }}>
              <TextField size="small" value={row.sourceExamples} onChange={(e) => onUpdateRow(row.id, { sourceExamples: e.target.value })} multiline minRows={2} fullWidth />
            </Box>
            <Box sx={{ px: 1, py: 0.55, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconButton size="small" color="error" onClick={() => onRemoveRow(row.id)}>
                <DeleteIcon sx={{ fontSize: '0.95rem' }} />
              </IconButton>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default CdmFieldsEditorTable;
