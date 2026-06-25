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
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import PageContainer from '../layout/PageContainer';
import ContentHeader from '../layout/ContentHeader';
import apiClient from '../api/client';
import { Defect, DefectStatus, ReportingSummary } from '../api/types';

const qualityTaskTypes = new Set(['preload_validation', 'postload_validation', 'load']);
const statusOptions: DefectStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

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

const ProjectDefectsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [taskFilter, setTaskFilter] = React.useState<'all' | 'validation' | 'load' | 'other'>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | DefectStatus>('all');
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
    queryKey: ['project-defects-project', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/projects/${projectId}`);
      return response.data.data;
    },
    enabled: !!projectId,
  });

  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['project-defects-tasks', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/project/${projectId}`);
      return response.data.data || [];
    },
    enabled: !!projectId,
  });

  const taskIds = React.useMemo(() => (tasks || []).map((task: any) => task.id).filter(Boolean), [tasks]);

  const defectQueries = useQueries({
    queries: taskIds.map((taskId) => ({
      queryKey: ['project-defects', projectId, taskId],
      queryFn: async () => {
        const response = await apiClient.get(`/api/tasks/${taskId}/defects`);
        return response.data.data || [];
      },
      enabled: !!projectId && !!taskId,
    })),
  });

  const { data: summary } = useQuery<ReportingSummary>({
    queryKey: ['project-defects-summary', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/reporting/projects/${projectId}/summary`);
      return response.data.data;
    },
    enabled: !!projectId,
    staleTime: 30_000,
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

  const taskById = React.useMemo(
    () => Object.fromEntries((tasks || []).map((task: any) => [task.id, task])),
    [tasks]
  );

  const allDefects = React.useMemo(() => {
    return defectQueries.flatMap((query: any, index: number) => {
      const taskId = taskIds[index];
      const task = taskById[taskId];
      return (query.data || []).map((defect: any) => ({
        ...defect,
        taskId,
        taskName: task?.name || task?.taskName || 'Task',
        taskType: task?.taskType || task?.task_type || 'custom',
        projectObjectId: defect.projectObjectId || task?.projectObjectId || null,
      }));
    });
  }, [defectQueries, taskIds, taskById]);

  const allTaskTypes = React.useMemo(() => {
    const grouped: Record<string, number> = {};
    (tasks || []).forEach((task: any) => {
      const type = (task.taskType || task.task_type || 'custom').toLowerCase();
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return grouped;
  }, [tasks]);

  const filteredTasks = React.useMemo(() => {
    return (tasks || []).filter((task: any) => {
      if (taskFilter === 'all') return true;
      const taskType = (task.taskType || task.task_type || '').toLowerCase();
      if (taskFilter === 'validation') return taskType === 'preload_validation' || taskType === 'postload_validation';
      if (taskFilter === 'load') return taskType === 'load';
      return !qualityTaskTypes.has(taskType);
    });
  }, [tasks, taskFilter]);

  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, any[]> = {
      'Preload Validation': [],
      'Load': [],
      'Postload Validation': [],
      'Other': [],
    };

    filteredTasks.forEach((task: any) => {
      const taskType = (task.taskType || task.task_type || '').toLowerCase();
      if (taskType === 'preload_validation') groups['Preload Validation'].push(task);
      else if (taskType === 'load') groups['Load'].push(task);
      else if (taskType === 'postload_validation') groups['Postload Validation'].push(task);
      else groups['Other'].push(task);
    });

    return groups;
  }, [filteredTasks]);

  const filteredDefects = React.useMemo(() => {
    return allDefects
      .filter((defect: any) => (statusFilter === 'all' ? true : defect.status === statusFilter))
      .filter((defect: any) => {
        const haystack = `${defect.title || ''} ${defect.taskName || ''} ${defect.issueCode || ''}`.toLowerCase();
        return haystack.includes(searchTerm.trim().toLowerCase());
      })
      .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [allDefects, statusFilter, searchTerm]);

  const activeDefect = React.useMemo(
    () => filteredDefects.find((defect: any) => defect.id === selectedDefectId) || filteredDefects[0] || null,
    [filteredDefects, selectedDefectId]
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
      await queryClient.invalidateQueries({ queryKey: ['project-defects', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-defects-summary', projectId] });
    } finally {
      setIsSaving(false);
    }
  };

  if (!projectId) {
    return <Alert severity="error">Project ID not found</Alert>;
  }

  return (
    <PageContainer>
      <ContentHeader
        title={`${project?.name || 'Project'} Defects`}
        stats={[
          { label: 'Open Defects', value: summary?.defects.open ?? 0 },
          { label: 'In Progress', value: summary?.defects.inProgress ?? 0 },
          { label: 'Preload Invalid', value: summary?.validation.preload.invalidRecords ?? 0 },
          { label: 'Postload Invalid', value: summary?.validation.postload.invalidRecords ?? 0 },
        ]}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              Project quality overview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use this page to inspect any task in the project, capture preload/postload validation stats, and manage defects for the selected task.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              <Chip size="small" label={`Total defects: ${summary?.defects.total ?? 0}`} />
              <Chip size="small" label={`Load failures: ${summary?.loadMetrics.failed ?? 0}`} />
              <Chip size="small" label={`Preload invalid: ${summary?.validation.preload.invalidRecords ?? 0}`} color="warning" variant="outlined" />
              <Chip size="small" label={`Postload invalid: ${summary?.validation.postload.invalidRecords ?? 0}`} color="error" variant="outlined" />
              <Chip size="small" label={`Validation tasks: ${(allTaskTypes.preload_validation || 0) + (allTaskTypes.postload_validation || 0)}`} />
              <Chip size="small" label={`Load tasks: ${allTaskTypes.load || 0}`} />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Defect Work Items</Typography>
                <Typography variant="body2" color="text.secondary">ADO-style defect triage with a work-item queue and detail editor.</Typography>
              </Box>
            </Box>
            <Divider />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                label="Search defects"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 260 }}
              />
              <TextField
                size="small"
                select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | DefectStatus)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">All statuses</MenuItem>
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>{status.replace('_', ' ')}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {defectQueries.some((query: any) => query.isLoading) ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredDefects.length === 0 ? (
        <Alert severity="info">No defects found for the selected filters.</Alert>
      ) : (
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4} lg={3.5}>
            <Paper variant="outlined" sx={{ height: '100%', maxHeight: 760, overflow: 'auto' }}>
              <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700}>Defect Queue ({filteredDefects.length})</Typography>
              </Box>
              <List dense disablePadding>
                {filteredDefects.map((defect: any) => (
                  <ListItemButton
                    key={defect.id}
                    selected={activeDefect?.id === defect.id}
                    onClick={() => setSelectedDefectId(defect.id)}
                    sx={{ alignItems: 'flex-start', py: 1.2 }}
                  >
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={700}>BUG {defect.id.slice(0, 8)}</Typography>}
                      secondary={(
                        <Stack spacing={0.7} sx={{ mt: 0.5 }}>
                          <Typography variant="body2">{defect.title}</Typography>
                          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                            <Chip size="small" variant="outlined" label={defect.status.replace('_', ' ')} />
                            <Chip size="small" label={defect.severity} color={defect.severity === 'critical' ? 'error' : defect.severity === 'high' ? 'warning' : 'default'} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{defect.taskName || 'Task'}</Typography>
                        </Stack>
                      )}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8} lg={8.5}>
            {!activeDefect ? (
              <Alert severity="info">Select a defect to view details.</Alert>
            ) : (
              <Paper variant="outlined" sx={{ p: 2 }}>
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

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" color="primary" label="Details" />
                    <Chip size="small" variant="outlined" label="Related Work" />
                    <Chip size="small" variant="outlined" label="Discussion" />
                  </Stack>

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
                              <Typography variant="caption" color="text.secondary">Created: {new Date(activeDefect.createdAt).toLocaleString()}</Typography>
                              <Typography variant="caption" color="text.secondary">Updated: {new Date(activeDefect.updatedAt).toLocaleString()}</Typography>
                              {activeDefect.resolvedAt ? (
                                <Typography variant="caption" color="text.secondary">Resolved: {new Date(activeDefect.resolvedAt).toLocaleString()}</Typography>
                              ) : null}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Stack>
                    </Grid>
                  </Grid>
                </Stack>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        {(['all', 'validation', 'load', 'other'] as const).map((filter) => (
          <Button
            key={filter}
            size="small"
            variant={taskFilter === filter ? 'contained' : 'outlined'}
            onClick={() => setTaskFilter(filter)}
            sx={{ textTransform: 'none' }}
          >
            {filter === 'all' ? 'All Tasks' : filter === 'validation' ? 'Validation Tasks' : filter === 'load' ? 'Load Tasks' : 'Other Tasks'}
          </Button>
        ))}
      </Box>

      {tasksLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : tasksError ? (
        <Alert severity="error">Failed to load tasks for this project.</Alert>
      ) : filteredTasks.length === 0 ? (
        <Alert severity="info">No tasks match the selected filter.</Alert>
      ) : (
        <Stack spacing={2}>
          {Object.entries(groupedTasks).map(([groupName, groupTasks]) => {
            if (groupTasks.length === 0) return null;

            return (
              <Card key={groupName} variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {groupName} ({groupTasks.length})
                    </Typography>
                    <Grid container spacing={2}>
                      {groupTasks.map((task: any) => {
                        const taskType = (task.taskType || task.task_type || 'custom').toLowerCase();
                        const isValidation = taskType === 'preload_validation' || taskType === 'postload_validation';
                        return (
                          <Grid key={task.id} item xs={12} md={6} lg={4}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                              <CardContent>
                                <Stack spacing={1.25}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                                    <Box>
                                      <Typography variant="subtitle2" fontWeight={700}>
                                        {task.name || task.taskName || 'Task'}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {task.taskType || task.task_type || 'custom'}
                                      </Typography>
                                    </Box>
                                    <Chip size="small" label={(task.status || 'not_started').replace(/_/g, ' ')} variant="outlined" />
                                  </Box>

                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {task.draUserId ? <Chip size="small" label={`DRA: ${peopleById[task.draUserId]?.name || task.draUserId}`} /> : null}
                                    {task.developerUserId ? <Chip size="small" label={`Dev: ${peopleById[task.developerUserId]?.name || task.developerUserId}`} /> : null}
                                  </Box>

                                  <Typography variant="body2" color="text.secondary">
                                    {task.notes || task.description || 'No notes.'}
                                  </Typography>

                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {isValidation ? (
                                      <Chip
                                        size="small"
                                        color={taskType === 'preload_validation' ? 'warning' : 'error'}
                                        variant="outlined"
                                        label={taskType === 'preload_validation' ? 'Preload quality' : 'Postload quality'}
                                      />
                                    ) : null}
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={() => setSelectedTask(task)}
                                      sx={{ textTransform: 'none' }}
                                    >
                                      Manage task
                                    </Button>
                                  </Box>
                                </Stack>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

    </PageContainer>
  );
};

export default ProjectDefectsPage;
