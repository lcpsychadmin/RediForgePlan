// client/src/pages/SchedulePage.tsx

import React, { useState } from 'react';
import { Box, CircularProgress, Alert, Button, Stack, Snackbar } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import MuiAlert from '@mui/material/Alert';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PageContainer from '../layout/PageContainer';
import ContentHeader from '../layout/ContentHeader';
import { ExportMenu } from '../components/export';
import DraggableScheduleGrid from '../components/schedule/DraggableScheduleGrid';
import { useSchedule } from '../api/hooks';
import { useParams } from 'react-router-dom';
import { addDays, startOfWeek, subDays, format } from 'date-fns';
import { useFilter } from '../contexts/FilterContext';

const SchedulePage: React.FC = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const { selectedProjectId } = useFilter();
  const projectId = routeProjectId || selectedProjectId || '';
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));

  const { data: scheduleItems = [], isLoading, error } = useSchedule(projectId!);
  const taskIds = React.useMemo(() => scheduleItems.map((item) => item.taskId).filter(Boolean), [scheduleItems]);

  const { data: openDefectMap = {} } = useQuery({
    queryKey: ['schedule-open-defects', projectId, taskIds],
    queryFn: async () => {
      const entries = await Promise.all(
        taskIds.map(async (taskId) => {
          try {
            const response = await apiClient.get(`/tasks/${taskId}/defects`);
            const defects = response.data.data || [];
            const openCount = defects.filter((defect: any) => defect.status === 'open').length;
            return [taskId, openCount] as const;
          } catch (_error) {
            return [taskId, 0] as const;
          }
        })
      );

      return Object.fromEntries(entries);
    },
    enabled: !!projectId && taskIds.length > 0,
  });

  const scheduleItemsWithDefects = React.useMemo(
    () =>
      scheduleItems.map((item) => ({
        ...item,
        hasOpenDefects: Number(openDefectMap[item.taskId] || 0) > 0,
      })),
    [scheduleItems, openDefectMap]
  );

  if (!projectId) {
    return <Alert severity="info">Select a project using the global filter to view schedule.</Alert>;
  }

  const weekEnd = addDays(weekStart, 6);

  const handlePreviousWeek = () => {
    setWeekStart(subDays(weekStart, 7));
  };

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  return (
    <PageContainer>
      <ContentHeader
        title="Schedule"
        actions={projectId ? <ExportMenu projectId={projectId} variant="icon" /> : null}
      />

      {/* Week Navigation */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
        <Button variant="outlined" startIcon={<ChevronLeftIcon />} onClick={handlePreviousWeek} size="small">
          Previous
        </Button>

        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <strong>
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </strong>
        </Box>

        <Button variant="outlined" endIcon={<ChevronRightIcon />} onClick={handleNextWeek} size="small">
          Next
        </Button>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error.message}</Alert>
      ) : (
        <DraggableScheduleGrid
          items={scheduleItemsWithDefects as any}
          weekStart={weekStart}
          projectId={projectId}
        />
      )}
    </PageContainer>
  );
};

export default SchedulePage;
