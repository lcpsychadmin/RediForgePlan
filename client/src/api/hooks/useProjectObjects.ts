// client/src/api/hooks/useProjectObjects.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import {
  ProjectObject,
  CreateProjectObjectPayload,
  UpdateProjectObjectPayload,
  ProjectObjectFilters,
} from '../types';

const PROJECT_OBJECT_KEYS = {
  all: ['projectObjects'] as const,
  lists: () => [...PROJECT_OBJECT_KEYS.all, 'list'] as const,
  listByProject: (projectId: string, filters?: ProjectObjectFilters) =>
    [...PROJECT_OBJECT_KEYS.lists(), projectId, filters] as const,
  details: () => [...PROJECT_OBJECT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PROJECT_OBJECT_KEYS.details(), id] as const,
};

/**
 * Fetch project objects with optional filters
 */
export function useProjectObjects(projectId: string, filters?: ProjectObjectFilters) {
  return useQuery({
    queryKey: PROJECT_OBJECT_KEYS.listByProject(projectId, filters),
    queryFn: async () => {
      const response = await apiClient.get<{ data: ProjectObject[] }>(`/project-objects/project/${projectId}`, {
        params: filters,
      });
      return response.data.data;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single project object by ID
 */
export function useProjectObject(objectId: string) {
  return useQuery({
    queryKey: PROJECT_OBJECT_KEYS.detail(objectId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: ProjectObject }>(`/project-objects/${objectId}`);
      return response.data.data;
    },
    enabled: !!objectId,
  });
}

/**
 * Create a new project object
 */
export function useCreateProjectObject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateProjectObjectPayload) => {
      const response = await apiClient.post<{ data: ProjectObject }>('/project-objects', payload);
      return response.data.data;
    },
    onSuccess: (newObject) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_OBJECT_KEYS.listByProject(projectId) });
      queryClient.setQueryData(PROJECT_OBJECT_KEYS.detail(newObject.id), newObject);
    },
  });
}

/**
 * Update an existing project object
 */
export function useUpdateProjectObject(objectId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProjectObjectPayload) => {
      const response = await apiClient.patch<{ data: ProjectObject }>(`/project-objects/${objectId}`, payload);
      return response.data.data;
    },
    onSuccess: (updatedObject) => {
      queryClient.setQueryData(PROJECT_OBJECT_KEYS.detail(objectId), updatedObject);
      queryClient.invalidateQueries({ queryKey: PROJECT_OBJECT_KEYS.listByProject(projectId) });
    },
  });
}

/**
 * Delete a project object
 */
export function useDeleteProjectObject(objectId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/project-objects/${objectId}`);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: PROJECT_OBJECT_KEYS.detail(objectId) });
      queryClient.invalidateQueries({ queryKey: PROJECT_OBJECT_KEYS.listByProject(projectId) });
    },
  });
}
