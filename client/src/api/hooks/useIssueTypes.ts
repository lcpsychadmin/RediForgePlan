import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { CreateIssueTypePayload, IssueType } from '../types';

const ISSUE_TYPE_KEYS = {
  all: ['issueTypes'] as const,
  list: (taskId: string) => [...ISSUE_TYPE_KEYS.all, taskId] as const,
};

export function useIssueTypes(taskId: string) {
  const queryClient = useQueryClient();

  const issueTypesQuery = useQuery({
    queryKey: ISSUE_TYPE_KEYS.list(taskId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: IssueType[] }>(`/tasks/${taskId}/issue-types`);
      return response.data.data || [];
    },
    enabled: !!taskId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateIssueTypePayload) => {
      const response = await apiClient.post<{ data: IssueType }>(`/tasks/${taskId}/issue-types`, payload);
      return response.data.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ISSUE_TYPE_KEYS.list(taskId) });
      const previous = queryClient.getQueryData<IssueType[]>(ISSUE_TYPE_KEYS.list(taskId)) || [];

      const optimistic: IssueType = {
        id: `temp-${Date.now()}`,
        taskId,
        issueCode: payload.issueCode,
        issueDescription: payload.issueDescription,
        count: payload.count,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<IssueType[]>(ISSUE_TYPE_KEYS.list(taskId), [...previous, optimistic]);
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ISSUE_TYPE_KEYS.list(taskId), context.previous);
      }
    },
    onSuccess: (created) => {
      queryClient.setQueryData<IssueType[]>(ISSUE_TYPE_KEYS.list(taskId), (old = []) => {
        const filtered = old.filter((item) => !String(item.id).startsWith('temp-'));
        return [...filtered, created];
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ISSUE_TYPE_KEYS.list(taskId) });
    },
  });

  return {
    ...issueTypesQuery,
    createIssueType: createMutation.mutate,
    createIssueTypeAsync: createMutation.mutateAsync,
    isCreatingIssueType: createMutation.isPending,
  };
}

export const issueTypeKeys = ISSUE_TYPE_KEYS;
