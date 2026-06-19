import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { CreateIssueRecordPayload, IssueRecord } from '../types';

const ISSUE_RECORD_KEYS = {
  all: ['issueRecords'] as const,
  list: (issueTypeId: string) => [...ISSUE_RECORD_KEYS.all, issueTypeId] as const,
};

export function useIssueRecords(issueTypeId: string) {
  const queryClient = useQueryClient();

  const recordsQuery = useQuery({
    queryKey: ISSUE_RECORD_KEYS.list(issueTypeId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: IssueRecord[] }>(`/issue-types/${issueTypeId}/records`);
      return response.data.data || [];
    },
    enabled: !!issueTypeId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateIssueRecordPayload) => {
      const response = await apiClient.post<{ data: IssueRecord }>(`/issue-types/${issueTypeId}/records`, payload);
      return response.data.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ISSUE_RECORD_KEYS.list(issueTypeId) });
      const previous = queryClient.getQueryData<IssueRecord[]>(ISSUE_RECORD_KEYS.list(issueTypeId)) || [];

      const optimistic: IssueRecord = {
        id: `temp-${Date.now()}`,
        taskIssueTypeId: issueTypeId,
        recordIdentifier: payload.recordIdentifier,
        rawData: payload.rawData || null,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<IssueRecord[]>(ISSUE_RECORD_KEYS.list(issueTypeId), [...previous, optimistic]);
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ISSUE_RECORD_KEYS.list(issueTypeId), context.previous);
      }
    },
    onSuccess: (created) => {
      queryClient.setQueryData<IssueRecord[]>(ISSUE_RECORD_KEYS.list(issueTypeId), (old = []) => {
        const filtered = old.filter((item) => !String(item.id).startsWith('temp-'));
        return [...filtered, created];
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ISSUE_RECORD_KEYS.list(issueTypeId) });
    },
  });

  return {
    ...recordsQuery,
    createIssueRecord: createMutation.mutate,
    createIssueRecordAsync: createMutation.mutateAsync,
    isCreatingIssueRecord: createMutation.isPending,
  };
}

export const issueRecordKeys = ISSUE_RECORD_KEYS;
