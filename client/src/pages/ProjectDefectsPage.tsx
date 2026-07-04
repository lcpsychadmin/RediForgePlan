import React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  TableContainer,
  Stack,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageContainer from '../layout/PageContainer';
import ContentHeader from '../layout/ContentHeader';
import apiClient from '../api/client';
import { useFilter } from '../contexts/FilterContext';
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

const filterFieldSx = {
  minWidth: 150,
  '& .MuiInputBase-root': { fontSize: '0.78rem', height: 32 },
  '& .MuiInputLabel-root': { fontSize: '0.78rem' },
};

const Section: React.FC<{ title: string; count?: number; accent: string; children: React.ReactNode }> = ({ title, count, accent, children }) => (
  <Box sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
    <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
      <Box sx={{ width: 4, height: 18, borderRadius: 2, backgroundColor: accent, flexShrink: 0 }} />
      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</Typography>
      {typeof count === 'number' ? (
        <Box sx={{ px: 0.8, py: 0.1, borderRadius: 1, backgroundColor: `${accent}28`, color: accent, fontWeight: 700, fontSize: '0.75rem' }}>{count}</Box>
      ) : null}
    </Box>
    {children}
  </Box>
);

const formatDefectNumber = (defect: any) => {
  const parsedNumber = typeof defect?.defectNumber === 'number'
    ? defect.defectNumber
    : Number(defect?.defectNumber);
  if (Number.isFinite(parsedNumber)) {
    return `DEF-${String(parsedNumber).padStart(5, '0')}`;
  }
  return defect.id;
};

interface ProjectDefectsPageProps {
  projectId?: string | null;
}

const ProjectDefectsPage: React.FC<ProjectDefectsPageProps> = ({ projectId: projectIdProp }) => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const { selectedProgramId, selectedProjectId } = useFilter();
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

  const { data: defects = [], isLoading: defectsLoading } = useQuery({
    queryKey: ['project-defects', resolvedProjectId, selectedProgramId, defectStatuses, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (defectStatuses.length) {
        params.append('statuses', defectStatuses.join(','));
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const fetchProjectDefects = async (projectId: string) => {
        const response = await apiClient.get(`/api/projects/${projectId}/defects`, {
          params: Object.fromEntries(params),
        });
        return response.data.data || [];
      };

      if (resolvedProjectId) {
        return await fetchProjectDefects(resolvedProjectId);
      }

      const programs = selectedProgramId
        ? [{ id: selectedProgramId }]
        : ((await apiClient.get('/api/programs')).data.data || []);

      const projectGroups = await Promise.all(
        programs.map(async (program: any) => {
          const projectsResponse = await apiClient.get(`/api/projects/by-program/${program.id}`);
          return projectsResponse.data.data || [];
        })
      );

      const projects = projectGroups.flat();
      const defectGroups = await Promise.all(
        projects.map(async (project: any) => {
          try {
            return await fetchProjectDefects(project.id);
          } catch {
            return [];
          }
        })
      );

      const deduped = new Map<string, any>();
      defectGroups.flat().forEach((defect: any) => {
        if (!defect?.id) return;
        deduped.set(defect.id, defect);
      });
      return Array.from(deduped.values());
    },
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

  return (
    <PageContainer>
      <ContentHeader title="Defects" />

      <Section title="Defect Queue" count={defects.length} accent="#ef5350">
        <Box sx={{ px: 2, py: 1.25, display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <TextField
            size="small"
            placeholder="Search defects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 320, ...filterFieldSx }}
            slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} /> } }}
          />
          <TextField
            size="small"
            select
            label="Visibility"
            value={statusMode}
            onChange={(e) => setStatusMode(e.target.value as 'active' | 'closed' | 'all')}
            sx={filterFieldSx}
          >
            <MenuItem value="active">Active defects</MenuItem>
            <MenuItem value="closed">Closed defects</MenuItem>
            <MenuItem value="all">All defects</MenuItem>
          </TextField>
        </Box>

        {defectsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : defects.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>No defects found for the selected filters.</Alert>
        ) : (
          <TableContainer sx={{ maxHeight: 716 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableTh}>Defect #</TableCell>
                  <TableCell sx={tableTh}>Title</TableCell>
                  <TableCell sx={tableTh}>Assigned To</TableCell>
                  <TableCell sx={tableTh}>Process Area</TableCell>
                  <TableCell sx={tableTh}>Program</TableCell>
                  <TableCell sx={tableTh}>Project</TableCell>
                  <TableCell sx={tableTh}>Mock Cycle</TableCell>
                  <TableCell sx={tableTh}>State</TableCell>
                  <TableCell sx={{ ...tableTh, width: 48, p: 0 }}></TableCell>
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
                      <Typography sx={{ fontWeight: 700, fontSize: '0.78rem' }}>{formatDefectNumber(defect)}</Typography>
                      <Typography variant="caption" color="text.secondary">{defect.taskName || 'Task'}</Typography>
                    </TableCell>
                    <TableCell sx={tableTd}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{defect.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{defect.defectDetails || 'No problem statement.'}</Typography>
                    </TableCell>
                    <TableCell sx={tableTd}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{defect.assignedToUserEmail || 'Unassigned'}</Typography>
                    </TableCell>
                    <TableCell sx={tableTd}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{defect.processArea || 'Unspecified'}</Typography>
                    </TableCell>
                    <TableCell sx={tableTd}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{defect.programName || 'Unknown'}</Typography>
                    </TableCell>
                    <TableCell sx={tableTd}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{defect.projectName || project?.name || 'Unknown'}</Typography>
                    </TableCell>
                    <TableCell sx={tableTd}>
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{defect.mockCycleName || 'Unknown'}</Typography>
                    </TableCell>
                    <TableCell sx={tableTd}>
                      <Stack spacing={0.5}>
                        <Chip size="small" variant="outlined" label={defect.status.replace('_', ' ')} />
                        <Chip size="small" label={defect.severity} color={defect.severity === 'critical' ? 'error' : defect.severity === 'high' ? 'warning' : 'default'} />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ ...tableTd, width: 48, p: 0 }}>
                      <IconButton size="small" onClick={() => setSelectedDefectId(defect.id)}>
                        <OpenInNewIcon sx={{ fontSize: '0.95rem' }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Section>

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
