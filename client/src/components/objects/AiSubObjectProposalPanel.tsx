import React from 'react';
import { Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import type { AiSubObjectProposal } from '../../types/objectAi';

type EditableProposal = AiSubObjectProposal & {
  accepted: boolean;
};

interface AiSubObjectProposalPanelProps {
  proposals: AiSubObjectProposal[];
  loading?: boolean;
  onApply: (accepted: AiSubObjectProposal[]) => Promise<void> | void;
  onClose: () => void;
}

const AiSubObjectProposalPanel: React.FC<AiSubObjectProposalPanelProps> = ({
  proposals,
  loading = false,
  onApply,
  onClose,
}) => {
  const [rows, setRows] = React.useState<EditableProposal[]>([]);

  React.useEffect(() => {
    setRows((proposals || []).map((row) => ({ ...row, accepted: true })));
  }, [proposals]);

  const setRow = (index: number, patch: Partial<EditableProposal>) => {
    setRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const acceptedCount = rows.filter((row) => row.accepted && row.name.trim()).length;

  const handleApply = async () => {
    await onApply(rows.filter((row) => row.accepted && row.name.trim()).map(({ accepted, ...row }) => row));
  };

  return (
    <Box sx={{ mt: 2, border: '1px solid rgba(255,255,255,0.18)', borderRadius: 1, p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>AI Proposals</Typography>
        <Chip size="small" label={`${acceptedCount} selected`} />
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" variant="contained" disabled={loading || acceptedCount === 0} onClick={handleApply} sx={{ textTransform: 'none' }}>
          {loading ? 'Applying...' : 'Accept Selected'}
        </Button>
        <Button size="small" variant="text" onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
      </Stack>

      <Box sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, overflowX: 'auto' }}>
        <Box sx={{ minWidth: 980, display: 'grid', gridTemplateColumns: '0.8fr 2.8fr 0.9fr 2fr 0.8fr', backgroundColor: 'rgba(255,255,255,0.06)' }}>
          {['Sub-object', 'Description', 'Confidence', 'Explanation', 'Decision'].map((header) => (
            <Box key={header} sx={{ px: 1, py: 0.75, fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>{header}</Box>
          ))}
        </Box>

        {rows.map((row, index) => (
          <Box key={`${row.name}-${index}`} sx={{ minWidth: 980, display: 'grid', gridTemplateColumns: '0.8fr 2.8fr 0.9fr 2fr 0.8fr', borderTop: '1px solid rgba(255,255,255,0.08)', opacity: row.accepted ? 1 : 0.5 }}>
            <Box sx={{ px: 1, py: 0.5 }}>
              <TextField size="small" value={row.name} onChange={(e) => setRow(index, { name: e.target.value })} fullWidth />
            </Box>
            <Box sx={{ px: 1, py: 0.5 }}>
              <TextField size="small" value={row.description} onChange={(e) => setRow(index, { description: e.target.value })} fullWidth />
            </Box>
            <Box sx={{ px: 1, py: 0.8 }}>
              <Chip size="small" label={`${Math.round((row.confidenceScore || 0) * 100)}%`} sx={{ height: 20 }} />
            </Box>
            <Box sx={{ px: 1, py: 0.5 }}>
              <TextField size="small" value={row.explanation} onChange={(e) => setRow(index, { explanation: e.target.value })} fullWidth multiline minRows={2} />
            </Box>
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Button size="small" variant={row.accepted ? 'contained' : 'outlined'} onClick={() => setRow(index, { accepted: true })} sx={{ textTransform: 'none', minWidth: 64 }}>
                Accept
              </Button>
              <Button size="small" color="inherit" variant={!row.accepted ? 'contained' : 'outlined'} onClick={() => setRow(index, { accepted: false })} sx={{ textTransform: 'none', minWidth: 64 }}>
                Reject
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default AiSubObjectProposalPanel;
