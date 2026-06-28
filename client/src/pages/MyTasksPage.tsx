import React from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import PageContainer from '../layout/PageContainer';
import ContentHeader from '../layout/ContentHeader';
import PrioritySection from '../components/priorities/PrioritySection';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useFilter } from '../contexts/FilterContext';

const normalizeValue = (value?: string | null) => (value || '').trim().toLowerCase();

const MyTasksPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedProgramId, selectedProjectId } = useFilter();
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);

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

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-tasks', user?.id, user?.email, selectedProgramId, selectedProjectId],
    queryFn: async () => {
      const emailAlias = normalizeValue((user?.email || '').split('@')[0]?.split('+')[0]);
      const tokenSet = new Set(
        [user?.id, user?.email, emailAlias]
          .map((item) => normalizeValue(item))
          .filter(Boolean)
      );

      // If a specific project is selected, only fetch tasks for that project
      if (selectedProjectId) {
        const tasksResponse = await apiClient.get(`/api/tasks/project/${selectedProjectId}`);
        const tasks = tasksResponse.data.data || [];
        const assigned = tasks.filter((task: any) => {
          const dra = normalizeValue(task.draUserId);
          const dev = normalizeValue(task.developerUserId);
          return tokenSet.has(dra) || tokenSet.has(dev) || tokenSet.has(normalizeValue(task.assignedTo));
        });
        return buildSections(assigned);
      }

      // Otherwise fetch across the selected program (or all programs)
      const programsResponse = await apiClient.get('/api/programs');
      const allPrograms = programsResponse.data.data || [];
      const programs = selectedProgramId
        ? allPrograms.filter((p: any) => p.id === selectedProgramId)
        : allPrograms;

      const cycleScopesNested = await Promise.all(
        programs.map(async (program: any) => {
          const cyclesResponse = await apiClient.get(`/api/programs/${program.id}/mock-cycles`);
          const cycles = cyclesResponse.data.data || [];
          return cycles.map((cycle: any) => ({ program, cycle }));
        })
      );

      const cycleScopes = cycleScopesNested.flat();

      const projectScopesNested = await Promise.all(
        cycleScopes.map(async ({ program, cycle }: any) => {
          const projectsResponse = await apiClient.get(`/api/projects/by-cycle/${cycle.id}`);
          const projects = projectsResponse.data.data || [];
          return projects.map((project: any) => ({ program, cycle, project }));
        })
      );

      const projectScopes = projectScopesNested.flat();

      const taskBatches = await Promise.all(
        projectScopes.map(async ({ program, cycle, project }: any) => {
          try {
            const tasksResponse = await apiClient.get(`/api/tasks/project/${project.id}`);
            const tasks = tasksResponse.data.data || [];

            return tasks
              .filter((task: any) => {
                const dra = normalizeValue(task.draUserId);
                const developer = normalizeValue(task.developerUserId);
                const assignedTo = normalizeValue(task.assignedTo);
                return tokenSet.has(dra) || tokenSet.has(developer) || tokenSet.has(assignedTo);
              })
              .map((task: any) => ({
                ...task,
                taskId: task.id,
                taskName: task.name,
                priorityCategory: 'my_tasks',
                projectName: project.name,
                mockCycleName: cycle.name,
                programName: program.name,
              }));
          } catch (requestError) {
            return [];
          }
        })
      );

      const assignedTasks = taskBatches.flat();
      return buildSections(assignedTasks);
    },
    enabled: !!user,
  });

  function buildSections(assignedTasks: any[]) {
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

    const sections = {
      late: assignedTasks.filter((task: any) => {
        if (task.status === 'complete') return false;
        const end = parseDateOnly(task.endDate);
        return !!end && end < todayStart;
      }),
      in_progress: assignedTasks.filter((task: any) => task.status === 'in_progress'),
      due_this_week: assignedTasks.filter((task: any) => {
        if (task.status === 'complete') return false;
        const end = parseDateOnly(task.endDate);
        return !!end && end >= todayStart && end <= weekEnd;
      }),
      blocked: assignedTasks.filter((task: any) => task.status === 'blocked'),
      complete: assignedTasks.filter((task: any) => task.status === 'complete'),
    };
    return { sections, totalAssigned: assignedTasks.length };
  }

  return (
    <Layout>
      <PageContainer maxWidth="xl">
        <ContentHeader
          title="My Tasks"
          subtitle={selectedProjectId ? 'Tasks assigned to you in the selected project.' : selectedProgramId ? 'Tasks assigned to you in the selected program.' : 'Tasks assigned to you across all programs and projects.'}
          stats={[{ label: 'Assigned Tasks', value: data?.totalAssigned ?? 0 }]}
        />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Unable to load your tasks right now.</Alert>
        ) : !data || data.totalAssigned === 0 ? (
          <Alert severity="info">No tasks are currently assigned to your account.</Alert>
        ) : (
          <>
            <PrioritySection
              title="Late Tasks"
              tasks={data.sections.late}
              color="#ef5350"
              onTaskClick={setSelectedTask}
              peopleById={peopleById}
            />
            <PrioritySection
              title="In Progress"
              tasks={data.sections.in_progress}
              color="#29b6f6"
              onTaskClick={setSelectedTask}
              peopleById={peopleById}
            />
            <PrioritySection
              title="Due This Week"
              tasks={data.sections.due_this_week}
              color="#ffa726"
              onTaskClick={setSelectedTask}
              peopleById={peopleById}
            />
            <PrioritySection
              title="Blocked"
              tasks={data.sections.blocked}
              color="#ab47bc"
              onTaskClick={setSelectedTask}
              peopleById={peopleById}
            />
            <PrioritySection
              title="Completed"
              tasks={data.sections.complete}
              color="#66bb6a"
              onTaskClick={setSelectedTask}
              peopleById={peopleById}
            />
          </>
        )}

        <TaskDetailModal
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask?.taskId || selectedTask?.id}
          task={selectedTask}
          peopleById={peopleById}
        />
      </PageContainer>
    </Layout>
  );
};

export default MyTasksPage;
