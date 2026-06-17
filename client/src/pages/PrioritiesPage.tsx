// client/src/pages/PrioritiesPage.tsx

import React from 'react';
import { Box, CircularProgress, Alert, Grid, Card, CardContent, Typography } from '@mui/material';
import PageContainer from '../layout/PageContainer';
import ContentHeader from '../layout/ContentHeader';
import PrioritySection from '../components/priorities/PrioritySection';
import { usePriorities, useProjectStatus } from '../hooks/usePriorities';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import TaskDetailModal from '../components/tasks/TaskDetailModal';

const PrioritiesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);

  const { data: prioritized, isLoading, error } = usePriorities(projectId!);
  const { data: status } = useProjectStatus(projectId!);
  const { data: people = [] } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const response = await apiClient.get('/api/people');
      return response.data.data || [];
    },
  });

  const { data: rawTasks = [] } = useQuery({
    queryKey: ['priorities-fallback-tasks', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/project/${projectId}`);
      return response.data.data || [];
    },
    enabled: !!projectId,
  });

  if (!projectId) {
    return <Alert severity="error">Project ID not found</Alert>;
  }

  const sectionConfig = [
    { key: 'late', title: 'Late Tasks', color: '#ef5350' },
    { key: 'in_progress', title: 'In Progress', color: '#29b6f6' },
    { key: 'due_this_week', title: 'Due This Week', color: '#ffa726' },
    { key: 'blocked', title: 'Blocked Tasks', color: '#ab47bc' },
  ];

  const parseDateOnly = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(todayStart.getDate() + 6);

  const fallbackPrioritized = {
    late: rawTasks.filter((t: any) => {
      if (t.status === 'complete') return false;
      const end = parseDateOnly(t.endDate);
      return !!end && end < todayStart;
    }),
    in_progress: rawTasks.filter((t: any) => t.status === 'in_progress'),
    due_this_week: rawTasks.filter((t: any) => {
      if (t.status === 'complete') return false;
      const end = parseDateOnly(t.endDate);
      return !!end && end >= todayStart && end <= weekEnd;
    }),
    blocked: rawTasks.filter((t: any) => t.status === 'blocked'),
  };

  const peopleById = React.useMemo(
    () => Object.fromEntries((people || []).map((person: any) => [person.id, person])),
    [people]
  );

  const rawTaskMap = React.useMemo(
    () => new Map((rawTasks || []).map((task: any) => [task.id, task])),
    [rawTasks]
  );

  const mergeTaskDetails = (tasks: any[]) =>
    tasks.map((task: any) => {
      const id = task.taskId || task.id;
      const raw = rawTaskMap.get(id) || {};
      return {
        ...raw,
        ...task,
        taskId: id,
        taskName: task.taskName || raw.name,
        notes: task.notes || raw.notes,
        progressPercentage:
          typeof task.progressPercentage === 'number'
            ? task.progressPercentage
            : raw.progressPercentage,
      };
    });

  const effectivePrioritized = React.useMemo(() => {
    const source = prioritized || fallbackPrioritized;
    return {
      late: mergeTaskDetails(source.late || []),
      in_progress: mergeTaskDetails(source.in_progress || []),
      due_this_week: mergeTaskDetails(source.due_this_week || []),
      blocked: mergeTaskDetails(source.blocked || []),
    };
  }, [prioritized, rawTaskMap, rawTasks]);

  const openTaskModal = (task: any) => setSelectedTask(task);

  return (
    <PageContainer>
      <ContentHeader title="Priorities" />

      {/* Project Status Overview */}
      {status && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Tasks
                </Typography>
                <Typography variant="h4">{status.totalTasks}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completed
                </Typography>
                <Typography variant="h4" sx={{ color: '#81c784' }}>
                  {status.completedTasks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  In Progress
                </Typography>
                <Typography variant="h4" sx={{ color: '#ffb74d' }}>
                  {status.inProgressTasks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Blocked
                </Typography>
                <Typography variant="h4" sx={{ color: '#ef5350' }}>
                  {status.blockedTasks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Priorities service unavailable. Showing fallback task view.
          </Alert>
          {sectionConfig.map((config) => (
            <PrioritySection
              key={config.key}
              title={config.title}
              tasks={effectivePrioritized[config.key as keyof typeof effectivePrioritized] || []}
              color={config.color}
              onTaskClick={openTaskModal}
              peopleById={peopleById}
            />
          ))}
        </>
      ) : effectivePrioritized ? (
        sectionConfig.map((config) => (
          <PrioritySection
            key={config.key}
            title={config.title}
            tasks={effectivePrioritized[config.key as keyof typeof effectivePrioritized] || []}
            color={config.color}
            onTaskClick={openTaskModal}
            peopleById={peopleById}
          />
        ))
      ) : (
        <Alert severity="info">No prioritized data available</Alert>
      )}

      <TaskDetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        taskId={selectedTask?.taskId || selectedTask?.id}
        task={selectedTask}
        peopleById={peopleById}
      />
    </PageContainer>
  );
};

export default PrioritiesPage;
