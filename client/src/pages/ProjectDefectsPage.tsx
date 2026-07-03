import React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageContainer from '../layout/PageContainer';
import ContentHeader from '../layout/ContentHeader';
import apiClient from '../api/client';
import { ReportingSummary } from '../api/types';
import { useFilter } from '../contexts/FilterContext';
import { useProjectDefects } from '../api/hooks';
import DefectCommentsModal from '../components/DefectCommentsModal';

const surfaceSx = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 2,
  backgroundColor: 'rgba(255,255,255,0.04)',
  overflow: 'hidden',
};

const tableTh = {
  py: 0.8,
  px: 1.5,
  fontSize: '0.68rem',
  letterSpacing: '0.06em',
  color: 'rgba(255,255,255,0.45)',
  backgroundColor: 'rgba(0,0,0,0.18)',
  textTransform: 'uppercase' as const,
  fontWeight: 700,
  borderBottom: '1px solid rgba(255,255,255,0.07)',
};

const tableTd = {
  py: 0.75,
  px: 1.5,
  fontSize: '0.8rem',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
};

interface ProjectDefectsPageProps {
  projectId?: string | null;
}

const ProjectDefectsPage: React.FC<ProjectDefectsPageProps> = ({ projectId: projectIdProp }) => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const { selectedProjectId } = useFilter();
  const resolvedProjectId = projectIdProp || routeProjectId || selectedProjectId || '';
  const [statusMode, setStatusMode] = React.useState<'active' | 'closed' | 'all'>('active');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDefectId, setSelectedDefectId] = React.useState<string>('');

  const { data: project } = useQuery({
    queryKey: ['project-defects-project', resolvedProjectId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/projects/${resolvedProjectId}`);
      return response.data.data;
    },
    enabled: !!resolvedProjectId,
  });

  const defectStatuses = React.useMemo(() => {
    if (statusMode === 'active') return ['open', 'in_progress'];
    if (statusMode === 'closed') return ['closed'];
    return ['open', 'in_progress', 'resolved', 'closed'];
  }, [statusMode]);

  const { data: defects = [], isLoading: defectsLoading } = useProjectDefects(resolvedProjectId, {
    statuses: defectStatuses,
    search: searchTerm,
  });

  const { data: people = [] } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const response = await apiClient.get('/api/people');
      return response.data.data || [];
    },
  });

  const queryClient = useQueryClient();

  const activeDefect = React.useMemo(
    () => defects.find((defect: any) => defect.id === selectedDefectId) || null,
    [defects, selectedDefectId]
  );

  React.useEffect(() => {
    if (selectedDefectId && !defects.some((defect: any) => defect.id === selectedDefectId)) {
      setSelectedDefectId('');
    }
  }, [defects, selectedDefectId]);

  const handleDefectSaved = async () => {
    await queryClient.invalidateQueries({ queryKey: ['project-defects', resolvedProjectId] });
    await queryClient.invalidateQueries({ queryKey: ['project-defects-summary', resolvedProjectId] });
  };

  if (!resolvedProjectId) {
    return <Alert severity="info">Select a project using the global filter to view defects.</Alert>;
  }

  const defectCount = defects.length;
  const activeCount = defects.filter((defect: any) => defect.status === 'open' || defect.status === 'in_progress').length;
  const closedCount = defects.filter((defect: any) => defect.status === 'closed').length;
  const resolvedCount = defects.filter((defect: any) => defect.status === 'resolved').length;

  return (
    <PageContainer>
      <ContentHeader
        title={`${project?.name || 'Project'} Defects`}
        stats={[
          { label: 'Displayed', value: defectCount },
          { label: 'Active', value: activeCount },
          { label: 'Closed', value: closedCount },
          { label: 'Resolved', value: resolvedCount },
        ]}
      />

      <Box sx={{ ...surfaceSx, mb: 3 }}>
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <Typography variant="subtitle2" fontWeight={700}>Defect Search</Typography>
          <Typography variant="body2" color="text.secondary">
            Search defects across the project. Active defects are shown by default; switch to closed or all defects when needed.
          </Typography>
        </Box>
        <Box sx={{ px: 2.5, py: 1.5 }}>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                label="Search defects"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 280 }}
              />
              <TextField
                size="small"
                select
                label="Visibility"
                value={statusMode}
                onChange={(e) => setStatusMode(e.target.value as 'active' | 'closed' | 'all')}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="active">Active defects</MenuItem>
                <MenuItem value="closed">Closed defects</MenuItem>
                <MenuItem value="all">All defects</MenuItem>
              </TextField>
            </Stack>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label={`Active: ${activeCount}`} />
              <Chip size="small" label={`Closed: ${closedCount}`} />
              <Chip size="small" label={`Resolved: ${resolvedCount}`} />
            </Box>
          </Stack>
        </Box>
      </Box>

      {defectsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : defects.length === 0 ? (
        <Alert severity="info">No defects found for the selected filters.</Alert>
      ) : (
        <Box sx={{ ...surfaceSx, mb: 3, maxHeight: 760, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <Typography variant="subtitle2" fontWeight={700}>Defect Queue ({defects.length})</Typography>
          </Box>
          <Box sx={{ maxHeight: 716, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableTh}>Defect #</TableCell>
                  <TableCell sx={tableTh}>Title</TableCell>
                  <TableCell sx={tableTh}>Root Cause</TableCell>
                  <TableCell sx={tableTh}>State</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {defects.map((defect: any) => (
                  <TableRow
                    key={defect.id}
                    hover
                    selected={activeDefect?.id === defect.id}
                    onClick={() => setSelectedDefectId(defect.id)}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.035)' }, backgroundColor: 'rgba(255,255,255,0.01)' }}
                  >
                    <TableCell sx={tableTd}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.78rem' }}>{defect.id}</Typography>
                      <Typography variant="caption" color="text.secondary">{defect.taskName || 'Task'}</Typography>
                    </TableCell>
                    <TableCell sx={tableTd}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{defect.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{defect.defectDetails || 'No problem statement.'}</Typography>
                    </TableCell>
                    <TableCell sx={tableTd}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{defect.rootCauseCategoryName || 'Unspecified'}</Typography>
                    </TableCell>
                    <TableCell sx={tableTd}>
                      <Stack spacing={0.5}>
                        <Chip size="small" variant="outlined" label={defect.status.replace('_', ' ')} />
                        <Chip size="small" label={defect.severity} color={defect.severity === 'critical' ? 'error' : defect.severity === 'high' ? 'warning' : 'default'} />
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}

      <DefectCommentsModal
        open={Boolean(activeDefect)}
        defect={activeDefect}
        people={people || []}
        onClose={() => setSelectedDefectId('')}
        onSaved={handleDefectSaved}
      />

    </PageContainer>
  );
};

export default ProjectDefectsPage;
