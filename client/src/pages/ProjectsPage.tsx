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
  Slider,
  Tabs,
  Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import SyncIcon from '@mui/icons-material/Sync';
import StorageIcon from '@mui/icons-material/Storage';
import GroupIcon from '@mui/icons-material/Group';
import DownloadIcon from '@mui/icons-material/Download';
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
  accentColor?: string;
  progressPercentage?: number;
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
  const [tabValue, setTabValue] = useState(0);
  
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
  
  // Delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemType, setDeleteItemType] = useState<'program' | 'cycle' | 'project' | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteItemName, setDeleteItemName] = useState('');
  const [deleteChildrenCount, setDeleteChildrenCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItemType, setEditItemType] = useState<'program' | 'cycle' | 'project' | null>(null);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemDesc, setEditItemDesc] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editAccentColor, setEditAccentColor] = useState('');
  const [editProgressPercentage, setEditProgressPercentage] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  // Data object dialog states
  const [dataObjectDialogOpen, setDataObjectDialogOpen] = useState(false);
  const [newDataObjectName, setNewDataObjectName] = useState('');
  const [newDataObjectId, setNewDataObjectId] = useState('');
  const [isCreatingDataObject, setIsCreatingDataObject] = useState(false);

  // Task group dialog states
  const [taskGroupDialogOpen, setTaskGroupDialogOpen] = useState(false);
  const [newTaskGroupName, setNewTaskGroupName] = useState('');
  const [isCreatingTaskGroup, setIsCreatingTaskGroup] = useState(false);

  // Picklist constants
  const processAreaOptions = ['A2R', 'CTRM', 'GTS', 'H2R', 'I2L', 'MDM', 'P2C', 'P2D', 'PSS', 'R2R', 'S2P', 'TM'];
  const complexityOptions = ['1-Complex', '2-Medium', '3-Simple'];
  const deploymentDispositionOptions = ['In Scope', 'Out of Scope', 'Pending Approval', 'Pending Confirmation'];
  const buildTypeOptions = ['New', 'Modify'];
  const objectTypeOptions = ['Master Data', 'Transactional', 'Document'];
  const cutoverPhaseOptions = ['Pre-Cutover', 'Blackout', 'Post Go-Live'];
  const ddmApproachOptions = ['Not in Scope', 'Automated', 'Manual'];
  const riskSecurityTypeOptions = ['Standard', 'Risk & Control', 'Data Masking'];
  const migrationTypeOptions = ['Automated', 'Manual'];
  const factorTypeOptions = ['Conversion - Extract, Transform & Load', 'Conversion - Construct & Load', 'Conversion - Construct, Transform & Manual Load', 'Conversion - Construct, Transform & Load', 'Conversion - Extract, Transform & Manual Load', 'Manual'];
  const loadMethodOptions = ['LTMC', 'IDOC', 'BAPI', 'LSMW', 'BODS - IDOC', 'BODS - BAPI', 'Custom ABAP Program', 'Informatica', 'Migration Cockpit', 'SAP Standard T Code', 'Manual'];

  // Inventory states
  const [inventorySubTab, setInventorySubTab] = useState(0);
  const [inventoryObjects, setInventoryObjects] = useState<{ id: string; objectId: string; description: string; processArea: string }[]>([]);
  const [projectInventoryItems, setProjectInventoryItems] = useState<any[]>([]);
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [selectedProjectForInventory, setSelectedProjectForInventory] = useState<string | null>(null);
  const [catalogObjectDialogOpen, setCatalogObjectDialogOpen] = useState(false);
  const [catalogObjectId, setCatalogObjectId] = useState('');
  const [catalogObjectDesc, setCatalogObjectDesc] = useState('');
  const [catalogProcessArea, setCatalogProcessArea] = useState('');
  const [isCreatingCatalogObject, setIsCreatingCatalogObject] = useState(false);

  // Project Inventory item dialog states
  const [projectInventoryDialogOpen, setProjectInventoryDialogOpen] = useState(false);
  const [projectInventoryItem, setProjectInventoryItem] = useState({
    dataObjectId: '',
    processArea: '',
    complexity: '',
    deploymentDisposition: '',
    buildType: '',
    objectType: '',
    dra: '',
    developer: '',
    systemsAnalyst: '',
    cutoverPhase: '',
    ddmApproach: '',
    riskSecurityType: '',
    migrationType: '',
    factorType: '',
    loadMethod: '',
  });
  const [isCreatingProjectInventoryItem, setIsCreatingProjectInventoryItem] = useState(false);

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

  const getChildrenCount = (type: 'program' | 'cycle' | 'project', itemId: string): number => {
    if (type === 'program') {
      return mockCycles[itemId]?.length ?? 0;
    } else if (type === 'cycle') {
      return projectsByMockCycle[itemId]?.length ?? 0;
    }
    return 0;
  };

  const getTotalDescendants = (type: 'program' | 'cycle' | 'project', itemId: string): { cycles: number; projects: number } => {
    let cycles = 0;
    let projects = 0;
    
    if (type === 'program') {
      const cycleList = mockCycles[itemId] ?? [];
      cycles = cycleList.length;
      cycleList.forEach(cycle => {
        projects += projectsByMockCycle[cycle.id]?.length ?? 0;
      });
    } else if (type === 'cycle') {
      projects = projectsByMockCycle[itemId]?.length ?? 0;
    }
    
    return { cycles, projects };
  };

  const openDeleteDialog = (type: 'program' | 'cycle' | 'project', itemId: string, itemName: string) => {
    const childrenCount = getChildrenCount(type, itemId);
    const descendants = getTotalDescendants(type, itemId);
    
    setDeleteItemType(type);
    setDeleteItemId(itemId);
    setDeleteItemName(itemName);
    setDeleteChildrenCount(childrenCount);
    setDeleteDialogOpen(true);
    setMenuAnchorEl(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItemId || !deleteItemType) return;

    try {
      setIsDeleting(true);
      if (deleteItemType === 'program') {
        await apiClient.delete(`/api/programs/${deleteItemId}`);
      } else if (deleteItemType === 'cycle') {
        await apiClient.delete(`/api/mock-cycles/${deleteItemId}`);
      } else if (deleteItemType === 'project') {
        await apiClient.delete(`/api/projects/${deleteItemId}`);
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['mockCycles'] });
      queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] });
      
      // Clear selection if we deleted the selected item
      if (selectedItem?.id === deleteItemId) {
        setSelectedItem(null);
      }
      
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (type: 'program' | 'cycle' | 'project', itemId: string) => {
    setEditItemType(type);
    setEditItemId(itemId);
    setMenuAnchorEl(null);

    // Pre-fill form with current data
    if (type === 'program') {
      const program = programs.find(p => p.id === itemId);
      if (program) {
        setEditItemName(program.name);
        setEditItemDesc(program.description || '');
        setEditStartDate('');
        setEditEndDate('');
        setEditAccentColor('');
      }
    } else if (type === 'cycle') {
      for (const progId in mockCycles) {
        const cycle = mockCycles[progId]?.find(c => c.id === itemId);
        if (cycle) {
          setEditItemName(cycle.name);
          setEditItemDesc('');
          setEditStartDate(cycle.startDate);
          setEditEndDate(cycle.endDate);
          setEditAccentColor('');
          break;
        }
      }
    } else if (type === 'project') {
      for (const cycleId in projectsByMockCycle) {
        const project = projectsByMockCycle[cycleId]?.find(p => p.id === itemId);
        if (project) {
          setEditItemName(project.name);
          setEditItemDesc('');
          setEditStartDate(project.startDate || '');
          setEditEndDate(project.endDate || '');
          setEditAccentColor(project.accentColor || '');
          setEditProgressPercentage(project.progressPercentage || 0);
          break;
        }
      }
    }

    setEditDialogOpen(true);
  };

  const handleEditConfirm = async () => {
    if (!editItemId || !editItemType) return;

    try {
      setIsEditing(true);
      if (editItemType === 'program') {
        await apiClient.patch(`/api/programs/${editItemId}`, {
          name: editItemName,
          description: editItemDesc,
        });
      } else if (editItemType === 'cycle') {
        await apiClient.patch(`/api/mock-cycles/${editItemId}`, {
          name: editItemName,
          startDate: editStartDate,
          endDate: editEndDate,
        });
      } else if (editItemType === 'project') {
        await apiClient.patch(`/api/projects/${editItemId}`, {
          name: editItemName,
          startDate: editStartDate,
          endDate: editEndDate,
          accentColor: editAccentColor,
          progressPercentage: editProgressPercentage,
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['mockCycles'] });
      queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] });

      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setIsEditing(false);
    }
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
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        {/* Title and Stats Row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedItem?.type === 'project' ? (
              // Project-specific header
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <FolderOutlinedIcon sx={{ fontSize: '2rem', color: (selectedDetails as Project).accentColor || '#90caf9', flexShrink: 0 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {selectedDetails?.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Project
                  </Typography>
                </Box>
              </Box>
            ) : (
              // Default Migration Plan header
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <StorageIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Migration Plan
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', gap: 3, ml: 3 }}>
              {selectedItem?.type === 'project' ? (
                // Task progress breakdown for project
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Tasks in Plan:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      0
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Tasks in Inventory:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      0
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Progress:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {(selectedDetails as Project).progressPercentage || 0}%
                    </Typography>
                  </Box>
                </>
              ) : (
                // Default stats
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Programs:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {programs.length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Cycles:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {Object.values(mockCycles).flat().length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Objects:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      46
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      0%
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<GroupIcon />}
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              People
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              Export CSV
            </Button>
          </Box>
        </Box>
        
        {/* Tabs */}
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Plan" icon={<Box sx={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #5B67CA 0%, #3B4DB3 100%)', borderRadius: '2px' }} />} iconPosition="start" />
          <Tab label="Inventory" />
        </Tabs>
        <Divider sx={{ mt: 2, mb: 2 }} />
      </Box>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', height: 'calc(100vh - 320px)', gap: 2, mx: -3, px: 3 }}>
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
                        sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <CorporateFareIcon sx={{ fontSize: '1.4rem', color: 'primary.main', flexShrink: 0 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, noWrap: true, letterSpacing: 0.3 }}>
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
                                sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}
                              >
                                <SyncIcon sx={{ fontSize: '1.1rem', color: 'info.main', flexShrink: 0 }} />
                                <Typography variant="body2" sx={{ fontWeight: 500, noWrap: true }}>
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
                                      sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}
                                    >
                                      <FolderOutlinedIcon sx={{ fontSize: '1.1rem', color: project.accentColor || '#90caf9', flexShrink: 0 }} />
                                      <Typography variant="caption" sx={{ noWrap: true, fontWeight: 500, flex: 1 }}>
                                        {project.name}
                                      </Typography>
                                      <Typography variant="caption" sx={{ noWrap: true, color: 'text.secondary', fontWeight: 500 }}>
                                        {project.progressPercentage || 0}%
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
          {/* Plan Tab Content */}
          {tabValue === 0 && (
            <>
              {!selectedItem ? (
                <Alert severity="info">Select an item from the list to view details</Alert>
              ) : selectedDetails ? (
                <Card>
                  <CardHeader
                    avatar={
                      selectedItem.type === 'project' ? (
                        <FolderOutlinedIcon sx={{ color: (selectedDetails as Project).accentColor || '#90caf9', fontSize: '2rem' }} />
                      ) : undefined
                    }
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
                      <>
                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                          <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setDataObjectDialogOpen(true)}
                            sx={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              textTransform: 'none',
                              fontWeight: 600,
                            }}
                          >
                            Add Data Object
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => setTaskGroupDialogOpen(true)}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 600,
                            }}
                          >
                            Add Task Group
                          </Button>
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}

          {/* Inventory Tab Content - Always Shows */}
          {tabValue === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
              {/* Inventory Sub-Tabs */}
              <Box sx={{ display: 'flex', gap: 1, overflow: 'visible' }}>
                <Button
                  variant={inventorySubTab === 0 ? 'contained' : 'outlined'}
                  onClick={() => setInventorySubTab(0)}
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 600,
                    borderRadius: '8px',
                    '&:hover': {
                      backgroundColor: inventorySubTab === 0 ? undefined : 'action.hover',
                      borderColor: 'transparent',
                    }
                  }}
                >
                  Object Catalog
                </Button>
                <Button
                  variant={inventorySubTab === 1 ? 'contained' : 'outlined'}
                  onClick={() => setInventorySubTab(1)}
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 600,
                    borderRadius: '8px',
                    '&:hover': {
                      backgroundColor: inventorySubTab === 1 ? undefined : 'action.hover',
                      borderColor: 'transparent',
                    }
                  }}
                >
                  Project Inventory
                </Button>
              </Box>

              {/* Object Catalog Sub-Tab */}
              {inventorySubTab === 0 && (
                <Card sx={{ backgroundColor: 'background.paper' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6">
                        Object Catalog
                      </Typography>
                      <Button
                        variant="contained"
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                        startIcon={<AddIcon />}
                        onClick={() => setCatalogObjectDialogOpen(true)}
                      >
                        Add Object
                      </Button>
                    </Box>
                    
                    {/* Search Bar */}
                    <TextField
                      fullWidth
                      placeholder="Search catalog..."
                      size="small"
                      value={inventorySearchTerm}
                      onChange={(e) => setInventorySearchTerm(e.target.value)}
                      sx={{ mb: 2 }}
                    />

                    {/* Catalog Table */}
                    <Box sx={{ overflowX: 'auto' }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 0, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                        {/* Header */}
                        <Box sx={{ backgroundColor: 'background.paper', p: 1.5, fontWeight: 600, borderBottom: '1px solid', borderColor: 'divider' }}>
                          OBJECT ID
                        </Box>
                        <Box sx={{ backgroundColor: 'background.paper', p: 1.5, fontWeight: 600, borderBottom: '1px solid', borderColor: 'divider' }}>
                          DESCRIPTION
                        </Box>

                        {/* Catalog Data Rows */}
                        {inventoryObjects.length === 0 ? (
                          <Box sx={{ gridColumn: '1 / -1', p: 2, textAlign: 'center', color: 'text.secondary' }}>
                            No objects in catalog yet
                          </Box>
                        ) : (
                          inventoryObjects.map((obj) => (
                            <React.Fragment key={obj.id}>
                              <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                {obj.objectId}
                              </Box>
                              <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                {obj.description}
                              </Box>
                            </React.Fragment>
                          ))
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* Project Inventory Sub-Tab */}
              {inventorySubTab === 1 && (
                <Card sx={{ backgroundColor: 'background.paper' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6">
                        Project Inventory
                      </Typography>
                      <Button
                        variant="contained"
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                        startIcon={<AddIcon />}
                        onClick={() => setProjectInventoryDialogOpen(true)}
                        disabled={!selectedProjectForInventory}
                      >
                        Add to Inventory
                      </Button>
                    </Box>

                    {/* Project Selector Chips */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                        Select a project:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {mockCycles.length === 0 ? (
                          <Typography variant="caption" color="textSecondary">
                            No projects available
                          </Typography>
                        ) : (
                          mockCycles.flatMap((cycle: MockCycle) => {
                            const cycleProjects = projectsByMockCycle[cycle.id] || [];
                            return cycleProjects.map((project: Project) => (
                              <Box
                                key={project.id}
                                component="button"
                                onClick={() => setSelectedProjectForInventory(project.id)}
                                sx={{
                                  px: 2,
                                  py: 1,
                                  borderRadius: '24px',
                                  border: selectedProjectForInventory === project.id ? '2px solid' : '1px solid',
                                  borderColor: selectedProjectForInventory === project.id ? 'primary.main' : 'divider',
                                  backgroundColor: selectedProjectForInventory === project.id ? 'primary.lighter' : 'background.paper',
                                  cursor: 'pointer',
                                  textTransform: 'none',
                                  fontWeight: selectedProjectForInventory === project.id ? 600 : 500,
                                  fontSize: '0.875rem',
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    borderColor: 'primary.main',
                                    backgroundColor: 'primary.lighter',
                                  },
                                }}
                              >
                                {project.name}
                              </Box>
                            ));
                          })
                        )}
                      </Box>
                    </Box>
                    
                    {/* Search Bar */}
                    <TextField
                      fullWidth
                      placeholder="Search inventory..."
                      size="small"
                      value={inventorySearchTerm}
                      onChange={(e) => setInventorySearchTerm(e.target.value)}
                      sx={{ mb: 2 }}
                    />

                    {/* Inventory Table */}
                    <Box sx={{ overflowX: 'auto' }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '150px 150px 120px 150px', gap: 0, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                        {/* Header */}
                        <Box sx={{ backgroundColor: 'background.paper', p: 1.5, fontWeight: 600, borderBottom: '1px solid', borderColor: 'divider' }}>
                          DATA OBJECT ID
                        </Box>
                        <Box sx={{ backgroundColor: 'background.paper', p: 1.5, fontWeight: 600, borderBottom: '1px solid', borderColor: 'divider' }}>
                          PROCESS AREA
                        </Box>
                        <Box sx={{ backgroundColor: 'background.paper', p: 1.5, fontWeight: 600, borderBottom: '1px solid', borderColor: 'divider' }}>
                          COMPLEXITY
                        </Box>
                        <Box sx={{ backgroundColor: 'background.paper', p: 1.5, fontWeight: 600, borderBottom: '1px solid', borderColor: 'divider' }}>
                          DEPLOYMENT DISPOSITION
                        </Box>

                        {/* Inventory Data Rows */}
                        {projectInventoryItems.length === 0 ? (
                          <Box sx={{ gridColumn: '1 / -1', p: 2, textAlign: 'center', color: 'text.secondary' }}>
                            No items in project inventory yet
                          </Box>
                        ) : (
                          projectInventoryItems.map((item) => (
                            <React.Fragment key={item.id}>
                              <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                {item.dataObjectId}
                              </Box>
                              <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                {item.processArea || '—'}
                              </Box>
                              <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                {item.complexity || '—'}
                              </Box>
                              <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                                {item.deploymentDisposition || '—'}
                              </Box>
                            </React.Fragment>
                          ))
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
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
            if (!menuItemId || !menuType) return;
            openEditDialog(menuType, menuItemId);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!menuItemId || !menuType) return;
            
            // Get the item name for the dialog
            let itemName = '';
            if (menuType === 'program') {
              itemName = programs.find(p => p.id === menuItemId)?.name || '';
            } else if (menuType === 'cycle') {
              for (const progId in mockCycles) {
                const cycle = mockCycles[progId]?.find(c => c.id === menuItemId);
                if (cycle) {
                  itemName = cycle.name;
                  break;
                }
              }
            } else if (menuType === 'project') {
              for (const cycleId in projectsByMockCycle) {
                const project = projectsByMockCycle[cycleId]?.find(p => p.id === menuItemId);
                if (project) {
                  itemName = project.name;
                  break;
                }
              }
            }
            
            openDeleteDialog(menuType, menuItemId, itemName);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
          Delete {deleteItemType}?
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete <strong>{deleteItemName}</strong>?
          </Typography>
          
          {deleteChildrenCount > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Warning: This action will cascade delete all child items:</strong>
              </Typography>
              {deleteItemType === 'program' && (
                <Typography variant="body2">
                  • All {deleteChildrenCount} Mock Cycle(s) and their projects will be permanently deleted
                </Typography>
              )}
              {deleteItemType === 'cycle' && (
                <Typography variant="body2">
                  • All {deleteChildrenCount} Project(s) will be permanently deleted
                </Typography>
              )}
            </Alert>
          )}
          
          <Typography variant="body2" color="textSecondary">
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit {editItemType}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Name"
            value={editItemName}
            onChange={(e) => setEditItemName(e.target.value)}
            fullWidth
          />
          
          {editItemType === 'program' && (
            <TextField
              label="Description"
              value={editItemDesc}
              onChange={(e) => setEditItemDesc(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
          )}

          {editItemType === 'cycle' && (
            <>
              <TextField
                label="Start Date"
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End Date"
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </>
          )}

          {editItemType === 'project' && (
            <>
              <TextField
                label="Start Date"
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End Date"
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  label="Accent Color"
                  type="color"
                  value={editAccentColor}
                  onChange={(e) => setEditAccentColor(e.target.value)}
                  sx={{ width: '100px' }}
                />
                {editAccentColor && (
                  <Box
                    sx={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: editAccentColor,
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                    }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ minWidth: '100px' }}>
                  Progress: {editProgressPercentage}%
                </Typography>
                <Slider
                  value={editProgressPercentage}
                  onChange={(e, newValue) => setEditProgressPercentage(newValue as number)}
                  min={0}
                  max={100}
                  step={1}
                  sx={{ flex: 1 }}
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isEditing}>
            Cancel
          </Button>
          <Button
            onClick={handleEditConfirm}
            variant="contained"
            color="primary"
            disabled={isEditing}
          >
            {isEditing ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Data Object Dialog */}
      <Dialog open={dataObjectDialogOpen} onClose={() => setDataObjectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Data Object</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Object ID"
            value={newDataObjectId}
            onChange={(e) => setNewDataObjectId(e.target.value)}
            margin="normal"
            placeholder="e.g., H2R.CNV.068"
          />
          <TextField
            fullWidth
            label="Object Name"
            value={newDataObjectName}
            onChange={(e) => setNewDataObjectName(e.target.value)}
            margin="normal"
            placeholder="e.g., EC (Employee): Position"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDataObjectDialogOpen(false);
            setNewDataObjectId('');
            setNewDataObjectName('');
          }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              // TODO: Implement API call to create data object
              setDataObjectDialogOpen(false);
              setNewDataObjectId('');
              setNewDataObjectName('');
            }}
            variant="contained"
            disabled={isCreatingDataObject || !newDataObjectId.trim() || !newDataObjectName.trim()}
          >
            {isCreatingDataObject ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Group Dialog */}
      <Dialog open={taskGroupDialogOpen} onClose={() => setTaskGroupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Task Group</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Task Group Name"
            value={newTaskGroupName}
            onChange={(e) => setNewTaskGroupName(e.target.value)}
            margin="normal"
            placeholder="e.g., Data Validation Tasks"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTaskGroupDialogOpen(false);
            setNewTaskGroupName('');
          }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              // TODO: Implement API call to create task group
              setTaskGroupDialogOpen(false);
              setNewTaskGroupName('');
            }}
            variant="contained"
            disabled={isCreatingTaskGroup || !newTaskGroupName.trim()}
          >
            {isCreatingTaskGroup ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Catalog Object Dialog */}
      <Dialog open={catalogObjectDialogOpen} onClose={() => setCatalogObjectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Object to Catalog</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Object ID"
            value={catalogObjectId}
            onChange={(e) => setCatalogObjectId(e.target.value)}
            margin="normal"
            placeholder="e.g., H2R.CNV.068"
          />
          <TextField
            fullWidth
            label="Description"
            value={catalogObjectDesc}
            onChange={(e) => setCatalogObjectDesc(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            placeholder="Enter detailed object description"
          />
          <TextField
            fullWidth
            label="Process Area"
            value={catalogProcessArea}
            onChange={(e) => setCatalogProcessArea(e.target.value)}
            margin="normal"
            placeholder="e.g., H2R, Finance, HR"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCatalogObjectDialogOpen(false);
            setCatalogObjectId('');
            setCatalogObjectDesc('');
            setCatalogProcessArea('');
          }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              // TODO: Implement API call to create catalog object
              const newObject = {
                id: Math.random().toString(36).substr(2, 9),
                objectId: catalogObjectId,
                description: catalogObjectDesc,
                processArea: catalogProcessArea,
              };
              setInventoryObjects([...inventoryObjects, newObject]);
              setCatalogObjectDialogOpen(false);
              setCatalogObjectId('');
              setCatalogObjectDesc('');
              setCatalogProcessArea('');
            }}
            variant="contained"
            disabled={isCreatingCatalogObject || !catalogObjectId.trim() || !catalogObjectDesc.trim()}
          >
            {isCreatingCatalogObject ? 'Adding...' : 'Add Object'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Inventory Item Dialog */}
      <Dialog open={projectInventoryDialogOpen} onClose={() => setProjectInventoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Project Inventory Item</DialogTitle>
        <DialogContent sx={{ pt: 2, maxHeight: '60vh', overflowY: 'auto' }}>
          <TextField
            select
            fullWidth
            label="Data Object ID"
            value={projectInventoryItem.dataObjectId}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, dataObjectId: e.target.value })}
            margin="normal"
          >
            {inventoryObjects.map((obj) => (
              <Box key={obj.id} component="option" value={obj.objectId}>
                {obj.objectId}
              </Box>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Process Area"
            value={projectInventoryItem.processArea}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, processArea: e.target.value })}
            margin="normal"
          >
            {processAreaOptions.map((option) => (
              <Box key={option} component="option" value={option}>
                {option}
              </Box>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Complexity"
            value={projectInventoryItem.complexity}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, complexity: e.target.value })}
            margin="normal"
          >
            {complexityOptions.map((option) => (
              <Box key={option} component="option" value={option}>
                {option}
              </Box>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Deployment Disposition"
            value={projectInventoryItem.deploymentDisposition}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, deploymentDisposition: e.target.value })}
            margin="normal"
          >
            {deploymentDispositionOptions.map((option) => (
              <Box key={option} component="option" value={option}>
                {option}
              </Box>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Build Type"
            value={projectInventoryItem.buildType}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, buildType: e.target.value })}
            margin="normal"
          >
            {buildTypeOptions.map((option) => (
              <Box key={option} component="option" value={option}>
                {option}
              </Box>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Object Type"
            value={projectInventoryItem.objectType}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, objectType: e.target.value })}
            margin="normal"
          >
            {objectTypeOptions.map((option) => (
              <Box key={option} component="option" value={option}>
                {option}
              </Box>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="DRA (Person)"
            value={projectInventoryItem.dra}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, dra: e.target.value })}
            margin="normal"
            placeholder="Enter person name"
          />

          <TextField
            fullWidth
            label="Developer (Person)"
            value={projectInventoryItem.developer}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, developer: e.target.value })}
            margin="normal"
            placeholder="Enter person name"
          />

          <TextField
            fullWidth
            label="Systems Analyst (Person)"
            value={projectInventoryItem.systemsAnalyst}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, systemsAnalyst: e.target.value })}
            margin="normal"
            placeholder="Enter person name"
          />

          <TextField
            select
            fullWidth
            label="Cutover Phase"
            value={projectInventoryItem.cutoverPhase}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, cutoverPhase: e.target.value })}
            margin="normal"
          >
            {cutoverPhaseOptions.map((option) => (
              <Box key={option} component="option" value={option}>
                {option}
              </Box>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="DDM Approach"
            value={projectInventoryItem.ddmApproach}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, ddmApproach: e.target.value })}
            margin="normal"
          >
            {ddmApproachOptions.map((option) => (
              <Box key={option} component="option" value={option}>
                {option}
              </Box>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Risk/Security Type"
            value={projectInventoryItem.riskSecurityType}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, riskSecurityType: e.target.value })}
            margin="normal"
          >
            {riskSecurityTypeOptions.map((option) => (
              <Box key={option} component="option" value={option}>
                {option}
              </Box>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Migration Type"
            value={projectInventoryItem.migrationType}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, migrationType: e.target.value })}
            margin="normal"
          >
            {migrationTypeOptions.map((option) => (
              <Box key={option} component="option" value={option}>
                {option}
              </Box>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Factor Type"
            value={projectInventoryItem.factorType}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, factorType: e.target.value })}
            margin="normal"
          >
            {factorTypeOptions.map((option) => (
              <Box key={option} component="option" value={option}>
                {option}
              </Box>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Load Method"
            value={projectInventoryItem.loadMethod}
            onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, loadMethod: e.target.value })}
            margin="normal"
          >
            {loadMethodOptions.map((option) => (
              <Box key={option} component="option" value={option}>
                {option}
              </Box>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setProjectInventoryDialogOpen(false);
            setProjectInventoryItem({
              dataObjectId: '',
              processArea: '',
              complexity: '',
              deploymentDisposition: '',
              buildType: '',
              objectType: '',
              dra: '',
              developer: '',
              systemsAnalyst: '',
              cutoverPhase: '',
              ddmApproach: '',
              riskSecurityType: '',
              migrationType: '',
              factorType: '',
              loadMethod: '',
            });
          }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              // TODO: Implement API call to create project inventory item
              const newItem = {
                id: Math.random().toString(36).substr(2, 9),
                ...projectInventoryItem,
              };
              setProjectInventoryItems([...projectInventoryItems, newItem]);
              setProjectInventoryDialogOpen(false);
              setProjectInventoryItem({
                dataObjectId: '',
                processArea: '',
                complexity: '',
                deploymentDisposition: '',
                buildType: '',
                objectType: '',
                dra: '',
                developer: '',
                systemsAnalyst: '',
                cutoverPhase: '',
                ddmApproach: '',
                riskSecurityType: '',
                migrationType: '',
                factorType: '',
                loadMethod: '',
              });
            }}
            variant="contained"
            disabled={isCreatingProjectInventoryItem || !projectInventoryItem.dataObjectId.trim()}
          >
            {isCreatingProjectInventoryItem ? 'Adding...' : 'Add Item'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default ProjectsPage;
