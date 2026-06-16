// client/src/hooks/useTasks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';

export interface Task {
  id: string;
  projectId: string;
  projectObjectId?: string;
  taskGroupId?: string;
  taskType: string;
  name?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  draUserId?: string;
  developerUserId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskFilters {
  status?: string;
  taskType?: string;
  draUserId?: string;
  developerUserId?: string;
  projectObjectId?: string;
  taskGroupId?: string;
}

export const useTasks = (projectId: string, filters?: TaskFilters) => {
  const queryKey = ['tasks', projectId, filters];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.taskType) params.append('taskType', filters.taskType);
      if (filters?.draUserId) params.append('draUserId', filters.draUserId);
      if (filters?.developerUserId) params.append('developerUserId', filters.developerUserId);
      if (filters?.projectObjectId) params.append('projectObjectId', filters.projectObjectId);
      if (filters?.taskGroupId) params.append('taskGroupId', filters.taskGroupId);

      const response = await apiClient.get(`/api/tasks/project/${projectId}`, {
        params: Object.fromEntries(params),
      });
      return response.data.data;
    },
    enabled: !!projectId,
  });
};

export const useTask = (taskId: string) => {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/${taskId}`);
      return response.data.data;
    },
    enabled: !!taskId,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post(`/api/tasks/project/${data.projectId}`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.patch(`/api/tasks/${data.id}`, data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.delete(`/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};
