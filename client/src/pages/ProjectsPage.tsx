// client/src/pages/ProjectsPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Stack,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import Layout from '../components/Layout';

interface Program {
  id: string;
  name: string;
  description?: string;
}

interface MockCycle {
  id: string;
  programId: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface Project {
  id: string;
  mockCycleId: string;
  name: string;
  startDate?: string;
  endDate?: string;
}

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const response = await apiClient.get('/api/programs');
      return response.data.data;
    },
  });

  const { data: mockCycles = {} } = useQuery({
    queryKey: ['mockCycles'],
    queryFn: async () => {
      const cycles: Record<string, MockCycle[]> = {};
      await Promise.all(
        programs.map(async (program: Program) => {
          try {
            const response = await apiClient.get(`/api/programs/${program.id}/mock-cycles`);
            cycles[program.id] = response.data.data;
          } catch {
            cycles[program.id] = [];
          }
        })
      );
      return cycles;
    },
    enabled: programs.length > 0,
  });

  const { data: projectsByMockCycle = {} } = useQuery({
    queryKey: ['projectsByMockCycle'],
    queryFn: async () => {
      const projects: Record<string, Project[]> = {};
      for (const programId in mockCycles) {
        const cycles = mockCycles[programId];
        for (const cycle of cycles) {
          try {
            const response = await apiClient.get(`/api/projects/by-cycle/${cycle.id}`);
            projects[cycle.id] = response.data.data;
          } catch {
            projects[cycle.id] = [];
          }
        }
      }
      return projects;
    },
    enabled: Object.keys(mockCycles).length > 0,
  });

  const handleProjectClick = (programId: string, mockCycleId: string, projectId: string) => {
    navigate(`/programs/${programId}/mock-cycles/${mockCycleId}/projects/${projectId}/plan`);
  };

  if (isLoading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
          Projects
        </Typography>

        {programs.length === 0 ? (
          <Alert severity="info">No programs available</Alert>
        ) : (
          <Grid container spacing={2}>
            {programs.map((program: Program) => (
              <Grid item xs={12} key={program.id}>
                <Card>
                  <CardHeader
                    title={program.name}
                    subheader={program.description}
                    action={
                      <IconButton
                        onClick={() =>
                          setExpandedProgram(expandedProgram === program.id ? null : program.id)
                        }
                      >
                        {expandedProgram === program.id ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )}
                      </IconButton>
                    }
                  />

                  <Collapse in={expandedProgram === program.id}>
                    <CardContent>
                      {mockCycles[program.id]?.length === 0 ? (
                        <Typography color="textSecondary">No mock cycles</Typography>
                      ) : (
                        <List>
                          {mockCycles[program.id]?.map((cycle: MockCycle) => (
                            <Box key={cycle.id} sx={{ mb: 2 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  mb: 1,
                                  cursor: 'pointer',
                                  p: 1,
                                  backgroundColor: '#f5f5f5',
                                  borderRadius: 1,
                                }}
                                onClick={() =>
                                  setExpandedCycle(expandedCycle === cycle.id ? null : cycle.id)
                                }
                              >
                                <Typography sx={{ fontWeight: 500 }}>
                                  {cycle.name}
                                </Typography>
                                <IconButton size="small">
                                  {expandedCycle === cycle.id ? (
                                    <ExpandLessIcon />
                                  ) : (
                                    <ExpandMoreIcon />
                                  )}
                                </IconButton>
                              </Box>

                              <Collapse in={expandedCycle === cycle.id}>
                                <Stack spacing={1} sx={{ pl: 2 }}>
                                  {projectsByMockCycle[cycle.id]?.length === 0 ? (
                                    <Typography variant="caption" color="textSecondary">
                                      No projects
                                    </Typography>
                                  ) : (
                                    projectsByMockCycle[cycle.id]?.map((project: Project) => (
                                      <ListItemButton
                                        key={project.id}
                                        onClick={() =>
                                          handleProjectClick(
                                            program.id,
                                            cycle.id,
                                            project.id
                                          )
                                        }
                                        sx={{
                                          backgroundColor: '#fafafa',
                                          borderRadius: 1,
                                          '&:hover': { backgroundColor: '#ede7f6' },
                                        }}
                                      >
                                        <Stack sx={{ width: '100%' }}>
                                          <Typography>{project.name}</Typography>
                                          {project.startDate && project.endDate && (
                                            <Typography variant="caption" color="textSecondary">
                                              {project.startDate} → {project.endDate}
                                            </Typography>
                                          )}
                                        </Stack>
                                      </ListItemButton>
                                    ))
                                  )}
                                </Stack>
                              </Collapse>
                            </Box>
                          ))}
                        </List>
                      )}
                    </CardContent>
                  </Collapse>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Layout>
  );
};

export default ProjectsPage;
