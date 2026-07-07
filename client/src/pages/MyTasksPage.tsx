import React from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Typography,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import ContentHeader from '../layout/ContentHeader';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import DefectCommentsModal from '../components/DefectCommentsModal';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useFilter } from '../contexts/FilterContext';
import { usePageStats } from '../contexts/PageStatsContext';

const normalizeValue = (value?: string | null) => (value || '').trim().toLowerCase();

const fmtDate = (v?: string) => {
  if (!v) return '—';
  const clean = v.length > 10 ? v.substring(0, 10) : v;
  const [y, m, d] = clean.split('-');
  return `${m}/${d}/${y}`;
};

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not Started', in_progress: 'In Progress', complete: 'Complete', blocked: 'Blocked',
};

const STATUS_COLOR: Record<string, string> = {
  not_started: 'rgba(255,255,255,0.3)', in_progress: '#29b6f6', complete: '#66bb6a', blocked: '#ef5350',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef5350', high: '#ffa726', medium: '#29b6f6', low: '#78909c',
};

const Section: React.FC<{ title: string; count: number; accent: string; children: React.ReactNode }> = ({ title, count, accent, children }) => (
  <Box sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
    <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
      <Box sx={{ width: 4, height: 18, borderRadius: 2, backgroundColor: accent, flexShrink: 0 }} />
      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</Typography>
      <Box sx={{ px: 0.8, py: 0.1, borderRadius: 1, backgroundColor: `${accent}28`, color: accent, fontWeight: 700, fontSize: '0.75rem' }}>{count}</Box>
    </Box>
    {children}
  </Box>
);

const MyTasksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { selectedProgramId, selectedProjectId } = useFilter();
  const openTaskId = searchParams.get('openTask') || '';
  const openDefectId = searchParams.get('openDefect') || '';
  const isAdmin = user?.role === 'admin';
  const effectiveProgramId = isAdmin ? null : selectedProgramId;
  const effectiveProjectId = isAdmin ? null : selectedProjectId;
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);
  const [selectedDefectId, setSelectedDefectId] = React.useState<string>('');
  const [taskSearch, setTaskSearch] = React.useState('');
  const [taskStatusFilter, setTaskStatusFilter] = React.useState('not_complete');
  const [defectSearch, setDefectSearch] = React.useState('');
  const [defectStatusFilter, setDefectStatusFilter] = React.useState('not_resolved_closed');
  const [severityFilter, setSeverityFilter] = React.useState('all');
  const queryClient = useQueryClient();

  const { data: people = [] } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const response = await apiClient.get('/api/people');
      return response.data.data || [];
    },
  });

  const peopleById = React.useMemo(
    () => Object.fromEntries((people || []).map((person: any) => [person.id, person])),
    [people]
  );

  const currentPerson = React.useMemo(
    () => (people || []).find((person: any) => normalizeValue(person.email) === normalizeValue(user?.email)) || null,
    [people, user?.email]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-items', user?.id, user?.email, currentPerson?.id, effectiveProgramId, effectiveProjectId],
    queryFn: async () => {
      const emailAlias = normalizeValue((user?.email || '').split('@')[0]?.split('+')[0]);
      const tokenSet = new Set(
        [
          user?.id,
          user?.email,
          (user as any)?.name,
          currentPerson?.id,
          currentPerson?.email,
          currentPerson?.name,
          emailAlias,
          normalizeValue((currentPerson?.email || '').split('@')[0]?.split('+')[0]),
        ]
          .map((item) => normalizeValue(item))
          .filter(Boolean)
      );

      const taskMap = new Map<string, any>();
      const defectMap = new Map<string, any>();

      const isTaskAssigned = (task: any) => {
        const dra = normalizeValue(task.draUserId);
        const dev = normalizeValue(task.developerUserId);
        const assignedTo = normalizeValue(task.assignedTo);
        if (isAdmin) {
          return Boolean(dra || dev || assignedTo);
        }
        return tokenSet.has(dra) || tokenSet.has(dev) || tokenSet.has(assignedTo);
      };

      const isDefectAssigned = (defect: any) => {
        const assignedId = normalizeValue(defect.assignedToUserId);
        const assignedEmail = normalizeValue(defect.assignedToUserEmail);
        if (isAdmin) {
          return Boolean(assignedId || assignedEmail);
        }
        return tokenSet.has(assignedId) || tokenSet.has(assignedEmail);
      };

      const hydrateScope = async (program: any, cycle: any, project: any) => {
        const tasksResponse = await apiClient.get(`/api/tasks/cycle/${cycle.id}`);
        const cycleTasks = tasksResponse.data.data || [];

        cycleTasks.forEach((task: any) => {
          const taskId = task.id || task.taskId;
          if (!taskId) return;
          if (isTaskAssigned(task)) {
            taskMap.set(taskId, {
              ...task,
              taskId,
              taskName: task.name || task.taskName,
              projectName: project?.name || task.projectName || 'Project',
              mockCycleName: cycle?.name || task.mockCycleName || 'Cycle',
              programName: program?.name || task.programName || 'Program',
            });
          }
        });

        const defectResponses = await Promise.all(
          cycleTasks.map((task: any) => apiClient.get(`/api/tasks/${task.id}/defects`).catch(() => ({ data: { data: [] } })))
        );

        defectResponses.flatMap((r: any) => r?.data?.data || []).forEach((defect: any) => {
          if (!defect?.id || !isDefectAssigned(defect)) return;
          defectMap.set(defect.id, {
            ...defect,
            programName: defect.programName || program?.name || 'Program',
            projectName: defect.projectName || project?.name || 'Project',
            mockCycleName: defect.mockCycleName || cycle?.name || 'Cycle',
          });
        });
      };

      if (effectiveProjectId) {
        const projectResponse = await apiClient.get(`/api/projects/${effectiveProjectId}`);
        const project = projectResponse.data.data;
        let cycle = null;
        let program = null;
        if (project?.mockCycleId) {
          const cycleResponse = await apiClient.get(`/api/mock-cycles/${project.mockCycleId}`);
          cycle = cycleResponse.data.data;
          if (cycle?.programId) {
            const programResponse = await apiClient.get(`/api/programs/${cycle.programId}`);
            program = programResponse.data.data;
          }
        }

        if (cycle?.id) {
          await hydrateScope(program, cycle, project);
        } else {
          const tasksResponse = await apiClient.get(`/api/tasks/project/${effectiveProjectId}`);
          const tasks = tasksResponse.data.data || [];
          tasks.forEach((task: any) => {
            if (!isTaskAssigned(task)) return;
            const taskId = task.id || task.taskId;
            taskMap.set(taskId, {
              ...task,
              taskId,
              taskName: task.name || task.taskName,
              projectName: project?.name || 'Project',
              mockCycleName: 'Cycle',
              programName: program?.name || 'Program',
            });
          });

          const defectResponses = await Promise.all(
            tasks.map((task: any) => apiClient.get(`/api/tasks/${task.id}/defects`).catch(() => ({ data: { data: [] } })))
          );
          defectResponses.flatMap((r: any) => r?.data?.data || []).forEach((defect: any) => {
            if (!defect?.id || !isDefectAssigned(defect)) return;
            defectMap.set(defect.id, {
              ...defect,
              programName: defect.programName || program?.name || 'Program',
              projectName: defect.projectName || project?.name || 'Project',
              mockCycleName: defect.mockCycleName || 'Cycle',
            });
          });
        }
      } else {
        const programsResponse = await apiClient.get('/api/programs');
        const allPrograms = programsResponse.data.data || [];
        const programs = effectiveProgramId
          ? allPrograms.filter((p: any) => p.id === effectiveProgramId)
          : allPrograms;

        const projectScopesNested = await Promise.all(
          programs.map(async (program: any) => {
            const projectsResponse = await apiClient.get(`/api/projects/by-program/${program.id}`);
            const projects = projectsResponse.data.data || [];
            return projects.map((project: any) => ({ program, project }));
          })
        );

        const projectScopes = projectScopesNested.flat();

        for (const { program, project } of projectScopes as any[]) {
          try {
            const tasksResponse = await apiClient.get(`/api/tasks/project/${project.id}`);
            const tasks = tasksResponse.data.data || [];

            tasks.forEach((task: any) => {
              if (!isTaskAssigned(task)) return;
              const taskId = task.id || task.taskId;
              if (!taskId) return;
              taskMap.set(taskId, {
                ...task,
                taskId,
                taskName: task.name || task.taskName,
                projectName: project?.name || task.projectName || 'Project',
                mockCycleName: task.mockCycleName || 'Cycle',
                programName: program?.name || task.programName || 'Program',
              });
            });

            const defectResponses = await Promise.all(
              tasks.map((task: any) => apiClient.get(`/api/tasks/${task.id}/defects`).catch(() => ({ data: { data: [] } })))
            );

            defectResponses.flatMap((r: any) => r?.data?.data || []).forEach((defect: any) => {
              if (!defect?.id || !isDefectAssigned(defect)) return;
              defectMap.set(defect.id, {
                ...defect,
                programName: defect.programName || program?.name || 'Program',
                projectName: defect.projectName || project?.name || 'Project',
                mockCycleName: defect.mockCycleName || 'Cycle',
              });
            });
          } catch {
            // Continue processing remaining scopes.
          }
        }
      }

      return {
        tasks: Array.from(taskMap.values()),
        defects: Array.from(defectMap.values()),
      };
    },
    enabled: !!user,
  });

  const filteredTasks = React.useMemo(() => {
    const all = (data?.tasks || []) as any[];
    return all.filter((task: any) => {
      if (taskStatusFilter === 'not_complete' && (task.status || 'not_started') === 'complete') return false;
      if (taskStatusFilter !== 'all' && (task.status || 'not_started') !== taskStatusFilter) return false;
      if (!taskSearch) return true;
      const q = taskSearch.toLowerCase();
      return (
        String(task.taskName || task.name || '').toLowerCase().includes(q)
        || String(task.objectId || '').toLowerCase().includes(q)
        || String(task.processArea || '').toLowerCase().includes(q)
        || String(task.projectName || '').toLowerCase().includes(q)
      );
    });
  }, [data?.tasks, taskSearch, taskStatusFilter]);

  React.useEffect(() => {
    if (!openTaskId) return;

    const existing = filteredTasks.find((task: any) => (task.taskId || task.id) === openTaskId)
      || (data?.tasks || []).find((task: any) => (task.taskId || task.id) === openTaskId);

    if (existing) {
      setSelectedTask(existing);
      return;
    }

    apiClient.get(`/api/tasks/${openTaskId}`)
      .then((response) => {
        const task = response.data?.data;
        if (task?.id) {
          setSelectedTask({ ...task, taskId: task.id, taskName: task.name || task.taskName });
        }
      })
      .catch(() => {});
  }, [openTaskId, filteredTasks, data?.tasks]);

  const filteredDefects = React.useMemo(() => {
    const all = (data?.defects || []) as any[];
    return all.filter((defect: any) => {
      const status = defect.status || 'open';
      if (defectStatusFilter === 'not_resolved_closed') {
        if (status === 'resolved' || status === 'closed') return false;
      } else if (defectStatusFilter !== 'all' && status !== defectStatusFilter) {
        return false;
      }
      if (severityFilter !== 'all' && (defect.severity || 'low') !== severityFilter) return false;
      if (!defectSearch) return true;
      const q = defectSearch.toLowerCase();
      return (
        String(defect.title || '').toLowerCase().includes(q)
        || String(defect.issueCode || '').toLowerCase().includes(q)
        || String(defect.processArea || '').toLowerCase().includes(q)
        || String(defect.projectName || '').toLowerCase().includes(q)
      );
    });
  }, [data?.defects, defectSearch, defectStatusFilter, severityFilter]);

  React.useEffect(() => {
    if (!openDefectId) return;
    setDefectStatusFilter('all');
  }, [openDefectId]);

  const { data: notificationDefect = null } = useQuery({
    queryKey: ['mytasks-open-defect', openDefectId],
    queryFn: async () => {
      if (!openDefectId) return null;
      const response = await apiClient.get(`/api/defects/${openDefectId}`);
      return response.data?.data || null;
    },
    enabled: !!openDefectId,
  });

  React.useEffect(() => {
    if (!openDefectId) return;

    const found = filteredDefects.some((defect: any) => defect.id === openDefectId)
      || (data?.defects || []).some((defect: any) => defect.id === openDefectId)
      || (notificationDefect && notificationDefect.id === openDefectId);

    if (found) {
      setSelectedDefectId(openDefectId);
    }
  }, [openDefectId, filteredDefects, data?.defects, notificationDefect]);

  const activeDefect = React.useMemo(
    () => filteredDefects.find((defect: any) => defect.id === selectedDefectId)
      || (notificationDefect?.id === selectedDefectId ? notificationDefect : null),
    [filteredDefects, selectedDefectId, notificationDefect]
  );

  React.useEffect(() => {
    if (selectedDefectId && !filteredDefects.some((defect: any) => defect.id === selectedDefectId)) {
      setSelectedDefectId('');
    }
  }, [filteredDefects, selectedDefectId]);

  const handleDefectSaved = async () => {
    await queryClient.invalidateQueries({ queryKey: ['my-items', user?.id, user?.email, currentPerson?.id, effectiveProgramId, effectiveProjectId] });
  };

  const th = { py: 0.8, px: 1.5, fontSize: '0.68rem', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(0,0,0,0.18)', textTransform: 'uppercase' as const, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.07)' };
  const td = { py: 0.75, px: 1.5, fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.04)' };
  const fsx = { minWidth: 130, '& .MuiInputBase-root': { fontSize: '0.78rem', height: 32 }, '& .MuiInputLabel-root': { fontSize: '0.78rem' } };

  const { setStats } = usePageStats();

  const inProgressTasks = React.useMemo(() => (data?.tasks || []).filter((t: any) => t.status === 'in_progress').length, [data?.tasks]);
  const criticalAssignedDefects = React.useMemo(() => (data?.defects || []).filter((d: any) => d.severity === 'critical' && d.status !== 'closed').length, [data?.defects]);
  const myTasksStats = React.useMemo(() => [
    { label: 'In Progress', value: inProgressTasks },
    { label: 'Critical Defects', value: criticalAssignedDefects },
  ], [inProgressTasks, criticalAssignedDefects]);

  React.useEffect(() => {
    setStats(myTasksStats);
    return () => setStats([]);
  }, [myTasksStats, setStats]);

  return (
    <Layout>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <ContentHeader title="My Tasks" />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Unable to load your assigned items right now.</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Section title="Assigned Tasks" count={filteredTasks.length} accent="#29b6f6">
              <Box sx={{ px: 2, py: 1.25, display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <TextField size="small" placeholder="Search tasks..." value={taskSearch} onChange={e => setTaskSearch(e.target.value)}
                  sx={{ width: 220, ...fsx }}
                  slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} /> } }} />
                <TextField select size="small" label="Status" value={taskStatusFilter} onChange={e => setTaskStatusFilter(e.target.value)} sx={fsx}>
                  <MenuItem value="not_complete">Not Complete</MenuItem>
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="not_started">Not Started</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                  <MenuItem value="complete">Complete</MenuItem>
                </TextField>
              </Box>
              {filteredTasks.length === 0 ? (
                <Box sx={{ p: 3 }}><Typography variant="body2" color="text.secondary">No assigned tasks match the current filters.</Typography></Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={th}>Object</TableCell>
                        <TableCell sx={th}>Task</TableCell>
                        <TableCell sx={th}>Status</TableCell>
                        <TableCell sx={th}>Process Area</TableCell>
                        <TableCell sx={th}>Project</TableCell>
                        <TableCell sx={th}>Mock Cycle</TableCell>
                        <TableCell sx={th}>Due Date</TableCell>
                        <TableCell sx={{ ...th, width: 48, p: 0 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTasks.map((task: any, i: number) => (
                        <TableRow key={`${task.taskId || task.id}-${i}`} hover onClick={() => setSelectedTask(task)}
                          sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.035)' } }}>
                          <TableCell sx={td}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{task.objectId || '—'}</Typography>
                          </TableCell>
                          <TableCell sx={td}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{task.taskName || task.name || 'Untitled'}</Typography>
                          </TableCell>
                          <TableCell sx={td}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: STATUS_COLOR[task.status] || 'rgba(255,255,255,0.3)' }} />
                              <Typography sx={{ fontSize: '0.78rem' }}>{STATUS_LABEL[task.status] || task.status}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{task.processArea || '—'}</Typography></TableCell>
                          <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{task.projectName || '—'}</Typography></TableCell>
                          <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{task.mockCycleName || '—'}</Typography></TableCell>
                          <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{fmtDate(task.endDate)}</Typography></TableCell>
                          <TableCell sx={{ ...td, px: 0.5 }}>
                            <IconButton size="small" onClick={e => { e.stopPropagation(); setSelectedTask(task); }} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                              <OpenInNewIcon sx={{ fontSize: '0.9rem' }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Section>

            <Section title="Assigned Defects" count={filteredDefects.length} accent="#ef5350">
              <Box sx={{ px: 2, py: 1.25, display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <TextField size="small" placeholder="Search defects..." value={defectSearch} onChange={e => setDefectSearch(e.target.value)}
                  sx={{ width: 220, ...fsx }}
                  slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: '1rem', mr: 0.5, color: 'text.secondary' }} /> } }} />
                <TextField select size="small" label="Status" value={defectStatusFilter} onChange={e => setDefectStatusFilter(e.target.value)} sx={fsx}>
                  <MenuItem value="not_resolved_closed">Not Resolved or Closed</MenuItem>
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </TextField>
                <TextField select size="small" label="Severity" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} sx={fsx}>
                  <MenuItem value="all">All Severities</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </TextField>
              </Box>
              {filteredDefects.length === 0 ? (
                <Box sx={{ p: 3 }}><Typography variant="body2" color="text.secondary">No assigned defects match the current filters.</Typography></Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={th}>Title</TableCell>
                        <TableCell sx={th}>Severity</TableCell>
                        <TableCell sx={th}>Status</TableCell>
                        <TableCell sx={th}>Process Area</TableCell>
                        <TableCell sx={th}>Project</TableCell>
                        <TableCell sx={th}>Mock Cycle</TableCell>
                        <TableCell sx={th}>Reported</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredDefects.map((defect: any) => {
                        const sevColor = SEVERITY_COLOR[defect.severity || 'low'] || '#78909c';
                        return (
                          <TableRow key={defect.id} hover onClick={() => setSelectedDefectId(defect.id)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.035)' } }}>
                            <TableCell sx={td}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{defect.title || 'Untitled Defect'}</Typography>
                              <Typography variant="caption" color="text.secondary">{defect.issueCode || '—'}</Typography>
                            </TableCell>
                            <TableCell sx={td}>
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: sevColor }} />
                                <Typography sx={{ fontSize: '0.78rem', color: sevColor, fontWeight: 600, textTransform: 'capitalize' }}>{defect.severity || 'low'}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={td}>
                              <Chip size="small" label={(defect.status || 'open').replace(/_/g, ' ')} sx={{ fontSize: '0.68rem', height: 20, textTransform: 'capitalize' }} />
                            </TableCell>
                            <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{defect.processArea || '—'}</Typography></TableCell>
                            <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{defect.projectName || '—'}</Typography></TableCell>
                            <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{defect.mockCycleName || '—'}</Typography></TableCell>
                            <TableCell sx={td}><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{defect.createdAt ? fmtDate(defect.createdAt.slice(0, 10)) : '—'}</Typography></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Section>
          </Box>
        )}

        <TaskDetailModal
          open={!!selectedTask}
          onClose={() => {
            setSelectedTask(null);
            if (openTaskId) {
              const next = new URLSearchParams(searchParams);
              next.delete('openTask');
              setSearchParams(next, { replace: true });
            }
          }}
          taskId={selectedTask?.taskId || selectedTask?.id}
          task={selectedTask}
          peopleById={peopleById}
          people={people}
        />

        <DefectCommentsModal
          open={Boolean(activeDefect)}
          defect={activeDefect}
          people={people || []}
          onClose={() => {
            setSelectedDefectId('');
            if (openDefectId) {
              const next = new URLSearchParams(searchParams);
              next.delete('openDefect');
              setSearchParams(next, { replace: true });
            }
          }}
          onSaved={handleDefectSaved}
        />
      </Box>
    </Layout>
  );
};

export default MyTasksPage;
