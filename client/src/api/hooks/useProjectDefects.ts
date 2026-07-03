import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import { Defect } from '../types';

export interface ProjectDefectFilters {
  statuses?: string[];
  search?: string;
}

export function useProjectDefects(projectId: string, filters?: ProjectDefectFilters) {
  return useQuery({
    queryKey: ['project-defects', projectId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.statuses?.length) {
        params.append('statuses', filters.statuses.join(','));
      }
      if (filters?.search?.trim()) {
        params.append('search', filters.search.trim());
      }

      const response = await apiClient.get<{ data: Defect[] }>(`/api/projects/${projectId}/defects`, {
        params: Object.fromEntries(params),
      });
      return response.data.data || [];
    },
    enabled: !!projectId,
  });
}