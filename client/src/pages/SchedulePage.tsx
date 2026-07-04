// client/src/pages/SchedulePage.tsx

import React, { useState, useMemo } from 'react';
import { Box, CircularProgress, Alert, Button, Stack, MenuItem, Select, FormControl, InputLabel, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PageContainer from '../layout/PageContainer';
import ContentHeader from '../layout/ContentHeader';
import { ExportMenu } from '../components/export';
import DraggableScheduleGrid from '../components/schedule/DraggableScheduleGrid';
import { useParams } from 'react-router-dom';
import { addDays, startOfWeek, subDays, format } from 'date-fns';
import { useFilter } from '../contexts/FilterContext';

const SchedulePage: React.FC = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const { selectedProgramId, selectedProjectId } = useFilter();
  const projectId = routeProjectId || selectedProjectId || '';
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [filterProcessArea, setFilterProcessArea] = useState('');
  const [filterMockCycle, setFilterMockCycle] = useState('');

  const { data: scheduleItems = [], isLoading, error } = useQuery({
    queryKey: ['schedule-scoped', projectId, selectedProgramId],
    queryFn: async () => {
      const fetchProjectSchedule = async (pid: string) => {
        const response = await apiClient.get(`/api/schedule/project/${pid}`);
        return response.data.data || [];
      };

      if (projectId) {
        return await fetchProjectSchedule(projectId);
      }

      const programs = selectedProgramId
        ? [{ id: selectedProgramId }]
        : ((await apiClient.get('/api/programs')).data.data || []);

      const projectGroups = await Promise.all(
        programs.map(async (program: any) => {
          const projectsResponse = await apiClient.get(`/api/projects/by-program/${program.id}`);
          return projectsResponse.data.data || [];
        })
      );

      const projects = projectGroups.flat();
      const scheduleGroups = await Promise.all(
        projects.map(async (project: any) => {
          try {
            return await fetchProjectSchedule(project.id);
          } catch {
            return [];
          }
        })
      );

      const deduped = new Map<string, any>();
      scheduleGroups.flat().forEach((item: any) => {
        if (!item?.id) return;
        deduped.set(item.id, item);
      });
      return Array.from(deduped.values());
    },
  });

  const { data: hierarchyState = {} } = useQuery({
    queryKey: ['hierarchy-preferences-state'],
    queryFn: async () => {
      const response = await apiClient.get('/api/hierarchy-preferences/state');
      return response.data?.data || {};
    },
  });

  const processAreaAccentOverrides =
    (hierarchyState as any)?.processAreaAccentOverrides || {};
  const globalProcessAreaAccents =
    (hierarchyState as any)?.globalProcessAreaAccents || {};

  const processAreaOptions = useMemo(() =>
    Array.from(new Set(scheduleItems.map((i: any) => i.processArea).filter(Boolean))).sort() as string[],
    [scheduleItems]
  );

  const mockCycleOptions = useMemo(() =>
    Array.from(new Set(scheduleItems.map((i: any) => i.mockCycleName).filter(Boolean))).sort() as string[],
    [scheduleItems]
  );

  const filteredItems = useMemo(() =>
    scheduleItems.filter((i: any) => {
      if (filterProcessArea && i.processArea !== filterProcessArea) return false;
      if (filterMockCycle && i.mockCycleName !== filterMockCycle) return false;
      return true;
    }),
    [scheduleItems, filterProcessArea, filterMockCycle]
  );

  const weekEnd = addDays(weekStart, 6);

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const scheduledThisWeek = useMemo(() =>
    scheduleItems.filter((i: any) => {
      if (!i.startDate) return false;
      const start = new Date(i.startDate);
      return start >= weekStart && start <= weekEnd;
    }).length,
    [scheduleItems, weekStart, weekEnd]
  );

  const overdueItems = useMemo(() =>
    scheduleItems.filter((i: any) => {
      if (!i.endDate || i.status === 'complete') return false;
      const end = new Date(i.endDate);
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return endDay < todayStart;
    }).length,
    [scheduleItems]
  );

  const scheduleStats = useMemo(() => [
    { label: 'Scheduled This Week', value: scheduledThisWeek },
    { label: 'Overdue', value: overdueItems },
  ], [scheduledThisWeek, overdueItems]);

  const handlePreviousWeek = () => {
    setWeekStart(subDays(weekStart, 7));
  };

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ContentHeader
        title="Schedule"
        stats={scheduleStats}
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

      {/* Filters */}
      <Box
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', mr: 0.5 }}>
          Filter
        </Typography>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="pa-filter-label">Process Area</InputLabel>
          <Select
            labelId="pa-filter-label"
            label="Process Area"
            value={filterProcessArea}
            onChange={(e) => setFilterProcessArea(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {processAreaOptions.map((pa) => (
              <MenuItem key={pa} value={pa}>{pa}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="mc-filter-label">Mock Cycle</InputLabel>
          <Select
            labelId="mc-filter-label"
            label="Mock Cycle"
            value={filterMockCycle}
            onChange={(e) => setFilterMockCycle(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {mockCycleOptions.map((mc) => (
              <MenuItem key={mc} value={mc}>{mc}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {(filterProcessArea || filterMockCycle) && (
          <Button size="small" onClick={() => { setFilterProcessArea(''); setFilterMockCycle(''); }}>
            Clear
          </Button>
        )}
      </Box>

      {/* Schedule */}
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error.message}</Alert>
        ) : (
          <DraggableScheduleGrid
            items={filteredItems as any}
            weekStart={weekStart}
            projectId={projectId}
            processAreaAccentOverrides={processAreaAccentOverrides}
            globalProcessAreaAccents={globalProcessAreaAccents}
          />
        )}
      </Box>
    </Box>
  );
};

export default SchedulePage;
