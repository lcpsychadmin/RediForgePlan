// client/src/pages/SchedulePage.tsx

import React, { useState } from 'react';
import { Box, CircularProgress, Alert, Button, Stack, Snackbar } from '@mui/material';
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

const SchedulePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));

  const { data: scheduleItems = [], isLoading, error } = useSchedule(projectId!);

  if (!projectId) {
    return <Alert severity="error">Project ID not found</Alert>;
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
          items={scheduleItems}
          weekStart={weekStart}
          projectId={projectId}
        />
      )}
    </PageContainer>
  );
};

export default SchedulePage;
