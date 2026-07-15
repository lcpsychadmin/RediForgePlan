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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../../api/client';
import GatewayEditorModal, { type GatewayEditorValues } from './GatewayEditorModal';

interface GatewayRow {
  id: string;
  gatewayName: string;
  assignedModelIds: string[];
  assignedModels: string[];
  fallbackRules: string;
  costCeiling: string;
}

const parseDescription = (description: string) => {
  try {
    const parsed = JSON.parse(description || '{}');
    return {
      fallbackRules: parsed.fallbackRules || '',
      costCeiling: parsed.costCeiling || '',
    };
  } catch {
    return { fallbackRules: description || '', costCeiling: '' };
  }
};

const toDescription = (fallbackRules: string, costCeiling: string) => JSON.stringify({ fallbackRules, costCeiling });

const AiGatewayPanel: React.FC = () => {
  const [rows, setRows] = React.useState<GatewayRow[]>([]);
  const [modelOptions, setModelOptions] = React.useState<Array<{ id: string; label: string }>>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState<GatewayRow | null>(null);

  const loadData = React.useCallback(async () => {
    const [modelsRes, gatewaysRes] = await Promise.all([
      apiClient.get('/api/ai/models'),
      apiClient.get('/api/ai/gateways'),
    ]);

    const modelLookup = new Map<string, string>();
    const options = ((modelsRes.data?.data || []) as any[]).map((model: any) => {
      const provider = (model.provider || 'unknown').toUpperCase();
      modelLookup.set(model.id, `${model.display_name} (${provider})`);
      return { id: model.id, label: `${model.display_name} (${provider})` };
    });
    setModelOptions(options);

    const mapped = ((gatewaysRes.data?.data || []) as any[]).map((gateway: any) => {
      const parsed = parseDescription(gateway.description || '');
      const assignedModelIds = [gateway.default_model_id, gateway.failover_model_id].filter(Boolean);
      return {
        id: gateway.id,
        gatewayName: gateway.name,
        assignedModelIds,
        assignedModels: assignedModelIds.map((modelId: string) => modelLookup.get(modelId) || modelId),
        fallbackRules: parsed.fallbackRules,
        costCeiling: parsed.costCeiling,
      } as GatewayRow;
    });

    setRows(mapped);
  }, []);

  React.useEffect(() => {
    loadData().catch(() => {
      setRows([]);
      setModelOptions([]);
    });
  }, [loadData]);

  const handleSave = async (values: GatewayEditorValues) => {
    const payload = {
      name: values.gatewayName,
      defaultModelId: values.priorityOrder[0] || values.assignedModelIds[0] || null,
      failoverModelId: values.priorityOrder[1] || values.assignedModelIds[1] || null,
      description: toDescription(values.fallbackRules, values.costCeiling),
      isActive: true,
    };

    if (editingRow) {
      await apiClient.put(`/api/ai/gateways/${editingRow.id}`, payload);
    } else {
      await apiClient.post('/api/ai/gateways', payload);
    }

    await loadData();
    setEditingRow(null);
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/api/ai/gateways/${id}`);
    await loadData();
  };

  const initialValues: GatewayEditorValues | undefined = editingRow
    ? {
        gatewayName: editingRow.gatewayName,
        assignedModelIds: editingRow.assignedModelIds,
        priorityOrder: editingRow.assignedModelIds,
        fallbackRules: editingRow.fallbackRules,
        costCeiling: editingRow.costCeiling,
      }
    : undefined;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          Configure provider gateways, fallback behavior, and cost controls.
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: 'none' }} onClick={() => { setEditingRow(null); setModalOpen(true); }}>
          Create Gateway
        </Button>
      </Box>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Gateway Name</TableCell>
              <TableCell>Assigned Models</TableCell>
              <TableCell>Fallback Rules</TableCell>
              <TableCell>Cost Ceiling</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.gatewayName}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {row.assignedModels.length === 0
                      ? <Chip size="small" label="-" />
                      : row.assignedModels.map((entry) => <Chip key={entry} size="small" label={entry} variant="outlined" />)}
                  </Box>
                </TableCell>
                <TableCell>{row.fallbackRules || '-'}</TableCell>
                <TableCell>{row.costCeiling || '-'}</TableCell>
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
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>
                  No gateways configured.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <GatewayEditorModal
        open={modalOpen}
        initialValues={initialValues}
        modelOptions={modelOptions}
        onClose={() => { setModalOpen(false); setEditingRow(null); }}
        onSave={handleSave}
      />
    </Box>
  );
};

export default AiGatewayPanel;
