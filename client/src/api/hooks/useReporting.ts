import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import { ReportingIssueBreakdownItem, ReportingSummary, ReportingTrends } from '../types';

const REPORTING_KEYS = {
  all: ['reporting'] as const,
  projectSummary: (projectId: string) => [...REPORTING_KEYS.all, 'project', projectId, 'summary'] as const,
  mockCycleSummary: (mockCycleId: string) => [...REPORTING_KEYS.all, 'mockCycle', mockCycleId, 'summary'] as const,
  programSummary: (programId: string) => [...REPORTING_KEYS.all, 'program', programId, 'summary'] as const,
  trends: (projectId: string) => [...REPORTING_KEYS.all, projectId, 'trends'] as const,
  issues: (projectId: string) => [...REPORTING_KEYS.all, projectId, 'issues'] as const,
};

export async function getProjectSummary(projectId: string) {
  const response = await apiClient.get<{ data: ReportingSummary }>(`/reporting/projects/${projectId}/summary`);
  return response.data.data;
}

export async function getMockCycleSummary(mockCycleId: string) {
  const response = await apiClient.get<{ data: ReportingSummary }>(`/reporting/mock-cycles/${mockCycleId}/summary`);
  return response.data.data;
}

export async function getProgramSummary(programId: string) {
  const response = await apiClient.get<{ data: ReportingSummary }>(`/reporting/programs/${programId}/summary`);
  return response.data.data;
}

export async function getTrends(projectId: string) {
  const response = await apiClient.get<{ data: ReportingTrends }>(`/reporting/projects/${projectId}/trends`);
  return response.data.data;
}

export async function getIssueBreakdown(projectId: string) {
  const response = await apiClient.get<{ data: ReportingIssueBreakdownItem[] }>(`/reporting/projects/${projectId}/issues`);
  return response.data.data || [];
}

export function useProjectReportingSummary(projectId: string) {
  return useQuery({
    queryKey: REPORTING_KEYS.projectSummary(projectId),
    queryFn: () => getProjectSummary(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useMockCycleReportingSummary(mockCycleId: string) {
  return useQuery({
    queryKey: REPORTING_KEYS.mockCycleSummary(mockCycleId),
    queryFn: () => getMockCycleSummary(mockCycleId),
    enabled: !!mockCycleId,
    staleTime: 30_000,
  });
}

export function useProgramReportingSummary(programId: string) {
  return useQuery({
    queryKey: REPORTING_KEYS.programSummary(programId),
    queryFn: () => getProgramSummary(programId),
    enabled: !!programId,
    staleTime: 30_000,
  });
}

export function useReportingTrends(projectId: string) {
  return useQuery({
    queryKey: REPORTING_KEYS.trends(projectId),
    queryFn: () => getTrends(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useReportingIssueBreakdown(projectId: string) {
  return useQuery({
    queryKey: REPORTING_KEYS.issues(projectId),
    queryFn: () => getIssueBreakdown(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export const reportingKeys = REPORTING_KEYS;
