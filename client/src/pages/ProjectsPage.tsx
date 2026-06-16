// client/src/pages/ProjectsPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Paper,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Menu from '@mui/material/Menu';
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

type SelectableItem = { type: 'program'; id: string } | { type: 'cycle'; id: string; programId: string } | { type: 'project'; id: string; cycleId: string };

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State for expanded nodes in tree
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());
  
  // State for selected item
  const [selectedItem, setSelectedItem] = useState<SelectableItem | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'program' | 'cycle' | 'project'>('program');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [contextProgramId, setContextProgramId] = useState<string | null>(null);
  const [contextCycleId, setContextCycleId] = useState<string | null>(null);
  
  // Context menu states
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuType, setMenuType] = useState<'program' | 'cycle' | 'project' | null>(null);
  const [menuItemId, setMenuItemId] = useState<string | null>(null);

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

  const handleCreateItem = async () => {
    if (!newItemName.trim()) {
      alert('Name is required');
      return;
    }

    try {
      setIsCreating(true);
      if (dialogMode === 'program') {
        await apiClient.post('/api/programs', {
          name: newItemName,
          description: newItemDesc,
        });
        queryClient.invalidateQueries({ queryKey: ['programs'] });
      } else if (dialogMode === 'cycle' && contextProgramId) {
        await apiClient.post(`/api/programs/${contextProgramId}/mock-cycles`, {
          name: newItemName,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        queryClient.invalidateQueries({ queryKey: ['mockCycles'] });
        setExpandedPrograms(new Set(expandedPrograms).add(contextProgramId));
      } else if (dialogMode === 'project' && contextCycleId) {
        await apiClient.post(`/api/projects/by-cycle/${contextCycleId}`, {
          name: newItemName,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] });
        setExpandedCycles(new Set(expandedCycles).add(contextCycleId));
      }
      setNewItemName('');
      setNewItemDesc('');
      setCreateDialogOpen(false);
      setContextProgramId(null);
      setContextCycleId(null);
    } catch (error) {
      console.error('Failed to create:', error);
      alert('Failed to create. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleProgramExpanded = (programId: string) => {
    const newSet = new Set(expandedPrograms);
    if (newSet.has(programId)) {
      newSet.delete(programId);
    } else {
      newSet.add(programId);
    }
    setExpandedPrograms(newSet);
  };

  const toggleCycleExpanded = (cycleId: string) => {
    const newSet = new Set(expandedCycles);
    if (newSet.has(cycleId)) {
      newSet.delete(cycleId);
    } else {
      newSet.add(cycleId);
    }
    setExpandedCycles(newSet);
  };

  const openCreateDialog = (mode: 'program' | 'cycle' | 'project', programId?: string, cycleId?: string) => {
    setDialogMode(mode);
    setContextProgramId(programId || null);
    setContextCycleId(cycleId || null);
    setNewItemName('');
    setNewItemDesc('');
    setCreateDialogOpen(true);
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

  // Get selected item details
  const getSelectedItemDetails = () => {
    if (!selectedItem) return null;
    
    if (selectedItem.type === 'program') {
      return programs.find(p => p.id === selectedItem.id);
    } else if (selectedItem.type === 'cycle') {
      return mockCycles[selectedItem.programId]?.find(c => c.id === selectedItem.id);
    } else if (selectedItem.type === 'project') {
      for (const cycleId in projectsByMockCycle) {
        const project = projectsByMockCycle[cycleId]?.find(p => p.id === selectedItem.id);
        if (project) return project;
      }
    }
    return null;
  };

  const selectedDetails = getSelectedItemDetails();

  return (
    <Layout>
      <Box sx={{ display: 'flex', height: 'calc(100vh - 180px)', gap: 2, mx: -3, px: 3 }}>
        {/* Left Sidebar - Hierarchy Tree */}
        <Paper
          sx={{
            width: '280px',
            overflowY: 'auto',
            p: 2,
            flexShrink: 0,
            backgroundColor: 'background.elevated',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {programs.length === 0 ? (
              <Typography variant="caption" color="textSecondary">
                No programs
              </Typography>
            ) : (
              <List sx={{ p: 0 }}>
                {programs.map((program: Program) => (
                  <Box key={program.id}>
                    {/* Program Item */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 1,
                        px: 1,
                        borderRadius: 1,
                        backgroundColor: selectedItem?.type === 'program' && selectedItem?.id === program.id ? 'primary.lighter' : 'transparent',
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                    >
                      <Box
                        onClick={() => {
                          setSelectedItem({ type: 'program', id: program.id });
                          toggleProgramExpanded(program.id);
                        }}
                        sx={{ flex: 1, minWidth: 0 }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500, noWrap: true }}>
                          {program.name}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setMenuAnchorEl(e.currentTarget);
                          setMenuType('program');
                          setMenuItemId(program.id);
                        }}
                        sx={{ ml: 1 }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Mock Cycles */}
                    {expandedPrograms.has(program.id) && (
                      <Box sx={{ pl: 2 }}>
                        {mockCycles[program.id]?.map((cycle: MockCycle) => (
                          <Box key={cycle.id}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                py: 0.75,
                                px: 1,
                                borderRadius: 1,
                                backgroundColor: selectedItem?.type === 'cycle' && selectedItem?.id === cycle.id ? 'primary.lighter' : 'transparent',
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'action.hover' },
                              }}
                            >
                              <Box
                                onClick={() => {
                                  setSelectedItem({ type: 'cycle', id: cycle.id, programId: program.id });
                                  toggleCycleExpanded(cycle.id);
                                }}
                                sx={{ flex: 1, minWidth: 0 }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: 500, noWrap: true }}>
                                  {cycle.name}
                                </Typography>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  setMenuAnchorEl(e.currentTarget);
                                  setMenuType('cycle');
                                  setMenuItemId(cycle.id);
                                }}
                                sx={{ ml: 1 }}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </Box>

                            {/* Projects */}
                            {expandedCycles.has(cycle.id) && (
                              <Box sx={{ pl: 2 }}>
                                {projectsByMockCycle[cycle.id]?.map((project: Project) => (
                                  <Box
                                    key={project.id}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      py: 0.5,
                                      px: 1,
                                      borderRadius: 1,
                                      backgroundColor: selectedItem?.type === 'project' && selectedItem?.id === project.id ? 'primary.lighter' : 'transparent',
                                      cursor: 'pointer',
                                      '&:hover': { backgroundColor: 'action.hover' },
                                    }}
                                  >
                                    <Box
                                      onClick={() =>
                                        setSelectedItem({ type: 'project', id: project.id, cycleId: cycle.id })
                                      }
                                      sx={{ flex: 1, minWidth: 0 }}
                                    >
                                      <Typography variant="caption" sx={{ noWrap: true }}>
                                        {project.name}
                                      </Typography>
                                    </Box>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        setMenuAnchorEl(e.currentTarget);
                                        setMenuType('project');
                                        setMenuItemId(project.id);
                                      }}
                                      sx={{ ml: 1 }}
                                    >
                                      <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                ))}
                                {/* Add Project Button */}
                                <Button
                                  size="small"
                                  variant="text"
                                  startIcon={<AddIcon />}
                                  onClick={() => openCreateDialog('project', undefined, cycle.id)}
                                  sx={{ fontSize: '0.75rem', height: 28, mt: 0.5 }}
                                >
                                  Add Project
                                </Button>
                              </Box>
                            )}
                          </Box>
                        ))}
                        {/* Add Mock Cycle Button */}
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<AddIcon />}
                          onClick={() => openCreateDialog('cycle', program.id)}
                          sx={{ fontSize: '0.75rem', height: 28, mt: 1 }}
                        >
                          Add Mock Cycle
                        </Button>
                      </Box>
                    )}
                  </Box>
                ))}
              </List>
            )}
          </Box>

          {/* Add Program Button at Bottom */}
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            fullWidth
            onClick={() => openCreateDialog('program')}
            sx={{ mt: 2 }}
          >
            Add Program
          </Button>
        </Paper>

        {/* Right Content Area - Details */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {!selectedItem ? (
            <Alert severity="info">Select an item from the list to view details</Alert>
          ) : selectedDetails ? (
            <Card>
              <CardHeader
                title={selectedDetails.name}
                subheader={selectedDetails.description || (selectedItem.type === 'cycle' ? `${(selectedDetails as MockCycle).startDate} → ${(selectedDetails as MockCycle).endDate}` : '')}
              />
              <Divider />
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {selectedItem.type === 'program' && 'Program Details'}
                  {selectedItem.type === 'cycle' && 'Mock Cycle Details'}
                  {selectedItem.type === 'project' && 'Project Details'}
                </Typography>
                
                {selectedItem.type === 'project' && (
                  <Button
                    variant="contained"
                    onClick={() => {
                      const item = selectedItem as Extract<SelectableItem, { type: 'project' }>;
                      // Find the cycle's program ID
                      for (const progId in mockCycles) {
                        const cycle = mockCycles[progId]?.find(c => c.id === item.cycleId);
                        if (cycle) {
                          navigate(`/programs/${progId}/mock-cycles/${item.cycleId}/projects/${item.id}/plan`);
                          break;
                        }
                      }
                    }}
                  >
                    Open Planning View
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : null}
        </Box>
      </Box>

      {/* Create Item Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'program' && 'Create New Program'}
          {dialogMode === 'cycle' && 'Create New Mock Cycle'}
          {dialogMode === 'project' && 'Create New Project'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            margin="normal"
            placeholder="Enter name"
          />
          {dialogMode === 'program' && (
            <TextField
              fullWidth
              label="Description"
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              margin="normal"
              multiline
              rows={3}
              placeholder="Optional description"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateItem}
            variant="contained"
            disabled={isCreating || !newItemName.trim()}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            // TODO: Implement edit
            setMenuAnchorEl(null);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={async () => {
            if (!menuItemId || !menuType) return;
            if (!confirm(`Delete this ${menuType}?`)) return;

            try {
              if (menuType === 'program') {
                await apiClient.delete(`/api/programs/${menuItemId}`);
              } else if (menuType === 'cycle') {
                await apiClient.delete(`/api/mock-cycles/${menuItemId}`);
              } else if (menuType === 'project') {
                await apiClient.delete(`/api/projects/${menuItemId}`);
              }
              
              // Invalidate queries
              queryClient.invalidateQueries({ queryKey: ['programs'] });
              queryClient.invalidateQueries({ queryKey: ['mockCycles'] });
              queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] });
              
              // Clear selection if we deleted the selected item
              if (selectedItem?.id === menuItemId) {
                setSelectedItem(null);
              }
              
              setMenuAnchorEl(null);
            } catch (error) {
              console.error('Failed to delete:', error);
              alert('Failed to delete. Please try again.');
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Layout>
  );
};

export default ProjectsPage;
