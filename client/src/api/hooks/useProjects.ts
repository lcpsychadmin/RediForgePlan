// client/src/api/hooks/useProjects.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { Project, CreateProjectPayload, UpdateProjectPayload } from '../types';

const PROJECT_KEYS = {
  all: ['projects'] as const,
  lists: () => [...PROJECT_KEYS.all, 'list'] as const,
  listByMockCycle: (mockCycleId: string) => [...PROJECT_KEYS.lists(), mockCycleId] as const,
  details: () => [...PROJECT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PROJECT_KEYS.details(), id] as const,
};

/**
 * Fetch projects for a mock cycle
 */
export function useProjects(mockCycleId: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.listByMockCycle(mockCycleId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: Project[] }>(`/mock-cycles/${mockCycleId}/projects`);
      return response.data.data;
    },
    enabled: !!mockCycleId,
  });
}

/**
 * Fetch a single project by ID
 */
export function useProject(projectId: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(projectId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: Project }>(`/projects/${projectId}`);
      return response.data.data;
    },
    enabled: !!projectId,
  });
}

/**
 * Create a new project
 */
export function useCreateProject(mockCycleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const response = await apiClient.post<{ data: Project }>(`/mock-cycles/${mockCycleId}/projects`, payload);
      return response.data.data;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.listByMockCycle(mockCycleId) });
      queryClient.setQueryData(PROJECT_KEYS.detail(newProject.id), newProject);
    },
  });
}

/**
 * Update an existing project
 */
export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProjectPayload) => {
      const response = await apiClient.patch<{ data: Project }>(`/projects/${projectId}`, payload);
      return response.data.data;
    },
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(PROJECT_KEYS.detail(projectId), updatedProject);
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.lists() });
    },
  });
}

/**
 * Delete a project
 */
export function useDeleteProject(projectId: string, mockCycleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: PROJECT_KEYS.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.listByMockCycle(mockCycleId) });
    },
  });
}
