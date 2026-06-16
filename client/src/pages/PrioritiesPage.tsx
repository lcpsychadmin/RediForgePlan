// client/src/pages/PrioritiesPage.tsx

import React from 'react';
import { Box, CircularProgress, Alert, Grid, Card, CardContent, Typography } from '@mui/material';
import PageContainer from '../layout/PageContainer';
import ContentHeader from '../layout/ContentHeader';
import PrioritySection from '../components/priorities/PrioritySection';
import { usePriorities, useProjectStatus } from '../hooks/usePriorities';
import { useParams } from 'react-router-dom';

const PrioritiesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: prioritized, isLoading, error } = usePriorities(projectId!);
  const { data: status } = useProjectStatus(projectId!);

  if (!projectId) {
    return <Alert severity="error">Project ID not found</Alert>;
  }

  const sectionConfig = [
    { key: 'late', title: '⚠️ Late Tasks', color: '#ef5350' },
    { key: 'in_progress', title: '⏳ In Progress', color: '#ffb74d' },
    { key: 'due_this_week', title: '📅 Due This Week', color: '#42a5f5' },
    { key: 'on_track', title: '✓ On Track', color: '#81c784' },
  ];

  return (
    <PageContainer>
      <ContentHeader title="Priorities" />

      {/* Project Status Overview */}
      {status && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Tasks
                </Typography>
                <Typography variant="h4">{status.totalTasks}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completed
                </Typography>
                <Typography variant="h4" sx={{ color: '#81c784' }}>
                  {status.completedTasks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  In Progress
                </Typography>
                <Typography variant="h4" sx={{ color: '#ffb74d' }}>
                  {status.inProgressTasks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Blocked
                </Typography>
                <Typography variant="h4" sx={{ color: '#ef5350' }}>
                  {status.blockedTasks}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error.message}</Alert>
      ) : prioritized ? (
        sectionConfig.map((config) => (
          <PrioritySection
            key={config.key}
            title={config.title}
            tasks={prioritized[config.key as keyof typeof prioritized] || []}
            color={config.color}
          />
        ))
      ) : (
        <Alert severity="info">No prioritized data available</Alert>
      )}
    </PageContainer>
  );
};

export default PrioritiesPage;
