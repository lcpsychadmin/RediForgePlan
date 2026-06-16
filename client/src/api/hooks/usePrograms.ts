// client/src/api/hooks/usePrograms.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { Program, CreateProgramPayload, UpdateProgramPayload } from '../types';
import { parseApiError } from '../errorHandler';

const PROGRAM_KEYS = {
  all: ['programs'] as const,
  lists: () => [...PROGRAM_KEYS.all, 'list'] as const,
  list: (filters: any) => [...PROGRAM_KEYS.lists(), filters] as const,
  details: () => [...PROGRAM_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PROGRAM_KEYS.details(), id] as const,
};

/**
 * Fetch all programs
 */
export function usePrograms() {
  return useQuery({
    queryKey: PROGRAM_KEYS.lists(),
    queryFn: async () => {
      const response = await apiClient.get<{ data: Program[] }>('/programs');
      return response.data.data;
    },
  });
}

/**
 * Fetch a single program by ID
 */
export function useProgram(programId: string) {
  return useQuery({
    queryKey: PROGRAM_KEYS.detail(programId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: Program }>(`/programs/${programId}`);
      return response.data.data;
    },
    enabled: !!programId,
  });
}

/**
 * Create a new program
 */
export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateProgramPayload) => {
      const response = await apiClient.post<{ data: Program }>('/programs', payload);
      return response.data.data;
    },
    onSuccess: (newProgram) => {
      queryClient.invalidateQueries({ queryKey: PROGRAM_KEYS.lists() });
      queryClient.setQueryData(PROGRAM_KEYS.detail(newProgram.id), newProgram);
    },
  });
}

/**
 * Update an existing program
 */
export function useUpdateProgram(programId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProgramPayload) => {
      const response = await apiClient.patch<{ data: Program }>(`/programs/${programId}`, payload);
      return response.data.data;
    },
    onSuccess: (updatedProgram) => {
      queryClient.setQueryData(PROGRAM_KEYS.detail(programId), updatedProgram);
      queryClient.invalidateQueries({ queryKey: PROGRAM_KEYS.lists() });
    },
  });
}

/**
 * Delete a program
 */
export function useDeleteProgram(programId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/programs/${programId}`);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: PROGRAM_KEYS.detail(programId) });
      queryClient.invalidateQueries({ queryKey: PROGRAM_KEYS.lists() });
    },
  });
}
