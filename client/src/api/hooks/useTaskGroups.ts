// client/src/api/hooks/useTaskGroups.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { TaskGroup, CreateTaskGroupPayload, UpdateTaskGroupPayload } from '../types';

const TASK_GROUP_KEYS = {
  all: ['taskGroups'] as const,
  lists: () => [...TASK_GROUP_KEYS.all, 'list'] as const,
  listByProject: (projectId: string) => [...TASK_GROUP_KEYS.lists(), projectId] as const,
  details: () => [...TASK_GROUP_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TASK_GROUP_KEYS.details(), id] as const,
};

/**
 * Fetch task groups for a project
 */
export function useTaskGroups(projectId: string) {
  return useQuery({
    queryKey: TASK_GROUP_KEYS.listByProject(projectId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: TaskGroup[] }>(`/tasks/groups/project/${projectId}`);
      return response.data.data;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single task group by ID
 */
export function useTaskGroup(taskGroupId: string) {
  return useQuery({
    queryKey: TASK_GROUP_KEYS.detail(taskGroupId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: TaskGroup }>(`/tasks/groups/${taskGroupId}`);
      return response.data.data;
    },
    enabled: !!taskGroupId,
  });
}

/**
 * Create a new task group
 */
export function useCreateTaskGroup(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTaskGroupPayload) => {
      const response = await apiClient.post<{ data: TaskGroup }>('/tasks/groups', payload);
      return response.data.data;
    },
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: TASK_GROUP_KEYS.listByProject(projectId) });
      queryClient.setQueryData(TASK_GROUP_KEYS.detail(newGroup.id), newGroup);
    },
  });
}

/**
 * Update an existing task group
 */
export function useUpdateTaskGroup(taskGroupId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateTaskGroupPayload) => {
      const response = await apiClient.patch<{ data: TaskGroup }>(`/tasks/groups/${taskGroupId}`, payload);
      return response.data.data;
    },
    onSuccess: (updatedGroup) => {
      queryClient.setQueryData(TASK_GROUP_KEYS.detail(taskGroupId), updatedGroup);
      queryClient.invalidateQueries({ queryKey: TASK_GROUP_KEYS.listByProject(projectId) });
    },
  });
}

/**
 * Delete a task group
 */
export function useDeleteTaskGroup(taskGroupId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/tasks/groups/${taskGroupId}`);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: TASK_GROUP_KEYS.detail(taskGroupId) });
      queryClient.invalidateQueries({ queryKey: TASK_GROUP_KEYS.listByProject(projectId) });
    },
  });
}
