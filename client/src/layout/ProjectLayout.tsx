// client/src/layout/ProjectLayout.tsx

import React from 'react';
import { Box, Breadcrumbs, Typography, Link, Skeleton } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import TopTabs from './TopTabs';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

const ProjectLayout: React.FC<ProjectLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { programId, mockCycleId, projectId } = useParams<{
    programId: string;
    mockCycleId: string;
    projectId: string;
  }>();

  // Fetch hierarchy data
  const { data: program } = useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/programs/${programId}`);
      return response.data.data;
    },
    enabled: !!programId,
  });

  const { data: mockCycle } = useQuery({
    queryKey: ['mockCycle', mockCycleId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/mock-cycles/${mockCycleId}`);
      return response.data.data;
    },
    enabled: !!mockCycleId,
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/projects/${projectId}`);
      return response.data.data;
    },
    enabled: !!projectId,
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Breadcrumb Navigation */}
      <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
        <Breadcrumbs>
          <Link
            component="button"
            onClick={() => navigate('/dashboard')}
            sx={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            Programs
          </Link>
          {program ? (
            <Typography>{program.name}</Typography>
          ) : (
            <Skeleton width={100} />
          )}
          {mockCycle ? (
            <Typography>{mockCycle.name}</Typography>
          ) : (
            <Skeleton width={100} />
          )}
          {project ? (
            <Typography color="primary">{project.name}</Typography>
          ) : (
            <Skeleton width={150} />
          )}
        </Breadcrumbs>
      </Box>

      {/* Top Tabs */}
      <TopTabs projectId={projectId} />

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {children}
      </Box>
    </Box>
  );
};

export default ProjectLayout;
