// client/src/hooks/usePriorities.ts

import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

export interface PriorityTask {
  taskId: string;
  taskType: string;
  taskName?: string;
  projectObjectId?: string;
  objectId?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  draUserId?: string;
  developerUserId?: string;
  priorityCategory: string;
}

export interface PrioritizedTasks {
  late: PriorityTask[];
  in_progress: PriorityTask[];
  due_this_week: PriorityTask[];
  on_track: PriorityTask[];
}

export const usePriorities = (projectId: string) => {
  return useQuery({
    queryKey: ['priorities', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/priorities/project/${projectId}`);
      return response.data.data as PrioritizedTasks;
    },
    enabled: !!projectId,
  });
};

export interface ProjectStatus {
  projectId: string;
  projectName: string;
  startDate: string;
  endDate: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  notStartedTasks: number;
  completionPercentage: number;
}

export const useProjectStatus = (projectId: string) => {
  return useQuery({
    queryKey: ['projectStatus', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/priorities/status/${projectId}`);
      return response.data.data as ProjectStatus;
    },
    enabled: !!projectId,
  });
};
