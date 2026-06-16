// client/src/hooks/useTaskGroups.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';

export interface TaskGroup {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const useTaskGroups = (projectId: string) => {
  return useQuery({
    queryKey: ['taskGroups', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/groups/project/${projectId}`);
      return response.data.data;
    },
    enabled: !!projectId,
  });
};

export const useTaskGroup = (taskGroupId: string) => {
  return useQuery({
    queryKey: ['taskGroup', taskGroupId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/groups/${taskGroupId}`);
      return response.data.data;
    },
    enabled: !!taskGroupId,
  });
};

export const useCreateTaskGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post(`/api/tasks/groups/project/${data.projectId}`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['taskGroups', variables.projectId] });
    },
  });
};

export const useUpdateTaskGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.patch(`/api/tasks/groups/${data.id}`, data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['taskGroup', data.id] });
      queryClient.invalidateQueries({ queryKey: ['taskGroups'] });
    },
  });
};

export const useDeleteTaskGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskGroupId: string) => {
      await apiClient.delete(`/api/tasks/groups/${taskGroupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskGroups'] });
    },
  });
};
