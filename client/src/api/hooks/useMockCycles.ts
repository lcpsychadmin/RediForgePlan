// client/src/api/hooks/useMockCycles.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { MockCycle, CreateMockCyclePayload, UpdateMockCyclePayload } from '../types';

const MOCK_CYCLE_KEYS = {
  all: ['mockCycles'] as const,
  lists: () => [...MOCK_CYCLE_KEYS.all, 'list'] as const,
  listByProgram: (programId: string) => [...MOCK_CYCLE_KEYS.lists(), programId] as const,
  details: () => [...MOCK_CYCLE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...MOCK_CYCLE_KEYS.details(), id] as const,
};

/**
 * Fetch mock cycles for a program
 */
export function useMockCycles(programId: string) {
  return useQuery({
    queryKey: MOCK_CYCLE_KEYS.listByProgram(programId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: MockCycle[] }>(`/programs/${programId}/mock-cycles`);
      return response.data.data;
    },
    enabled: !!programId,
  });
}

/**
 * Fetch a single mock cycle by ID
 */
export function useMockCycle(mockCycleId: string) {
  return useQuery({
    queryKey: MOCK_CYCLE_KEYS.detail(mockCycleId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: MockCycle }>(`/mock-cycles/${mockCycleId}`);
      return response.data.data;
    },
    enabled: !!mockCycleId,
  });
}

/**
 * Create a new mock cycle
 */
export function useCreateMockCycle(programId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateMockCyclePayload) => {
      const response = await apiClient.post<{ data: MockCycle }>(`/programs/${programId}/mock-cycles`, payload);
      return response.data.data;
    },
    onSuccess: (newCycle) => {
      queryClient.invalidateQueries({ queryKey: MOCK_CYCLE_KEYS.listByProgram(programId) });
      queryClient.setQueryData(MOCK_CYCLE_KEYS.detail(newCycle.id), newCycle);
    },
  });
}

/**
 * Update an existing mock cycle
 */
export function useUpdateMockCycle(mockCycleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateMockCyclePayload) => {
      const response = await apiClient.patch<{ data: MockCycle }>(`/mock-cycles/${mockCycleId}`, payload);
      return response.data.data;
    },
    onSuccess: (updatedCycle) => {
      queryClient.setQueryData(MOCK_CYCLE_KEYS.detail(mockCycleId), updatedCycle);
      queryClient.invalidateQueries({ queryKey: MOCK_CYCLE_KEYS.lists() });
    },
  });
}

/**
 * Delete a mock cycle
 */
export function useDeleteMockCycle(mockCycleId: string, programId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/mock-cycles/${mockCycleId}`);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: MOCK_CYCLE_KEYS.detail(mockCycleId) });
      queryClient.invalidateQueries({ queryKey: MOCK_CYCLE_KEYS.listByProgram(programId) });
    },
  });
}
