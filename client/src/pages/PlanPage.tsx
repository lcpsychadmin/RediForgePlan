// client/src/pages/PlanPage.tsx

import React, { useState } from 'react';
import { Grid, Box, CircularProgress, Alert, Button, Stack } from '@mui/material';
import { useQueries } from '@tanstack/react-query';
import apiClient from '../api/client';
import AddIcon from '@mui/icons-material/Add';
import PageContainer from '../layout/PageContainer';
import ContentHeader from '../layout/ContentHeader';
import { ExportMenu } from '../components/export';
import { useProjectObjects } from '../api/hooks';
import { useTaskGroups } from '../api/hooks';
import DataObjectCard from '../components/objects/DataObjectCard';
import DataObjectDetailDrawer from '../components/objects/DataObjectDetailDrawer';
import TaskGroupCard from '../components/taskGroups/TaskGroupCard';
import TaskGroupDetailDrawer from '../components/taskGroups/TaskGroupDetailDrawer';
import { useParams } from 'react-router-dom';

const PlanPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [objectFilters, setObjectFilters] = useState({ status: '', draUserId: '', developerUserId: '' });
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedTaskGroupId, setSelectedTaskGroupId] = useState<string | null>(null);
  const [isObjectDrawerOpen, setIsObjectDrawerOpen] = useState(false);
  const [isTaskGroupDrawerOpen, setIsTaskGroupDrawerOpen] = useState(false);

  const { data: objects = [], isLoading: objectsLoading, error: objectsError } = useProjectObjects(
    projectId!,
    objectFilters
  );

  const { data: groups = [], isLoading: groupsLoading, error: groupsError } = useTaskGroups(projectId!);

  const objectTaskQueries = useQueries({
    queries: objects.map((object) => ({
      queryKey: ['plan-object-tasks', projectId, object.id],
      queryFn: async () => {
        const response = await apiClient.get(`/tasks/project/${projectId}`, {
          params: { projectObjectId: object.id },
        });
        return response.data.data || [];
      },
      enabled: !!projectId,
    })),
  });

  const objectValidationQueries = useQueries({
    queries: objectTaskQueries.map((taskQuery, index) => {
      const objectId = objects[index]?.id;
      const tasks = taskQuery.data || [];
      const validationTaskIds = tasks
        .filter((task: any) => {
          const taskType = task.taskType || task.task_type;
          return taskType === 'preload_validation' || taskType === 'postload_validation';
        })
        .map((task: any) => task.id)
        .filter(Boolean);

      return {
        queryKey: ['plan-object-validation', objectId, validationTaskIds],
        queryFn: async () => {
          if (!validationTaskIds.length) return [];

          const responses = await Promise.all(
            validationTaskIds.map((taskId: string) =>
              apiClient.get(`/tasks/${taskId}/validation-stats`).catch(() => ({ data: { data: null } }))
            )
          );
          return responses.map((response: any) => response.data.data).filter(Boolean);
        },
        enabled: validationTaskIds.length > 0,
      };
    }),
  });

  const objectDefectQueries = useQueries({
    queries: objectTaskQueries.map((taskQuery, index) => {
      const objectId = objects[index]?.id;
      const tasks = taskQuery.data || [];
      const taskIds = tasks.map((task: any) => task.id).filter(Boolean);

      return {
        queryKey: ['plan-object-defects', objectId, taskIds],
        queryFn: async () => {
          if (!taskIds.length) return [];
          const responses = await Promise.all(
            taskIds.map((taskId: string) => apiClient.get(`/api/tasks/${taskId}/defects`).catch(() => ({ data: { data: [] } })))
          );
          return responses.flatMap((response: any) => response.data.data || []);
        },
        enabled: taskIds.length > 0,
      };
    }),
  });

  const groupTaskQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: ['plan-group-tasks', projectId, group.id],
      queryFn: async () => {
        const response = await apiClient.get(`/tasks/project/${projectId}`, {
          params: { taskGroupId: group.id },
        });
        return response.data.data || [];
      },
      enabled: !!projectId,
    })),
  });

  const groupDefectQueries = useQueries({
    queries: groupTaskQueries.map((taskQuery, index) => {
      const groupId = groups[index]?.id;
      const taskIds = (taskQuery.data || []).map((task: any) => task.id).filter(Boolean);
      return {
        queryKey: ['plan-group-defects', groupId, taskIds],
        queryFn: async () => {
          if (!taskIds.length) return [];
          const responses = await Promise.all(
            taskIds.map((taskId: string) => apiClient.get(`/api/tasks/${taskId}/defects`).catch(() => ({ data: { data: [] } })))
          );
          return responses.flatMap((response: any) => response.data.data || []);
        },
        enabled: taskIds.length > 0,
      };
    }),
  });

  if (!projectId) {
    return <Alert severity="error">Project ID not found</Alert>;
  }

  const handleObjectClick = (objectId: string) => {
    setSelectedObjectId(objectId);
    setIsObjectDrawerOpen(true);
  };

  const handleGroupClick = (groupId: string) => {
    setSelectedTaskGroupId(groupId);
    setIsTaskGroupDrawerOpen(true);
  };

  return (
    <PageContainer>
      <ContentHeader
        title="Plan"
        stats={[
          { label: 'Data Objects', value: objects.length },
          { label: 'Task Groups', value: groups.length },
        ]}
        actions={projectId ? <ExportMenu projectId={projectId} variant="icon" /> : null}
      >
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1}>
            <Button
              select
              SelectProps={{ native: true }}
              size="small"
              value={objectFilters.status}
              onChange={(e) => setObjectFilters({ ...objectFilters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="complete">Complete</option>
            </Button>
          </Stack>
        </Stack>
      </ContentHeader>

      {/* Data Objects Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <h2>Data Objects ({objects.length})</h2>
          <Button variant="contained" startIcon={<AddIcon />} size="small">
            Add Object
          </Button>
        </Box>

        {objectsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : objectsError ? (
          <Alert severity="error">{objectsError.message}</Alert>
        ) : objects.length === 0 ? (
          <Alert severity="info">No data objects yet</Alert>
        ) : (
          <Grid container spacing={2}>
            {objects.map((object) => (
              <Grid item xs={12} sm={6} md={4} key={object.id}>
                {(() => {
                  const objectIndex = objects.findIndex((item) => item.id === object.id);
                  const validationStatsList = objectValidationQueries[objectIndex]?.data || [];
                  const objectDefects = objectDefectQueries[objectIndex]?.data || [];
                  const openDefectsCount = objectDefects.filter((defect: any) => defect.status === 'open').length;
                  const invalidRecordsCount = validationStatsList.reduce(
                    (sum: number, stat: any) => sum + Number(stat?.invalidRecords || 0),
                    0
                  );

                  return (
                <DataObjectCard
                  object={object}
                  invalidRecordsCount={invalidRecordsCount}
                  openDefectsCount={openDefectsCount}
                  onClick={() => handleObjectClick(object.id)}
                  onEdit={() => handleObjectClick(object.id)}
                />
                  );
                })()}
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Task Groups Section */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <h2>Task Groups ({groups.length})</h2>
          <Button variant="contained" startIcon={<AddIcon />} size="small">
            Add Task Group
          </Button>
        </Box>

        {groupsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : groupsError ? (
          <Alert severity="error">{groupsError.message}</Alert>
        ) : groups.length === 0 ? (
          <Alert severity="info">No task groups yet</Alert>
        ) : (
          <Grid container spacing={2}>
            {groups.map((group) => (
              <Grid item xs={12} sm={6} md={4} key={group.id}>
                {(() => {
                  const groupIndex = groups.findIndex((item) => item.id === group.id);
                  const groupDefects = groupDefectQueries[groupIndex]?.data || [];
                  const openDefectsCount = groupDefects.filter((defect: any) => defect.status === 'open').length;
                  return (
                <TaskGroupCard
                  group={group}
                  openDefectsCount={openDefectsCount}
                  onClick={() => handleGroupClick(group.id)}
                  onEdit={() => handleGroupClick(group.id)}
                />
                  );
                })()}
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Drawers */}
      <DataObjectDetailDrawer
        projectObjectId={selectedObjectId}
        open={isObjectDrawerOpen}
        onClose={() => setIsObjectDrawerOpen(false)}
      />

      <TaskGroupDetailDrawer
        taskGroupId={selectedTaskGroupId}
        open={isTaskGroupDrawerOpen}
        onClose={() => setIsTaskGroupDrawerOpen(false)}
      />
    </PageContainer>
  );
};

export default PlanPage;
