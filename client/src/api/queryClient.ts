// client/src/api/queryClient.ts

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

const queryConfig: DefaultOptions = {
  queries: {
    // Retry failed requests once
    retry: 1,
    // Data remains fresh for 30 seconds
    staleTime: 30_000,
    // Don't refetch when window regains focus
    refetchOnWindowFocus: false,
    // Don't refetch when component remounts
    refetchOnMount: false,
    // Garbage collect unused queries after 5 minutes
    gcTime: 5 * 60 * 1000,
  },
  mutations: {
    // Retry mutations once on failure
    retry: 1,
  },
};

/**
 * Create and configure QueryClient for React Query
 */
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

export default queryClient;
