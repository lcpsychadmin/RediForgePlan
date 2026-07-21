import React from 'react';
import { Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import type { AiMappingSuggestion } from '../../types/objectAi';

type EditableSuggestion = AiMappingSuggestion & {
  accepted: boolean;
};

interface AiMappingSuggestionPanelProps {
  suggestions: AiMappingSuggestion[];
  averageConfidenceScore?: number;
  loading?: boolean;
  onApply: (accepted: AiMappingSuggestion[]) => Promise<void> | void;
  onClose: () => void;
}

const AiMappingSuggestionPanel: React.FC<AiMappingSuggestionPanelProps> = ({
  suggestions,
  averageConfidenceScore = 0,
  loading = false,
  onApply,
  onClose,
}) => {
  const [rows, setRows] = React.useState<EditableSuggestion[]>([]);

  React.useEffect(() => {
    setRows((suggestions || []).map((row) => ({ ...row, accepted: true })));
  }, [suggestions]);

  const setRow = (index: number, patch: Partial<EditableSuggestion>) => {
    setRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const acceptedCount = rows.filter((row) => row.accepted).length;

  const handleApply = async () => {
    await onApply(rows.filter((row) => row.accepted).map(({ accepted, ...row }) => row));
  };

  return (
    <Box sx={{ mt: 2, border: '1px solid rgba(255,255,255,0.18)', borderRadius: 1, p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>AI Mapping Suggestions</Typography>
        <Chip size="small" label={`${acceptedCount} selected`} />
        <Chip size="small" label={`Avg ${Math.round((averageConfidenceScore || 0) * 100)}%`} />
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" variant="contained" disabled={loading || acceptedCount === 0} onClick={handleApply} sx={{ textTransform: 'none' }}>
          {loading ? 'Applying...' : 'Apply Selected'}
        </Button>
        <Button size="small" variant="text" onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
      </Stack>

      <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
        <Box sx={{ minWidth: 1240, display: 'grid', gridTemplateColumns: '1fr 0.9fr 1fr 0.9fr 1.8fr 1.1fr 1fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
          {['Source Field', 'Source Table', 'CDM Field', 'Confidence', 'Explanation', 'Transform', 'Decision'].map((header) => (
            <Box key={header} sx={{ px: 1, py: 0.75, fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>{header}</Box>
          ))}
        </Box>

        {rows.map((row, index) => (
          <Box key={`${row.sourceFieldName}-${index}`} sx={{ minWidth: 1240, display: 'grid', gridTemplateColumns: '1fr 0.9fr 1fr 0.9fr 1.8fr 1.1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.08)', opacity: row.accepted ? 1 : 0.5 }}>
            <Box sx={{ px: 1, py: 0.75, fontFamily: 'monospace', fontSize: '0.84rem' }}>{row.sourceFieldName}</Box>
            <Box sx={{ px: 1, py: 0.75, color: 'text.secondary' }}>{row.sourceTableName || '-'}</Box>
            <Box sx={{ px: 1, py: 0.5 }}><TextField size="small" value={row.cdmFieldName} onChange={(e) => setRow(index, { cdmFieldName: e.target.value })} fullWidth /></Box>
            <Box sx={{ px: 1, py: 0.8 }}><Chip size="small" label={`${Math.round((row.confidenceScore || 0) * 100)}%`} sx={{ height: 20 }} /></Box>
            <Box sx={{ px: 1, py: 0.5 }}><TextField size="small" value={row.explanation} onChange={(e) => setRow(index, { explanation: e.target.value })} fullWidth multiline minRows={2} /></Box>
            <Box sx={{ px: 1, py: 0.5 }}><TextField size="small" value={row.transformRule || ''} onChange={(e) => setRow(index, { transformRule: e.target.value || null })} fullWidth /></Box>
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Button size="small" variant={row.accepted ? 'contained' : 'outlined'} onClick={() => setRow(index, { accepted: true })} sx={{ textTransform: 'none', minWidth: 64 }}>Accept</Button>
              <Button size="small" color="inherit" variant={!row.accepted ? 'contained' : 'outlined'} onClick={() => setRow(index, { accepted: false })} sx={{ textTransform: 'none', minWidth: 64 }}>Reject</Button>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default AiMappingSuggestionPanel;
