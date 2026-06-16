// client/src/api/hooks/useTasks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { Task, CreateTaskPayload, UpdateTaskPayload, TaskFilters } from '../types';

const TASK_KEYS = {
  all: ['tasks'] as const,
  lists: () => [...TASK_KEYS.all, 'list'] as const,
  listByProject: (projectId: string, filters?: TaskFilters) => [...TASK_KEYS.lists(), projectId, filters] as const,
  details: () => [...TASK_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TASK_KEYS.details(), id] as const,
};

/**
 * Fetch tasks for a project with optional filters
 */
export function useTasks(projectId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: TASK_KEYS.listByProject(projectId, filters),
    queryFn: async () => {
      const response = await apiClient.get<{ data: Task[] }>(`/tasks/project/${projectId}`, { params: filters });
      return response.data.data;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single task by ID
 */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: TASK_KEYS.detail(taskId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: Task }>(`/tasks/${taskId}`);
      return response.data.data;
    },
    enabled: !!taskId,
  });
}

/**
 * Create a new task
 */
export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTaskPayload) => {
      const response = await apiClient.post<{ data: Task }>('/tasks', payload);
      return response.data.data;
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.listByProject(projectId) });
      queryClient.setQueryData(TASK_KEYS.detail(newTask.id), newTask);
    },
  });
}

/**
 * Update an existing task with optimistic updates
 */
export function useUpdateTask(taskId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateTaskPayload) => {
      const response = await apiClient.patch<{ data: Task }>(`/tasks/${taskId}`, payload);
      return response.data.data;
    },
    onMutate: async (newData) => {
      // Cancel any outgoing queries
      await queryClient.cancelQueries({ queryKey: TASK_KEYS.detail(taskId) });

      // Snapshot previous data
      const previousTask = queryClient.getQueryData(TASK_KEYS.detail(taskId));

      // Optimistically update
      if (previousTask) {
        queryClient.setQueryData(TASK_KEYS.detail(taskId), (old: Task) => ({
          ...old,
          ...newData,
        }));
      }

      return { previousTask };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousTask) {
        queryClient.setQueryData(TASK_KEYS.detail(taskId), context.previousTask);
      }
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(TASK_KEYS.detail(taskId), updatedTask);
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.listByProject(projectId) });
    },
  });
}

/**
 * Delete a task
 */
export function useDeleteTask(taskId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: TASK_KEYS.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.listByProject(projectId) });
    },
  });
}
