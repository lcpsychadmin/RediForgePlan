// client/src/components/GlobalFilterBar.tsx
// Compact global filter bar shown at the top of main pages.
// Lets users select their program and project; persists across navigation.

import React from 'react';
import {
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  Typography,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useFilter } from '../contexts/FilterContext';

const GlobalFilterBar: React.FC = () => {
  const {
    selectedProgramId,
    selectedProjectId,
    setSelectedProgramId,
    setSelectedProjectId,
    programs,
    projects,
    programsLoading,
    projectsLoading,
  } = useFilter();

  const projectNameCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    (projects || []).forEach((project: any) => {
      const key = String(project?.name || '').trim().toLowerCase();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [projects]);

  const formatProjectLabel = (project: any) => {
    const base = String(project?.name || 'Project');
    const nameKey = base.trim().toLowerCase();
    if ((projectNameCounts[nameKey] || 0) <= 1) return base;
    const programName = String(project?.programName || '').trim();
    if (programName) return `${base} (${programName})`;
    const shortId = String(project?.id || '').slice(0, 8);
    return shortId ? `${base} (${shortId})` : base;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
        <FilterListIcon sx={{ fontSize: '1rem' }} />
        <Typography variant="caption" fontWeight={500} color="text.secondary">
          Viewing
        </Typography>
      </Box>

      {/* Program selector */}
      {programsLoading ? (
        <Skeleton variant="rounded" width={180} height={32} />
      ) : (
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="global-program-label">Program</InputLabel>
          <Select
            labelId="global-program-label"
            label="Program"
            value={selectedProgramId ?? ''}
            onChange={(e) => setSelectedProgramId(e.target.value || null)}
            sx={{ fontSize: '0.875rem' }}
          >
            <MenuItem value="" sx={{ fontSize: '0.875rem' }}>
              All Programs
            </MenuItem>
            {programs.map((p: any) => (
              <MenuItem key={p.id} value={p.id} sx={{ fontSize: '0.875rem' }}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Project selector */}
      {projectsLoading ? (
        <Skeleton variant="rounded" width={200} height={32} />
      ) : (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="global-project-label">Project</InputLabel>
          <Select
            labelId="global-project-label"
            label="Project"
            value={selectedProjectId ?? ''}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            sx={{ fontSize: '0.875rem' }}
          >
            <MenuItem value="" sx={{ fontSize: '0.875rem' }}>
              All Projects
            </MenuItem>
            {projects.map((p: any) => (
              <MenuItem key={p.id} value={p.id} sx={{ fontSize: '0.875rem' }}>
                {formatProjectLabel(p)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
};

export default GlobalFilterBar;
