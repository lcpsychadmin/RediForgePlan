import React from 'react';
import { Alert, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import {
  useMockCycleReportingSummary,
  useProgramReportingSummary,
  useProjectReportingSummary,
  useReportingIssueBreakdown,
  useReportingTrends,
} from '../api/hooks/useReporting';
import DefectSeverityChart from '../components/reporting/DefectSeverityChart';
import IssueBreakdownTable from '../components/reporting/IssueBreakdownTable';
import LoadMetricsChart from '../components/reporting/LoadMetricsChart';
import ReportingSummaryCards from '../components/reporting/ReportingSummaryCards';
import TrendCharts from '../components/reporting/TrendCharts';
import ValidationStatsChart from '../components/reporting/ValidationStatsChart';
import ContentHeader from '../layout/ContentHeader';
import PageContainer from '../layout/PageContainer';

const ReportingDashboardPage: React.FC = () => {
  const { projectId, mockCycleId, programId } = useParams<{
    projectId: string;
    mockCycleId: string;
    programId: string;
  }>();

  const { data: summary, isLoading, error } = useProjectReportingSummary(projectId || '');
  const { data: mockCycleSummary } = useMockCycleReportingSummary(mockCycleId || '');
  const { data: programSummary } = useProgramReportingSummary(programId || '');
  const { data: trends } = useReportingTrends(projectId || '');
  const { data: issueBreakdown = [] } = useReportingIssueBreakdown(projectId || '');

  if (!projectId || !mockCycleId || !programId) {
    return <Alert severity="error">Project reporting context is missing.</Alert>;
  }

  if (isLoading) {
    return (
      <PageContainer maxWidth="xl">
        <ContentHeader title="Reporting Dashboard" />
        <CircularProgress />
      </PageContainer>
    );
  }

  if (error || !summary) {
    return (
      <PageContainer maxWidth="xl">
        <ContentHeader title="Reporting Dashboard" />
        <Alert severity="error">Failed to load reporting data.</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <ContentHeader title="Reporting Dashboard" subtitle="Project analytics with mock cycle and program rollups." />

      <Stack spacing={4}>
        <ReportingSummaryCards summary={summary} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <DefectSeverityChart data={summary.defects.bySeverity} />
          </Grid>
          <Grid item xs={12} md={6}>
            <LoadMetricsChart data={summary.loadMetrics} />
          </Grid>
          <Grid item xs={12}>
            <ValidationStatsChart data={summary.validation} />
          </Grid>
          <Grid item xs={12}>
            <IssueBreakdownTable data={issueBreakdown} />
          </Grid>
          <Grid item xs={12}>
            <TrendCharts
              trends={
                trends || {
                  defectsOverTime: [],
                  validationOverTime: [],
                  loadFailuresOverTime: [],
                }
              }
            />
          </Grid>
        </Grid>

        <Stack spacing={3}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Rollups
          </Typography>
          {mockCycleSummary ? <ReportingSummaryCards summary={mockCycleSummary} title="Mock Cycle Rollup" /> : null}
          {programSummary ? <ReportingSummaryCards summary={programSummary} title="Program Rollup" /> : null}
        </Stack>
      </Stack>
    </PageContainer>
  );
};

export default ReportingDashboardPage;
