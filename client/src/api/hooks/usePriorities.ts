// client/src/api/hooks/usePriorities.ts

import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import { PrioritizedTasks, ProjectStatus } from '../types';

const PRIORITY_KEYS = {
  all: ['priorities'] as const,
  lists: () => [...PRIORITY_KEYS.all, 'list'] as const,
  listByProject: (projectId: string) => [...PRIORITY_KEYS.lists(), projectId] as const,
  status: () => [...PRIORITY_KEYS.all, 'status'] as const,
  statusByProject: (projectId: string) => [...PRIORITY_KEYS.status(), projectId] as const,
};

/**
 * Fetch prioritized tasks grouped by category
 * Returns: { late: Task[], inProgress: Task[], dueThisWeek: Task[], onTrack: Task[] }
 */
export function usePriorities(projectId: string) {
  return useQuery({
    queryKey: PRIORITY_KEYS.listByProject(projectId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: PrioritizedTasks }>(`/priorities/project/${projectId}`);
      return response.data.data;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch project status and metrics
 */
export function useProjectStatus(projectId: string) {
  return useQuery({
    queryKey: PRIORITY_KEYS.statusByProject(projectId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: ProjectStatus }>(`/priorities/status/${projectId}`);
      return response.data.data;
    },
    enabled: !!projectId,
  });
}
