// client/src/api/hooks/useAuditLogs.ts

import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import { AuditLog, AuditLogFilters, PaginationParams } from '../types';

const AUDIT_LOG_KEYS = {
  all: ['auditLogs'] as const,
  lists: () => [...AUDIT_LOG_KEYS.all, 'list'] as const,
  list: (filters: AuditLogFilters, pagination?: PaginationParams) =>
    [...AUDIT_LOG_KEYS.lists(), filters, pagination] as const,
  details: () => [...AUDIT_LOG_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...AUDIT_LOG_KEYS.details(), id] as const,
};

/**
 * Fetch audit logs with optional filters and pagination
 * Note: Admin only endpoint
 */
export function useAuditLogs(filters?: AuditLogFilters, pagination?: PaginationParams) {
  return useQuery({
    queryKey: AUDIT_LOG_KEYS.list(filters || {}, pagination),
    queryFn: async () => {
      const params = {
        ...filters,
        ...pagination,
      };
      const response = await apiClient.get<{ data: AuditLog[] }>('/audit', { params });
      return response.data.data;
    },
  });
}

/**
 * Fetch a single audit log by ID
 * Note: Admin only endpoint
 */
export function useAuditLog(logId: string) {
  return useQuery({
    queryKey: AUDIT_LOG_KEYS.detail(logId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: AuditLog }>(`/audit/${logId}`);
      return response.data.data;
    },
    enabled: !!logId,
  });
}
