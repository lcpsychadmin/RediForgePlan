// client/src/api/hooks/useGlobalObjects.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { GlobalObject, CreateGlobalObjectPayload, UpdateGlobalObjectPayload, PaginationParams } from '../types';

const GLOBAL_OBJECT_KEYS = {
  all: ['globalObjects'] as const,
  lists: () => [...GLOBAL_OBJECT_KEYS.all, 'list'] as const,
  list: (filters: any) => [...GLOBAL_OBJECT_KEYS.lists(), filters] as const,
  details: () => [...GLOBAL_OBJECT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...GLOBAL_OBJECT_KEYS.details(), id] as const,
};

/**
 * Fetch all global objects with optional filters
 */
export function useGlobalObjects(params?: PaginationParams) {
  return useQuery({
    queryKey: GLOBAL_OBJECT_KEYS.list(params),
    queryFn: async () => {
      const response = await apiClient.get<{ data: GlobalObject[] }>('/api/global-objects', { params });
      return response.data.data;
    },
  });
}

/**
 * Fetch a single global object by ID
 */
export function useGlobalObject(objectId: string) {
  return useQuery({
    queryKey: GLOBAL_OBJECT_KEYS.detail(objectId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: GlobalObject }>(`/api/global-objects/${objectId}`);
      return response.data.data;
    },
    enabled: !!objectId,
  });
}

/**
 * Create a new global object
 */
export function useCreateGlobalObject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateGlobalObjectPayload) => {
      const response = await apiClient.post<{ data: GlobalObject }>('/api/global-objects', payload);
      return response.data.data;
    },
    onSuccess: (newObject) => {
      queryClient.invalidateQueries({ queryKey: GLOBAL_OBJECT_KEYS.lists() });
      queryClient.setQueryData(GLOBAL_OBJECT_KEYS.detail(newObject.id), newObject);
    },
  });
}

/**
 * Update an existing global object
 */
export function useUpdateGlobalObject(objectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateGlobalObjectPayload) => {
      const response = await apiClient.patch<{ data: GlobalObject }>(`/api/global-objects/${objectId}`, payload);
      return response.data.data;
    },
    onSuccess: (updatedObject) => {
      queryClient.setQueryData(GLOBAL_OBJECT_KEYS.detail(objectId), updatedObject);
      queryClient.invalidateQueries({ queryKey: GLOBAL_OBJECT_KEYS.lists() });
    },
  });
}

/**
 * Delete a global object
 */
export function useDeleteGlobalObject(objectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/global-objects/${objectId}`);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: GLOBAL_OBJECT_KEYS.detail(objectId) });
      queryClient.invalidateQueries({ queryKey: GLOBAL_OBJECT_KEYS.lists() });
    },
  });
}
