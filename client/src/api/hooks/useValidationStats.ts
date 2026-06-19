import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { SaveValidationStatsPayload, ValidationStats } from '../types';

const VALIDATION_KEYS = {
  all: ['validationStats'] as const,
  detail: (taskId: string) => [...VALIDATION_KEYS.all, taskId] as const,
};

export function useValidationStats(taskId: string) {
  const queryClient = useQueryClient();

  const statsQuery = useQuery({
    queryKey: VALIDATION_KEYS.detail(taskId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: ValidationStats | null }>(`/tasks/${taskId}/validation-stats`);
      return response.data.data;
    },
    enabled: !!taskId,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: SaveValidationStatsPayload) => {
      const response = await apiClient.post<{ data: ValidationStats }>(`/tasks/${taskId}/validation-stats`, payload);
      return response.data.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: VALIDATION_KEYS.detail(taskId) });
      const previous = queryClient.getQueryData<ValidationStats | null>(VALIDATION_KEYS.detail(taskId));

      queryClient.setQueryData<ValidationStats | null>(VALIDATION_KEYS.detail(taskId), (old) => {
        const base = old || ({ id: `temp-${taskId}`, taskId, createdAt: new Date().toISOString() } as ValidationStats);
        return {
          ...base,
          ...payload,
          updatedAt: new Date().toISOString(),
        };
      });

      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(VALIDATION_KEYS.detail(taskId), context.previous);
      }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(VALIDATION_KEYS.detail(taskId), saved);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: VALIDATION_KEYS.detail(taskId) });
    },
  });

  return {
    ...statsQuery,
    saveValidationStats: saveMutation.mutate,
    saveValidationStatsAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}

export const validationStatsKeys = VALIDATION_KEYS;
