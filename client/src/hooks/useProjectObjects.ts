// client/src/hooks/useProjectObjects.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';

export interface ProjectObject {
  id: string;
  projectId: string;
  globalObjectId: string;
  objectId: string;
  description: string;
  processArea: string;
  complexity: string;
  deploymentDisposition: string;
  buildType: string;
  status: string;
  startDate: string;
  endDate: string;
  draUserId?: string;
  developerUserId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Filters {
  status?: string;
  draUserId?: string;
  developerUserId?: string;
  processArea?: string;
}

export const useProjectObjects = (projectId: string, filters?: Filters) => {
  const queryKey = ['projectObjects', projectId, filters];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.draUserId) params.append('draUserId', filters.draUserId);
      if (filters?.developerUserId) params.append('developerUserId', filters.developerUserId);
      if (filters?.processArea) params.append('processArea', filters.processArea);

      const response = await apiClient.get(`/api/project-objects/project/${projectId}`, {
        params: Object.fromEntries(params),
      });
      return response.data.data;
    },
    enabled: !!projectId,
  });
};

export const useProjectObject = (projectObjectId: string) => {
  return useQuery({
    queryKey: ['projectObject', projectObjectId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/project-objects/${projectObjectId}`);
      return response.data.data;
    },
    enabled: !!projectObjectId,
  });
};

export const useCreateProjectObject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post(`/api/project-objects/project/${data.projectId}`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectObjects', variables.projectId] });
    },
  });
};

export const useUpdateProjectObject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.patch(`/api/project-objects/${data.id}`, data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projectObject', data.id] });
      queryClient.invalidateQueries({ queryKey: ['projectObjects'] });
    },
  });
};

export const useDeleteProjectObject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectObjectId: string) => {
      await apiClient.delete(`/api/project-objects/${projectObjectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectObjects'] });
    },
  });
};
