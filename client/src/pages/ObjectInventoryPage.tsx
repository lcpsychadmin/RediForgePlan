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
import Layout from '../components/Layout';
import apiClient from '../api/client';

interface GlobalObjectRow {
  id: string;
  objectId: string;
  object_id?: string;
  description?: string;
  processArea?: string;
  process_area?: string;
}

const ObjectInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [objects, setObjects] = React.useState<GlobalObjectRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await apiClient.get('/api/global-objects');
        if (!active) return;
        setObjects(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.response?.data?.message || 'Failed to load object inventory.');
        setObjects([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2.5 }}>
          Object Inventory
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <TableContainer className="table-container">
            <Table stickyHeader>
              <TableHead className="table-header">
                <TableRow className="table-row">
                  {['Object ID', 'Description', 'Process Area', 'Actions'].map((header) => (
                    <TableCell key={header} className="table-cell">
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {objects.length === 0 ? (
                  <TableRow className="table-row">
                    <TableCell colSpan={4} className="table-cell" sx={{ color: 'text.secondary', py: 2.5 }}>
                      No objects found.
                    </TableCell>
                  </TableRow>
                ) : (
                  objects.map((obj, idx) => {
                    const objectCode = obj.objectId || obj.object_id || '';
                    return (
                      <TableRow
                        key={obj.id}
                        className="table-row"
                        data-row-odd={idx % 2 !== 0 ? 'true' : 'false'}
                      >
                        <TableCell className="table-cell table-cell-object-id">
                          {objectCode}
                        </TableCell>
                        <TableCell className="table-cell">
                          {obj.description || '-'}
                        </TableCell>
                        <TableCell className="table-cell">
                          {obj.processArea || obj.process_area || '-'}
                        </TableCell>
                        <TableCell className="table-cell">
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ textTransform: 'none' }}
                            onClick={() => navigate(`/objects/${encodeURIComponent(obj.id)}`)}
                          >
                            Open Object Page
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Layout>
  );
};

export default ObjectInventoryPage;
