// client/src/hooks/useSchedule.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';

export interface ScheduleItem {
  id: string;
  projectId: string;
  taskId: string;
  taskType: string;
  taskName?: string;
  taskStatus: string;
  projectObjectId?: string;
  objectId?: string;
  scheduledDate: string;
  createdAt: string;
}

export const useSchedule = (projectId: string) => {
  return useQuery({
    queryKey: ['schedule', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/schedule/project/${projectId}`);
      return response.data.data;
    },
    enabled: !!projectId,
  });
};

export const useCreateScheduleItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post(`/api/schedule/project/${data.projectId}`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedule', variables.projectId] });
    },
  });
};

export const useUpdateScheduleItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.patch(`/api/schedule/${data.id}`, {
        scheduledDate: data.scheduledDate,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
};

export const useDeleteScheduleItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleItemId: string) => {
      await apiClient.delete(`/api/schedule/${scheduleItemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
};
