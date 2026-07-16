import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useFilter } from '../../contexts/FilterContext';
import apiClient from '../../api/client';

interface ProjectInventoryRow {
  id: string;
  globalObjectId: string;
  objectId: string;
  description: string;
  complexity?: string;
  deploymentDisposition?: string;
  buildType?: string;
  objectType?: string;
  status?: string;
  notes?: string;
}

const ObjectInventoryProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProjectId } = useFilter();
  const [rows, setRows] = React.useState<ProjectInventoryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      if (!selectedProjectId) {
        setRows([]);
        setError('');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        const res = await apiClient.get(`/api/project-objects/project/${selectedProjectId}`);
        if (!active) return;
        setRows(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.response?.data?.message || 'Failed to load project inventory.');
        setRows([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  if (!selectedProjectId) {
    return <Alert severity="info">Select a project in the global header filter to view Project Inventory.</Alert>;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <TableContainer className="table-container">
      <Table stickyHeader>
        <TableHead className="table-header">
          <TableRow className="table-row">
            {['Data Object', 'Complexity', 'Deployment Disposition', 'Build Type', 'Object Type', 'Project Metadata', 'Actions'].map((header) => (
              <TableCell key={header} className="table-cell">
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="table-row">
              <TableCell colSpan={7} className="table-cell" sx={{ color: 'text.secondary', py: 2.5 }}>
                No items in project inventory yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, idx) => (
              <TableRow key={row.id} className="table-row" data-row-odd={idx % 2 !== 0 ? 'true' : 'false'}>
                <TableCell className="table-cell table-cell-object-id">{row.objectId || '-'}</TableCell>
                <TableCell className="table-cell">{row.complexity || '-'}</TableCell>
                <TableCell className="table-cell">{row.deploymentDisposition || '-'}</TableCell>
                <TableCell className="table-cell">{row.buildType || '-'}</TableCell>
                <TableCell className="table-cell">{row.objectType || '-'}</TableCell>
                <TableCell className="table-cell">
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Status: {row.status || '-'}</Typography>
                  <Typography variant="caption" color="text.secondary">Notes: {row.notes || '-'}</Typography>
                </TableCell>
                <TableCell className="table-cell">
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: 'none' }}
                    onClick={() => navigate(`/objects/${encodeURIComponent(row.globalObjectId)}`)}
                  >
                    Open Object Page
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ObjectInventoryProjectPage;
