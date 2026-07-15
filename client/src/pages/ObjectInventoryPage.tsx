import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
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
import { palette } from '../theme/palette';

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
          <TableContainer
            component={Paper}
            sx={{
              backgroundColor: palette.background.paper,
              backgroundImage: 'none',
              borderRadius: 1.5,
              border: `1px solid ${palette.divider}`,
              overflow: 'hidden',
            }}
          >
            <Table stickyHeader>
              <TableHead sx={{ backgroundColor: palette.background.elevated }}>
                <TableRow>
                  {['Object ID', 'Description', 'Process Area', 'Actions'].map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        fontWeight: 700,
                        color: palette.text.primary,
                        backgroundColor: palette.background.elevated,
                        borderColor: palette.divider,
                        fontSize: '0.875rem',
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {objects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ color: 'text.secondary', py: 2.5 }}>
                      No objects found.
                    </TableCell>
                  </TableRow>
                ) : (
                  objects.map((obj, idx) => {
                    const objectCode = obj.objectId || obj.object_id || '';
                    return (
                      <TableRow
                        key={obj.id}
                        sx={{
                          backgroundColor: idx % 2 === 0 ? 'transparent' : `${palette.background.elevated}40`,
                          '&:hover': { backgroundColor: `${palette.primary.main}08` },
                        }}
                      >
                        <TableCell sx={{ color: palette.text.primary, fontWeight: 600, borderColor: palette.divider }}>
                          {objectCode}
                        </TableCell>
                        <TableCell sx={{ color: palette.text.secondary, borderColor: palette.divider }}>
                          {obj.description || '-'}
                        </TableCell>
                        <TableCell sx={{ color: palette.text.secondary, borderColor: palette.divider }}>
                          {obj.processArea || obj.process_area || '-'}
                        </TableCell>
                        <TableCell sx={{ borderColor: palette.divider }}>
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
