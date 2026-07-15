import React from 'react';
import {
  Box,
  Button,
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
import RouterEditorModal, { type RouterEditorValues } from './RouterEditorModal';

interface RouterRow {
  id: string;
  routerName: string;
  routerType: string;
  gatewayId: string;
  gatewayName: string;
  rules: string;
}

const AiRouterPanel: React.FC = () => {
  const [rows, setRows] = React.useState<RouterRow[]>([]);
  const [gatewayOptions, setGatewayOptions] = React.useState<Array<{ id: string; label: string }>>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState<RouterRow | null>(null);

  const loadData = React.useCallback(async () => {
    const [gatewaysRes, routersRes] = await Promise.all([
      apiClient.get('/api/ai/gateways'),
      apiClient.get('/api/ai/routers'),
    ]);

    const options = ((gatewaysRes.data?.data || []) as any[]).map((gateway: any) => ({ id: gateway.id, label: gateway.name }));
    setGatewayOptions(options);

    const mapped = ((routersRes.data?.data || []) as any[]).map((router: any) => ({
      id: router.id,
      routerName: router.name,
      routerType: router.strategy || '-',
      gatewayId: router.primary_gateway_id || '',
      gatewayName: router.primary_gateway_name || '-',
      rules: router.description || '-',
    }));

    setRows(mapped);
  }, []);

  React.useEffect(() => {
    loadData().catch(() => {
      setRows([]);
      setGatewayOptions([]);
    });
  }, [loadData]);

  const handleSave = async (values: RouterEditorValues) => {
    const payload = {
      name: values.routerName,
      strategy: values.routerType,
      primaryGatewayId: values.gatewayId || null,
      description: values.rules,
      isActive: true,
    };

    if (editingRow) {
      await apiClient.put(`/api/ai/routers/${editingRow.id}`, payload);
    } else {
      await apiClient.post('/api/ai/routers', payload);
    }

    await loadData();
    setEditingRow(null);
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/api/ai/routers/${id}`);
    await loadData();
  };

  const initialValues: RouterEditorValues | undefined = editingRow
    ? {
        routerName: editingRow.routerName,
        routerType: (editingRow.routerType as RouterEditorValues['routerType']) || 'costOptimized',
        gatewayId: editingRow.gatewayId,
        rules: editingRow.rules === '-' ? '' : editingRow.rules,
      }
    : undefined;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          Define routing strategies and gateway assignment rules.
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: 'none' }} onClick={() => { setEditingRow(null); setModalOpen(true); }}>
          Create Router
        </Button>
      </Box>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Router Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Gateway</TableCell>
              <TableCell>Rules</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.routerName}</TableCell>
                <TableCell>{row.routerType}</TableCell>
                <TableCell>{row.gatewayName}</TableCell>
                <TableCell>{row.rules}</TableCell>
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
                  No routers configured.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <RouterEditorModal
        open={modalOpen}
        initialValues={initialValues}
        gatewayOptions={gatewayOptions}
        onClose={() => { setModalOpen(false); setEditingRow(null); }}
        onSave={handleSave}
      />
    </Box>
  );
};

export default AiRouterPanel;
