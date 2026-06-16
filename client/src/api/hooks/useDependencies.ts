// client/src/api/hooks/useDependencies.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { ObjectDependency, CreateDependencyPayload } from '../types';

const DEPENDENCY_KEYS = {
  all: ['dependencies'] as const,
  lists: () => [...DEPENDENCY_KEYS.all, 'list'] as const,
  listByObject: (objectId: string) => [...DEPENDENCY_KEYS.lists(), objectId] as const,
  details: () => [...DEPENDENCY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...DEPENDENCY_KEYS.details(), id] as const,
};

/**
 * Fetch dependencies for a project object
 */
export function useDependencies(projectObjectId: string) {
  return useQuery({
    queryKey: DEPENDENCY_KEYS.listByObject(projectObjectId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: ObjectDependency[] }>(
        `/project-objects/${projectObjectId}/dependencies`
      );
      return response.data.data;
    },
    enabled: !!projectObjectId,
  });
}

/**
 * Add a dependency between two objects
 */
export function useAddDependency(sourceObjectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDependencyPayload) => {
      const response = await apiClient.post<{ data: ObjectDependency }>(
        `/project-objects/${sourceObjectId}/dependencies`,
        payload
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPENDENCY_KEYS.listByObject(sourceObjectId) });
    },
  });
}

/**
 * Remove a dependency between two objects
 */
export function useRemoveDependency(sourceObjectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dependencyId: string) => {
      await apiClient.delete(`/project-objects/${sourceObjectId}/dependencies/${dependencyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPENDENCY_KEYS.listByObject(sourceObjectId) });
    },
  });
}
