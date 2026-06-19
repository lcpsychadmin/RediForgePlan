import React from 'react';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography, Button } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageContainer from '../layout/PageContainer';
import ContentHeader from '../layout/ContentHeader';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import apiClient from '../api/client';
import { ReportingSummary } from '../api/types';

const qualityTaskTypes = new Set(['preload_validation', 'postload_validation', 'load']);

const ProjectDefectsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);
  const [taskFilter, setTaskFilter] = React.useState<'all' | 'validation' | 'load' | 'other'>('all');

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

  const peopleById = React.useMemo(
    () => Object.fromEntries((people || []).map((person: any) => [person.id, person])),
    [people]
  );

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
            </Box>
          </Stack>
        </CardContent>
      </Card>

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

      <TaskDetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        taskId={selectedTask?.id}
        task={selectedTask}
        peopleById={peopleById}
        people={people}
        accentColor="#5B67CA"
      />
    </PageContainer>
  );
};

export default ProjectDefectsPage;
