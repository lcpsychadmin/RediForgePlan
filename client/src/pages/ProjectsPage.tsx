// client/src/pages/ProjectsPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
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
  Breadcrumbs,
  Link,
  Badge,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { TaskCommentsModal } from '../components/TaskCommentsModal';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';
import EventIcon from '@mui/icons-material/Event';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Menu from '@mui/material/Menu';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
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
  const [menuType, setMenuType] = useState<'program' | 'cycle' | 'project' | 'task' | 'taskGroup' | null>(null);
  const [menuItemId, setMenuItemId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskGroupId, setEditingTaskGroupId] = useState<string | null>(null);
  
  // Delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemType, setDeleteItemType] = useState<'program' | 'cycle' | 'project' | 'task' | 'taskGroup' | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteItemName, setDeleteItemName] = useState('');
  const [deleteChildrenCount, setDeleteChildrenCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItemType, setEditItemType] = useState<'program' | 'cycle' | 'project' | 'task' | 'taskGroup' | null>(null);
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
  const [planSearchTerm, setPlanSearchTerm] = useState('');
  const [planStatusFilter, setPlanStatusFilter] = useState('');
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [catalogSortColumn, setCatalogSortColumn] = useState<'objectId' | 'description'>('objectId');
  const [catalogSortDirection, setCatalogSortDirection] = useState<'asc' | 'desc'>('asc');
  const [inventorySortColumn, setInventorySortColumn] = useState<'dataObjectId' | 'processArea' | 'complexity' | 'deploymentDisposition'>('dataObjectId');
  const [inventorySortDirection, setInventorySortDirection] = useState<'asc' | 'desc'>('asc');
  const [scheduleWeekStart, setScheduleWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun ... 6=Sat
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [schedulePhaseFilter, setSchedulePhaseFilter] = useState<string>('all');
  const [cycleScheduleItems, setCycleScheduleItems] = useState<any[]>([]);
  const [isLoadingCycleSchedule, setIsLoadingCycleSchedule] = useState(false);
  const [editingInventoryItemId, setEditingInventoryItemId] = useState<string | null>(null);
  const [deletingInventoryItemId, setDeletingInventoryItemId] = useState<string | null>(null);
  const [deletingInventoryItemName, setDeletingInventoryItemName] = useState('');
  const [isDeletingInventoryItem, setIsDeletingInventoryItem] = useState(false);
  const [selectedProjectForInventory, setSelectedProjectForInventory] = useState<string | null>(null);
  const [catalogObjectDialogOpen, setCatalogObjectDialogOpen] = useState(false);
  const [catalogObjectId, setCatalogObjectId] = useState('');
  const [catalogObjectDesc, setCatalogObjectDesc] = useState('');
  const [catalogProcessArea, setCatalogProcessArea] = useState('');
  const [isCreatingCatalogObject, setIsCreatingCatalogObject] = useState(false);
  const [editingCatalogObjectId, setEditingCatalogObjectId] = useState<string | null>(null);
  const [deletingCatalogObjectId, setDeletingCatalogObjectId] = useState<string | null>(null);
  const [deletingCatalogObjectName, setDeletingCatalogObjectName] = useState('');
  const [isDeletingCatalogObject, setIsDeletingCatalogObject] = useState(false);

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

  // Plan tab states
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [projectTaskGroups, setProjectTaskGroups] = useState<any[]>([]);
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
  const [expandedTaskGroups, setExpandedTaskGroups] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [depDialogTaskId, setDepDialogTaskId] = useState<string | null>(null);
  const [cycleTasksForDep, setCycleTasksForDep] = useState<any[]>([]);
  const [taskDeps, setTaskDeps] = useState<Record<string, any[]>>({});
  const [defaultTaskOrder, setDefaultTaskOrder] = useState<string[]>([]);

  // Comment modal state
  const [commentModalTask, setCommentModalTask] = useState<{ id: string; name: string } | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [taskCommentCounts, setTaskCommentCounts] = useState<Record<string, number>>({});
  const [planRowOrder, setPlanRowOrder] = useState<string[]>([]);
  const [dragItem, setDragItem] = useState<{ type: 'planRow'; key: string } | null>(null);
  const [treeDragItem, setTreeDragItem] = useState<
    | { type: 'program'; id: string }
    | { type: 'cycle'; id: string; programId: string }
    | { type: 'project'; id: string; cycleId: string }
    | null
  >(null);
  const [treeOrder, setTreeOrder] = useState<{ programs: string[]; cycles: Record<string, string[]>; projects: Record<string, string[]> }>({
    programs: [],
    cycles: {},
    projects: {},
  });

  // People sidebar state
  const [peopleSidebarOpen, setPeopleSidebarOpen] = useState(false);
  const [people, setPeople] = useState<any[]>([]);
  const [peopleRoles, setPeopleRoles] = useState<string[]>([]);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editPersonRole, setEditPersonRole] = useState('');
  const [editPersonEmail, setEditPersonEmail] = useState('');

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

  // Fetch global objects for inventory dropdown
  useQuery({
    queryKey: ['globalObjects'],
    queryFn: async () => {
      const response = await apiClient.get('/api/global-objects');
      const objects = response.data.data || [];
      setInventoryObjects(objects.map((obj: any) => ({
        id: obj.id,
        objectId: obj.objectId,
        description: obj.description || '',
        processArea: obj.processArea || '',
      })));
      return objects;
    },
  });

  // Fetch default task template order
  useEffect(() => {
    apiClient.get('/api/tasks/templates/defaults').then(res => {
      const names = (res.data.data || []).map((t: any) => t.name as string);
      setDefaultTaskOrder(names);
    }).catch(() => {});
  }, []);

  // Fetch people directory
  useEffect(() => {
    apiClient.get('/api/people').then(res => {
      setPeople(res.data.data || []);
    }).catch(() => {});
    apiClient.get('/api/people/roles').then(res => {
      setPeopleRoles((res.data.data || []).map((r: any) => r.name));
    }).catch(() => {});
  }, []);

  // Get the active project ID from either inventory tab or plan tab selection
  const activeProjectId = selectedItem?.type === 'project' ? selectedItem.id : selectedProjectForInventory;
  const activeCycleId = selectedItem?.type === 'project'
    ? selectedItem.cycleId
    : selectedItem?.type === 'cycle'
      ? selectedItem.id
      : null;

  const scheduleWeekDates = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(scheduleWeekStart);
    d.setDate(scheduleWeekStart.getDate() + idx);
    return d;
  });

  const getProjectAccentColor = (project: Project, index: number) => {
    if (project.accentColor) return project.accentColor;
    const fallback = ['#5B67CA', '#00BFA5', '#FF5B8A', '#26C6DA', '#F59E0B', '#8B5CF6'];
    return fallback[index % fallback.length];
  };

  const toRgba = (hex: string, alpha: number) => {
    const value = (hex || '').trim();
    const fullHex = /^#?[0-9a-fA-F]{6}$/.test(value)
      ? value.replace('#', '')
      : /^#?[0-9a-fA-F]{3}$/.test(value)
        ? value.replace('#', '').split('').map(ch => ch + ch).join('')
        : '5B67CA';
    const r = parseInt(fullHex.slice(0, 2), 16);
    const g = parseInt(fullHex.slice(2, 4), 16);
    const b = parseInt(fullHex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const normalizeDateOnly = (value?: string) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const isSameDay = (a: Date, b: Date) => (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );

  const mergeOrder = (existing: string[], current: string[]) => {
    const existingFiltered = existing.filter(id => current.includes(id));
    const newItems = current.filter(id => !existingFiltered.includes(id));
    return [...existingFiltered, ...newItems];
  };

  const moveWithin = (list: string[], id: string, delta: number) => {
    const idx = list.indexOf(id);
    if (idx === -1) return list;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= list.length) return list;
    const copy = [...list];
    const [item] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, item);
    return copy;
  };

  const reorderByDrop = (list: string[], dragId: string, targetId: string) => {
    const from = list.indexOf(dragId);
    const to = list.indexOf(targetId);
    if (from === -1 || to === -1 || from === to) return list;
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  };

  const getOrderStorageKey = (projectId: string) => `rf-plan-order:${projectId}`;
  const getTreeOrderStorageKey = () => 'rf-tree-order';
  const objectRowKey = (id: string) => `obj:${id}`;
  const taskGroupRowKey = (id: string) => `grp:${id}`;

  const getOrderedPrograms = () => {
    const ids = mergeOrder(treeOrder.programs, programs.map((p: Program) => p.id));
    return ids.map(id => programs.find((p: Program) => p.id === id)).filter(Boolean) as Program[];
  };

  const getOrderedCycles = (programId: string) => {
    const source = mockCycles[programId] || [];
    const existing = treeOrder.cycles[programId] || [];
    const ids = mergeOrder(existing, source.map((c: MockCycle) => c.id));
    return ids.map(id => source.find((c: MockCycle) => c.id === id)).filter(Boolean) as MockCycle[];
  };

  const getOrderedProjects = (cycleId: string) => {
    const source = projectsByMockCycle[cycleId] || [];
    const existing = treeOrder.projects[cycleId] || [];
    const ids = mergeOrder(existing, source.map((p: Project) => p.id));
    return ids.map(id => source.find((p: Project) => p.id === id)).filter(Boolean) as Project[];
  };

  // Load schedule rows for all projects in the selected cycle.
  useEffect(() => {
    const loadCycleSchedule = async () => {
      if (tabValue !== 3 || !activeCycleId) {
        setCycleScheduleItems([]);
        return;
      }

      const cycleProjects = projectsByMockCycle[activeCycleId] || [];
      if (cycleProjects.length === 0) {
        setCycleScheduleItems([]);
        return;
      }

      setIsLoadingCycleSchedule(true);
      try {
        const all = await Promise.all(
          cycleProjects.map(async (project: Project, index: number) => {
            try {
              const [objectsResponse, tasksResponse] = await Promise.all([
                apiClient.get(`/api/project-objects/project/${project.id}`),
                apiClient.get(`/api/tasks/project/${project.id}`),
              ]);

              const items = objectsResponse.data?.data || [];
              const tasks = tasksResponse.data?.data || [];

              // Map each project object to its scheduled Load task date.
              const loadDateByObjectId: Record<string, string> = {};
              tasks.forEach((task: any) => {
                const objectId = task.projectObjectId;
                if (!objectId) return;

                const isLoadTask =
                  (task.taskType || '').toLowerCase() === 'load' ||
                  (task.name || '').trim().toLowerCase() === 'load';

                if (!isLoadTask) return;

                const candidate = task.startDate || task.endDate;
                if (!candidate) return;

                const existing = loadDateByObjectId[objectId];
                if (!existing || new Date(candidate).getTime() < new Date(existing).getTime()) {
                  loadDateByObjectId[objectId] = candidate;
                }
              });

              const projectColor = getProjectAccentColor(project, index);
              return items.map((item: any) => ({
                ...item,
                projectName: project.name,
                projectColor,
                projectId: project.id,
                loadScheduledDate: loadDateByObjectId[item.id] || null,
              }));
            } catch {
              return [];
            }
          })
        );

        setCycleScheduleItems(all.flat());
      } finally {
        setIsLoadingCycleSchedule(false);
      }
    };

    loadCycleSchedule();
  }, [tabValue, activeCycleId, projectsByMockCycle]);

  // Load persisted ordering when project changes.
  useEffect(() => {
    if (!activeProjectId) {
      setPlanRowOrder([]);
      return;
    }
    try {
      const raw = localStorage.getItem(getOrderStorageKey(activeProjectId));
      if (!raw) {
        setPlanRowOrder([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.rows)) {
        setPlanRowOrder(parsed.rows);
      } else {
        const objects = Array.isArray(parsed?.objects) ? parsed.objects : [];
        const groups = Array.isArray(parsed?.groups) ? parsed.groups : [];
        setPlanRowOrder([
          ...objects.map((id: string) => objectRowKey(id)),
          ...groups.map((id: string) => taskGroupRowKey(id)),
        ]);
      }
    } catch {
      setPlanRowOrder([]);
    }
  }, [activeProjectId]);

  // Keep ordering synced with available ids.
  useEffect(() => {
    if (!activeProjectId) return;
    const objectIds = Array.from(new Set(projectTasks.filter(t => t.projectObjectId).map(t => t.projectObjectId)));
    const groupIds = projectTaskGroups.map(g => g.id);
    const currentKeys = [
      ...objectIds.map((id: string) => objectRowKey(id)),
      ...groupIds.map((id: string) => taskGroupRowKey(id)),
    ];
    setPlanRowOrder(prev => mergeOrder(prev, currentKeys));
  }, [activeProjectId, projectTasks, projectTaskGroups]);

  // Load persisted tree ordering.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(getTreeOrderStorageKey());
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setTreeOrder({
        programs: Array.isArray(parsed?.programs) ? parsed.programs : [],
        cycles: typeof parsed?.cycles === 'object' && parsed?.cycles ? parsed.cycles : {},
        projects: typeof parsed?.projects === 'object' && parsed?.projects ? parsed.projects : {},
      });
    } catch {
      // ignore local parse failures
    }
  }, []);

  // Sync tree ordering when data changes.
  useEffect(() => {
    setTreeOrder(prev => {
      const nextPrograms = mergeOrder(prev.programs, programs.map((p: Program) => p.id));
      const nextCycles: Record<string, string[]> = { ...prev.cycles };
      for (const programId in mockCycles) {
        const cycles = mockCycles[programId] || [];
        nextCycles[programId] = mergeOrder(prev.cycles[programId] || [], cycles.map((c: MockCycle) => c.id));
      }
      const nextProjects: Record<string, string[]> = { ...prev.projects };
      for (const cycleId in projectsByMockCycle) {
        const projects = projectsByMockCycle[cycleId] || [];
        nextProjects[cycleId] = mergeOrder(prev.projects[cycleId] || [], projects.map((p: Project) => p.id));
      }
      return { programs: nextPrograms, cycles: nextCycles, projects: nextProjects };
    });
  }, [programs, mockCycles, projectsByMockCycle]);

  // Persist tree ordering.
  useEffect(() => {
    localStorage.setItem(getTreeOrderStorageKey(), JSON.stringify(treeOrder));
  }, [treeOrder]);

  // Persist ordering.
  useEffect(() => {
    if (!activeProjectId) return;
    const objectIds = planRowOrder.filter((k: string) => k.startsWith('obj:')).map((k: string) => k.slice(4));
    const groupIds = planRowOrder.filter((k: string) => k.startsWith('grp:')).map((k: string) => k.slice(4));
    localStorage.setItem(getOrderStorageKey(activeProjectId), JSON.stringify({
      rows: planRowOrder,
      objects: objectIds,
      groups: groupIds,
    }));
  }, [activeProjectId, planRowOrder]);

  // Fetch project inventory items when a project is selected
  useEffect(() => {
    const loadProjectInventory = async () => {
      if (!activeProjectId) {
        setProjectInventoryItems([]);
        return;
      }

      try {
        const response = await apiClient.get(`/api/project-objects/project/${activeProjectId}`);
        const items = response.data.data || [];
        setProjectInventoryItems(items.map((item: any) => ({
          id: item.id,
          projectId: item.projectId,
          dataObjectId: item.objectId,
          objectId: item.objectId,
          globalObjectId: item.globalObjectId,
          processArea: item.processArea,
          complexity: item.complexity,
          deploymentDisposition: item.deploymentDisposition,
          buildType: item.buildType,
          objectType: item.objectType,
          cutoverPhase: item.cutoverPhase,
          ddmApproach: item.ddmApproach,
          riskSecurityType: item.riskSecurityType,
          migrationType: item.migrationType,
          factorType: item.factorType,
          loadMethod: item.loadMethod,
          startDate: item.startDate,
          endDate: item.endDate,
        })));
      } catch (error) {
        console.error('Failed to load project inventory:', error);
        setProjectInventoryItems([]);
      }
    };

    loadProjectInventory();
  }, [activeProjectId]);

  // Load tasks and task groups when project is selected
  useEffect(() => {
    const loadTasksAndGroups = async () => {
      if (!activeProjectId) {
        setProjectTasks([]);
        setProjectTaskGroups([]);
        setTaskCommentCounts({});
        return;
      }

      try {
        // Load tasks
        const tasksResponse = await apiClient.get(`/api/tasks/project/${activeProjectId}`);
        const tasks = tasksResponse.data.data || [];
        setProjectTasks(tasks);

        // Load task groups
        const groupsResponse = await apiClient.get(`/api/tasks/groups/project/${activeProjectId}`);
        const groups = groupsResponse.data.data || [];
        setProjectTaskGroups(groups);

        // Fetch comment counts for each task
        const commentCounts: Record<string, number> = {};
        for (const task of tasks) {
          try {
            const commentsRes = await apiClient.get(`/api/comments/task/${task.id}`);
            commentCounts[task.id] = (commentsRes.data.data || []).length;
          } catch (e) {
            commentCounts[task.id] = 0;
          }
        }
        setTaskCommentCounts(commentCounts);
      } catch (error) {
        console.error('Failed to load tasks:', error);
        setProjectTasks([]);
        setProjectTaskGroups([]);
      }
    };

    loadTasksAndGroups();
  }, [activeProjectId]);

  // Hydrate notification navigation target from URL query params.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openTask = params.get('openTask');
    if (!openTask) return;

    const projectId = params.get('projectId');
    const taskName = params.get('taskName') || 'Task';

    if (projectId) {
      sessionStorage.setItem('pendingNotificationTarget', JSON.stringify({ projectId, taskId: openTask, taskName }));
      return;
    }

    // Fallback if projectId was not passed: fetch task by id to resolve owning project.
    apiClient.get(`/api/tasks/${openTask}`).then((res) => {
      const task = res.data?.data;
      if (task?.projectId) {
        sessionStorage.setItem('pendingNotificationTarget', JSON.stringify({
          projectId: task.projectId,
          taskId: openTask,
          taskName: task.name || taskName,
        }));
      }
    }).catch(() => {});
  }, [location.search]);

  // Ensure Priorities tab has a project context so the panel doesn't appear blank.
  useEffect(() => {
    if (tabValue !== 2 || activeProjectId) return;

    for (const cycleId in projectsByMockCycle) {
      const projects = projectsByMockCycle[cycleId] || [];
      if (projects.length > 0) {
        const firstProject = projects[0];
        setSelectedItem({ type: 'project', id: firstProject.id, cycleId });
        return;
      }
    }
  }, [tabValue, activeProjectId, projectsByMockCycle]);

  // Handle navigation from notification click: select target project.
  useEffect(() => {
    const raw = sessionStorage.getItem('pendingNotificationTarget');
    if (!raw) return;

    let target: { projectId?: string } = {};
    try { target = JSON.parse(raw); } catch { return; }
    if (!target.projectId) return;

    const selectNotificationProject = async () => {
      if (selectedItem?.type === 'project' && selectedItem.id === target.projectId) {
        setTabValue(0);
        return;
      }

      let matchedCycleId: string | null = null;
      for (const [cycleId, projects] of Object.entries(projectsByMockCycle as Record<string, any[]>)) {
        if ((projects || []).some((p: any) => p.id === target.projectId)) {
          matchedCycleId = cycleId;
          break;
        }
      }

      // Fallback: resolve cycle directly from project API if tree maps are not ready yet.
      if (!matchedCycleId) {
        try {
          const res = await apiClient.get(`/api/projects/${target.projectId}`);
          matchedCycleId = res.data?.data?.mockCycleId || null;
        } catch {
          matchedCycleId = null;
        }
      }

      if (!matchedCycleId) return;

      let matchedProgramId: string | null = null;
      for (const [programId, cycles] of Object.entries(mockCycles as Record<string, any[]>)) {
        if ((cycles || []).some((c: any) => c.id === matchedCycleId)) {
          matchedProgramId = programId;
          break;
        }
      }

      if (matchedProgramId) {
        setExpandedPrograms(prev => new Set(prev).add(matchedProgramId as string));
      }
      setExpandedCycles(prev => new Set(prev).add(matchedCycleId as string));
      setSelectedItem({ type: 'project', id: target.projectId, cycleId: matchedCycleId });
      setTabValue(0);
    };

    selectNotificationProject();
  }, [projectsByMockCycle, mockCycles, selectedItem, location.search]);

  // Once tasks load for the selected project, open the discussion modal for the target task.
  useEffect(() => {
    const raw = sessionStorage.getItem('pendingNotificationTarget');
    if (!raw || !activeProjectId) return;

    let target: { projectId?: string; taskId?: string; taskName?: string } = {};
    try { target = JSON.parse(raw); } catch { return; }

    if (!target.projectId || !target.taskId || target.projectId !== activeProjectId) return;

    const task = projectTasks.find((t: any) => t.id === target.taskId);

    setCommentModalTask({ id: target.taskId, name: task?.name || target.taskName || 'Task' });
    sessionStorage.removeItem('pendingNotificationTarget');
  }, [activeProjectId, projectTasks, location.search]);

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

  const openDeleteDialog = (type: 'program' | 'cycle' | 'project' | 'task' | 'taskGroup', itemId: string, itemName: string) => {
    let childrenCount = 0;
    if (type === 'program' || type === 'cycle' || type === 'project') {
      childrenCount = getChildrenCount(type, itemId);
    }
    
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
      } else if (deleteItemType === 'task') {
        // Delete only the tasks for this project object — keeps the object in inventory
        const tasksForObject = projectTasks.filter(t => t.projectObjectId === deleteItemId);
        await Promise.all(tasksForObject.map(t => apiClient.delete(`/api/tasks/${t.id}`)));
        setProjectTasks(prev => prev.filter(t => t.projectObjectId !== deleteItemId));
      } else if ((deleteItemType as any) === 'taskSingle') {
        // Delete a single task row
        await apiClient.delete(`/api/tasks/${deleteItemId}`);
        setProjectTasks(prev => prev.filter(t => t.id !== deleteItemId));
      } else if (deleteItemType === 'taskGroup') {
        await apiClient.delete(`/api/tasks/groups/${deleteItemId}`);
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['mockCycles'] });
      queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] });
      
      // Reload tasks if we deleted a task or task group
      if (activeProjectId && (deleteItemType === 'task' || deleteItemType === 'taskGroup')) {
        const [tasksRes, groupsRes] = await Promise.all([
          apiClient.get(`/api/tasks/project/${activeProjectId}`),
          apiClient.get(`/api/tasks/groups/project/${activeProjectId}`),
        ]);
        setProjectTasks(tasksRes.data.data || []);
        setProjectTaskGroups(groupsRes.data.data || []);
      }
      
      // Clear selection if we deleted the selected item
      if (selectedItem?.id === deleteItemId) {
        setSelectedItem(null);
      }
      
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to delete:', error);
      const msg = error?.response?.data?.message || error?.response?.status || error?.message || 'Unknown error';
      alert(`Failed to delete: ${msg}`);
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

  // Handle edit catalog object
  const handleEditCatalogObject = (obj: any) => {
    setEditingCatalogObjectId(obj.id);
    setCatalogObjectId(obj.objectId);
    setCatalogObjectDesc(obj.description);
    setCatalogProcessArea(obj.processArea || '');
    setCatalogObjectDialogOpen(true);
  };

  // Handle delete catalog object
  const handleDeleteCatalogObject = (obj: any) => {
    setDeletingCatalogObjectId(obj.id);
    setDeletingCatalogObjectName(obj.objectId);
  };

  const handleCatalogProcessAreaChange = async (objectId: string, processArea: string) => {
    try {
      await apiClient.put(`/api/global-objects/${objectId}`, {
        processArea,
      });
      setInventoryObjects(prev => prev.map(obj => obj.id === objectId ? { ...obj, processArea } : obj));
    } catch (error) {
      console.error('Failed to update process area:', error);
      alert('Failed to update process area. Please try again.');
    }
  };

  // Confirm delete catalog object
  const confirmDeleteCatalogObject = async () => {
    if (!deletingCatalogObjectId) return;
    
    try {
      setIsDeletingCatalogObject(true);
      await apiClient.delete(`/api/global-objects/${deletingCatalogObjectId}`);
      setInventoryObjects(inventoryObjects.filter(obj => obj.id !== deletingCatalogObjectId));
      setDeletingCatalogObjectId(null);
      alert('Object deleted successfully');
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete object. Please try again.');
    } finally {
      setIsDeletingCatalogObject(false);
    }
  };

  // Get filtered and sorted catalog objects
  const getFilteredSortedCatalogObjects = () => {
    let filtered = inventoryObjects.filter(obj =>
      obj.objectId.toLowerCase().includes(catalogSearchTerm.toLowerCase()) ||
      obj.description.toLowerCase().includes(catalogSearchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aVal = a[catalogSortColumn]?.toLowerCase() || '';
      const bVal = b[catalogSortColumn]?.toLowerCase() || '';
      return catalogSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return filtered;
  };

  // Get filtered and sorted inventory items
  const getFilteredSortedInventoryItems = () => {
    let filtered = projectInventoryItems.filter(item =>
      item.dataObjectId?.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
      item.processArea?.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
      item.complexity?.toLowerCase().includes(inventorySearchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aVal = (a[inventorySortColumn] || '')?.toString().toLowerCase();
      const bVal = (b[inventorySortColumn] || '')?.toString().toLowerCase();
      return inventorySortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return filtered;
  };

  // Handle edit inventory item
  const handleEditInventoryItem = (item: any) => {
    setEditingInventoryItemId(item.id);
    setProjectInventoryItem({ ...item });
    setProjectInventoryDialogOpen(true);
  };

  // Handle delete inventory item
  const handleDeleteInventoryItem = (item: any) => {
    setDeletingInventoryItemId(item.id);
    setDeletingInventoryItemName(item.dataObjectId);
  };

  // Confirm delete inventory item
  const confirmDeleteInventoryItem = async () => {
    if (!deletingInventoryItemId) return;
    
    try {
      setIsDeletingInventoryItem(true);
      await apiClient.delete(`/api/project-objects/${deletingInventoryItemId}`);
      setProjectInventoryItems(projectInventoryItems.filter(item => item.id !== deletingInventoryItemId));
      setDeletingInventoryItemId(null);
      alert('Item deleted successfully');
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setIsDeletingInventoryItem(false);
    }
  };

  const handleProjectInventoryInlineChange = async (itemId: string, field: string, value: string) => {
    try {
      await apiClient.patch(`/api/project-objects/${itemId}`, {
        [field]: value || null,
      });
      setProjectInventoryItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    } catch (error) {
      console.error('Failed to update inventory item field:', error);
      alert('Failed to update inventory item. Please try again.');
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

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return '#4CAF50';
      case 'in_progress': return '#29B6F6';
      case 'blocked': return '#EF5350';
      default: return 'rgba(255,255,255,0.2)';
    }
  };

  const calcEndDate = (startDate: string, duration: number, durationUnit: string) => {
    if (!startDate || !duration) return '';
    const d = new Date(startDate);
    const hours = durationUnit === 'days' ? duration * 8 : duration;
    d.setHours(d.getHours() + hours);
    return d.toISOString().split('T')[0];
  };

  const updateTaskInline = async (taskId: string, field: string, value: string) => {
    try {
      const payload = field === 'progressPercentage' ? { [field]: parseInt(value) || 0 } : { [field]: value };
      await apiClient.patch(`/api/tasks/${taskId}`, payload);
      const updatedTasks = projectTasks.map(t => t.id === taskId ? { ...t, [field]: field === 'progressPercentage' ? parseInt(value) || 0 : value } : t);
      setProjectTasks(updatedTasks);

      // Recalculate and persist project % complete
      if (activeProjectId) {
        const allPct = updatedTasks.filter(t => t.projectObjectId || t.taskGroupId);
        const avg = allPct.length > 0
          ? Math.round(allPct.reduce((sum, t) => {
              const pct = t.id === taskId && field === 'status' && value === 'complete' ? 100
                : t.id === taskId && field === 'progressPercentage' ? (parseInt(value) || 0)
                : (t.progressPercentage ?? 0);
              return sum + pct;
            }, 0) / allPct.length)
          : 0;
        await apiClient.patch(`/api/projects/${activeProjectId}`, { progressPercentage: avg });
        // Update local projectsByMockCycle so tree reflects new %
        queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] });
      }
    } catch (e) { console.error('Failed to update task', e); }
  };

  const loadTaskDeps = async (taskId: string) => {
    try {
      const res = await apiClient.get(`/api/tasks/${taskId}/dependencies`);
      setTaskDeps(prev => ({ ...prev, [taskId]: res.data.data || [] }));
    } catch (e) { /* ignore */ }
  };

  const cycleCount = Object.values(mockCycles).reduce((acc: number, arr: any) => acc + (arr?.length || 0), 0);

  const parseDateOnly = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(todayStart.getDate() + 6);

  const allPriorityTasks = projectTasks.filter(t => t.projectObjectId || t.taskGroupId);
  const lateTasks = allPriorityTasks.filter(t => {
    if (t.status === 'complete') return false;
    const end = parseDateOnly(t.endDate);
    return !!end && end < todayStart;
  });
  const inProgressTasks = allPriorityTasks.filter(t => t.status === 'in_progress');
  const dueThisWeekTasks = allPriorityTasks.filter(t => {
    if (t.status === 'complete') return false;
    const end = parseDateOnly(t.endDate);
    return !!end && end >= todayStart && end <= weekEnd;
  });
  const blockedTasks = allPriorityTasks.filter(t => t.status === 'blocked');

  const getPriorityTaskContext = (task: any) => {
    if (task.projectObjectId) {
      const inventoryObject = projectInventoryItems.find(obj => obj.id === task.projectObjectId);
      return inventoryObject?.objectId || 'Object';
    }
    if (task.taskGroupId) {
      return projectTaskGroups.find(g => g.id === task.taskGroupId)?.name || 'Task Group';
    }
    return 'Task';
  };

  const handlePriorityTaskClick = (task: any) => {
    const projectId = task.projectId || activeProjectId;
    if (!projectId || !task.id) return;
    sessionStorage.setItem('pendingNotificationTarget', JSON.stringify({
      projectId,
      taskId: task.id,
      taskName: task.name || 'Task',
    }));
    setTabValue(0);
  };

  return (
    <Layout
      programCount={programs.length}
      cycleCount={cycleCount}
      objectCount={projectInventoryItems.length}
      completionPercentage={0}
      tabValue={tabValue}
      onTabChange={(v) => setTabValue(v)}
      onPeopleClick={() => setPeopleSidebarOpen(true)}
    >
      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar - Hierarchy Tree */}
        <Paper
          sx={{
            width: '280px',
            overflowY: 'auto',
            flexShrink: 0,
            backgroundColor: 'transparent',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'none',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            borderTop: 'none',
            borderLeft: 'none',
            borderRadius: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ flex: 1, overflowY: 'auto', pt: 1 }}>
            {programs.length === 0 ? (
              <Typography variant="caption" color="textSecondary" sx={{ px: 2 }}>
                No programs
              </Typography>
            ) : (
              <List sx={{ p: 0 }}>
                {getOrderedPrograms().map((program: Program) => {
                  const isProgramSelected = selectedItem?.type === 'program' && selectedItem?.id === program.id;
                  const isProgramExpanded = expandedPrograms.has(program.id);
                  return (
                    <Box key={program.id}>
                      {/* Program Row */}
                      <Box
                        draggable
                        onDragStart={(e) => {
                          const payload = JSON.stringify({ type: 'program', id: program.id });
                          e.dataTransfer.setData('text/plain', payload);
                          e.dataTransfer.effectAllowed = 'move';
                          setTreeDragItem({ type: 'program', id: program.id });
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const raw = e.dataTransfer.getData('text/plain');
                          let parsed: any = null;
                          try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
                          const dragId = parsed?.type === 'program' ? parsed.id : treeDragItem?.type === 'program' ? treeDragItem.id : null;
                          if (!dragId) return;
                          const orderedIds = mergeOrder(treeOrder.programs, programs.map((p: Program) => p.id));
                          setTreeOrder(prev => ({ ...prev, programs: reorderByDrop(orderedIds, dragId, program.id) }));
                          setTreeDragItem(null);
                        }}
                        onDragEnd={() => setTreeDragItem(null)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          py: 0.75,
                          pl: 0,
                          pr: 0.5,
                          cursor: 'pointer',
                          position: 'relative',
                          backgroundColor: isProgramSelected ? 'rgba(91, 103, 202, 0.15)' : 'transparent',
                          borderLeft: '3px solid transparent',
                          '&::before': isProgramSelected ? {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: '4px',
                            bottom: '4px',
                            width: '3px',
                            backgroundColor: '#5B67CA',
                            borderRadius: '2px',
                          } : {},
                          '&:hover': { backgroundColor: isProgramSelected ? 'rgba(91, 103, 202, 0.15)' : 'rgba(255,255,255,0.05)' },
                        }}
                        onClick={() => {
                          setSelectedItem({ type: 'program', id: program.id });
                          toggleProgramExpanded(program.id);
                        }}
                      >
                        <DragIndicatorIcon sx={{ fontSize: '0.9rem', opacity: 0.45, mx: 0.25, flexShrink: 0 }} />
                        {/* Expand arrow */}
                        <Box sx={{ width: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isProgramExpanded
                            ? <ExpandMoreIcon sx={{ fontSize: '1rem', opacity: 0.6 }} />
                            : <ChevronRightIcon sx={{ fontSize: '1rem', opacity: 0.6 }} />
                          }
                        </Box>
                        <CorporateFareIcon sx={{ fontSize: '1.1rem', color: isProgramSelected ? '#5B67CA' : 'primary.light', flexShrink: 0, mx: 0.75 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isProgramSelected ? '#5B67CA' : 'inherit' }}>
                          {program.name}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuAnchorEl(e.currentTarget);
                            setMenuType('program');
                            setMenuItemId(program.id);
                          }}
                          sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                        >
                          <MoreVertIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Box>

                      {/* Cycles (with tree line) */}
                      {isProgramExpanded && (
                        <Box sx={{ position: 'relative', ml: 3.5 }}>
                          {/* Vertical tree line */}
                          <Box sx={{
                            position: 'absolute',
                            left: 8,
                            top: 0,
                            bottom: 32,
                            width: '1px',
                            backgroundColor: 'rgba(255,255,255,0.12)',
                          }} />

                          {getOrderedCycles(program.id).map((cycle: MockCycle) => {
                            const isCycleSelected = selectedItem?.type === 'cycle' && selectedItem?.id === cycle.id;
                            const isCycleExpanded = expandedCycles.has(cycle.id);
                            return (
                              <Box key={cycle.id}>
                                {/* Cycle Row */}
                                <Box
                                  draggable
                                  onDragStart={(e) => {
                                    const payload = JSON.stringify({ type: 'cycle', id: cycle.id, programId: program.id });
                                    e.dataTransfer.setData('text/plain', payload);
                                    e.dataTransfer.effectAllowed = 'move';
                                    setTreeDragItem({ type: 'cycle', id: cycle.id, programId: program.id });
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const raw = e.dataTransfer.getData('text/plain');
                                    let parsed: any = null;
                                    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
                                    const dragged = parsed?.type === 'cycle'
                                      ? parsed
                                      : treeDragItem?.type === 'cycle'
                                        ? treeDragItem
                                        : null;
                                    if (!dragged || dragged.programId !== program.id) return;
                                    const orderedIds = mergeOrder(treeOrder.cycles[program.id] || [], (mockCycles[program.id] || []).map((c: MockCycle) => c.id));
                                    setTreeOrder(prev => ({
                                      ...prev,
                                      cycles: {
                                        ...prev.cycles,
                                        [program.id]: reorderByDrop(orderedIds, dragged.id, cycle.id),
                                      },
                                    }));
                                    setTreeDragItem(null);
                                  }}
                                  onDragEnd={() => setTreeDragItem(null)}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    py: 0.6,
                                    pl: 0,
                                    pr: 0.5,
                                    cursor: 'pointer',
                                    position: 'relative',
                                    backgroundColor: isCycleSelected ? 'rgba(91, 103, 202, 0.15)' : 'transparent',
                                    borderLeft: '3px solid transparent',
                                    '&::before': isCycleSelected ? {
                                      content: '""',
                                      position: 'absolute',
                                      left: 0,
                                      top: '4px',
                                      bottom: '4px',
                                      width: '3px',
                                      backgroundColor: '#5B67CA',
                                      borderRadius: '2px',
                                    } : {},
                                    '&:hover': { backgroundColor: isCycleSelected ? 'rgba(91, 103, 202, 0.15)' : 'rgba(255,255,255,0.05)' },
                                  }}
                                  onClick={() => {
                                    setSelectedItem({ type: 'cycle', id: cycle.id, programId: program.id });
                                    toggleCycleExpanded(cycle.id);
                                  }}
                                >
                                  {/* Tree connector */}
                                  <Box sx={{ width: 8, flexShrink: 0 }} />
                                  <DragIndicatorIcon sx={{ fontSize: '0.85rem', opacity: 0.45, mx: 0.15, flexShrink: 0 }} />
                                  {/* Expand arrow */}
                                  <Box sx={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {isCycleExpanded
                                      ? <ExpandMoreIcon sx={{ fontSize: '0.85rem', opacity: 0.6 }} />
                                      : <ChevronRightIcon sx={{ fontSize: '0.85rem', opacity: 0.6 }} />
                                    }
                                  </Box>
                                  <SyncIcon sx={{ fontSize: '0.95rem', color: isCycleSelected ? '#5B67CA' : 'info.light', flexShrink: 0, mx: 0.5 }} />
                                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCycleSelected ? '#5B67CA' : 'inherit' }}>
                                    {cycle.name}
                                  </Typography>
                                  {(() => {
                                    const cycleProjects = projectsByMockCycle[cycle.id] || [];
                                    const cyclePct = cycleProjects.length > 0
                                      ? Math.round(cycleProjects.reduce((s: number, p: Project) => s + (p.progressPercentage || 0), 0) / cycleProjects.length)
                                      : 0;
                                    return <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, mr: 0.5, flexShrink: 0 }}>{cyclePct}%</Typography>;
                                  })()}
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuAnchorEl(e.currentTarget);
                                      setMenuType('cycle');
                                      setMenuItemId(cycle.id);
                                    }}
                                    sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                  >
                                    <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
                                  </IconButton>
                                </Box>

                                {/* Projects (with tree line) */}
                                {isCycleExpanded && (
                                  <Box sx={{ position: 'relative', ml: 3 }}>
                                    {/* Vertical tree line */}
                                    <Box sx={{
                                      position: 'absolute',
                                      left: 8,
                                      top: 0,
                                      bottom: 28,
                                      width: '1px',
                                      backgroundColor: 'rgba(255,255,255,0.12)',
                                    }} />

                                    {getOrderedProjects(cycle.id).map((project: Project) => {
                                      const isProjectSelected = selectedItem?.type === 'project' && selectedItem?.id === project.id;
                                      const accentColor = project.accentColor || '#90caf9';
                                      return (
                                        <Box
                                          key={project.id}
                                          draggable
                                          onDragStart={(e) => {
                                            const payload = JSON.stringify({ type: 'project', id: project.id, cycleId: cycle.id });
                                            e.dataTransfer.setData('text/plain', payload);
                                            e.dataTransfer.effectAllowed = 'move';
                                            setTreeDragItem({ type: 'project', id: project.id, cycleId: cycle.id });
                                          }}
                                          onDragOver={(e) => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                          }}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            const raw = e.dataTransfer.getData('text/plain');
                                            let parsed: any = null;
                                            try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
                                            const dragged = parsed?.type === 'project'
                                              ? parsed
                                              : treeDragItem?.type === 'project'
                                                ? treeDragItem
                                                : null;
                                            if (!dragged || dragged.cycleId !== cycle.id) return;
                                            const orderedIds = mergeOrder(treeOrder.projects[cycle.id] || [], (projectsByMockCycle[cycle.id] || []).map((p: Project) => p.id));
                                            setTreeOrder(prev => ({
                                              ...prev,
                                              projects: {
                                                ...prev.projects,
                                                [cycle.id]: reorderByDrop(orderedIds, dragged.id, project.id),
                                              },
                                            }));
                                            setTreeDragItem(null);
                                          }}
                                          onDragEnd={() => setTreeDragItem(null)}
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            py: 0.5,
                                            pl: 0,
                                            pr: 0.5,
                                            cursor: 'pointer',
                                            position: 'relative',
                                            backgroundColor: isProjectSelected ? `${accentColor}22` : 'transparent',
                                            borderLeft: '3px solid transparent',
                                            '&::before': isProjectSelected ? {
                                              content: '""',
                                              position: 'absolute',
                                              left: 0,
                                              top: '3px',
                                              bottom: '3px',
                                              width: '3px',
                                              backgroundColor: accentColor,
                                              borderRadius: '2px',
                                            } : {},
                                            '&:hover': { backgroundColor: isProjectSelected ? `${accentColor}22` : 'rgba(255,255,255,0.05)' },
                                          }}
                                          onClick={() => setSelectedItem({ type: 'project', id: project.id, cycleId: cycle.id })}
                                        >
                                          {/* Tree connector */}
                                          <Box sx={{ width: 8, flexShrink: 0 }} />
                                          <DragIndicatorIcon sx={{ fontSize: '0.8rem', opacity: 0.45, mx: 0.15, flexShrink: 0 }} />
                                          <FolderOutlinedIcon sx={{ fontSize: '0.95rem', color: accentColor, flexShrink: 0, mx: 0.5 }} />
                                          <Typography variant="caption" sx={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isProjectSelected ? accentColor : 'inherit' }}>
                                            {project.name}
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, mr: 0.5, flexShrink: 0 }}>
                                            {project.progressPercentage || 0}%
                                          </Typography>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setMenuAnchorEl(e.currentTarget);
                                              setMenuType('project');
                                              setMenuItemId(project.id);
                                            }}
                                            sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                          >
                                            <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
                                          </IconButton>
                                        </Box>
                                      );
                                    })}

                                    {/* Add Project */}
                                    <Button
                                      size="small"
                                      variant="text"
                                      startIcon={<AddIcon sx={{ fontSize: '0.85rem !important' }} />}
                                      onClick={() => openCreateDialog('project', undefined, cycle.id)}
                                      sx={{ fontSize: '0.72rem', height: 26, mt: 0.25, color: '#7C83D0', textTransform: 'none', pl: 1, '&:hover': { color: '#5B67CA' } }}
                                    >
                                      Add Project
                                    </Button>
                                  </Box>
                                )}
                              </Box>
                            );
                          })}

                          {/* Add Mock Cycle */}
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<AddIcon sx={{ fontSize: '0.85rem !important' }} />}
                            onClick={() => openCreateDialog('cycle', program.id)}
                            sx={{ fontSize: '0.72rem', height: 26, mt: 0.25, color: '#64B5F6', textTransform: 'none', pl: 1, '&:hover': { color: '#90CAF9' } }}
                          >
                            Add Mock Cycle
                          </Button>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>

          {/* Add Program Button at Bottom */}
          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Button
              variant="text"
              size="small"
              startIcon={<AddIcon />}
              fullWidth
              onClick={() => openCreateDialog('program')}
              sx={{ textTransform: 'none', justifyContent: 'flex-start', color: '#7C83D0', fontWeight: 500, '&:hover': { color: '#5B67CA' } }}
            >
              Add Program
            </Button>
          </Box>
        </Paper>

        {/* Right Content Area - Details */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {/* Plan Tab Content */}
          {tabValue === 0 && (
            <>
              {!selectedItem ? (
                <Alert severity="info">Select an item from the list to view details</Alert>
              ) : selectedDetails ? (
                <>
                  {selectedItem.type === 'project' ? (() => {
                    const project = selectedDetails as Project;
                    const accentColor = project.accentColor || '#00BFA5';
                    const parentCycleId = (selectedItem as any).cycleId;
                    let parentCycleName = '';
                    let parentProgramName = '';
                    for (const progId in mockCycles) {
                      const cycle = (mockCycles[progId] || []).find((c: MockCycle) => c.id === parentCycleId);
                      if (cycle) {
                        parentCycleName = cycle.name;
                        const prog = programs.find((p: Program) => p.id === progId);
                        parentProgramName = prog?.name || '';
                        break;
                      }
                    }
                    const allPlanTasks = projectTasks.filter(t => t.projectObjectId || t.taskGroupId);
                    const progressPct = allPlanTasks.length > 0 ? Math.round(allPlanTasks.reduce((s, t) => s + (t.progressPercentage ?? 0), 0) / allPlanTasks.length) : 0;
                    const allObjectIds = Array.from(new Set(projectTasks.filter(t => t.projectObjectId).map(t => t.projectObjectId)));
                    const allGroupIds = projectTaskGroups.map(g => g.id);
                    const currentPlanRowKeys = [
                      ...allObjectIds.map((id: string) => objectRowKey(id)),
                      ...allGroupIds.map((id: string) => taskGroupRowKey(id)),
                    ];
                    const orderedPlanRowKeys = mergeOrder(planRowOrder, currentPlanRowKeys);
                    const rowOrderIndex = new Map(orderedPlanRowKeys.map((k, idx) => [k, idx]));
                    const orderedTaskGroups = allGroupIds
                      .map(id => projectTaskGroups.find(g => g.id === id))
                      .filter(Boolean) as any[];
                    const canReorderPlan = orderedPlanRowKeys.length > 1;
                    const taskFieldSx = {
                      '& .MuiInputBase-root': { fontSize: '0.72rem', height: 26 },
                      '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: accentColor },
                      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accentColor },
                    };
                    return (
                      <Box>
                        {/* Breadcrumbs */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                          {parentProgramName && <><Typography variant="caption" color="text.disabled">{parentProgramName}</Typography><Typography variant="caption" color="text.disabled">›</Typography></>}
                          {parentCycleName && <><Typography variant="caption" color="text.disabled">{parentCycleName}</Typography><Typography variant="caption" color="text.disabled">›</Typography></>}
                          <Typography variant="caption" sx={{ color: accentColor, fontWeight: 600 }}>{project.name}</Typography>
                        </Box>

                        {/* Title */}
                        <Typography variant="h4" sx={{ fontWeight: 700, color: accentColor, mb: 0.75 }}>{project.name}</Typography>

                        {/* Stats */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">{projectInventoryItems.length} objects</Typography>
                          <Box sx={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: 'text.disabled' }} />
                          <Typography variant="body2" color="text.secondary">{projectTaskGroups.length} task groups</Typography>
                        </Box>

                        {/* Progress */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                          <LinearProgress variant="determinate" value={progressPct} sx={{ width: 160, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { backgroundColor: accentColor, borderRadius: 3 } }} />
                          <Typography variant="body2" sx={{ color: accentColor, fontWeight: 600 }}>{progressPct}%</Typography>
                        </Box>

                        {/* Timeline */}
                        {(() => {
                          const parseLocalDate = (dateString: string) => {
                            if (!dateString || typeof dateString !== 'string') return null;
                            const parts = dateString.trim().split(/[-\/]/);
                            if (parts.length !== 3) return null;
                            
                            let year: number, month: number, day: number;
                            if (parts[0].length === 4) {
                              year = parseInt(parts[0]);
                              month = parseInt(parts[1]);
                              day = parseInt(parts[2]);
                            } else if (parts[2].length === 4) {
                              month = parseInt(parts[0]);
                              day = parseInt(parts[1]);
                              year = parseInt(parts[2]);
                            } else {
                              return null;
                            }
                            
                            if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
                            return { year, month, day };
                          };
                          const dateToNum = (d: { year: number; month: number; day: number }) => d.year * 10000 + d.month * 100 + d.day;
                          const now = new Date();
                          const todayParts = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
                          
                          // Project timeline is driven by all tasks in the project.
                          let minStart = null;
                          let maxEnd = null;
                          for (const task of allPlanTasks) {
                            const startParsed = parseLocalDate(task.startDate) || todayParts;
                            const endParsed = parseLocalDate(task.endDate) || todayParts;
                            if (!minStart || dateToNum(startParsed) < dateToNum(minStart)) minStart = startParsed;
                            if (!maxEnd || dateToNum(endParsed) > dateToNum(maxEnd)) maxEnd = endParsed;
                          }

                          // Fallback to project dates only when there are no plan tasks.
                          if (!minStart || !maxEnd) {
                            const startDateParsed = parseLocalDate(project.startDate) || todayParts;
                            const endDateParsed = parseLocalDate(project.endDate) || todayParts;
                            minStart = startDateParsed;
                            maxEnd = endDateParsed;
                          }
                          
                          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          const startStr = `${monthNames[minStart.month - 1]} ${minStart.day}`;
                          const endStr = `${monthNames[maxEnd.month - 1]} ${maxEnd.day}`;
                          
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                              <EventIcon sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />
                              <Typography variant="caption" color="text.disabled">
                                Timeline: {startStr} → {endStr}
                              </Typography>
                            </Box>
                          );
                        })()}

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, justifyContent: 'flex-end' }}>
                          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDataObjectDialogOpen(true)}
                            sx={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}99 100%)`, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}>
                            Add Data Object
                          </Button>
                          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTaskGroupDialogOpen(true)}
                            sx={{ background: 'linear-gradient(135deg, #5B67CA 0%, #3B4DB3 100%)', textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}>
                            Add Task Group
                          </Button>
                        </Box>

                        {/* Filter Row */}
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                          <TextField placeholder="Search..." size="small" value={planSearchTerm} onChange={(e) => setPlanSearchTerm(e.target.value)}
                            sx={{ width: 180, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: accentColor }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accentColor } }}
                            slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 0.5, fontSize: '1rem', color: 'text.secondary' }} /> } }} />
                          <TextField select size="small" value={planStatusFilter} onChange={(e) => setPlanStatusFilter(e.target.value)}
                            sx={{ width: 150, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: accentColor }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accentColor } }}>
                            <MenuItem value="">All Statuses</MenuItem>
                            <MenuItem value="not_started">Not Started</MenuItem>
                            <MenuItem value="in_progress">In Progress</MenuItem>
                            <MenuItem value="complete">Completed</MenuItem>
                          </TextField>
                          {(planSearchTerm || planStatusFilter) && (
                            <Button size="small" variant="text" onClick={() => { setPlanSearchTerm(''); setPlanStatusFilter(''); }} sx={{ textTransform: 'none', color: 'text.secondary' }}>Clear</Button>
                          )}
                        </Box>

                        {/* Objects + Groups */}
                        {allObjectIds.length === 0 && projectTaskGroups.length === 0 ? (
                          <Alert severity="info">No tasks added to plan yet</Alert>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {!canReorderPlan && (
                              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, mb: 0.5 }}>
                                Add at least 2 total rows (Objects and/or Task Groups) to reorder.
                              </Typography>
                            )}
                            {allObjectIds.map((objectId) => {
                              const rowKey = objectRowKey(objectId || '');
                              const tasksForObject = projectTasks
                                .filter(t => t.projectObjectId === objectId)
                                .sort((a, b) => {
                                  // 1. Start date ascending (nulls last)
                                  const aDate = a.startDate ? new Date(a.startDate).getTime() : Infinity;
                                  const bDate = b.startDate ? new Date(b.startDate).getTime() : Infinity;
                                  if (aDate !== bDate) return aDate - bDate;
                                  // 2. Default template order
                                  const aIdx = defaultTaskOrder.indexOf(a.name);
                                  const bIdx = defaultTaskOrder.indexOf(b.name);
                                  const aOrder = aIdx === -1 ? 999 : aIdx;
                                  const bOrder = bIdx === -1 ? 999 : bIdx;
                                  if (aOrder !== bOrder) return aOrder - bOrder;
                                  // 3. Alphabetical
                                  return (a.name || '').localeCompare(b.name || '');
                                });
                              const inventoryObject = projectInventoryItems.find(obj => obj.id === objectId);
                              const objectName = inventoryObject?.objectId || 'Unknown Object';
                              const globalObj = inventoryObjects.find(o => o.id === inventoryObject?.globalObjectId || o.objectId === inventoryObject?.objectId);
                              const description = globalObj?.description || inventoryObject?.description || '';
                              const isExpanded = expandedObjects.has(objectId || '');
                              if (planSearchTerm && !objectName.toLowerCase().includes(planSearchTerm.toLowerCase()) && !description.toLowerCase().includes(planSearchTerm.toLowerCase())) return null;
                              if (planStatusFilter && !tasksForObject.some(t => t.status === planStatusFilter)) return null;
                              const overallStatus = tasksForObject.length > 0 && tasksForObject.every(t => t.status === 'complete') ? 'complete' : tasksForObject.some(t => t.status === 'in_progress') ? 'in_progress' : tasksForObject.some(t => t.status === 'blocked') ? 'blocked' : 'not_started';
                              return (
                                <Box
                                  key={`obj-${objectId}`}
                                  draggable={canReorderPlan}
                                  onDragStart={(e) => {
                                    if (!canReorderPlan) return;
                                    const payload = JSON.stringify({ type: 'planRow', key: rowKey });
                                    e.dataTransfer.setData('text/plain', payload);
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDragItem({ type: 'planRow', key: rowKey });
                                  }}
                                  onDragOver={(e) => {
                                    if (!canReorderPlan) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                  }}
                                  onDrop={(e) => {
                                    if (!canReorderPlan) return;
                                    e.preventDefault();
                                    const raw = e.dataTransfer.getData('text/plain');
                                    let parsed: any = null;
                                    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
                                    const dragKey = parsed?.type === 'planRow' ? parsed.key : dragItem?.type === 'planRow' ? dragItem.key : null;
                                    if (!dragKey || !objectId) return;
                                    setPlanRowOrder(prev => reorderByDrop(mergeOrder(prev, orderedPlanRowKeys), dragKey, rowKey));
                                    setDragItem(null);
                                  }}
                                  onDragEnd={() => setDragItem(null)}
                                  sx={{
                                    position: 'relative',
                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    opacity: dragItem?.type === 'planRow' && dragItem.key === rowKey ? 0.6 : 1,
                                    order: rowOrderIndex.get(rowKey) ?? 0,
                                  }}
                                >
                                  <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: accentColor }} />
                                  <Box onClick={() => { const next = new Set(expandedObjects); if (isExpanded) next.delete(objectId || ''); else next.add(objectId || ''); setExpandedObjects(next); }}
                                    sx={{ pl: 2.5, pr: 1, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' } }}>
                                    <DragIndicatorIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0, cursor: canReorderPlan ? 'grab' : 'not-allowed', opacity: canReorderPlan ? 1 : 0.45 }} />
                                    <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: accentColor, flexShrink: 0, minWidth: 90 }}>{objectName}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</Typography>
                                    <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center', flexShrink: 0 }}>
                                      {tasksForObject.slice(0, 10).map((task, i) => (<Box key={i} sx={{ width: 16, height: 4, borderRadius: 2, backgroundColor: getTaskStatusColor(task.status) }} />))}
                                    </Box>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getTaskStatusColor(overallStatus), flexShrink: 0 }} />
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuAnchorEl(e.currentTarget); setMenuType('task'); setMenuItemId(objectId || ''); }}><MoreVertIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                  </Box>
                                  {/* Timeline and Status Info Line */}
                                  {tasksForObject.length > 0 && (() => {
                                    const parseLocalDate = (dateString: string) => {
                                      if (!dateString) return null;
                                      const parts = dateString.trim().split(/[-\/]/);
                                      if (parts.length !== 3) return null;
                                      let year: number, month: number, day: number;
                                      if (parts[0].length === 4) {
                                        year = parseInt(parts[0]);
                                        month = parseInt(parts[1]);
                                        day = parseInt(parts[2]);
                                      } else if (parts[2].length === 4) {
                                        month = parseInt(parts[0]);
                                        day = parseInt(parts[1]);
                                        year = parseInt(parts[2]);
                                      } else {
                                        return null;
                                      }
                                      if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
                                      return { year, month, day };
                                    };
                                    const dateToNum = (d: { year: number; month: number; day: number }) => d.year * 10000 + d.month * 100 + d.day;
                                    const now = new Date();
                                    const todayParts = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
                                    
                                    // Find min start date and max end date from all tasks
                                    let minStart = null;
                                    let maxEnd = null;
                                    for (const task of tasksForObject) {
                                      const startParsed = parseLocalDate(task.startDate) || todayParts;
                                      const endParsed = parseLocalDate(task.endDate) || todayParts;
                                      if (startParsed) {
                                        if (!minStart || dateToNum(startParsed) < dateToNum(minStart)) minStart = startParsed;
                                      }
                                      if (endParsed) {
                                        if (!maxEnd || dateToNum(endParsed) > dateToNum(maxEnd)) maxEnd = endParsed;
                                      }
                                    }
                                    
                                    if (!minStart || !maxEnd) return null;
                                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                    const timelineStr = `${monthNames[minStart.month - 1]} ${minStart.day} → ${monthNames[maxEnd.month - 1]} ${maxEnd.day}`;
                                    const today = new Date();
                                    const endDate = new Date(maxEnd.year, maxEnd.month - 1, maxEnd.day);
                                    const isBehind = today > endDate || overallStatus === 'blocked';
                                    return (
                                      <Box sx={{ px: 2.5, py: 0.4, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem' }}>
                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', fontWeight: 500 }}>{timelineStr}</Typography>
                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: isBehind ? 'rgba(255, 152, 0, 0.3)' : 'rgba(76, 175, 80, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isBehind ? '#FFA726' : '#66BB6A', fontSize: '0.6rem', fontWeight: 'bold' }}>
                                          {isBehind ? '⚠' : '✓'}
                                        </Box>
                                        <Typography variant="caption" sx={{ color: isBehind ? '#FFA726' : '#66BB6A', fontSize: '0.65rem' }}>{isBehind ? 'Behind' : 'On Target'}</Typography>
                                      </Box>
                                    );
                                  })()}
                                  {isExpanded && (
                                    <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                      {/* Object dependencies row */}
                                      {(taskDeps[objectId || ''] || []).length > 0 && (
                                        <Box sx={{ px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                          <Typography variant="caption" color="text.disabled">Depends on:</Typography>
                                          {(taskDeps[objectId || ''] || []).map((dep: any) => (
                                            <Box key={dep.id} sx={{ px: 1, py: 0.25, borderRadius: 1, backgroundColor: 'rgba(91,103,202,0.2)', fontSize: '0.7rem', color: '#9FA8DA' }}>{dep.objectId || dep.dependsOnName}</Box>
                                          ))}
                                        </Box>
                                      )}
                                      {/* Table header */}
                                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 60px 150px 100px 100px 100px', gap: 0, px: 2, py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        {['TASK', 'STATUS', '%', 'ASSIGNED TO', 'START DATE', 'END DATE', 'ACTIONS'].map(h => (
                                          <Typography key={h} variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 600 }}>{h}</Typography>
                                        ))}
                                      </Box>
                                      {tasksForObject.length === 0
                                        ? <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1, display: 'block' }}>No tasks</Typography>
                                        : tasksForObject.map((task) => (
                                          <Box key={task.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 60px 150px 100px 100px 100px', gap: 0, px: 2, py: 0.5, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                                            {/* Task name */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: getTaskStatusColor(task.status), flexShrink: 0 }} />
                                              <TextField size="small" value={task.name || ''} onBlur={e => updateTaskInline(task.id, 'name', e.target.value)}
                                                onChange={e => setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: e.target.value } : t))}
                                                sx={{ ...taskFieldSx, flex: 1 }} />
                                            </Box>
                                            {/* Status dropdown */}
                                            <TextField select size="small" value={task.status} onChange={e => {
                                              const newStatus = e.target.value;
                                              updateTaskInline(task.id, 'status', newStatus);
                                              if (newStatus === 'complete') updateTaskInline(task.id, 'progressPercentage', '100');
                                              else if (newStatus !== 'in_progress') updateTaskInline(task.id, 'progressPercentage', '0');
                                            }}
                                              sx={taskFieldSx}>
                                              <MenuItem value="not_started">Not Started</MenuItem>
                                              <MenuItem value="in_progress">In Progress</MenuItem>
                                              <MenuItem value="complete">Completed</MenuItem>
                                              <MenuItem value="blocked">Blocked</MenuItem>
                                            </TextField>
                                            {/* % Complete - right after status */}
                                            <TextField size="small" type="number" value={task.progressPercentage ?? 0}
                                              disabled={task.status !== 'in_progress'}
                                              onChange={e => {
                                                const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                updateTaskInline(task.id, 'progressPercentage', String(val));
                                              }}
                                              slotProps={{ htmlInput: { min: 0, max: 100 } }}
                                              sx={{ ...taskFieldSx, '& input': { textAlign: 'center', px: 0.5 } }} />
                                            {/* Assigned To */}
                                            <TextField select size="small" value={task.assignedTo || ''} onChange={e => updateTaskInline(task.id, 'assignedTo', e.target.value)}
                                              sx={taskFieldSx}>
                                              <MenuItem value=""><em>Unassigned</em></MenuItem>
                                              {people.map(p => <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>)}
                                            </TextField>
                                            {/* Start Date */}
                                            <TextField size="small" type="date" value={task.startDate || ''} onChange={e => {
                                              updateTaskInline(task.id, 'startDate', e.target.value);
                                              if (task.duration) updateTaskInline(task.id, 'endDate', calcEndDate(e.target.value, task.duration, task.durationUnit || 'hours'));
                                            }} sx={taskFieldSx} />
                                            {/* End Date */}
                                            <TextField size="small" type="date" value={task.endDate || ''} onChange={e => updateTaskInline(task.id, 'endDate', e.target.value)}
                                              sx={taskFieldSx} />
                                            {/* Actions */}
                                            <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
                                              <Badge badgeContent={taskCommentCounts[task.id] || 0} color="primary">
                                                <IconButton size="small" title="Discussion" onClick={() => setCommentModalTask({ id: task.id, name: task.name || 'Task' })}
                                                  sx={{ opacity: 0.6, '&:hover': { opacity: 1, color: accentColor } }}>
                                                  <ChatBubbleOutlineIcon sx={{ fontSize: '0.9rem' }} />
                                                </IconButton>
                                              </Badge>
                                              <IconButton size="small" title="Dependencies" onClick={async () => {
                                                await loadTaskDeps(task.id);
                                                setDepDialogTaskId(task.id);
                                                const all = await apiClient.get(`/api/tasks/project/${activeProjectId}`);
                                                setCycleTasksForDep(all.data.data || []);
                                              }} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                                <ChevronRightIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                              <IconButton size="small" onClick={() => openDeleteDialog('taskSingle' as any, task.id, task.name)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                                <DeleteIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                            </Box>
                                          </Box>
                                        ))}
                                      {/* Add Task row */}
                                      <Box sx={{ px: 2, py: 0.5 }}>
                                        <Button size="small" variant="text" startIcon={<AddIcon sx={{ fontSize: '0.8rem !important' }} />}
                                          onClick={async () => {
                                            try {
                                              const res = await apiClient.post(`/api/tasks/project/${activeProjectId}`, { taskType: 'custom', projectObjectId: objectId, name: 'New Task' });
                                              setProjectTasks(prev => [...prev, res.data.data]);
                                            } catch (e) { console.error(e); }
                                          }}
                                          sx={{ fontSize: '0.72rem', color: '#7C83D0', textTransform: 'none' }}>
                                          Add Task
                                        </Button>
                                      </Box>
                                      {/* Object Notes */}
                                      <Box sx={{ px: 2, pb: 1.5 }}>
                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 600, display: 'block', mb: 0.5 }}>OBJECT NOTES</Typography>
                                        <TextField fullWidth size="small" multiline rows={1} placeholder="Add object-level notes..." sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: accentColor }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accentColor } }} />
                                      </Box>
                                    </Box>
                                  )}
                                </Box>
                              );
                            })}
                            {orderedTaskGroups.map((group) => {
                              const rowKey = taskGroupRowKey(group.id);
                              const isExpanded = expandedTaskGroups.has(group.id);
                              const groupTasks = projectTasks.filter(t => t.taskGroupId === group.id);
                              const overallStatus = groupTasks.length > 0 && groupTasks.every(t => t.status === 'complete') ? 'complete' : groupTasks.some(t => t.status === 'in_progress') ? 'in_progress' : groupTasks.some(t => t.status === 'blocked') ? 'blocked' : 'not_started';
                              return (
                                <Box
                                  key={`group-${group.id}`}
                                  draggable={canReorderPlan}
                                  onDragStart={(e) => {
                                    if (!canReorderPlan) return;
                                    const payload = JSON.stringify({ type: 'planRow', key: rowKey });
                                    e.dataTransfer.setData('text/plain', payload);
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDragItem({ type: 'planRow', key: rowKey });
                                  }}
                                  onDragOver={(e) => {
                                    if (!canReorderPlan) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                  }}
                                  onDrop={(e) => {
                                    if (!canReorderPlan) return;
                                    e.preventDefault();
                                    const raw = e.dataTransfer.getData('text/plain');
                                    let parsed: any = null;
                                    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
                                    const dragKey = parsed?.type === 'planRow' ? parsed.key : dragItem?.type === 'planRow' ? dragItem.key : null;
                                    if (!dragKey) return;
                                    setPlanRowOrder(prev => reorderByDrop(mergeOrder(prev, orderedPlanRowKeys), dragKey, rowKey));
                                    setDragItem(null);
                                  }}
                                  onDragEnd={() => setDragItem(null)}
                                  sx={{
                                    position: 'relative',
                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    opacity: dragItem?.type === 'planRow' && dragItem.key === rowKey ? 0.6 : 1,
                                    order: rowOrderIndex.get(rowKey) ?? 0,
                                  }}
                                >
                                  <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: accentColor }} />
                                  <Box onClick={() => { const next = new Set(expandedTaskGroups); if (isExpanded) next.delete(group.id); else next.add(group.id); setExpandedTaskGroups(next); }}
                                    sx={{ pl: 2.5, pr: 1, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' } }}>
                                    <DragIndicatorIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0, cursor: canReorderPlan ? 'grab' : 'not-allowed', opacity: canReorderPlan ? 1 : 0.45 }} />
                                    <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                                    <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', flex: 1, color: accentColor }}>{group.name}</Typography>
                                    <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center', flexShrink: 0 }}>
                                      {groupTasks.slice(0, 10).map((task, i) => (<Box key={i} sx={{ width: 16, height: 4, borderRadius: 2, backgroundColor: getTaskStatusColor(task.status) }} />))}
                                    </Box>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getTaskStatusColor(overallStatus), flexShrink: 0 }} />
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuAnchorEl(e.currentTarget); setMenuType('taskGroup'); setMenuItemId(group.id); }}><MoreVertIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                  </Box>
                                  {/* Timeline and Status Info Line for Task Group */}
                                  {groupTasks.length > 0 && (() => {
                                    const parseLocalDate = (dateString: string) => {
                                      if (!dateString) return null;
                                      const parts = dateString.trim().split(/[-\/]/);
                                      if (parts.length !== 3) return null;
                                      let year: number, month: number, day: number;
                                      if (parts[0].length === 4) {
                                        year = parseInt(parts[0]);
                                        month = parseInt(parts[1]);
                                        day = parseInt(parts[2]);
                                      } else if (parts[2].length === 4) {
                                        month = parseInt(parts[0]);
                                        day = parseInt(parts[1]);
                                        year = parseInt(parts[2]);
                                      } else {
                                        return null;
                                      }
                                      if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
                                      return { year, month, day };
                                    };
                                    const dateToNum = (d: { year: number; month: number; day: number }) => d.year * 10000 + d.month * 100 + d.day;
                                    const now = new Date();
                                    const todayParts = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
                                    
                                    // Find min start date and max end date from all tasks in group
                                    let minStart = null;
                                    let maxEnd = null;
                                    for (const task of groupTasks) {
                                      const startParsed = parseLocalDate(task.startDate) || todayParts;
                                      const endParsed = parseLocalDate(task.endDate) || todayParts;
                                      if (startParsed) {
                                          if (!minStart || dateToNum(startParsed) < dateToNum(minStart)) minStart = startParsed;
                                      }
                                      if (endParsed) {
                                          if (!maxEnd || dateToNum(endParsed) > dateToNum(maxEnd)) maxEnd = endParsed;
                                      }
                                    }
                                    
                                    if (!minStart || !maxEnd) return null;
                                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                    const timelineStr = `${monthNames[minStart.month - 1]} ${minStart.day} → ${monthNames[maxEnd.month - 1]} ${maxEnd.day}`;
                                    const today = new Date();
                                    const endDate = new Date(maxEnd.year, maxEnd.month - 1, maxEnd.day);
                                    const isBehind = today > endDate || overallStatus === 'blocked';
                                    return (
                                      <Box sx={{ px: 2.5, py: 0.4, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem' }}>
                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', fontWeight: 500 }}>{timelineStr}</Typography>
                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: isBehind ? 'rgba(255, 152, 0, 0.3)' : 'rgba(76, 175, 80, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isBehind ? '#FFA726' : '#66BB6A', fontSize: '0.6rem', fontWeight: 'bold' }}>
                                          {isBehind ? '⚠' : '✓'}
                                        </Box>
                                        <Typography variant="caption" sx={{ color: isBehind ? '#FFA726' : '#66BB6A', fontSize: '0.65rem' }}>{isBehind ? 'Behind' : 'On Target'}</Typography>
                                      </Box>
                                    );
                                  })()}
                                  {isExpanded && (
                                    <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                      {/* Table header */}
                                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 60px 150px 100px 100px 100px', gap: 0, px: 2, py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        {['TASK', 'STATUS', '%', 'ASSIGNED TO', 'START DATE', 'END DATE', 'ACTIONS'].map(h => (
                                          <Typography key={h} variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 600 }}>{h}</Typography>
                                        ))}
                                      </Box>
                                      {groupTasks.length === 0
                                        ? <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1, display: 'block' }}>No tasks</Typography>
                                        : groupTasks.map((task) => (
                                          <Box key={task.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 60px 150px 100px 100px 100px', gap: 0, px: 2, py: 0.5, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: getTaskStatusColor(task.status), flexShrink: 0 }} />
                                              <TextField size="small" value={task.name || ''} onBlur={e => updateTaskInline(task.id, 'name', e.target.value)}
                                                onChange={e => setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: e.target.value } : t))}
                                                sx={{ ...taskFieldSx, flex: 1 }} />
                                            </Box>
                                            <TextField select size="small" value={task.status} onChange={e => {
                                              const newStatus = e.target.value;
                                              updateTaskInline(task.id, 'status', newStatus);
                                              if (newStatus === 'complete') updateTaskInline(task.id, 'progressPercentage', '100');
                                              else if (newStatus !== 'in_progress') updateTaskInline(task.id, 'progressPercentage', '0');
                                            }}
                                              sx={taskFieldSx}>
                                              <MenuItem value="not_started">Not Started</MenuItem>
                                              <MenuItem value="in_progress">In Progress</MenuItem>
                                              <MenuItem value="complete">Completed</MenuItem>
                                              <MenuItem value="blocked">Blocked</MenuItem>
                                            </TextField>
                                            {/* % Complete - right after status */}
                                            <TextField size="small" type="number" value={task.progressPercentage ?? 0}
                                              disabled={task.status !== 'in_progress'}
                                              onChange={e => {
                                                const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                updateTaskInline(task.id, 'progressPercentage', String(val));
                                              }}
                                              slotProps={{ htmlInput: { min: 0, max: 100 } }}
                                              sx={{ ...taskFieldSx, '& input': { textAlign: 'center', px: 0.5 } }} />
                                            <TextField select size="small" value={task.assignedTo || ''} onChange={e => updateTaskInline(task.id, 'assignedTo', e.target.value)}
                                              sx={taskFieldSx}>
                                              <MenuItem value=""><em>Unassigned</em></MenuItem>
                                              {people.map(p => <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>)}
                                            </TextField>
                                            <TextField size="small" type="date" value={task.startDate || ''} onChange={e => updateTaskInline(task.id, 'startDate', e.target.value)}
                                              sx={taskFieldSx} />
                                            <TextField size="small" type="date" value={task.endDate || ''} onChange={e => updateTaskInline(task.id, 'endDate', e.target.value)}
                                              sx={taskFieldSx} />
                                            <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
                                              <Badge badgeContent={taskCommentCounts[task.id] || 0} color="primary">
                                                <IconButton size="small" title="Discussion" onClick={() => setCommentModalTask({ id: task.id, name: task.name || 'Task' })}
                                                  sx={{ opacity: 0.6, '&:hover': { opacity: 1, color: accentColor } }}>
                                                  <ChatBubbleOutlineIcon sx={{ fontSize: '0.9rem' }} />
                                                </IconButton>
                                              </Badge>
                                              <IconButton size="small" onClick={async () => {
                                                await loadTaskDeps(task.id);
                                                setDepDialogTaskId(task.id);
                                                const all = await apiClient.get(`/api/tasks/project/${activeProjectId}`);
                                                setCycleTasksForDep(all.data.data || []);
                                              }} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                                <ChevronRightIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                              <IconButton size="small" onClick={() => openDeleteDialog('taskSingle' as any, task.id, task.name)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                                <DeleteIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                            </Box>
                                          </Box>
                                        ))}
                                      {/* Add Task to group */}
                                      <Box sx={{ px: 2, py: 0.5 }}>
                                        <Button size="small" variant="text" startIcon={<AddIcon sx={{ fontSize: '0.8rem !important' }} />}
                                          onClick={async () => {
                                            try {
                                              const res = await apiClient.post(`/api/tasks/project/${activeProjectId}`, { taskType: 'custom', taskGroupId: group.id, name: 'New Task' });
                                              setProjectTasks(prev => [...prev, res.data.data]);
                                            } catch (e) { console.error(e); }
                                          }}
                                          sx={{ fontSize: '0.72rem', color: '#7C83D0', textTransform: 'none' }}>
                                          Add Task
                                        </Button>
                                      </Box>
                                    </Box>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Box>
                    );
                  })() : (
                    <Box sx={{ p: 1 }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>{selectedDetails?.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedDetails?.description || (selectedItem.type === 'cycle' ? `${(selectedDetails as MockCycle).startDate} → ${(selectedDetails as MockCycle).endDate}` : '')}
                      </Typography>
                    </Box>
                  )}
                </>
              ) : null}
            </>
          )}

          {/* Inventory Tab Content - Always Shows */}
          {tabValue === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
              {/* Inventory Sub-Tabs */}
              <Box sx={{ display: 'flex', gap: 1, overflow: 'visible' }}>
                <Button
                  variant={inventorySubTab === 0 ? 'contained' : 'text'}
                  onClick={() => setInventorySubTab(0)}
                  startIcon={<ViewListIcon sx={{ fontSize: '0.95rem !important' }} />}
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    borderRadius: '999px',
                    px: 1.8,
                    py: 0.55,
                    minHeight: 34,
                    background: inventorySubTab === 0 ? 'linear-gradient(135deg, #4C8DFF 0%, #5FA2FF 100%)' : 'rgba(29,45,76,0.72)',
                    color: inventorySubTab === 0 ? '#F5FAFF' : '#9FB0D8',
                    border: inventorySubTab === 0 ? '1px solid rgba(102,163,255,0.7)' : '1px solid rgba(89,112,160,0.35)',
                    '&:hover': {
                      background: inventorySubTab === 0 ? 'linear-gradient(135deg, #4C8DFF 0%, #5FA2FF 100%)' : 'rgba(35,54,90,0.9)',
                    },
                  }}
                >
                  Object Catalog
                </Button>
                <Button
                  variant={inventorySubTab === 1 ? 'contained' : 'text'}
                  onClick={() => setInventorySubTab(1)}
                  startIcon={<FolderOutlinedIcon sx={{ fontSize: '0.95rem !important' }} />}
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    borderRadius: '999px',
                    px: 1.8,
                    py: 0.55,
                    minHeight: 34,
                    background: inventorySubTab === 1 ? 'linear-gradient(135deg, #4C8DFF 0%, #5FA2FF 100%)' : 'rgba(29,45,76,0.72)',
                    color: inventorySubTab === 1 ? '#F5FAFF' : '#9FB0D8',
                    border: inventorySubTab === 1 ? '1px solid rgba(102,163,255,0.7)' : '1px solid rgba(89,112,160,0.35)',
                    '&:hover': {
                      background: inventorySubTab === 1 ? 'linear-gradient(135deg, #4C8DFF 0%, #5FA2FF 100%)' : 'rgba(35,54,90,0.9)',
                    },
                  }}
                >
                  Project Inventory
                </Button>
              </Box>

              {/* Object Catalog Sub-Tab */}
              {inventorySubTab === 0 && (
                <Card sx={{ backgroundColor: 'rgba(9, 19, 47, 0.9)', border: '1px solid rgba(80,115,181,0.35)', borderRadius: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ color: '#DCE6FF', fontWeight: 700, fontSize: '1rem' }}>
                        Object Catalog
                      </Typography>
                      <Button
                        variant="contained"
                        sx={{
                          background: 'linear-gradient(135deg, #6A7DFF 0%, #6B8BFF 100%)',
                          textTransform: 'none',
                          fontWeight: 600,
                          borderRadius: '10px',
                          boxShadow: 'none',
                        }}
                        startIcon={<AddIcon />}
                        onClick={() => setCatalogObjectDialogOpen(true)}
                      >
                        Add Object
                      </Button>
                    </Box>

                    <TextField
                      fullWidth
                      placeholder="Search catalog..."
                      size="small"
                      value={catalogSearchTerm}
                      onChange={(e) => setCatalogSearchTerm(e.target.value)}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '10px',
                          backgroundColor: 'rgba(13, 27, 60, 0.7)',
                          color: '#D6E2FF',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(96, 127, 189, 0.45)',
                        },
                        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(114, 153, 227, 0.6)',
                        },
                      }}
                      slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 0.75, color: '#7F95C6', fontSize: '1rem' }} /> } }}
                    />

                    <Box sx={{ overflowX: 'auto' }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '0.95fr 2fr 0.85fr 0.6fr', gap: 0, borderRadius: 1.25, overflow: 'hidden', border: '1px solid rgba(92, 127, 194, 0.45)' }}>
                        {/* Header Row */}
                        <Box sx={{ backgroundColor: 'rgba(22, 39, 78, 0.95)', p: 1, fontWeight: 700, color: '#A9BCDF', fontSize: '0.72rem', letterSpacing: '0.4px' }}>
                          OBJECT ID
                        </Box>
                        <Box sx={{ backgroundColor: 'rgba(22, 39, 78, 0.95)', p: 1, fontWeight: 700, color: '#A9BCDF', fontSize: '0.72rem', letterSpacing: '0.4px' }}>
                          DESCRIPTION
                        </Box>
                        <Box sx={{ backgroundColor: 'rgba(22, 39, 78, 0.95)', p: 1, fontWeight: 700, color: '#A9BCDF', fontSize: '0.72rem', letterSpacing: '0.4px' }}>
                          PROCESS AREA
                        </Box>
                        <Box sx={{ backgroundColor: 'rgba(22, 39, 78, 0.95)', p: 1, fontWeight: 700, color: '#A9BCDF', fontSize: '0.72rem', letterSpacing: '0.4px', textAlign: 'center' }}>
                          ACTIONS
                        </Box>

                        {/* Catalog Data Rows */}
                        {getFilteredSortedCatalogObjects().length === 0 ? (
                          <Box sx={{ gridColumn: '1 / -1', p: 2, textAlign: 'center', color: '#8EA3CB', fontSize: '0.85rem', backgroundColor: 'rgba(17, 30, 63, 0.82)' }}>
                            {inventoryObjects.length === 0 ? 'No objects in catalog yet' : 'No results matching your search'}
                          </Box>
                        ) : (
                          getFilteredSortedCatalogObjects().map((obj, idx) => (
                            <React.Fragment key={obj.id}>
                              <Box sx={{ p: 1, borderBottom: '1px solid rgba(83,110,165,0.26)', backgroundColor: idx % 2 === 0 ? 'rgba(20, 35, 70, 0.9)' : 'rgba(16, 30, 60, 0.9)', fontFamily: 'monospace', fontSize: '0.8rem', color: '#D6E2FF', fontWeight: 700 }}>
                                {obj.objectId}
                              </Box>
                              <Box sx={{ p: 1, borderBottom: '1px solid rgba(83,110,165,0.26)', backgroundColor: idx % 2 === 0 ? 'rgba(20, 35, 70, 0.9)' : 'rgba(16, 30, 60, 0.9)', color: '#BFD0F3', fontSize: '0.8rem' }}>
                                {obj.description}
                              </Box>
                              <Box sx={{ p: 0.75, borderBottom: '1px solid rgba(83,110,165,0.26)', backgroundColor: idx % 2 === 0 ? 'rgba(20, 35, 70, 0.9)' : 'rgba(16, 30, 60, 0.9)' }}>
                                <Box
                                  component="select"
                                  value={obj.processArea || ''}
                                  onChange={(e) => handleCatalogProcessAreaChange(obj.id, e.target.value)}
                                  sx={{
                                    width: '100%',
                                    p: '4px 8px',
                                    border: '1px solid rgba(94,123,180,0.45)',
                                    borderRadius: '6px',
                                    fontSize: '0.78rem',
                                    color: '#DBE7FF',
                                    backgroundColor: 'rgba(10, 22, 49, 0.9)',
                                  }}
                                >
                                  <option value="">-</option>
                                  {processAreaOptions.map((area) => (
                                    <option key={area} value={area}>{area}</option>
                                  ))}
                                </Box>
                              </Box>
                              <Box sx={{ p: 0.75, borderBottom: '1px solid rgba(83,110,165,0.26)', backgroundColor: idx % 2 === 0 ? 'rgba(20, 35, 70, 0.9)' : 'rgba(16, 30, 60, 0.9)', display: 'flex', gap: 0.25, justifyContent: 'center', alignItems: 'center' }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditCatalogObject(obj)}
                                  sx={{ color: '#86A9E8', '&:hover': { backgroundColor: 'rgba(68, 100, 160, 0.2)' } }}
                                  title="Edit"
                                >
                                  <EditIcon sx={{ fontSize: '1rem' }} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteCatalogObject(obj)}
                                  sx={{ color: '#88A0C7', '&:hover': { backgroundColor: 'rgba(68, 100, 160, 0.2)' } }}
                                  title="Delete"
                                >
                                  <DeleteIcon sx={{ fontSize: '1rem' }} />
                                </IconButton>
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
                <Card sx={{ backgroundColor: 'rgba(9, 19, 47, 0.9)', border: '1px solid rgba(80,115,181,0.35)', borderRadius: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {Object.keys(mockCycles).length === 0 || Object.values(mockCycles).flat().length === 0 ? (
                          <Typography variant="caption" sx={{ color: '#8EA3CB' }}>
                            No projects available
                          </Typography>
                        ) : (
                          Object.values(mockCycles).flat().flatMap((cycle: MockCycle) => {
                            const cycleProjects = projectsByMockCycle[cycle.id] || [];
                            return cycleProjects.map((project: Project) => (
                              <Box
                                key={project.id}
                                component="button"
                                onClick={() => setSelectedProjectForInventory(project.id)}
                                sx={{
                                  px: 1.6,
                                  py: 0.5,
                                  borderRadius: '999px',
                                  border: selectedProjectForInventory === project.id ? '1px solid rgba(122,164,248,0.9)' : '1px solid rgba(89,112,160,0.35)',
                                  background: selectedProjectForInventory === project.id ? 'linear-gradient(135deg, #6E7BFF 0%, #6A8BFF 100%)' : 'rgba(30, 46, 79, 0.72)',
                                  color: selectedProjectForInventory === project.id ? '#EFF4FF' : '#9FB0D8',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  lineHeight: 1.3,
                                  transition: 'all 0.16s ease',
                                  '&:hover': {
                                    background: selectedProjectForInventory === project.id ? 'linear-gradient(135deg, #6E7BFF 0%, #6A8BFF 100%)' : 'rgba(35,54,90,0.9)',
                                  },
                                }}
                              >
                                {project.name}
                              </Box>
                            ));
                          })
                        )}
                      </Box>

                      <Button
                        variant="contained"
                        sx={{
                          background: 'linear-gradient(135deg, #6A7DFF 0%, #6B8BFF 100%)',
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: '10px',
                          boxShadow: 'none',
                        }}
                        startIcon={<AddIcon />}
                        onClick={() => setProjectInventoryDialogOpen(true)}
                        disabled={!selectedProjectForInventory}
                      >
                        Add to Inventory
                      </Button>
                    </Box>

                    <Box sx={{ overflowX: 'auto' }}>
                      <Box sx={{ minWidth: 1120, display: 'grid', gridTemplateColumns: '2.2fr 0.9fr 0.9fr 1.05fr 0.75fr 0.75fr 0.55fr', gap: 0, borderRadius: 1.25, overflow: 'hidden', border: '1px solid rgba(92,127,194,0.45)' }}>
                        {['DATA OBJECT', 'PROCESS AREA', 'COMPLEXITY', 'DEPLOY. DISPOSITION', 'BUILD TYPE', 'OBJECT TYPE', 'ACTIONS'].map((header) => (
                          <Box key={header} sx={{ backgroundColor: 'rgba(22,39,78,0.95)', p: 1, fontWeight: 700, color: '#A9BCDF', fontSize: '0.72rem', letterSpacing: '0.4px' }}>
                            {header}
                          </Box>
                        ))}

                        {getFilteredSortedInventoryItems().length === 0 ? (
                          <Box sx={{ gridColumn: '1 / -1', p: 2, textAlign: 'center', color: '#8EA3CB', fontSize: '0.85rem', backgroundColor: 'rgba(17, 30, 63, 0.82)' }}>
                            No items in project inventory yet
                          </Box>
                        ) : (
                          getFilteredSortedInventoryItems().map((item, idx) => {
                            const rowBg = idx % 2 === 0 ? 'rgba(20, 35, 70, 0.9)' : 'rgba(16, 30, 60, 0.9)';
                            const catalogObj = inventoryObjects.find(obj => obj.objectId === item.dataObjectId);
                            const description = catalogObj?.description || '';
                            const inPlan = projectTasks.some(task => task.projectObjectId === item.id);

                            const selectSx = {
                              width: '100%',
                              p: '4px 8px',
                              border: '1px solid rgba(94,123,180,0.45)',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              color: '#DBE7FF',
                              backgroundColor: 'rgba(10, 22, 49, 0.9)',
                            } as const;

                            return (
                              <React.Fragment key={item.id}>
                                <Box sx={{ p: 0.85, borderBottom: '1px solid rgba(83,110,165,0.26)', backgroundColor: rowBg, display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 36 }}>
                                  <Box sx={{ px: 0.7, py: 0.22, borderRadius: 0.8, backgroundColor: 'rgba(92,118,204,0.35)', color: '#BFD2FF', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                                    {item.dataObjectId}
                                  </Box>
                                  <Typography sx={{ color: '#CBD9F7', fontSize: '0.79rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                    {description || 'No description'}
                                  </Typography>
                                  {inPlan && (
                                    <Box sx={{ px: 0.55, py: 0.1, borderRadius: 0.7, backgroundColor: 'rgba(54,182,113,0.2)', border: '1px solid rgba(54,182,113,0.4)', color: '#73E0A5', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                                      In Plan
                                    </Box>
                                  )}
                                </Box>

                                <Box sx={{ p: 0.6, borderBottom: '1px solid rgba(83,110,165,0.26)', backgroundColor: rowBg }}>
                                  <Box component="select" value={item.processArea || ''} onChange={(e) => handleProjectInventoryInlineChange(item.id, 'processArea', e.target.value)} sx={selectSx}>
                                    <option value="">—</option>
                                    {processAreaOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                  </Box>
                                </Box>

                                <Box sx={{ p: 0.6, borderBottom: '1px solid rgba(83,110,165,0.26)', backgroundColor: rowBg }}>
                                  <Box component="select" value={item.complexity || ''} onChange={(e) => handleProjectInventoryInlineChange(item.id, 'complexity', e.target.value)} sx={selectSx}>
                                    <option value="">—</option>
                                    {complexityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                  </Box>
                                </Box>

                                <Box sx={{ p: 0.6, borderBottom: '1px solid rgba(83,110,165,0.26)', backgroundColor: rowBg }}>
                                  <Box component="select" value={item.deploymentDisposition || ''} onChange={(e) => handleProjectInventoryInlineChange(item.id, 'deploymentDisposition', e.target.value)} sx={selectSx}>
                                    <option value="">—</option>
                                    {deploymentDispositionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                  </Box>
                                </Box>

                                <Box sx={{ p: 0.6, borderBottom: '1px solid rgba(83,110,165,0.26)', backgroundColor: rowBg }}>
                                  <Box component="select" value={item.buildType || ''} onChange={(e) => handleProjectInventoryInlineChange(item.id, 'buildType', e.target.value)} sx={selectSx}>
                                    <option value="">—</option>
                                    {buildTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                  </Box>
                                </Box>

                                <Box sx={{ p: 0.6, borderBottom: '1px solid rgba(83,110,165,0.26)', backgroundColor: rowBg }}>
                                  <Box component="select" value={item.objectType || ''} onChange={(e) => handleProjectInventoryInlineChange(item.id, 'objectType', e.target.value)} sx={selectSx}>
                                    <option value="">—</option>
                                    {objectTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                  </Box>
                                </Box>

                                <Box sx={{ p: 0.45, borderBottom: '1px solid rgba(83,110,165,0.26)', backgroundColor: rowBg, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.2 }}>
                                  <IconButton size="small" title="Edit" onClick={() => handleEditInventoryItem(item)} sx={{ color: '#86A9E8', '&:hover': { backgroundColor: 'rgba(68,100,160,0.2)' } }}>
                                    <EditIcon sx={{ fontSize: '0.95rem' }} />
                                  </IconButton>
                                  <IconButton size="small" title="Delete" onClick={() => handleDeleteInventoryItem(item)} sx={{ color: '#88A0C7', '&:hover': { backgroundColor: 'rgba(68,100,160,0.2)' } }}>
                                    <DeleteIcon sx={{ fontSize: '0.95rem' }} />
                                  </IconButton>
                                </Box>
                              </React.Fragment>
                            );
                          })
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {/* Priorities Tab Content */}
          {tabValue === 2 && (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!activeProjectId ? (
                <Box sx={{
                  border: '1px solid rgba(93,121,176,0.35)',
                  borderRadius: 2,
                  backgroundColor: 'rgba(18,33,65,0.72)',
                  p: 2,
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75, color: '#BFD0F3' }}>
                    No Project Selected
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#8EA3CB' }}>
                    Select a project from the tree to view Late, In Progress, Due This Week, and Blocked tasks.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>Priority Tasks</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                    Late, in progress, due this week, and blocked tasks with direct links.
                  </Typography>

                  {[
                    { title: 'Late', tasks: lateTasks, border: 'rgba(214,77,119,0.45)', chipBg: 'rgba(168,58,87,0.32)', chipColor: '#FF809A' },
                    { title: 'In Progress', tasks: inProgressTasks, border: 'rgba(61,152,213,0.45)', chipBg: 'rgba(44,122,175,0.32)', chipColor: '#6EC7FF' },
                    { title: 'Due This Week', tasks: dueThisWeekTasks, border: 'rgba(205,145,53,0.45)', chipBg: 'rgba(156,108,43,0.32)', chipColor: '#FFC567' },
                    { title: 'Blocked', tasks: blockedTasks, border: 'rgba(216,83,83,0.45)', chipBg: 'rgba(150,58,58,0.32)', chipColor: '#FF8E8E' },
                  ].map((section) => (
                    <Box key={section.title} sx={{ border: `1px solid ${section.border}`, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(20,34,66,0.65)' }}>
                      <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <Typography sx={{ fontWeight: 700, color: section.chipColor }}>{section.title}</Typography>
                        <Box sx={{ px: 0.7, py: 0.05, borderRadius: 1, backgroundColor: section.chipBg, color: section.chipColor, fontWeight: 700, fontSize: '0.75rem' }}>
                          {section.tasks.length}
                        </Box>
                      </Box>

                      {section.tasks.length === 0 ? (
                        <Box sx={{ p: 2 }}>
                          <Typography variant="body2" color="text.secondary">No tasks in this section.</Typography>
                        </Box>
                      ) : (
                        <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                          {section.tasks.map((task: any) => (
                            <Box key={`${section.title}-${task.id}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1, py: 0.75, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {task.name || 'Untitled Task'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {getPriorityTaskContext(task)}
                                  {task.endDate ? ` • Due ${new Date(task.endDate).toLocaleDateString()}` : ''}
                                </Typography>
                              </Box>
                              <Link
                                component="button"
                                underline="hover"
                                onClick={() => handlePriorityTaskClick(task)}
                                sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'primary.light', whiteSpace: 'nowrap' }}
                              >
                                Open Task
                              </Link>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))}
                </>
              )}
            </Box>
          )}

          {/* Schedule Tab Content */}
          {tabValue === 3 && (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!activeCycleId ? (
                <Alert severity="info">Select a cycle or project in the tree to view the load calendar.</Alert>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>Schedule</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Weekly calendar view for object load dates. Colors represent assigned projects.
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">Phase:</Typography>
                      <Box
                        component="select"
                        value={schedulePhaseFilter}
                        onChange={(e) => setSchedulePhaseFilter(e.target.value)}
                        sx={{
                          p: '6px 10px',
                          border: '1px solid rgba(94,123,180,0.45)',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          color: '#DBE7FF',
                          backgroundColor: 'rgba(10, 22, 49, 0.9)',
                        }}
                      >
                        <option value="all">All</option>
                        {cutoverPhaseOptions.map((phase) => (
                          <option key={phase} value={phase}>{phase}</option>
                        ))}
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" startIcon={<ChevronLeftIcon />} onClick={() => {
                      const prev = new Date(scheduleWeekStart);
                      prev.setDate(prev.getDate() - 7);
                      setScheduleWeekStart(prev);
                    }}>
                      Prev
                    </Button>
                    <Button size="small" variant="contained" onClick={() => {
                      const now = new Date();
                      const day = now.getDay();
                      const diffToMonday = (day + 6) % 7;
                      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
                      monday.setHours(0, 0, 0, 0);
                      setScheduleWeekStart(monday);
                    }}>
                      Today
                    </Button>
                    <Button size="small" variant="outlined" endIcon={<ChevronRightIcon />} onClick={() => {
                      const next = new Date(scheduleWeekStart);
                      next.setDate(next.getDate() + 7);
                      setScheduleWeekStart(next);
                    }}>
                      Next
                    </Button>
                    <Typography sx={{ ml: 1, fontWeight: 700 }}>
                      Week of {scheduleWeekDates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {scheduleWeekDates[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                    {((projectsByMockCycle[activeCycleId] || []) as Project[]).map((project, idx) => {
                      const color = getProjectAccentColor(project, idx);
                      return (
                        <Box key={project.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{project.name}</Typography>
                        </Box>
                      );
                    })}
                  </Box>

                  <Box sx={{ border: '1px solid rgba(88,117,175,0.35)', borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(14,27,55,0.7)' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(88,117,175,0.25)' }}>
                      {scheduleWeekDates.map((day) => {
                        const today = new Date();
                        const isToday = isSameDay(day, today);
                        return (
                          <Box key={day.toISOString()} sx={{ p: 1, textAlign: 'center', borderRight: '1px solid rgba(88,117,175,0.18)', '&:last-of-type': { borderRight: 'none' }, backgroundColor: isToday ? 'rgba(85,120,191,0.25)' : 'rgba(255,255,255,0.02)' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#9FB0D8', textTransform: 'uppercase' }}>
                              {day.toLocaleDateString(undefined, { weekday: 'short' })}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>

                    {isLoadingCycleSchedule ? (
                      <Box sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">Loading schedule...</Typography></Box>
                    ) : (
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 190 }}>
                        {scheduleWeekDates.map((day) => {
                          const dayItems = cycleScheduleItems.filter((item: any) => {
                            if (schedulePhaseFilter !== 'all' && (item.cutoverPhase || '') !== schedulePhaseFilter) return false;
                            const loadDate = normalizeDateOnly(item.loadScheduledDate || undefined);
                            return !!loadDate && isSameDay(loadDate, day);
                          });

                          return (
                            <Box key={`${day.toISOString()}-cell`} sx={{ p: 1, borderRight: '1px solid rgba(88,117,175,0.18)', '&:last-of-type': { borderRight: 'none' }, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                              {dayItems.length === 0 ? (
                                <Typography variant="caption" color="text.disabled">No loads</Typography>
                              ) : (
                                dayItems.map((item: any) => (
                                  <Box key={item.id} sx={{ p: 0.75, borderRadius: 1, backgroundColor: toRgba(item.projectColor, 0.28), border: `1px solid ${toRgba(item.projectColor, 0.6)}` }}>
                                    <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontWeight: 700, color: item.projectColor }}>
                                      {item.objectId || 'Object'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: '#D2DDF8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {item.description || 'Load Object'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block', color: '#9FB0D8' }}>
                                      {item.projectName}
                                    </Typography>
                                  </Box>
                                ))
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ border: '1px solid rgba(88,117,175,0.35)', borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(14,27,55,0.7)' }}>
                    <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(88,117,175,0.25)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                      <Typography sx={{ fontWeight: 700 }}>Unscheduled</Typography>
                    </Box>
                    <Box sx={{ p: 1.25, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1 }}>
                      {cycleScheduleItems
                        .filter((item: any) => {
                          if (schedulePhaseFilter !== 'all' && (item.cutoverPhase || '') !== schedulePhaseFilter) return false;
                          return !normalizeDateOnly(item.loadScheduledDate || undefined);
                        })
                        .map((item: any) => (
                          <Box key={`unscheduled-${item.id}`} sx={{ p: 0.75, borderRadius: 1, backgroundColor: toRgba(item.projectColor, 0.22), border: `1px solid ${toRgba(item.projectColor, 0.5)}` }}>
                            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontWeight: 700, color: item.projectColor }}>
                              {item.objectId || 'Object'}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: '#D2DDF8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.description || 'Load Object'}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: '#9FB0D8' }}>
                              {item.projectName}
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Create Item Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ 
          background: theme => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark || theme.palette.primary.main} 100%)`,
          color: 'white',
          fontWeight: 600,
          fontSize: '1.1rem',
          pb: 2,
        }}>
          {dialogMode === 'program' && 'Create New Program'}
          {dialogMode === 'cycle' && 'Create New Mock Cycle'}
          {dialogMode === 'project' && 'Create New Project'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, maxHeight: '70vh', overflowY: 'auto', px: 3 }}>
          <TextField
            autoFocus
            fullWidth
            label="Name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Enter name"
            variant="outlined"
            size="small"
            sx={{ mb: 2, mt: 3 }}
          />
          {dialogMode === 'program' && (
            <TextField
              fullWidth
              label="Description"
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              multiline
              rows={3}
              placeholder="Optional description"
              variant="outlined"
              size="small"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            onClick={handleCreateItem}
            variant="contained"
            disabled={isCreating || !newItemName.trim()}
            sx={{ textTransform: 'none' }}
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
        {(menuType === 'task' || menuType === 'taskGroup' || menuType === 'program' || menuType === 'cycle' || menuType === 'project') && (
          <>
            <MenuItem
              onClick={() => {
                if (!menuItemId || !menuType) return;
                if (menuType === 'task') {
                  const objectIds = Array.from(new Set(projectTasks.filter(t => t.projectObjectId).map(t => t.projectObjectId)));
                  const groupIds = projectTaskGroups.map(g => g.id);
                  const currentKeys = [
                    ...objectIds.map((id: string) => objectRowKey(id)),
                    ...groupIds.map((id: string) => taskGroupRowKey(id)),
                  ];
                  const ordered = mergeOrder(planRowOrder, currentKeys);
                  setPlanRowOrder(moveWithin(ordered, objectRowKey(menuItemId), -1));
                } else if (menuType === 'taskGroup') {
                  const objectIds = Array.from(new Set(projectTasks.filter(t => t.projectObjectId).map(t => t.projectObjectId)));
                  const groupIds = projectTaskGroups.map(g => g.id);
                  const currentKeys = [
                    ...objectIds.map((id: string) => objectRowKey(id)),
                    ...groupIds.map((id: string) => taskGroupRowKey(id)),
                  ];
                  const ordered = mergeOrder(planRowOrder, currentKeys);
                  setPlanRowOrder(moveWithin(ordered, taskGroupRowKey(menuItemId), -1));
                } else if (menuType === 'program') {
                  const currentIds = programs.map(p => p.id);
                  const ordered = mergeOrder(treeOrder.programs, currentIds);
                  setTreeOrder(prev => ({ ...prev, programs: moveWithin(ordered, menuItemId, -1) }));
                } else if (menuType === 'cycle') {
                  let parentProgramId: string | null = null;
                  for (const progId in mockCycles) {
                    if ((mockCycles[progId] || []).some(c => c.id === menuItemId)) {
                      parentProgramId = progId;
                      break;
                    }
                  }
                  if (parentProgramId) {
                    const currentIds = (mockCycles[parentProgramId] || []).map(c => c.id);
                    const ordered = mergeOrder(treeOrder.cycles[parentProgramId] || [], currentIds);
                    setTreeOrder(prev => ({
                      ...prev,
                      cycles: { ...prev.cycles, [parentProgramId as string]: moveWithin(ordered, menuItemId, -1) },
                    }));
                  }
                } else if (menuType === 'project') {
                  let parentCycleId: string | null = null;
                  for (const cycleId in projectsByMockCycle) {
                    if ((projectsByMockCycle[cycleId] || []).some(p => p.id === menuItemId)) {
                      parentCycleId = cycleId;
                      break;
                    }
                  }
                  if (parentCycleId) {
                    const currentIds = (projectsByMockCycle[parentCycleId] || []).map(p => p.id);
                    const ordered = mergeOrder(treeOrder.projects[parentCycleId] || [], currentIds);
                    setTreeOrder(prev => ({
                      ...prev,
                      projects: { ...prev.projects, [parentCycleId as string]: moveWithin(ordered, menuItemId, -1) },
                    }));
                  }
                }
                setMenuAnchorEl(null);
              }}
            >
              Move Up
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (!menuItemId || !menuType) return;
                if (menuType === 'task') {
                  const objectIds = Array.from(new Set(projectTasks.filter(t => t.projectObjectId).map(t => t.projectObjectId)));
                  const groupIds = projectTaskGroups.map(g => g.id);
                  const currentKeys = [
                    ...objectIds.map((id: string) => objectRowKey(id)),
                    ...groupIds.map((id: string) => taskGroupRowKey(id)),
                  ];
                  const ordered = mergeOrder(planRowOrder, currentKeys);
                  setPlanRowOrder(moveWithin(ordered, objectRowKey(menuItemId), 1));
                } else if (menuType === 'taskGroup') {
                  const objectIds = Array.from(new Set(projectTasks.filter(t => t.projectObjectId).map(t => t.projectObjectId)));
                  const groupIds = projectTaskGroups.map(g => g.id);
                  const currentKeys = [
                    ...objectIds.map((id: string) => objectRowKey(id)),
                    ...groupIds.map((id: string) => taskGroupRowKey(id)),
                  ];
                  const ordered = mergeOrder(planRowOrder, currentKeys);
                  setPlanRowOrder(moveWithin(ordered, taskGroupRowKey(menuItemId), 1));
                } else if (menuType === 'program') {
                  const currentIds = programs.map(p => p.id);
                  const ordered = mergeOrder(treeOrder.programs, currentIds);
                  setTreeOrder(prev => ({ ...prev, programs: moveWithin(ordered, menuItemId, 1) }));
                } else if (menuType === 'cycle') {
                  let parentProgramId: string | null = null;
                  for (const progId in mockCycles) {
                    if ((mockCycles[progId] || []).some(c => c.id === menuItemId)) {
                      parentProgramId = progId;
                      break;
                    }
                  }
                  if (parentProgramId) {
                    const currentIds = (mockCycles[parentProgramId] || []).map(c => c.id);
                    const ordered = mergeOrder(treeOrder.cycles[parentProgramId] || [], currentIds);
                    setTreeOrder(prev => ({
                      ...prev,
                      cycles: { ...prev.cycles, [parentProgramId as string]: moveWithin(ordered, menuItemId, 1) },
                    }));
                  }
                } else if (menuType === 'project') {
                  let parentCycleId: string | null = null;
                  for (const cycleId in projectsByMockCycle) {
                    if ((projectsByMockCycle[cycleId] || []).some(p => p.id === menuItemId)) {
                      parentCycleId = cycleId;
                      break;
                    }
                  }
                  if (parentCycleId) {
                    const currentIds = (projectsByMockCycle[parentCycleId] || []).map(p => p.id);
                    const ordered = mergeOrder(treeOrder.projects[parentCycleId] || [], currentIds);
                    setTreeOrder(prev => ({
                      ...prev,
                      projects: { ...prev.projects, [parentCycleId as string]: moveWithin(ordered, menuItemId, 1) },
                    }));
                  }
                }
                setMenuAnchorEl(null);
              }}
            >
              Move Down
            </MenuItem>
            <Divider />
          </>
        )}
        <MenuItem
          onClick={() => {
            if (!menuItemId || !menuType) return;
            if (menuType === 'task' || menuType === 'taskGroup') {
              // For tasks and task groups, open edit dialog
              if (menuType === 'task') {
                setEditingTaskId(menuItemId);
              } else {
                setEditingTaskGroupId(menuItemId);
              }
            } else {
              openEditDialog(menuType, menuItemId);
            }
            setMenuAnchorEl(null);
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
            } else if (menuType === 'task') {
              const task = projectTasks.find(t => t.projectObjectId === menuItemId);
              itemName = task?.name || 'Unknown Task';
            } else if (menuType === 'taskGroup') {
              const group = projectTaskGroups.find(g => g.id === menuItemId);
              itemName = group?.name || 'Unknown Group';
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
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ 
          background: theme => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark || theme.palette.primary.main} 100%)`,
          color: 'white',
          fontWeight: 600,
          fontSize: '1.1rem',
          pb: 2,
        }}>
          Edit {editItemType}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, maxHeight: '70vh', overflowY: 'auto', px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Name"
            value={editItemName}
            onChange={(e) => setEditItemName(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ mt: 3 }}
          />
          
          {editItemType === 'program' && (
            <TextField
              label="Description"
              value={editItemDesc}
              onChange={(e) => setEditItemDesc(e.target.value)}
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              size="small"
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
                variant="outlined"
                size="small"
              />
              <TextField
                label="End Date"
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                variant="outlined"
                size="small"
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
                variant="outlined"
                size="small"
              />
              <TextField
                label="End Date"
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                variant="outlined"
                size="small"
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  label="Accent Color"
                  type="color"
                  value={editAccentColor}
                  onChange={(e) => setEditAccentColor(e.target.value)}
                  sx={{ width: '100px' }}
                  variant="outlined"
                  size="small"
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
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isEditing} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleEditConfirm}
            variant="contained"
            color="primary"
            disabled={isEditing}
            sx={{ textTransform: 'none' }}
          >
            {isEditing ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Data Object Dialog */}
      <Dialog open={dataObjectDialogOpen} onClose={() => setDataObjectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', pb: 2 }}>
          Add Data Object to Plan
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            select
            autoFocus
            fullWidth
            label="Select Object from Inventory"
            value={newDataObjectId}
            onChange={(e) => setNewDataObjectId(e.target.value)}
            margin="normal"
            helperText="Only objects in this project's inventory are available"
            variant="outlined"
            size="small"
          >
            {projectInventoryItems.length > 0 ? (
              projectInventoryItems.map((item) => (
                <MenuItem key={item.id} value={item.objectId}>
                  {item.objectId} {item.processArea && `(${item.processArea})`}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>No objects in project inventory</MenuItem>
            )}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => {
            setDataObjectDialogOpen(false);
            setNewDataObjectId('');
            setNewDataObjectName('');
          }}
          sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (selectedItem?.type !== 'project') {
                alert('Please select a project first');
                return;
              }

              if (!activeProjectId) {
                alert('Project ID not found');
                return;
              }

              try {
                setIsCreatingDataObject(true);
                
                // Find the project object for the selected inventory item
                const inventoryItem = projectInventoryItems.find(item => item.objectId === newDataObjectId);
                if (!inventoryItem) {
                  alert('Selected object not found');
                  return;
                }

                // Create a task for this object — use default templates
                const tasksResponse = await apiClient.post(`/api/tasks/defaults/project-object/${inventoryItem.id}`, {
                  projectId: activeProjectId,
                });
                const newTasks = tasksResponse.data.data || [];
                setProjectTasks([...projectTasks, ...newTasks]);
                setDataObjectDialogOpen(false);
                setNewDataObjectId('');
                setNewDataObjectName('');
              } catch (error) {
                console.error('Failed to add object to plan:', error);
                alert('Failed to add object to plan');
              } finally {
                setIsCreatingDataObject(false);
              }
            }}
            variant="contained"
            disabled={isCreatingDataObject || !newDataObjectId.trim()}
            sx={{ textTransform: 'none' }}
          >
            {isCreatingDataObject ? 'Adding...' : 'Add to Plan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* People Sidebar Overlay */}
      {peopleSidebarOpen && (
        <>
          {/* Backdrop */}
          <Box
            onClick={() => setPeopleSidebarOpen(false)}
            sx={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1299 }}
          />
          {/* Sidebar Panel */}
          <Box sx={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
            backgroundColor: '#1A1E2E', borderLeft: '1px solid rgba(255,255,255,0.08)',
            zIndex: 1300, display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
          }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <GroupIcon sx={{ color: 'primary.light', fontSize: '1.2rem' }} />
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>People Directory</Typography>
            </Box>
            <IconButton size="small" onClick={() => setPeopleSidebarOpen(false)}><CloseIcon sx={{ fontSize: '1.1rem' }} /></IconButton>
          </Box>

          {/* Table Header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr 80px', gap: 0, px: 3, py: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['NAME', 'ROLE', 'EMAIL', 'ACTIONS'].map(h => (
              <Typography key={h} variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 600 }}>{h}</Typography>
            ))}
          </Box>

          {/* People List */}
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {people.map(person => (
              <Box key={person.id}>
                {editingPersonId === person.id ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr 80px', gap: 0.5, px: 2, py: 1, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <TextField size="small" value={editPersonName} onChange={e => setEditPersonName(e.target.value)} sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem', height: 28 } }} />
                    <TextField select size="small" value={editPersonRole} onChange={e => setEditPersonRole(e.target.value)} sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem', height: 28 } }}>
                      <MenuItem value=""><em>None</em></MenuItem>
                      {peopleRoles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </TextField>
                    <TextField size="small" value={editPersonEmail} onChange={e => setEditPersonEmail(e.target.value)} sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem', height: 28 } }} />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={async () => {
                        const res = await apiClient.patch(`/api/people/${person.id}`, { name: editPersonName, role: editPersonRole, email: editPersonEmail });
                        setPeople(prev => prev.map(p => p.id === person.id ? res.data.data : p));
                        setEditingPersonId(null);
                      }}><Box sx={{ fontSize: '0.7rem', color: 'success.main', fontWeight: 700 }}>✓</Box></IconButton>
                      <IconButton size="small" onClick={() => setEditingPersonId(null)}><CloseIcon sx={{ fontSize: '0.9rem' }} /></IconButton>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr 80px', gap: 0, px: 3, py: 1.25, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{person.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{person.role || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.email || '—'}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.25 }}>
                      <IconButton size="small" onClick={() => { setEditingPersonId(person.id); setEditPersonName(person.name); setEditPersonRole(person.role || ''); setEditPersonEmail(person.email || ''); }} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                        <EditIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                      <IconButton size="small" onClick={async () => { await apiClient.delete(`/api/people/${person.id}`); setPeople(prev => prev.filter(p => p.id !== person.id)); }} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                        <DeleteIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
          </Box>

          {/* Add Person */}
          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 2 }}>
            {addPersonOpen ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField size="small" placeholder="Name *" value={newPersonName} onChange={e => setNewPersonName(e.target.value)} sx={{ flex: 1 }} autoFocus />
                  <TextField select size="small" value={newPersonRole} onChange={e => setNewPersonRole(e.target.value)} sx={{ flex: 1 }} label="Role">
                    <MenuItem value=""><em>None</em></MenuItem>
                    {peopleRoles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </TextField>
                </Box>
                <TextField size="small" placeholder="Email" value={newPersonEmail} onChange={e => setNewPersonEmail(e.target.value)} fullWidth />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button size="small" onClick={() => { setAddPersonOpen(false); setNewPersonName(''); setNewPersonRole(''); setNewPersonEmail(''); }} sx={{ textTransform: 'none' }}>Cancel</Button>
                  <Button size="small" variant="contained" disabled={!newPersonName.trim()} onClick={async () => {
                    const res = await apiClient.post('/api/people', { name: newPersonName.trim(), role: newPersonRole.trim() || undefined, email: newPersonEmail.trim() || undefined });
                    setPeople(prev => [...prev, res.data.data]);
                    setNewPersonName(''); setNewPersonRole(''); setNewPersonEmail('');
                    setAddPersonOpen(false);
                  }} sx={{ textTransform: 'none' }}>Add</Button>
                </Box>
              </Box>
            ) : (
              <Button size="small" variant="outlined" startIcon={<AddIcon />} fullWidth onClick={() => setAddPersonOpen(true)} sx={{ textTransform: 'none', borderStyle: 'dashed' }}>Add Person</Button>
            )}
          </Box>
        </Box>
        </>
      )}

      {/* Task Comments Modal */}
      {commentModalTask && (
        <TaskCommentsModal
          open={!!commentModalTask}
          onClose={() => setCommentModalTask(null)}
          taskId={commentModalTask.id}
          taskName={commentModalTask.name}
          accentColor={(() => {
            if (selectedItem?.type === 'project') {
              for (const cycleId in projectsByMockCycle) {
                const p = (projectsByMockCycle[cycleId] || []).find((p: any) => p.id === selectedItem.id);
                if (p) return p.accentColor || '#00BFA5';
              }
            }
            return '#00BFA5';
          })()}
          people={people}
          onCommentsChange={(count) => setTaskCommentCounts(prev => ({ ...prev, [commentModalTask.id]: count }))}
        />
      )}

      {/* Task Dependency Dialog */}
      <Dialog open={!!depDialogTaskId} onClose={() => setDepDialogTaskId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Task Dependencies</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Select tasks that must complete before this task can start.
          </Typography>
          <TextField
            fullWidth size="small" placeholder="Search tasks..."
            sx={{ mb: 1.5 }}
            onChange={e => {
              const v = e.target.value.toLowerCase();
              setCycleTasksForDep(prev => prev.map(t => ({ ...t, _hidden: v ? !(t.name || '').toLowerCase().includes(v) : false })));
            }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 300, overflowY: 'auto' }}>
            {cycleTasksForDep.filter(t => t.id !== depDialogTaskId && !t._hidden).map(t => {
              const isDep = (taskDeps[depDialogTaskId || ''] || []).some((d: any) => d.dependsOnTaskId === t.id);
              const obj = projectInventoryItems.find(o => o.id === t.projectObjectId);
              return (
                <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.6, px: 1, borderRadius: 1, cursor: 'pointer', backgroundColor: isDep ? 'rgba(91,103,202,0.12)' : 'transparent', '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' } }}
                  onClick={async () => {
                    if (isDep) {
                      await apiClient.delete(`/api/tasks/${depDialogTaskId}/dependencies/${t.id}`);
                    } else {
                      await apiClient.post(`/api/tasks/${depDialogTaskId}/dependencies`, { dependsOnTaskId: t.id });
                    }
                    if (depDialogTaskId) await loadTaskDeps(depDialogTaskId);
                  }}>
                  <Box sx={{ width: 16, height: 16, borderRadius: '3px', border: '2px solid', borderColor: isDep ? 'primary.main' : 'rgba(255,255,255,0.3)', backgroundColor: isDep ? 'primary.main' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isDep && <Box sx={{ width: 8, height: 8, backgroundColor: 'white', borderRadius: '1px' }} />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.name || 'Unnamed'}</Typography>
                    {obj && <Typography variant="caption" color="text.disabled">{obj.objectId}</Typography>}
                  </Box>
                  <Box sx={{ px: 1, py: 0.25, borderRadius: 1, fontSize: '0.68rem', fontWeight: 600, backgroundColor: `${getTaskStatusColor(t.status)}22`, color: getTaskStatusColor(t.status) }}>{t.status}</Box>
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepDialogTaskId(null)} sx={{ textTransform: 'none' }}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Task Group Dialog */}
      <Dialog open={taskGroupDialogOpen} onClose={() => setTaskGroupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', pb: 2 }}>
          Add Task Group
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Task Group Name"
            value={newTaskGroupName}
            onChange={(e) => setNewTaskGroupName(e.target.value)}
            margin="normal"
            placeholder="e.g., Data Validation Tasks"
            variant="outlined"
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => {
            setTaskGroupDialogOpen(false);
            setNewTaskGroupName('');
          }}
          sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (selectedItem?.type !== 'project') {
                alert('Please select a project first');
                return;
              }

              if (!activeProjectId) {
                alert('Project ID not found');
                return;
              }

              try {
                setIsCreatingTaskGroup(true);
                
                const response = await apiClient.post(`/api/tasks/groups/project/${activeProjectId}`, {
                  name: newTaskGroupName,
                });

                console.log('Task group created successfully:', response.data);
                const newGroup = response.data.data;
                setProjectTaskGroups([...projectTaskGroups, newGroup]);
                setTaskGroupDialogOpen(false);
                setNewTaskGroupName('');
              } catch (error) {
                console.error('Failed to create task group:', error);
                alert('Failed to create task group');
              } finally {
                setIsCreatingTaskGroup(false);
              }
            }}
            variant="contained"
            disabled={isCreatingTaskGroup || !newTaskGroupName.trim()}
            sx={{ textTransform: 'none' }}
          >
            {isCreatingTaskGroup ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Catalog Object Dialog */}
      <Dialog open={catalogObjectDialogOpen} onClose={() => {
        setCatalogObjectDialogOpen(false);
        setEditingCatalogObjectId(null);
        setCatalogObjectId('');
        setCatalogObjectDesc('');
        setCatalogProcessArea('');
      }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ 
          background: theme => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark || theme.palette.primary.main} 100%)`,
          color: 'white',
          fontWeight: 600,
          fontSize: '1.1rem',
          pb: 2,
        }}>{editingCatalogObjectId ? 'Edit Object' : 'Add Object to Catalog'}</DialogTitle>
        <DialogContent sx={{ pt: 2, maxHeight: '70vh', overflowY: 'auto', px: 3 }}>
          <TextField
            autoFocus
            fullWidth
            label="Object ID"
            value={catalogObjectId}
            onChange={(e) => setCatalogObjectId(e.target.value)}
            placeholder="e.g., H2R.CNV.068"
            disabled={!!editingCatalogObjectId}
            variant="outlined"
            size="small"
            sx={{ mb: 2, mt: 3 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={catalogObjectDesc}
            onChange={(e) => setCatalogObjectDesc(e.target.value)}
            multiline
            rows={3}
            placeholder="Enter detailed object description"
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Process Area"
            value={catalogProcessArea}
            onChange={(e) => setCatalogProcessArea(e.target.value)}
            placeholder="e.g., H2R, Finance, HR"
            variant="outlined"
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => {
            setCatalogObjectDialogOpen(false);
            setEditingCatalogObjectId(null);
            setCatalogObjectId('');
            setCatalogObjectDesc('');
            setCatalogProcessArea('');
          }} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              try {
                setIsCreatingCatalogObject(true);
                
                if (editingCatalogObjectId) {
                  // Update existing object
                  await apiClient.put(`/api/global-objects/${editingCatalogObjectId}`, {
                    description: catalogObjectDesc,
                    processArea: catalogProcessArea,
                  });
                  setInventoryObjects(inventoryObjects.map(obj =>
                    obj.id === editingCatalogObjectId
                      ? { ...obj, description: catalogObjectDesc, processArea: catalogProcessArea }
                      : obj
                  ));
                } else {
                  // Add new object
                  const response = await apiClient.post('/api/global-objects', {
                    objectId: catalogObjectId,
                    description: catalogObjectDesc,
                    processArea: catalogProcessArea,
                  });
                  
                  const newObject = response.data.data || {
                    id: Math.random().toString(36).substr(2, 9),
                    objectId: catalogObjectId,
                    description: catalogObjectDesc,
                    processArea: catalogProcessArea,
                  };
                  setInventoryObjects([...inventoryObjects, newObject]);
                }
                
                setCatalogObjectDialogOpen(false);
                setEditingCatalogObjectId(null);
                setCatalogObjectId('');
                setCatalogObjectDesc('');
                setCatalogProcessArea('');
              } catch (error) {
                console.error('Failed to save object:', error);
                alert('Failed to save object. Please try again.');
              } finally {
                setIsCreatingCatalogObject(false);
              }
            }}
            variant="contained"
            disabled={isCreatingCatalogObject || !catalogObjectId.trim() || !catalogObjectDesc.trim()}
            sx={{ textTransform: 'none' }}
          >
            {isCreatingCatalogObject ? (editingCatalogObjectId ? 'Updating...' : 'Adding...') : (editingCatalogObjectId ? 'Update' : 'Add Object')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Catalog Object Confirmation Dialog */}
      <Dialog open={!!deletingCatalogObjectId} onClose={() => setDeletingCatalogObjectId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Object</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deletingCatalogObjectName}</strong>?
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingCatalogObjectId(null)} disabled={isDeletingCatalogObject}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteCatalogObject}
            variant="contained"
            color="error"
            disabled={isDeletingCatalogObject}
          >
            {isDeletingCatalogObject ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Inventory Item Dialog */}
      <Dialog open={projectInventoryDialogOpen} onClose={() => {
        setProjectInventoryDialogOpen(false);
        setEditingInventoryItemId(null);
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
      }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ 
          background: theme => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark || theme.palette.primary.main} 100%)`,
          color: 'white',
          fontWeight: 600,
          fontSize: '1.1rem',
          pb: 2,
        }}>
          {editingInventoryItemId ? 'Edit Project Inventory Item' : 'Add Project Inventory Item'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, maxHeight: '70vh', overflowY: 'auto', px: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 3 }}>
            <TextField
              select
              fullWidth
              label="Data Object ID"
              value={projectInventoryItem.dataObjectId}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, dataObjectId: e.target.value })}
              disabled={editingInventoryItemId !== null}
              variant="outlined"
              size="small"
            >
              {inventoryObjects.map((obj) => (
                <MenuItem key={obj.id} value={obj.objectId}>
                  {obj.objectId}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Process Area"
              value={projectInventoryItem.processArea}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, processArea: e.target.value })}
              variant="outlined"
              size="small"
            >
              {processAreaOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Complexity"
              value={projectInventoryItem.complexity}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, complexity: e.target.value })}
              variant="outlined"
              size="small"
            >
              {complexityOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Deployment Disposition"
              value={projectInventoryItem.deploymentDisposition}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, deploymentDisposition: e.target.value })}
              variant="outlined"
              size="small"
            >
              {deploymentDispositionOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Build Type"
              value={projectInventoryItem.buildType}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, buildType: e.target.value })}
              variant="outlined"
              size="small"
            >
              {buildTypeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Object Type"
              value={projectInventoryItem.objectType}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, objectType: e.target.value })}
              variant="outlined"
              size="small"
            >
              {objectTypeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="DRA (Person)"
              value={projectInventoryItem.dra}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, dra: e.target.value })}
              placeholder="Enter person name"
              variant="outlined"
              size="small"
            />

            <TextField
              fullWidth
              label="Developer"
              value={projectInventoryItem.developer}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, developer: e.target.value })}
              placeholder="Enter person name"
              variant="outlined"
              size="small"
            />

            <TextField
              fullWidth
              label="Systems Analyst"
              value={projectInventoryItem.systemsAnalyst}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, systemsAnalyst: e.target.value })}
              placeholder="Enter person name"
              variant="outlined"
              size="small"
            />

            <TextField
              select
              fullWidth
              label="Cutover Phase"
              value={projectInventoryItem.cutoverPhase}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, cutoverPhase: e.target.value })}
              variant="outlined"
              size="small"
            >
              {cutoverPhaseOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="DDM Approach"
              value={projectInventoryItem.ddmApproach}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, ddmApproach: e.target.value })}
              variant="outlined"
              size="small"
            >
              {ddmApproachOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Risk/Security Type"
              value={projectInventoryItem.riskSecurityType}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, riskSecurityType: e.target.value })}
              variant="outlined"
              size="small"
            >
              {riskSecurityTypeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Migration Type"
              value={projectInventoryItem.migrationType}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, migrationType: e.target.value })}
              variant="outlined"
              size="small"
            >
              {migrationTypeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Factor Type"
              value={projectInventoryItem.factorType}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, factorType: e.target.value })}
              variant="outlined"
              size="small"
            >
              {factorTypeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Load Method"
              value={projectInventoryItem.loadMethod}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, loadMethod: e.target.value })}
              variant="outlined"
              size="small"
            >
              {loadMethodOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => {
              setProjectInventoryDialogOpen(false);
              setEditingInventoryItemId(null);
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
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!selectedProjectForInventory) {
                alert('Please select a project first');
                return;
              }

              try {
                setIsCreatingProjectInventoryItem(true);
                
                // Find the global object ID from the selected dataObjectId
                const globalObj = inventoryObjects.find(obj => obj.objectId === projectInventoryItem.dataObjectId);
                if (!globalObj) {
                  alert('Selected object not found');
                  return;
                }

                if (editingInventoryItemId) {
                  // Update existing item
                  await apiClient.patch(`/api/project-objects/${editingInventoryItemId}`, {
                    processArea: projectInventoryItem.processArea || null,
                    complexity: projectInventoryItem.complexity || null,
                    deploymentDisposition: projectInventoryItem.deploymentDisposition || null,
                    buildType: projectInventoryItem.buildType || null,
                    objectType: projectInventoryItem.objectType || null,
                    cutoverPhase: projectInventoryItem.cutoverPhase || null,
                    ddmApproach: projectInventoryItem.ddmApproach || null,
                    riskSecurityType: projectInventoryItem.riskSecurityType || null,
                    migrationType: projectInventoryItem.migrationType || null,
                    factorType: projectInventoryItem.factorType || null,
                    loadMethod: projectInventoryItem.loadMethod || null,
                  });
                  
                  // Update local state - map backend response fields to frontend fields
                  setProjectInventoryItems(projectInventoryItems.map(item =>
                    item.id === editingInventoryItemId 
                      ? {
                          ...item,
                          processArea: projectInventoryItem.processArea,
                          complexity: projectInventoryItem.complexity,
                          deploymentDisposition: projectInventoryItem.deploymentDisposition,
                          buildType: projectInventoryItem.buildType,
                          objectType: projectInventoryItem.objectType,
                          cutoverPhase: projectInventoryItem.cutoverPhase,
                          ddmApproach: projectInventoryItem.ddmApproach,
                          riskSecurityType: projectInventoryItem.riskSecurityType,
                          migrationType: projectInventoryItem.migrationType,
                          factorType: projectInventoryItem.factorType,
                          loadMethod: projectInventoryItem.loadMethod,
                        }
                      : item
                  ));
                  setEditingInventoryItemId(null);
                } else {
                  // Add new item
                  const response = await apiClient.post(`/api/project-objects/project/${selectedProjectForInventory}`, {
                    globalObjectId: globalObj.id,
                    complexity: projectInventoryItem.complexity || null,
                    deploymentDisposition: projectInventoryItem.deploymentDisposition || null,
                    buildType: projectInventoryItem.buildType || null,
                    objectType: projectInventoryItem.objectType || null,
                    cutoverPhase: projectInventoryItem.cutoverPhase || null,
                    ddmApproach: projectInventoryItem.ddmApproach || null,
                    riskSecurityType: projectInventoryItem.riskSecurityType || null,
                    migrationType: projectInventoryItem.migrationType || null,
                    factorType: projectInventoryItem.factorType || null,
                    loadMethod: projectInventoryItem.loadMethod || null,
                  });
                  
                  // Map the API response to frontend format
                  const apiData = response.data.data;
                  const newItem = {
                    id: apiData.id,
                    projectId: apiData.projectId,
                    dataObjectId: apiData.objectId,
                    objectId: apiData.objectId,
                    globalObjectId: apiData.globalObjectId,
                    processArea: apiData.processArea,
                    complexity: apiData.complexity,
                    deploymentDisposition: apiData.deploymentDisposition,
                    buildType: apiData.buildType,
                    objectType: apiData.objectType,
                    cutoverPhase: apiData.cutoverPhase,
                    ddmApproach: apiData.ddmApproach,
                    riskSecurityType: apiData.riskSecurityType,
                    migrationType: apiData.migrationType,
                    factorType: apiData.factorType,
                    loadMethod: apiData.loadMethod,
                    startDate: apiData.startDate,
                    endDate: apiData.endDate,
                  };
                  setProjectInventoryItems([...projectInventoryItems, newItem]);
                }
                
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
              } catch (error) {
                console.error('Failed to save item:', error);
                alert('Failed to save item. Please try again.');
              } finally {
                setIsCreatingProjectInventoryItem(false);
              }
            }}
            variant="contained"
            disabled={isCreatingProjectInventoryItem || !projectInventoryItem.dataObjectId.trim() || !selectedProjectForInventory}
            sx={{ textTransform: 'none' }}
          >
            {isCreatingProjectInventoryItem ? 'Saving...' : (editingInventoryItemId ? 'Update' : 'Add Item')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Inventory Item Confirmation Dialog */}
      <Dialog open={deletingInventoryItemId !== null} onClose={() => setDeletingInventoryItemId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography>
              Are you sure you want to delete <strong>{deletingInventoryItemName}</strong>?
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
              This action cannot be undone.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingInventoryItemId(null)}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteInventoryItem}
            variant="contained"
            color="error"
            disabled={isDeletingInventoryItem}
          >
            {isDeletingInventoryItem ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default ProjectsPage;
