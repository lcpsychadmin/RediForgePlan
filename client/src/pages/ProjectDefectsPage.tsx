import React from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
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
import { Defect, DefectStatus, ReportingSummary } from '../api/types';
import { useFilter } from '../contexts/FilterContext';
import { useProjectDefects } from '../api/hooks';

const statusOptions: DefectStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

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

const parseDefectDescriptionSections = (description: string | null | undefined) => {
  const text = (description || '').trim();
  if (!text) {
    return {
      details: '',
      reproSteps: '',
      systemInfo: '',
      acceptanceCriteria: '',
      discussion: '',
    };
  }

  const getSection = (name: string) => {
    const sectionRegex = new RegExp(`##\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n##\\s*|$)`, 'i');
    const match = text.match(sectionRegex);
    return match ? match[1].trim() : '';
  };

  const stripped = text
    .replace(/\n?##\s*Repro Steps\s*\n[\s\S]*?(?=\n##\s*|$)/gi, '')
    .replace(/\n?##\s*System Info\s*\n[\s\S]*?(?=\n##\s*|$)/gi, '')
    .replace(/\n?##\s*Acceptance Criteria\s*\n[\s\S]*?(?=\n##\s*|$)/gi, '')
    .replace(/\n?##\s*Discussion\s*\n[\s\S]*?(?=\n##\s*|$)/gi, '')
    .trim();

  return {
    details: stripped,
    reproSteps: getSection('Repro Steps'),
    systemInfo: getSection('System Info'),
    acceptanceCriteria: getSection('Acceptance Criteria'),
    discussion: getSection('Discussion'),
  };
};

const composeDefectDescription = (sections: {
  details: string;
  reproSteps: string;
  systemInfo: string;
  acceptanceCriteria: string;
  discussion: string;
}) => {
  const blocks: string[] = [];
  if (sections.details.trim()) blocks.push(sections.details.trim());
  if (sections.reproSteps.trim()) blocks.push(`## Repro Steps\n${sections.reproSteps.trim()}`);
  if (sections.systemInfo.trim()) blocks.push(`## System Info\n${sections.systemInfo.trim()}`);
  if (sections.acceptanceCriteria.trim()) blocks.push(`## Acceptance Criteria\n${sections.acceptanceCriteria.trim()}`);
  if (sections.discussion.trim()) blocks.push(`## Discussion\n${sections.discussion.trim()}`);
  return blocks.join('\n\n').trim();
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
  const [draft, setDraft] = React.useState({
    title: '',
    severity: 'medium' as Defect['severity'],
    status: 'open' as DefectStatus,
    assignedToUserId: '',
    details: '',
    reproSteps: '',
    systemInfo: '',
    acceptanceCriteria: '',
    discussion: '',
  });
  const [isSaving, setIsSaving] = React.useState(false);

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

  const peopleById = React.useMemo(
    () => Object.fromEntries((people || []).map((person: any) => [person.id, person])),
    [people]
  );

  const activeDefects = defects;

  const activeDefect = React.useMemo(
    () => activeDefects.find((defect: any) => defect.id === selectedDefectId) || activeDefects[0] || null,
    [activeDefects, selectedDefectId]
  );

  React.useEffect(() => {
    if (!activeDefect) {
      setSelectedDefectId('');
      return;
    }
    if (selectedDefectId !== activeDefect.id) {
      setSelectedDefectId(activeDefect.id);
    }
  }, [activeDefect, selectedDefectId]);

  React.useEffect(() => {
    if (!activeDefect) return;
    const parsed = parseDefectDescriptionSections(activeDefect.description);
    setDraft({
      title: activeDefect.title || '',
      severity: activeDefect.severity || 'medium',
      status: activeDefect.status || 'open',
      assignedToUserId: activeDefect.assignedToUserId || '',
      details: parsed.details,
      reproSteps: parsed.reproSteps,
      systemInfo: parsed.systemInfo,
      acceptanceCriteria: parsed.acceptanceCriteria,
      discussion: parsed.discussion,
    });
  }, [activeDefect?.id]);

  const computedDescription = React.useMemo(
    () => composeDefectDescription(draft),
    [draft]
  );

  const isDirty = React.useMemo(() => {
    if (!activeDefect) return false;
    return (
      draft.title.trim() !== (activeDefect.title || '').trim()
      || draft.severity !== activeDefect.severity
      || draft.status !== activeDefect.status
      || (draft.assignedToUserId || '') !== (activeDefect.assignedToUserId || '')
      || computedDescription !== ((activeDefect.description || '').trim())
    );
  }, [activeDefect, draft, computedDescription]);

  const saveDefect = async () => {
    if (!activeDefect) return;
    try {
      setIsSaving(true);
      await apiClient.patch(`/api/defects/${activeDefect.id}`, {
        title: draft.title.trim(),
        severity: draft.severity,
        status: draft.status,
        assignedToUserId: draft.assignedToUserId || null,
        description: computedDescription,
      });
      await queryClient.invalidateQueries({ queryKey: ['project-defects', resolvedProjectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-defects-summary', resolvedProjectId] });
    } finally {
      setIsSaving(false);
    }
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
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} md={5} lg={4.5}>
            <Box sx={{ ...surfaceSx, height: '100%', maxHeight: 760, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <Typography variant="subtitle2" fontWeight={700}>Defect Queue ({defects.length})</Typography>
              </Box>
              <Box sx={{ maxHeight: 716, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={tableTh}>ID</TableCell>
                      <TableCell sx={tableTh}>Title</TableCell>
                      <TableCell sx={tableTh}>Task</TableCell>
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
                          <Typography sx={{ fontWeight: 700, fontSize: '0.78rem' }}>BUG {defect.id.slice(0, 8)}</Typography>
                          <Typography variant="caption" color="text.secondary">{defect.issueCode || 'No issue code'}</Typography>
                        </TableCell>
                        <TableCell sx={tableTd}>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{defect.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{defect.description || 'No description.'}</Typography>
                        </TableCell>
                        <TableCell sx={tableTd}>
                          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{defect.taskName || 'Task'}</Typography>
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
          </Grid>

          <Grid item xs={12} md={7} lg={7.5}>
            {!activeDefect ? (
              <Alert severity="info">Select a defect to view details.</Alert>
            ) : (
              <Box sx={{ ...surfaceSx, p: 2 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">BUG {activeDefect.id.slice(0, 8)}</Typography>
                      <TextField
                        value={draft.title}
                        onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                        variant="standard"
                        fullWidth
                        sx={{ minWidth: { xs: '100%', md: 420 }, '& .MuiInputBase-input': { fontSize: '1.35rem', fontWeight: 700 } }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        sx={{ textTransform: 'none' }}
                        disabled={!isDirty || isSaving}
                        onClick={() => {
                          const parsed = parseDefectDescriptionSections(activeDefect.description);
                          setDraft({
                            title: activeDefect.title || '',
                            severity: activeDefect.severity || 'medium',
                            status: activeDefect.status || 'open',
                            assignedToUserId: activeDefect.assignedToUserId || '',
                            details: parsed.details,
                            reproSteps: parsed.reproSteps,
                            systemInfo: parsed.systemInfo,
                            acceptanceCriteria: parsed.acceptanceCriteria,
                            discussion: parsed.discussion,
                          });
                        }}
                      >
                        Reset
                      </Button>
                      <Button variant="contained" sx={{ textTransform: 'none' }} disabled={!isDirty || isSaving} onClick={saveDefect}>
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </Stack>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} lg={7.5}>
                      <Stack spacing={1.5}>
                        <TextField
                          label="Details"
                          multiline
                          minRows={3}
                          value={draft.details}
                          onChange={(e) => setDraft((prev) => ({ ...prev, details: e.target.value }))}
                        />
                        <TextField
                          label="Repro Steps"
                          multiline
                          minRows={3}
                          value={draft.reproSteps}
                          onChange={(e) => setDraft((prev) => ({ ...prev, reproSteps: e.target.value }))}
                        />
                        <TextField
                          label="System Info"
                          multiline
                          minRows={2}
                          value={draft.systemInfo}
                          onChange={(e) => setDraft((prev) => ({ ...prev, systemInfo: e.target.value }))}
                        />
                        <TextField
                          label="Acceptance Criteria"
                          multiline
                          minRows={2}
                          value={draft.acceptanceCriteria}
                          onChange={(e) => setDraft((prev) => ({ ...prev, acceptanceCriteria: e.target.value }))}
                        />
                        <TextField
                          label="Discussion"
                          multiline
                          minRows={3}
                          value={draft.discussion}
                          onChange={(e) => setDraft((prev) => ({ ...prev, discussion: e.target.value }))}
                        />
                      </Stack>
                    </Grid>

                    <Grid item xs={12} lg={4.5}>
                      <Stack spacing={1.5}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Details</Typography>
                            <Stack spacing={1.25}>
                              <TextField
                                label="State"
                                size="small"
                                select
                                value={draft.status}
                                onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as DefectStatus }))}
                              >
                                {statusOptions.map((status) => (
                                  <MenuItem key={status} value={status}>{status.replace('_', ' ')}</MenuItem>
                                ))}
                              </TextField>
                              <TextField
                                label="Severity"
                                size="small"
                                select
                                value={draft.severity}
                                onChange={(e) => setDraft((prev) => ({ ...prev, severity: e.target.value as Defect['severity'] }))}
                              >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="critical">Critical</MenuItem>
                              </TextField>
                              <TextField
                                label="Assigned To"
                                size="small"
                                select
                                value={draft.assignedToUserId}
                                onChange={(e) => setDraft((prev) => ({ ...prev, assignedToUserId: e.target.value }))}
                              >
                                <MenuItem value="">Unassigned</MenuItem>
                                {(people || []).map((person: any) => (
                                  <MenuItem key={person.id} value={person.id}>{person.email}</MenuItem>
                                ))}
                              </TextField>
                              <Typography variant="caption" color="text.secondary">Task: {activeDefect.taskName || 'Task'}</Typography>
                              <Typography variant="caption" color="text.secondary">Issue Type: {activeDefect.issueCode || 'None'}</Typography>
                              <Typography variant="caption" color="text.secondary">Object: {activeDefect.globalObjectId || 'None'}</Typography>
                              <Typography variant="caption" color="text.secondary">Created: {new Date(activeDefect.createdAt).toLocaleString()}</Typography>
                              <Typography variant="caption" color="text.secondary">Updated: {new Date(activeDefect.updatedAt).toLocaleString()}</Typography>
                              {activeDefect.resolvedAt ? (
                                <Typography variant="caption" color="text.secondary">Resolved: {new Date(activeDefect.resolvedAt).toLocaleString()}</Typography>
                              ) : null}
                            </Stack>
                          </CardContent>
                        </Card>

                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Activity</Typography>
                            <Stack spacing={1}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Avatar sx={{ width: 24, height: 24, fontSize: 11 }}>
                                  {(activeDefect.createdByUserEmail || 'u').slice(0, 1).toUpperCase()}
                                </Avatar>
                                <Typography variant="caption" color="text.secondary">Created by {activeDefect.createdByUserEmail || activeDefect.createdByUserId}</Typography>
                              </Stack>
                              <Typography variant="caption" color="text.secondary">Current status: {activeDefect.status.replace('_', ' ')}</Typography>
                              <Typography variant="caption" color="text.secondary">Severity: {activeDefect.severity}</Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Stack>
                    </Grid>
                  </Grid>
                </Stack>
              </Box>
            )}
          </Grid>
        </Grid>
      )}

    </PageContainer>
  );
};

export default ProjectDefectsPage;
