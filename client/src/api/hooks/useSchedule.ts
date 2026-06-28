// client/src/api/hooks/useSchedule.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { ScheduleItem, CreateScheduleItemPayload, UpdateScheduleItemPayload } from '../types';

const SCHEDULE_KEYS = {
  all: ['schedule'] as const,
  lists: () => [...SCHEDULE_KEYS.all, 'list'] as const,
  listByProject: (projectId: string) => [...SCHEDULE_KEYS.lists(), projectId] as const,
  details: () => [...SCHEDULE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...SCHEDULE_KEYS.details(), id] as const,
};

/**
 * Fetch schedule items for a project
 */
export function useSchedule(projectId: string) {
  return useQuery({
    queryKey: SCHEDULE_KEYS.listByProject(projectId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: ScheduleItem[] }>(`/api/schedule/project/${projectId}`);
      return response.data.data || [];
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single schedule item by ID
 */
export function useScheduleItem(scheduleItemId: string) {
  return useQuery({
    queryKey: SCHEDULE_KEYS.detail(scheduleItemId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: ScheduleItem }>(`/api/schedule/${scheduleItemId}`);
      return response.data.data;
    },
    enabled: !!scheduleItemId,
  });
}

/**
 * Create a new schedule item with optimistic updates
 */
export function useCreateScheduleItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateScheduleItemPayload) => {
      const response = await apiClient.post<{ data: ScheduleItem }>('/api/schedule', payload);
      return response.data.data;
    },
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.listByProject(projectId) });
      queryClient.setQueryData(SCHEDULE_KEYS.detail(newItem.id), newItem);
    },
  });
}

/**
 * Update an existing schedule item with optimistic updates (detail-level)
 */
export function useUpdateScheduleItem(scheduleItemId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateScheduleItemPayload) => {
      const response = await apiClient.patch<{ data: ScheduleItem }>(`/api/schedule/${scheduleItemId}`, payload);
      return response.data.data;
    },
    onMutate: async (newData) => {
      // Cancel any outgoing queries
      await queryClient.cancelQueries({ queryKey: SCHEDULE_KEYS.detail(scheduleItemId) });

      // Snapshot previous data
      const previousItem = queryClient.getQueryData(SCHEDULE_KEYS.detail(scheduleItemId));

      // Optimistically update
      if (previousItem) {
        queryClient.setQueryData(SCHEDULE_KEYS.detail(scheduleItemId), (old: ScheduleItem) => ({
          ...old,
          ...newData,
        }));
      }

      return { previousItem };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousItem) {
        queryClient.setQueryData(SCHEDULE_KEYS.detail(scheduleItemId), context.previousItem);
      }
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData(SCHEDULE_KEYS.detail(scheduleItemId), updatedItem);
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.listByProject(projectId) });
    },
  });
}

/**
 * Update schedule item - project-scoped mutation with optimistic list-level updates
 * Used for drag-and-drop operations where we have the item ID and project ID
 */
export function useUpdateScheduleItemInProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; scheduledDate: string }) => {
      const response = await apiClient.patch<{ data: ScheduleItem }>(`/api/schedule/${payload.id}`, {
        scheduledDate: payload.scheduledDate,
      });
      return response.data.data;
    },
    onMutate: async ({ id, scheduledDate }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: SCHEDULE_KEYS.listByProject(projectId) });

      // Snapshot previous list
      const previousList = queryClient.getQueryData(SCHEDULE_KEYS.listByProject(projectId));

      // Optimistically update list
      queryClient.setQueryData(
        SCHEDULE_KEYS.listByProject(projectId),
        (old: ScheduleItem[] | undefined) => {
          if (!old) return old;
          return old.map((item) =>
            item.id === id ? { ...item, scheduledDate } : item
          );
        }
      );

      return { previousList };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(SCHEDULE_KEYS.listByProject(projectId), context.previousList);
      }
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.listByProject(projectId) });
    },
  });
}

/**
 * Delete a schedule item
 */
export function useDeleteScheduleItem(scheduleItemId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/schedule/${scheduleItemId}`);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: SCHEDULE_KEYS.detail(scheduleItemId) });
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEYS.listByProject(projectId) });
    },
  });
}
