import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { CreateDefectPayload, Defect, UpdateDefectPayload } from '../types';

const DEFECT_KEYS = {
  all: ['defects'] as const,
  list: (taskId: string) => [...DEFECT_KEYS.all, taskId] as const,
  detail: (defectId: string) => [...DEFECT_KEYS.all, 'detail', defectId] as const,
};

export function useDefects(taskId: string) {
  const queryClient = useQueryClient();

  const defectsQuery = useQuery({
    queryKey: DEFECT_KEYS.list(taskId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: Defect[] }>(`/api/tasks/${taskId}/defects`);
      return response.data.data || [];
    },
    enabled: !!taskId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateDefectPayload) => {
      const response = await apiClient.post<{ data: Defect }>(`/api/tasks/${taskId}/defects`, payload);
      return response.data.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: DEFECT_KEYS.list(taskId) });
      const previous = queryClient.getQueryData<Defect[]>(DEFECT_KEYS.list(taskId)) || [];

      const optimistic: Defect = {
        id: `temp-${Date.now()}`,
        taskId,
        title: payload.title,
        description: payload.description || null,
        severity: payload.severity,
        status: payload.status || 'open',
        assignedToUserId: payload.assignedToUserId || null,
        createdByUserId: 'current-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        issueTypeId: payload.issueTypeId || null,
        projectObjectId: payload.projectObjectId || null,
      };

      queryClient.setQueryData<Defect[]>(DEFECT_KEYS.list(taskId), [optimistic, ...previous]);
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(DEFECT_KEYS.list(taskId), context.previous);
      }
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Defect[]>(DEFECT_KEYS.list(taskId), (old = []) => {
        const filtered = old.filter((item) => !String(item.id).startsWith('temp-'));
        return [created, ...filtered];
      });
      queryClient.setQueryData(DEFECT_KEYS.detail(created.id), created);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DEFECT_KEYS.list(taskId) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ defectId, payload }: { defectId: string; payload: UpdateDefectPayload }) => {
      const response = await apiClient.patch<{ data: Defect }>(`/api/defects/${defectId}`, payload);
      return response.data.data;
    },
    onMutate: async ({ defectId, payload }) => {
      await queryClient.cancelQueries({ queryKey: DEFECT_KEYS.list(taskId) });
      const previous = queryClient.getQueryData<Defect[]>(DEFECT_KEYS.list(taskId)) || [];

      queryClient.setQueryData<Defect[]>(DEFECT_KEYS.list(taskId), (old = []) =>
        old.map((item) =>
          item.id === defectId
            ? {
                ...item,
                ...payload,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(DEFECT_KEYS.list(taskId), context.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Defect[]>(DEFECT_KEYS.list(taskId), (old = []) =>
        old.map((item) => (item.id === updated.id ? updated : item))
      );
      queryClient.setQueryData(DEFECT_KEYS.detail(updated.id), updated);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DEFECT_KEYS.list(taskId) });
    },
  });

  return {
    ...defectsQuery,
    createDefect: createMutation.mutate,
    createDefectAsync: createMutation.mutateAsync,
    updateDefect: updateMutation.mutate,
    updateDefectAsync: updateMutation.mutateAsync,
    isCreatingDefect: createMutation.isPending,
    isUpdatingDefect: updateMutation.isPending,
  };
}

export const defectKeys = DEFECT_KEYS;
