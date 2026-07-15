import React from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import apiClient from '../../api/client';
import RegisterModelModal, { type RegisterModelFormValues } from './RegisterModelModal';

interface ModelRow {
  id: string;
  modelName: string;
  provider: string;
  costTier: string;
  capabilities: string[];
  endpointUrl: string;
  maxTokens: string;
  latencyClass: string;
  status: 'Enabled' | 'Disabled';
}

const AiModelRegistryPanel: React.FC = () => {
  const [rows, setRows] = React.useState<ModelRow[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState<ModelRow | null>(null);

  const loadModels = React.useCallback(async () => {
    const response = await apiClient.get('/api/ai/models');
    const mapped = ((response.data?.data || []) as any[]).map((row: any) => ({
      id: row.id,
      modelName: row.display_name,
      provider: row.provider || '-',
      costTier: row.model_family || '-',
      capabilities: Array.isArray(row.capabilities) ? row.capabilities.map((entry: any) => entry.capabilityKey) : [],
      endpointUrl: row.endpoint_url || '',
      maxTokens: row.max_tokens ? String(row.max_tokens) : '',
      latencyClass: row.latency_class || 'standard',
      status: row.is_active ? 'Enabled' : 'Disabled',
    }));
    setRows(mapped);
  }, []);

  React.useEffect(() => {
    loadModels().catch(() => setRows([]));
  }, [loadModels]);

  const handleSave = async (values: RegisterModelFormValues) => {
    const normalizedModelName = values.modelName.trim();
    const payload = {
      modelKey: normalizedModelName,
      displayName: normalizedModelName,
      provider: values.provider,
      modelFamily: values.costTier,
      endpointUrl: values.endpointUrl || null,
      apiKey: values.apiKey || null,
      maxTokens: values.maxTokens ? Number(values.maxTokens) : null,
      latencyClass: values.latencyClass || null,
      isActive: values.enabled,
    };

    let modelId = editingRow?.id || '';
    if (editingRow) {
      await apiClient.put(`/api/ai/models/${editingRow.id}`, payload);
    } else {
      const created = await apiClient.post('/api/ai/models', payload);
      modelId = created.data?.data?.id;
    }

    if (modelId) {
      await Promise.all(values.capabilities.map((capabilityKey) =>
        apiClient.post(`/api/ai/models/${modelId}/capabilities`, { capabilityKey, isSupported: true })
      ));
    }

    await loadModels();
    setEditingRow(null);
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/api/ai/models/${id}`);
    await loadModels();
  };

  const initialValues: RegisterModelFormValues | undefined = editingRow
    ? {
        modelName: editingRow.modelName,
        provider: editingRow.provider === '-' ? 'openai' : editingRow.provider,
        endpointUrl: editingRow.endpointUrl,
        apiKey: '',
        costTier: editingRow.costTier === '-' ? 'standard' : editingRow.costTier,
        capabilities: editingRow.capabilities,
        maxTokens: editingRow.maxTokens,
        latencyClass: editingRow.latencyClass || 'standard',
        enabled: editingRow.status === 'Enabled',
      }
    : undefined;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          Register and manage AI models available for routing.
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: 'none' }} onClick={() => { setEditingRow(null); setModalOpen(true); }}>
          Register Model
        </Button>
      </Box>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Model Name</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Cost Tier</TableCell>
              <TableCell>Capabilities</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.modelName}</TableCell>
                <TableCell>{row.provider}</TableCell>
                <TableCell>{row.costTier}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {row.capabilities.length === 0 ? <Chip size="small" label="-" /> : row.capabilities.map((cap) => <Chip key={cap} size="small" label={cap} variant="outlined" />)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={row.status} color={row.status === 'Enabled' ? 'success' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" sx={{ textTransform: 'none', mr: 0.5 }} onClick={() => { setEditingRow(row); setModalOpen(true); }}>
                    Edit
                  </Button>
                  <IconButton size="small" onClick={() => handleDelete(row.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>
                  No registered models.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <RegisterModelModal
        open={modalOpen}
        modelId={editingRow?.id}
        initialValues={initialValues}
        onClose={() => { setModalOpen(false); setEditingRow(null); }}
        onSave={handleSave}
      />
    </Box>
  );
};

export default AiModelRegistryPanel;
