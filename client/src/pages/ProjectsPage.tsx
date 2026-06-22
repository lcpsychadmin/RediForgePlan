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
  Checkbox,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SaveIcon from '@mui/icons-material/Save';
import { TaskCommentsModal } from '../components/TaskCommentsModal';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from '@mui/icons-material/Search';
import EventIcon from '@mui/icons-material/Event';
import ViewListIcon from '@mui/icons-material/ViewList';
import MenuIcon from '@mui/icons-material/Menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Menu from '@mui/material/Menu';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import Layout from '../components/Layout';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import ProjectDefectsPage from './ProjectDefectsPage';
import { useAuth } from '../contexts/AuthContext';

interface Program {
  id: string;
  name: string;
  description?: string;
  accentColor?: string;
}

interface MockCycle {
  id: string;
  programId: string;
  name: string;
  startDate: string;
  endDate: string;
  accentColor?: string;
  scheduleMode?: 'all_days' | 'working_days';
}

type CalendarMode = 'all_days' | 'working_days';
type TaskCalendarOverride = 'inherit' | CalendarMode;

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
const HIERARCHY_SELECTION_STORAGE_KEY = 'rf_selected_hierarchy_context';

type PlanOverview = {
  projectCount: number;
  objectCount: number;
  taskGroupCount: number;
  taskCount: number;
  statusCounts: { complete: number; in_progress: number; blocked: number; not_started: number };
  progressPct: number;
  timelineStart: string | null;
  timelineEnd: string | null;
};

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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
  const [newItemAccentColor, setNewItemAccentColor] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCycleScheduleMode, setNewCycleScheduleMode] = useState<CalendarMode>('all_days');
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
  const [editCycleScheduleMode, setEditCycleScheduleMode] = useState<CalendarMode>('all_days');
  const [editAccentColor, setEditAccentColor] = useState('');
  const [editProgressPercentage, setEditProgressPercentage] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [cloneCycleDialogOpen, setCloneCycleDialogOpen] = useState(false);
  const [cloneCycleSourceId, setCloneCycleSourceId] = useState<string | null>(null);
  const [cloneCycleSourceProgramId, setCloneCycleSourceProgramId] = useState<string | null>(null);
  const [cloneCycleName, setCloneCycleName] = useState('');
  const [isCloningCycle, setIsCloningCycle] = useState(false);
  const [cycleOverview, setCycleOverview] = useState<PlanOverview | null>(null);
  const [isLoadingCycleOverview, setIsLoadingCycleOverview] = useState(false);
  const [programOverview, setProgramOverview] = useState<PlanOverview | null>(null);
  const [isLoadingProgramOverview, setIsLoadingProgramOverview] = useState(false);

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
  const [planAssignedFilter, setPlanAssignedFilter] = useState('');
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
  const [depSearchTerm, setDepSearchTerm] = useState('');
  const [depTreeExpanded, setDepTreeExpanded] = useState<Record<string, boolean>>({});
  const [defaultTaskOrder, setDefaultTaskOrder] = useState<string[]>([]);

  // Refs for always-current values — avoids stale closures in cascade
  const projectTasksRef = React.useRef<any[]>([]);
  projectTasksRef.current = projectTasks;
  const taskDepsRef = React.useRef<Record<string, any[]>>({});
  taskDepsRef.current = taskDeps;

  // Comment modal state
  const [commentModalTask, setCommentModalTask] = useState<{ id: string; name: string } | null>(null);
  const [priorityModalTask, setPriorityModalTask] = useState<any | null>(null);
  const [editingTaskInitialTab, setEditingTaskInitialTab] = useState(0);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [taskCommentCounts, setTaskCommentCounts] = useState<Record<string, number>>({});
  const [planRowOrder, setPlanRowOrder] = useState<string[]>([]);
  const [dragItem, setDragItem] = useState<{ type: 'planRow'; key: string } | null>(null);
  const [taskRowMenuAnchorEl, setTaskRowMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [taskRowMenuTask, setTaskRowMenuTask] = useState<any | null>(null);
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
  const [isHierarchySidebarOpen, setIsHierarchySidebarOpen] = useState(false);

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

  const openTaskRowMenu = (event: React.MouseEvent<HTMLElement>, task: any) => {
    event.stopPropagation();
    setTaskRowMenuAnchorEl(event.currentTarget);
    setTaskRowMenuTask(task);
    setMenuType('task');
  };

  const closeTaskRowMenu = () => {
    setTaskRowMenuAnchorEl(null);
    setTaskRowMenuTask(null);
    setMenuType(null);
  };

  const openTaskDetails = (task: any, initialTab = 0) => {
    setEditingTask(task);
    setEditingTaskInitialTab(initialTab);
  };

  const handleHierarchySelection = (item: SelectableItem) => {
    setSelectedItem(item);
    // On mobile, keep the tree open while traversing hierarchy levels.
    // Close only once the user selects a concrete project.
    if (isMobile && item.type === 'project') {
      setIsHierarchySidebarOpen(false);
    }
  };

  useEffect(() => {
    if (!isMobile) {
      setIsHierarchySidebarOpen(false);
    }
  }, [isMobile]);

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

  const inventoryProjects = React.useMemo(() => {
    const seen = new Set<string>();
    const unique: Project[] = [];
    Object.values(mockCycles).flat().forEach((cycle: any) => {
      const cycleProjects = projectsByMockCycle[cycle.id] || [];
      cycleProjects.forEach((project: Project) => {
        const nameKey = (project.name || '').trim().toLowerCase();
        const dedupeKey = nameKey || project.id;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          unique.push(project);
        }
      });
    });
    return unique;
  }, [mockCycles, projectsByMockCycle]);

  useEffect(() => {
    if (inventoryProjects.length === 0) {
      if (selectedProjectForInventory !== null) setSelectedProjectForInventory(null);
      return;
    }

    const stillExists = selectedProjectForInventory
      ? inventoryProjects.some((project) => project.id === selectedProjectForInventory)
      : false;

    if (!stillExists) {
      setSelectedProjectForInventory(inventoryProjects[0].id);
    }
  }, [inventoryProjects, selectedProjectForInventory]);

  // Keep inventory and plan project contexts isolated.
  const activeProjectId = tabValue === 1
    ? selectedProjectForInventory
    : (selectedItem?.type === 'project' ? selectedItem.id : null);
  const activeCycleId = selectedItem?.type === 'project'
    ? selectedItem.cycleId
    : selectedItem?.type === 'cycle'
      ? selectedItem.id
      : null;

  useEffect(() => {
    if (!selectedItem) return;

    const payload = selectedItem.type === 'project'
      ? { type: 'project', projectId: selectedItem.id, cycleId: selectedItem.cycleId }
      : selectedItem.type === 'cycle'
        ? { type: 'cycle', cycleId: selectedItem.id, programId: selectedItem.programId }
        : { type: 'program', programId: selectedItem.id };

    localStorage.setItem(HIERARCHY_SELECTION_STORAGE_KEY, JSON.stringify(payload));
  }, [selectedItem]);
  const activeCycleScheduleMode: CalendarMode = (() => {
    if (!activeCycleId) return 'all_days';
    for (const programId in mockCycles) {
      const cycle = (mockCycles[programId] || []).find((c: MockCycle) => c.id === activeCycleId);
      if (cycle?.scheduleMode === 'working_days') return 'working_days';
      if (cycle?.scheduleMode === 'all_days') return 'all_days';
    }
    return 'all_days';
  })();

  const { data: myTasksData, isLoading: isLoadingMyTasks, error: myTasksError } = useQuery({
    queryKey: ['projects-my-tasks', user?.id, user?.email, activeCycleId, programs.length, Object.keys(mockCycles).length, Object.keys(projectsByMockCycle).length],
    queryFn: async () => {
      const normalizeValue = (value?: string | null) => (value || '').trim().toLowerCase();
      const emailAlias = normalizeValue((user?.email || '').split('@')[0]?.split('+')[0]);
      const tokenSet = new Set(
        [user?.id, user?.email, emailAlias]
          .map((item) => normalizeValue(item))
          .filter(Boolean)
      );

      const cycleScopes = Object.entries(mockCycles).flatMap(([programId, cycles]) => {
        const program = programs.find((p: any) => p.id === programId);
        return (cycles || []).map((cycle: any) => ({ program, cycle }));
      });

      const filteredCycleScopes = activeCycleId
        ? cycleScopes.filter(({ cycle }: any) => cycle?.id === activeCycleId)
        : cycleScopes;

      const projectScopes = filteredCycleScopes.flatMap(({ program, cycle }: any) => {
        const projects = projectsByMockCycle[cycle.id] || [];
        return projects.map((project: any) => ({ program, cycle, project }));
      });

      const taskBatches = await Promise.all(
        projectScopes.map(async ({ program, cycle, project }: any) => {
          try {
            const tasksResponse = await apiClient.get(`/api/tasks/project/${project.id}`);
            const tasks = tasksResponse.data.data || [];
            return tasks
              .filter((task: any) => {
                const dra = normalizeValue(task.draUserId);
                const developer = normalizeValue(task.developerUserId);
                const assignedTo = normalizeValue(task.assignedTo);
                return tokenSet.has(dra) || tokenSet.has(developer) || tokenSet.has(assignedTo);
              })
              .map((task: any) => ({
                ...task,
                taskId: task.id,
                taskName: task.name,
                projectName: project.name,
                mockCycleName: cycle.name,
                programName: program?.name || 'Program',
              }));
          } catch {
            return [];
          }
        })
      );

      const assignedTasks = taskBatches.flat();
      const parseDateOnlyLocal = (value?: string) => {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      };
      const now = new Date();
      const todayStartLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekEndLocal = new Date(todayStartLocal);
      weekEndLocal.setDate(todayStartLocal.getDate() + 6);

      const sections = {
        late: assignedTasks.filter((task: any) => {
          if (task.status === 'complete') return false;
          const end = parseDateOnlyLocal(task.endDate);
          return !!end && end < todayStartLocal;
        }),
        in_progress: assignedTasks.filter((task: any) => task.status === 'in_progress'),
        due_this_week: assignedTasks.filter((task: any) => {
          if (task.status === 'complete') return false;
          const end = parseDateOnlyLocal(task.endDate);
          return !!end && end >= todayStartLocal && end <= weekEndLocal;
        }),
        blocked: assignedTasks.filter((task: any) => task.status === 'blocked'),
        complete: assignedTasks.filter((task: any) => task.status === 'complete'),
      };

      const selectedCycleName = activeCycleId
        ? filteredCycleScopes.find(({ cycle }: any) => cycle.id === activeCycleId)?.cycle?.name || null
        : null;

      return {
        sections,
        totalAssigned: assignedTasks.length,
        selectedCycleName,
      };
    },
    enabled: !!user && tabValue === 5 && Object.keys(mockCycles).length > 0,
  });

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
    // Preserve date-only strings as local calendar dates (avoid UTC shift to prior day).
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(n => Number(n));
      return new Date(y, m - 1, d);
    }
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

              // Map each project object to a load date window (start/end).
              const loadWindowByObjectId: Record<string, { startDate: string | null; endDate: string | null }> = {};
              tasks.forEach((task: any) => {
                const objectId = task.projectObjectId;
                if (!objectId) return;

                const isLoadTask =
                  (task.taskType || '').toLowerCase() === 'load' ||
                  (task.name || '').trim().toLowerCase() === 'load';

                if (!isLoadTask) return;

                const startDate = task.startDate || null;
                const endDate = task.endDate || task.startDate || null;
                if (!startDate && !endDate) return;

                const existing = loadWindowByObjectId[objectId];
                if (!existing) {
                  loadWindowByObjectId[objectId] = { startDate, endDate };
                  return;
                }

                const nextStart = startDate && (!existing.startDate || startDate < existing.startDate)
                  ? startDate
                  : existing.startDate;
                const nextEnd = endDate && (!existing.endDate || endDate > existing.endDate)
                  ? endDate
                  : existing.endDate;

                loadWindowByObjectId[objectId] = {
                  startDate: nextStart,
                  endDate: nextEnd,
                };
              });

              const projectColor = getProjectAccentColor(project, index);
              return items.map((item: any) => ({
                ...item,
                projectName: project.name,
                projectColor,
                projectId: project.id,
                loadStartDate: loadWindowByObjectId[item.id]?.startDate || null,
                loadEndDate: loadWindowByObjectId[item.id]?.endDate || null,
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
        const tasks = (tasksResponse.data.data || []).map((task: any) => normalizeTaskDateFields(task));
        setProjectTasks(tasks);

        // Load task dependencies for all tasks in parallel
        const allDeps: Record<string, any[]> = {};
        const depsTs = Date.now();
        await Promise.all(tasks.map(async (task: any) => {
          try {
            const depsRes = await apiClient.get(`/api/tasks/${task.id}/dependencies?t=${depsTs}`);
            allDeps[task.id] = depsRes.data.data || [];
          } catch (e) {
            allDeps[task.id] = [];
          }
        }));
        setTaskDeps(allDeps);

        // Cascade dates for tasks with dependencies+duration
        await cascadeAllDates(tasks, allDeps);

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

  useEffect(() => {
    const loadCycleOverview = async () => {
      if (tabValue !== 0 || selectedItem?.type !== 'cycle') {
        setCycleOverview(null);
        return;
      }

      const cycleId = selectedItem.id;
      const projects = projectsByMockCycle[cycleId] || [];

      if (projects.length === 0) {
        setCycleOverview({
          projectCount: 0,
          objectCount: 0,
          taskGroupCount: 0,
          taskCount: 0,
          statusCounts: { complete: 0, in_progress: 0, blocked: 0, not_started: 0 },
          progressPct: 0,
          timelineStart: null,
          timelineEnd: null,
        });
        return;
      }

      try {
        setIsLoadingCycleOverview(true);
        const perProject = await Promise.all(projects.map(async (project: Project) => {
          const [tasksRes, objectsRes, groupsRes] = await Promise.all([
            apiClient.get(`/api/tasks/project/${project.id}`),
            apiClient.get(`/api/project-objects/project/${project.id}`),
            apiClient.get(`/api/tasks/groups/project/${project.id}`),
          ]);

          return {
            tasks: tasksRes.data?.data || [],
            objects: objectsRes.data?.data || [],
            groups: groupsRes.data?.data || [],
          };
        }));

        const allTasks = perProject.flatMap((item: any) => item.tasks);
        const objectCount = perProject.reduce((sum: number, item: any) => sum + (item.objects?.length || 0), 0);
        const taskGroupCount = perProject.reduce((sum: number, item: any) => sum + (item.groups?.length || 0), 0);

        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        for (const task of allTasks) {
          const start = normalizeDateOnly(task.startDate || undefined);
          const end = normalizeDateOnly(task.endDate || undefined);
          if (start && (!minDate || start < minDate)) minDate = start;
          if (end && (!maxDate || end > maxDate)) maxDate = end;
        }

        const statusCounts = {
          complete: allTasks.filter((task: any) => task.status === 'complete').length,
          in_progress: allTasks.filter((task: any) => task.status === 'in_progress').length,
          blocked: allTasks.filter((task: any) => task.status === 'blocked').length,
          not_started: allTasks.filter((task: any) => task.status === 'not_started').length,
        };

        const progressPct = allTasks.length > 0
          ? Math.round(allTasks.reduce((sum: number, task: any) => sum + (task.progressPercentage ?? 0), 0) / allTasks.length)
          : Math.round(projects.reduce((sum, project) => sum + (project.progressPercentage || 0), 0) / Math.max(1, projects.length));

        const formatDate = (value: Date | null) => {
          if (!value) return null;
          return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
        };

        setCycleOverview({
          projectCount: projects.length,
          objectCount,
          taskGroupCount,
          taskCount: allTasks.length,
          statusCounts,
          progressPct,
          timelineStart: formatDate(minDate),
          timelineEnd: formatDate(maxDate),
        });
      } catch (error) {
        console.error('Failed to load cycle overview:', error);
        setCycleOverview(null);
      } finally {
        setIsLoadingCycleOverview(false);
      }
    };

    loadCycleOverview();
  }, [tabValue, selectedItem, projectsByMockCycle]);

  useEffect(() => {
    const loadProgramOverview = async () => {
      if (tabValue !== 0 || selectedItem?.type !== 'program') {
        setProgramOverview(null);
        return;
      }

      const cycles = mockCycles[selectedItem.id] || [];
      const projects = cycles.flatMap((cycle: MockCycle) => projectsByMockCycle[cycle.id] || []);

      if (projects.length === 0) {
        setProgramOverview({
          projectCount: 0,
          objectCount: 0,
          taskGroupCount: 0,
          taskCount: 0,
          statusCounts: { complete: 0, in_progress: 0, blocked: 0, not_started: 0 },
          progressPct: 0,
          timelineStart: null,
          timelineEnd: null,
        });
        return;
      }

      try {
        setIsLoadingProgramOverview(true);
        const perProject = await Promise.all(projects.map(async (project: Project) => {
          const [tasksRes, objectsRes, groupsRes] = await Promise.all([
            apiClient.get(`/api/tasks/project/${project.id}`),
            apiClient.get(`/api/project-objects/project/${project.id}`),
            apiClient.get(`/api/tasks/groups/project/${project.id}`),
          ]);

          return {
            tasks: tasksRes.data?.data || [],
            objects: objectsRes.data?.data || [],
            groups: groupsRes.data?.data || [],
          };
        }));

        const allTasks = perProject.flatMap((item: any) => item.tasks);
        const objectCount = perProject.reduce((sum: number, item: any) => sum + (item.objects?.length || 0), 0);
        const taskGroupCount = perProject.reduce((sum: number, item: any) => sum + (item.groups?.length || 0), 0);

        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        for (const task of allTasks) {
          const start = normalizeDateOnly(task.startDate || undefined);
          const end = normalizeDateOnly(task.endDate || undefined);
          if (start && (!minDate || start < minDate)) minDate = start;
          if (end && (!maxDate || end > maxDate)) maxDate = end;
        }

        const statusCounts = {
          complete: allTasks.filter((task: any) => task.status === 'complete').length,
          in_progress: allTasks.filter((task: any) => task.status === 'in_progress').length,
          blocked: allTasks.filter((task: any) => task.status === 'blocked').length,
          not_started: allTasks.filter((task: any) => task.status === 'not_started').length,
        };

        const progressPct = allTasks.length > 0
          ? Math.round(allTasks.reduce((sum: number, task: any) => sum + (task.progressPercentage ?? 0), 0) / allTasks.length)
          : Math.round(projects.reduce((sum, project) => sum + (project.progressPercentage || 0), 0) / Math.max(1, projects.length));

        const formatDate = (value: Date | null) => {
          if (!value) return null;
          return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
        };

        setProgramOverview({
          projectCount: projects.length,
          objectCount,
          taskGroupCount,
          taskCount: allTasks.length,
          statusCounts,
          progressPct,
          timelineStart: formatDate(minDate),
          timelineEnd: formatDate(maxDate),
        });
      } catch (error) {
        console.error('Failed to load program overview:', error);
        setProgramOverview(null);
      } finally {
        setIsLoadingProgramOverview(false);
      }
    };

    loadProgramOverview();
  }, [tabValue, selectedItem, mockCycles, projectsByMockCycle]);

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'my-tasks') {
      setTabValue(5);
    }
  }, [location.search]);

  // Ensure Priorities tab has a project context so the panel doesn't appear blank.
  useEffect(() => {
    if (tabValue !== 2 || activeProjectId) return;

    if (selectedItem?.type === 'cycle') {
      const selectedCycleProjects = projectsByMockCycle[selectedItem.id] || [];
      if (selectedCycleProjects.length > 0) {
        setSelectedItem({ type: 'project', id: selectedCycleProjects[0].id, cycleId: selectedItem.id });
        return;
      }
    }

    for (const cycleId in projectsByMockCycle) {
      const projects = projectsByMockCycle[cycleId] || [];
      if (projects.length > 0) {
        const firstProject = projects[0];
        setSelectedItem({ type: 'project', id: firstProject.id, cycleId });
        return;
      }
    }
  }, [tabValue, activeProjectId, projectsByMockCycle, selectedItem]);

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
          accentColor: newItemAccentColor || null,
        });
        queryClient.invalidateQueries({ queryKey: ['programs'] });
      } else if (dialogMode === 'cycle' && contextProgramId) {
        await apiClient.post(`/api/programs/${contextProgramId}/mock-cycles`, {
          name: newItemName,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          scheduleMode: newCycleScheduleMode,
          accentColor: newItemAccentColor || null,
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
      setNewItemAccentColor('');
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
    setNewItemAccentColor('');
    setNewCycleScheduleMode('all_days');
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
        const reloadTs = Date.now();
        const [tasksRes, groupsRes] = await Promise.all([
          apiClient.get(`/api/tasks/project/${activeProjectId}`),
          apiClient.get(`/api/tasks/groups/project/${activeProjectId}`),
        ]);
        const reloadedTasks = (tasksRes.data.data || []).map((task: any) => normalizeTaskDateFields(task));
        setProjectTasks(reloadedTasks);
        setProjectTaskGroups(groupsRes.data.data || []);
        // Reload deps for all remaining tasks so stale dep state is cleared
        const freshDepsMap: Record<string, any[]> = {};
        await Promise.all(reloadedTasks.map(async (task: any) => {
          try {
            const dr = await apiClient.get(`/api/tasks/${task.id}/dependencies?t=${reloadTs}`);
            freshDepsMap[task.id] = dr.data.data || [];
          } catch { freshDepsMap[task.id] = []; }
        }));
        setTaskDeps(freshDepsMap);
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
        setEditAccentColor(program.accentColor || '');
      }
    } else if (type === 'cycle') {
      for (const progId in mockCycles) {
        const cycle = mockCycles[progId]?.find(c => c.id === itemId);
        if (cycle) {
          setEditItemName(cycle.name);
          setEditItemDesc('');
          setEditStartDate(cycle.startDate);
          setEditEndDate(cycle.endDate);
          setEditCycleScheduleMode((cycle.scheduleMode || 'all_days') as CalendarMode);
          setEditAccentColor(cycle.accentColor || '');
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
          accentColor: editAccentColor || null,
        });
      } else if (editItemType === 'cycle') {
        await apiClient.patch(`/api/mock-cycles/${editItemId}`, {
          name: editItemName,
          scheduleMode: editCycleScheduleMode,
          accentColor: editAccentColor || null,
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

  const handleCloneCycle = (cycleId: string) => {
    let sourceCycle: MockCycle | null = null;
    let sourceProgramId: string | null = null;

    for (const progId in mockCycles) {
      const cycle = mockCycles[progId]?.find(c => c.id === cycleId);
      if (cycle) {
        sourceCycle = cycle;
        sourceProgramId = progId;
        break;
      }
    }

    if (!sourceCycle || !sourceProgramId) {
      alert('Unable to locate source mock cycle.');
      return;
    }

    setCloneCycleSourceId(cycleId);
    setCloneCycleSourceProgramId(sourceProgramId);
    setCloneCycleName(`${sourceCycle.name} Copy`);
    setCloneCycleDialogOpen(true);
  };

  const handleCloneCycleConfirm = async () => {
    if (!cloneCycleSourceId || !cloneCycleSourceProgramId) return;

    const name = cloneCycleName.trim();
    if (!name) {
      alert('A name is required to copy a mock cycle.');
      return;
    }

    try {
      setIsCloningCycle(true);
      const res = await apiClient.post(`/api/mock-cycles/${cloneCycleSourceId}/clone`, { name });
      const cloned = res?.data?.data;

      queryClient.invalidateQueries({ queryKey: ['mockCycles'] });
      queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] });

      setExpandedPrograms(prev => new Set(prev).add(cloneCycleSourceProgramId as string));
      if (cloned?.id) {
        setSelectedItem({ type: 'cycle', id: cloned.id, programId: cloneCycleSourceProgramId });
      }
      setTabValue(0);
      setCloneCycleDialogOpen(false);
      setCloneCycleSourceId(null);
      setCloneCycleSourceProgramId(null);
      setCloneCycleName('');
    } catch (error) {
      console.error('Failed to copy mock cycle:', error);
      alert('Failed to copy mock cycle. Please try again.');
    } finally {
      setIsCloningCycle(false);
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

  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  const formatDateOnly = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const adjustStartForMode = (startDate: string, mode: CalendarMode) => {
    const d = new Date(startDate.substring(0, 10) + 'T00:00:00');
    if (mode === 'working_days') {
      while (isWeekend(d)) d.setDate(d.getDate() + 1);
    }
    return d;
  };

  const addOneDay = (d: Date) => {
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    return next;
  };

  const getTaskCalendarMode = (task: any): CalendarMode => {
    if (task?.scheduleModeOverride === 'working_days') return 'working_days';
    if (task?.scheduleModeOverride === 'all_days') return 'all_days';
    return activeCycleScheduleMode;
  };

  const calcEndDate = (startDate: string, duration: number, task?: any): string => {
    if (!startDate || !duration) return '';
    const mode = getTaskCalendarMode(task);
    const d = adjustStartForMode(startDate, mode);
    let remaining = Math.max(1, Math.floor(Number(duration) || 0));
    if (mode === 'all_days') {
      d.setDate(d.getDate() + Math.max(0, remaining - 1));
      return formatDateOnly(d);
    }
    while (remaining > 1) {
      d.setDate(d.getDate() + 1);
      if (!isWeekend(d)) remaining--;
    }
    return formatDateOnly(d);
  };

  const updateTaskInline = async (taskId: string, field: string, value: string) => {
    try {
      const numericFields = ['progressPercentage', 'duration'];
      const parsedValue = numericFields.includes(field)
        ? (field === 'duration' ? (parseFloat(value) || null) : (parseInt(value) || 0))
        : value;
      const payload = { [field]: parsedValue };
      await apiClient.patch(`/api/tasks/${taskId}`, payload);
      // Use functional updater to avoid stale closure when multiple fields update simultaneously
      setProjectTasks(prev => {
        const updatedTasks = prev.map(t => t.id === taskId ? { ...t, [field]: parsedValue } : t);
        // Recalculate project % complete inline using updated snapshot
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
          apiClient.patch(`/api/projects/${activeProjectId}`, { progressPercentage: avg })
            .then(() => queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] }))
            .catch(() => {});
        }
        return updatedTasks;
      });
      // When endDate changes, cascade to all downstream dependent tasks
      if (field === 'endDate' && parsedValue) {
        const snapshot = projectTasksRef.current.map(t => t.id === taskId ? { ...t, endDate: String(parsedValue) } : t);
        cascadeAllDates(snapshot, taskDepsRef.current);
      }
    } catch (e) { console.error('Failed to update task', e); }
  };

  const loadTaskDeps = async (taskId: string) => {
    try {
      const res = await apiClient.get(`/api/tasks/${taskId}/dependencies?t=${Date.now()}`);
      const newDeps = res.data.data || [];
      setTaskDeps(prev => ({ ...prev, [taskId]: newDeps }));
      return newDeps as any[];
    } catch (e) { /* ignore */ }
    return [] as any[];
  };

  // Cascade date recalculation: for all tasks with deps+duration, propagate dates downstream.
  // tasks/deps are passed as snapshots so this works before React state flushes.
  const cascadeAllDates = async (tasks: any[], deps: Record<string, any[]>) => {
    const endMap: Record<string, string> = {};
    const startMap: Record<string, string> = {};
    for (const t of tasks) {
      if (t.endDate) endMap[t.id] = t.endDate;
      if (t.startDate) startMap[t.id] = t.startDate;
    }
    const patches: Record<string, { startDate: string; endDate: string }> = {};
    let changed = true;
    let iter = 0;
    while (changed && iter < 30) {
      changed = false;
      iter++;
      for (const [taskId, taskDepsArr] of Object.entries(deps)) {
        if (!taskDepsArr.length) continue;
        const task = tasks.find((t: any) => t.id === taskId);
        let maxEnd: string | null = null;
        for (const dep of taskDepsArr as any[]) {
          const end = endMap[dep.dependsOnTaskId] || dep.endDate;
          if (end && (!maxEnd || end > maxEnd)) maxEnd = end;
        }
        if (!maxEnd) continue;
        let newStart: string;
        const nd = new Date(maxEnd.substring(0, 10) + 'T00:00:00');
        nd.setDate(nd.getDate() + 1);
        const mode = getTaskCalendarMode(task);
        if (mode === 'working_days') {
          while (isWeekend(nd)) nd.setDate(nd.getDate() + 1);
        }
        newStart = formatDateOnly(nd);
        const newEnd = task?.duration
          ? (calcEndDate(newStart, Number(task.duration), task) || newStart)
          : newStart; // no duration: end = start (point in time)
        if (newStart !== startMap[taskId] || newEnd !== endMap[taskId]) {
          patches[taskId] = { startDate: newStart, endDate: newEnd };
          startMap[taskId] = newStart;
          endMap[taskId] = newEnd;
          changed = true;
        }
      }
    }
    if (Object.keys(patches).length === 0) return;
    await Promise.all(Object.entries(patches).map(([id, p]) =>
      apiClient.patch(`/api/tasks/${id}`, p).catch(() => {})
    ));
    setProjectTasks(prev => prev.map(t => patches[t.id] ? { ...t, ...patches[t.id] } : t));
  };

  const saveObjectTasks = async (taskIds: string[]) => {
    const tasksToSave = projectTasks.filter(t => taskIds.includes(t.id));
    await Promise.all(tasksToSave.map(async (task) => {
      try {
        await apiClient.patch(`/api/tasks/${task.id}`, {
          name: task.name || '',
          status: task.status,
          progressPercentage: task.progressPercentage ?? 0,
          assignedTo: task.assignedTo || null,
          duration: task.duration ? Number(task.duration) : null,
          durationUnit: 'days',
          startDate: task.startDate || null,
          endDate: task.endDate || null,
        });
      } catch (e) { console.error('Failed to save task', task.id, e); }
    }));
    if (activeProjectId) {
      const allPct = projectTasks.filter(t => t.projectObjectId || t.taskGroupId);
      const avg = allPct.length > 0 ? Math.round(allPct.reduce((s, t) => s + (t.progressPercentage ?? 0), 0) / allPct.length) : 0;
      apiClient.patch(`/api/projects/${activeProjectId}`, { progressPercentage: avg })
        .then(() => queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] })).catch(() => {});
    }
  };

  const loadCycleTasksForDep = async (currentTaskId: string) => {
    const currentTask = projectTasks.find(t => t.id === currentTaskId);
    const cycleProjects: any[] = activeCycleId ? (projectsByMockCycle[activeCycleId] || []) : [];
    const allProjects = cycleProjects.length > 0 ? cycleProjects : (activeProjectId ? [{ id: activeProjectId, name: 'Current Project', accentColor: '#00BFA5' }] : []);
    const enriched: any[] = [];
    await Promise.all(allProjects.map(async (proj: any) => {
      try {
        const [tasksRes, invRes, groupsRes] = await Promise.all([
          apiClient.get(`/api/tasks/project/${proj.id}`),
          apiClient.get(`/api/project-objects/project/${proj.id}`),
          apiClient.get(`/api/tasks/groups/project/${proj.id}`),
        ]);
        const projTasks: any[] = tasksRes.data.data || [];
        const projInv: any[] = invRes.data.data || [];
        const projGroups: any[] = groupsRes.data.data || [];
        projTasks.forEach(t => {
          const invItem = projInv.find(o => o.id === t.projectObjectId);
          const group = projGroups.find(g => g.id === t.taskGroupId);
          enriched.push({
            ...t,
            projectId: proj.id,
            projectName: proj.name,
            projectAccentColor: proj.accentColor || '#00BFA5',
            objectLabel: invItem ? (invItem.objectId + (invItem.description ? ' — ' + invItem.description : '')) : null,
            groupLabel: group?.name || null,
          });
        });
      } catch (e) { /* skip project on error */ }
    }));
    setCycleTasksForDep(enriched);
    // Collapse all by default, then expand only the current branch
    const expanded: Record<string, boolean> = {};
    allProjects.forEach((proj: any) => { expanded[`proj-${proj.id}`] = false; });
    if (currentTask && activeProjectId) {
      expanded[`proj-${activeProjectId}`] = true;
      if (currentTask.projectObjectId) {
        expanded[`proj-${activeProjectId}-obj-${currentTask.projectObjectId}`] = true;
      } else if (currentTask.taskGroupId) {
        expanded[`proj-${activeProjectId}-grp-${currentTask.taskGroupId}`] = true;
      } else {
        expanded[`proj-${activeProjectId}-ungrouped`] = true;
      }
    } else if (activeProjectId) {
      expanded[`proj-${activeProjectId}`] = true;
    }
    setDepTreeExpanded(expanded);
  };

  const cycleCount = Object.values(mockCycles).reduce((acc: number, arr: any) => acc + (arr?.length || 0), 0);

  const parseDateOnly = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const toDateInputValue = (value?: string) => {
    if (!value) return '';
    // Direct YYYY-MM-DD — already correct format
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // ISO string — extract the date portion directly to avoid timezone shifting
    if (value.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.substring(0, 10);
    // Fallback: parse using UTC methods to avoid local-timezone offset
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const normalizeTaskDateFields = (task: any) => ({
    ...task,
    startDate: toDateInputValue(task?.startDate),
    endDate: toDateInputValue(task?.endDate),
    scheduleModeOverride: task?.scheduleModeOverride || null,
  });

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

  const getPriorityTaskBreadcrumb = (task: any) => {
    const selectedProject = selectedItem?.type === 'project'
      ? (projectsByMockCycle[selectedItem.cycleId] || []).find((p: any) => p.id === selectedItem.id)
      : null;
    const cycleName = selectedItem?.type === 'project'
      ? (mockCycles[selectedProject?.programId || ''] || []).find((c: any) => c.id === selectedItem.cycleId)?.name
      : null;
    const programName = selectedItem?.type === 'project'
      ? programs.find((p: any) => p.id === selectedProject?.programId)?.name
      : null;
    const contextLabel = getPriorityTaskContext(task);
    return [programName, cycleName, selectedProject?.name, contextLabel]
      .filter(Boolean)
      .join(' / ');
  };

  const handlePriorityTaskClick = (task: any) => {
    if (!task?.id) return;
    setPriorityModalTask(task);
  };

  return (
    <Layout
      onMenuClick={() => setIsHierarchySidebarOpen(true)}
      programCount={programs.length}
      cycleCount={cycleCount}
      objectCount={projectInventoryItems.length}
      completionPercentage={0}
      tabValue={tabValue}
      onTabChange={(v) => setTabValue(v)}
      onPeopleClick={() => setPeopleSidebarOpen(true)}
    >
      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {isMobile && isHierarchySidebarOpen && (
          <Box
            onClick={() => setIsHierarchySidebarOpen(false)}
            sx={{
              position: 'fixed',
              top: '112px',
              left: 0,
              right: 0,
              bottom: '36px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 1298,
            }}
          />
        )}

        {/* Left Sidebar - Hierarchy Tree */}
        <Paper
          sx={{
            width: { xs: 'min(86vw, 320px)', md: '280px' },
            overflowY: 'auto',
            flexShrink: 0,
            backgroundColor: { xs: '#111a2d', md: 'transparent' },
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            borderTop: 'none',
            borderLeft: 'none',
            borderRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            position: { xs: 'fixed', md: 'relative' },
            top: { xs: '112px', md: 'auto' },
            left: { xs: 0, md: 'auto' },
            bottom: { xs: '36px', md: 'auto' },
            height: { xs: 'auto', md: '100%' },
            zIndex: { xs: 1299, md: 'auto' },
            transform: { xs: isHierarchySidebarOpen ? 'translateX(0)' : 'translateX(-100%)', md: 'none' },
            transition: { xs: 'transform 0.22s ease-out', md: 'none' },
            boxShadow: { xs: '8px 0 28px rgba(0,0,0,0.45)', md: 'none' },
            backdropFilter: { xs: 'none', md: 'none' },
          }}
        >
          {isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MenuIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Hierarchy</Typography>
              </Box>
              <IconButton size="small" onClick={() => setIsHierarchySidebarOpen(false)}>
                <CloseIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Box>
          )}

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
                  const programColor = program.accentColor || '#5B67CA';
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
                            backgroundColor: programColor,
                            borderRadius: '2px',
                          } : {},
                          '&:hover': { backgroundColor: isProgramSelected ? 'rgba(91, 103, 202, 0.15)' : 'rgba(255,255,255,0.05)' },
                        }}
                        onClick={() => {
                          handleHierarchySelection({ type: 'program', id: program.id });
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
                        <CorporateFareIcon sx={{ fontSize: '1.1rem', color: programColor, flexShrink: 0, mx: 0.75 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isProgramSelected ? programColor : 'inherit' }}>
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
                            const cycleColor = cycle.accentColor || '#64B5F6';
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
                                      backgroundColor: cycleColor,
                                      borderRadius: '2px',
                                    } : {},
                                    '&:hover': { backgroundColor: isCycleSelected ? 'rgba(91, 103, 202, 0.15)' : 'rgba(255,255,255,0.05)' },
                                  }}
                                  onClick={() => {
                                    handleHierarchySelection({ type: 'cycle', id: cycle.id, programId: program.id });
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
                                  <SyncIcon sx={{ fontSize: '0.95rem', color: cycleColor, flexShrink: 0, mx: 0.5 }} />
                                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCycleSelected ? cycleColor : 'inherit' }}>
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
                                          onClick={() => handleHierarchySelection({ type: 'project', id: project.id, cycleId: cycle.id })}
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
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1.25, sm: 3 }, minWidth: 0 }}>
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
                      '& input::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                      '& input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                      '& input[type=number]': { MozAppearance: 'textfield' },
                      '& .MuiInputBase-root.Mui-disabled': { opacity: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
                      '& .MuiInputBase-root.Mui-disabled input': { WebkitTextFillColor: 'rgba(255,255,255,0.75)', cursor: 'not-allowed' },
                      '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderStyle: 'dashed' },
                    };
                    return (
                      <Box>
                        {/* Top section: info left, buttons right */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap', rowGap: 1.5, mb: 3 }}>
                          <Box>
                        {/* Breadcrumbs */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                          {parentProgramName && <><Typography variant="caption" color="text.disabled">{parentProgramName}</Typography><Typography variant="caption" color="text.disabled">›</Typography></>}
                          {parentCycleName && <><Typography variant="caption" color="text.disabled">{parentCycleName}</Typography><Typography variant="caption" color="text.disabled">›</Typography></>}
                          <Typography variant="caption" sx={{ color: accentColor, fontWeight: 600 }}>{project.name}</Typography>
                        </Box>

                        {/* Title */}
                        <Typography variant="h4" sx={{ fontWeight: 700, color: accentColor, mb: 0.75, fontSize: { xs: '1.55rem', sm: '2.125rem' } }}>{project.name}</Typography>

                        {/* Stats */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">{projectInventoryItems.length} objects</Typography>
                          <Box sx={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: 'text.disabled' }} />
                          <Typography variant="body2" color="text.secondary">{projectTaskGroups.length} task groups</Typography>
                        </Box>

                        {/* Progress */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EventIcon sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />
                              <Typography variant="caption" color="text.disabled">
                                Timeline: {startStr} → {endStr}
                              </Typography>
                            </Box>
                          );
                        })()}

                          </Box>{/* end left info box */}
                          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, ml: { xs: 0, md: 2 }, width: { xs: '100%', md: 'auto' }, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDataObjectDialogOpen(true)}
                              sx={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}99 100%)`, textTransform: 'none', fontWeight: 600, boxShadow: 'none', width: { xs: '100%', sm: 'auto' } }}>
                              Add Data Object
                            </Button>
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTaskGroupDialogOpen(true)}
                              sx={{ background: 'linear-gradient(135deg, #5B67CA 0%, #3B4DB3 100%)', textTransform: 'none', fontWeight: 600, boxShadow: 'none', width: { xs: '100%', sm: 'auto' } }}>
                              Add Task Group
                            </Button>
                          </Box>
                        </Box>{/* end top section flex row */}

                        {/* Filter Row */}
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                          <TextField placeholder="Search by name or ID..." size="small" value={planSearchTerm} onChange={(e) => setPlanSearchTerm(e.target.value)}
                            sx={{ width: { xs: '100%', sm: 240 }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: accentColor }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accentColor } }}
                            slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 0.5, fontSize: '1rem', color: 'text.secondary' }} /> } }} />
                          <TextField select size="small" label="Status" value={planStatusFilter} onChange={(e) => setPlanStatusFilter(e.target.value)}
                            sx={{ width: { xs: 'calc(50% - 6px)', sm: 150 }, minWidth: { xs: 140, sm: 150 }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: accentColor }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accentColor }, '& .MuiInputLabel-root.Mui-focused': { color: accentColor } }}>
                            <MenuItem value="">All Statuses</MenuItem>
                            <MenuItem value="not_started">Not Started</MenuItem>
                            <MenuItem value="in_progress">In Progress</MenuItem>
                            <MenuItem value="complete">Completed</MenuItem>
                          </TextField>
                          <TextField select size="small" label="Assigned To" value={planAssignedFilter} onChange={(e) => setPlanAssignedFilter(e.target.value)}
                            sx={{ width: { xs: 'calc(50% - 6px)', sm: 170 }, minWidth: { xs: 140, sm: 170 }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: accentColor }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: accentColor }, '& .MuiInputLabel-root.Mui-focused': { color: accentColor } }}>
                            <MenuItem value="">All Assignees</MenuItem>
                            {people.map((p: any) => (
                              <MenuItem key={p.id} value={p.id}>{p.name || p.email}</MenuItem>
                            ))}
                          </TextField>
                          {(planSearchTerm || planStatusFilter || planAssignedFilter) && (
                            <Button size="small" variant="text" onClick={() => { setPlanSearchTerm(''); setPlanStatusFilter(''); setPlanAssignedFilter(''); }} sx={{ textTransform: 'none', color: 'text.secondary' }}>Clear</Button>
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
                              if (planAssignedFilter && !tasksForObject.some(t => t.draUserId === planAssignedFilter || t.developerUserId === planAssignedFilter)) return null;
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
                                    sx={{ pl: 2.5, pr: 1, py: 1.25, display: 'flex', alignItems: 'center', gap: { xs: 0.8, sm: 1.5 }, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' } }}>
                                    <DragIndicatorIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0, cursor: canReorderPlan ? 'grab' : 'not-allowed', opacity: canReorderPlan ? 1 : 0.45 }} />
                                    <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: { xs: '0.76rem', sm: '0.82rem' }, color: accentColor, flexShrink: 0, minWidth: { xs: 0, sm: 90 }, maxWidth: { xs: '38vw', sm: 'none' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{objectName}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</Typography>
                                    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.4, alignItems: 'center', flexShrink: 0 }}>
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
                                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 60px 150px 108px 68px 100px 100px 100px', gap: 0, px: 2, py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        {['TASK', 'STATUS', '%', 'ASSIGNED TO', 'DURATION\n(DAYS)', 'INCL\nWKND', 'START DATE', 'END DATE', 'ACTIONS'].map(h => (
                                          <Typography key={h} variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'pre-line', lineHeight: 1.05 }}>{h}</Typography>
                                        ))}
                                      </Box>
                                      {tasksForObject.length === 0
                                        ? <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1, display: 'block' }}>No tasks</Typography>
                                        : tasksForObject.map((task) => (
                                          <Box key={task.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 60px 150px 108px 68px 100px 100px 100px', gap: 0, px: 2, py: 0.5, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                                            {/* Task name */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: getTaskStatusColor(task.status), flexShrink: 0 }} />
                                              <TextField size="small" value={task.name || ''} onBlur={e => updateTaskInline(task.id, 'name', e.target.value)}
                                                onChange={e => setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: e.target.value } : t))}
                                                sx={{ ...taskFieldSx, flex: 1 }} />
                                            </Box>
                                            {/* Status dropdown */}
                                            <TextField select size="small" value={task.status} onChange={e => {
                                              const s = e.target.value;
                                              const newStatus = s;
                                              updateTaskInline(task.id, 'status', newStatus);
                                              if (newStatus === 'complete') updateTaskInline(task.id, 'progressPercentage', '100');
                                              else if (newStatus !== 'in_progress') updateTaskInline(task.id, 'progressPercentage', '0');
                                            }} sx={taskFieldSx}>
                                              <MenuItem value="not_started">Not Started</MenuItem>
                                              <MenuItem value="in_progress">In Progress</MenuItem>
                                              <MenuItem value="complete">Completed</MenuItem>
                                              <MenuItem value="blocked">Blocked</MenuItem>
                                            </TextField>
                                            {/* % Complete */}
                                            <TextField size="small" type="number" value={task.progressPercentage ?? 0}
                                              disabled={task.status !== 'in_progress'}
                                              onChange={e => {
                                                const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                updateTaskInline(task.id, 'progressPercentage', String(val));
                                              }}
                                              slotProps={{ htmlInput: { min: 0, max: 100 } }}
                                              sx={{ ...taskFieldSx, '& input': { textAlign: 'center', px: 0.5 } }} />
                                            {/* Assigned To */}
                                            <TextField select size="small" value={task.assignedTo || ''}
                                              onChange={e => updateTaskInline(task.id, 'assignedTo', e.target.value)}
                                              sx={taskFieldSx}>
                                              <MenuItem value=""><em>Unassigned</em></MenuItem>
                                              {people.map(p => <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>)}
                                            </TextField>
                                            {/* Duration */}
                                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                              <TextField size="small" type="number"
                                                value={task.duration != null ? Number(task.duration) : ''}
                                                placeholder="—"
                                                onChange={e => {
                                                  const dur = parseFloat(e.target.value) || null;
                                                  setProjectTasks(prev => prev.map(t => {
                                                    if (t.id !== task.id) return t;
                                                    const updates: any = { duration: dur };
                                                    if (dur && t.startDate) {
                                                      const newEnd = calcEndDate(t.startDate, dur, t);
                                                      if (newEnd) updates.endDate = newEnd;
                                                    }
                                                    return { ...t, ...updates };
                                                  }));
                                                }}
                                                onBlur={e => {
                                                  const dur = parseFloat(e.target.value) || 0;
                                                  const freshStart = projectTasksRef.current.find(t => t.id === task.id)?.startDate || task.startDate;
                                                  const newEnd = dur && freshStart ? calcEndDate(freshStart, dur, task) : null;
                                                  const patch: any = { duration: dur || null, durationUnit: 'days' };
                                                  if (newEnd) patch.endDate = newEnd;
                                                  // Immediate state update
                                                  setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...patch } : t));
                                                  // Single PATCH, then cascade
                                                  apiClient.patch(`/api/tasks/${task.id}`, patch)
                                                    .then(() => {
                                                      if (newEnd) {
                                                        const snap = projectTasksRef.current.map(t => t.id === task.id ? { ...t, ...patch } : t);
                                                        cascadeAllDates(snap, taskDepsRef.current);
                                                      }
                                                    })
                                                    .catch(() => {});
                                                }}
                                                slotProps={{ htmlInput: { min: 0, step: 1 } }}
                                                sx={{ ...taskFieldSx, '& input': { textAlign: 'center', px: 0.5, width: 38 } }} />
                                            </Box>
                                            {/* Include weekends override */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <Checkbox
                                                size="small"
                                                checked={getTaskCalendarMode(task) === 'all_days'}
                                                onChange={e => {
                                                  const cycleIsAllDays = activeCycleScheduleMode === 'all_days';
                                                  const checked = e.target.checked;
                                                  const scheduleModeOverride = checked === cycleIsAllDays
                                                    ? null
                                                    : (checked ? 'all_days' : 'working_days');
                                                  const taskSnapshot = projectTasksRef.current.find(t => t.id === task.id) || task;
                                                  const nextTask = { ...taskSnapshot, scheduleModeOverride };
                                                  const patchData: any = { scheduleModeOverride };
                                                  if (nextTask.startDate && nextTask.duration) {
                                                    const recalculatedEnd = calcEndDate(nextTask.startDate, Number(nextTask.duration), nextTask);
                                                    if (recalculatedEnd) patchData.endDate = recalculatedEnd;
                                                  }
                                                  setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...patchData } : t));
                                                  apiClient.patch(`/api/tasks/${task.id}`, patchData)
                                                    .then(() => {
                                                      const snap = projectTasksRef.current.map(t => t.id === task.id ? { ...t, ...patchData } : t);
                                                      cascadeAllDates(snap, taskDepsRef.current);
                                                    })
                                                    .catch(() => {});
                                                }}
                                                sx={{ p: 0, m: 0 }}
                                              />
                                            </Box>
                                            {/* Start Date */}
                                            {(taskDeps[task.id] || []).length > 0 ? (
                                              <Box title="Set by dependency — adjust via › button" sx={{ display: 'flex', alignItems: 'center', px: 1, height: 26, minWidth: 100, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.08)', cursor: 'not-allowed', fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>
                                                {task.startDate ? (() => { const [y,m,d] = task.startDate.split('-'); return `${m}/${d}/${y}`; })() : '—'}
                                              </Box>
                                            ) : (
                                              <Box sx={{ position: 'relative', '&:focus-within .date-empty': { display: 'none' } }}>
                                                <TextField size="small" type="date"
                                                  value={task.startDate || ''}
                                                  onChange={e => {
                                                    const newStart = e.target.value;
                                                    const freshTask = projectTasksRef.current.find(t => t.id === task.id);
                                                    const dur = freshTask?.duration ?? task.duration;
                                                    const endToSet = dur ? (calcEndDate(newStart, Number(dur), task) || null) : null;
                                                    const patchData: any = { startDate: newStart };
                                                    if (endToSet) patchData.endDate = endToSet;
                                                    setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, startDate: newStart, ...(endToSet ? { endDate: endToSet } : {}) } : t));
                                                    apiClient.patch(`/api/tasks/${task.id}`, patchData)
                                                      .then(() => {
                                                        const snap = projectTasksRef.current.map(t => t.id === task.id ? { ...t, startDate: newStart, ...(endToSet ? { endDate: endToSet } : {}) } : t);
                                                        cascadeAllDates(snap, taskDepsRef.current);
                                                      })
                                                      .catch(() => {});
                                                    e.target.blur();
                                                  }}
                                                  sx={{ ...taskFieldSx, ...(!task.startDate ? { '& input': { color: 'transparent' }, '& input:focus': { color: 'inherit' }, '& input::-webkit-calendar-picker-indicator': { opacity: 0 }, '& input:focus::-webkit-calendar-picker-indicator': { opacity: 1 } } : {}) }} />
                                                {!task.startDate && <Box className="date-empty" sx={{ position: 'absolute', inset: 0, pl: 1.5, display: 'flex', alignItems: 'center', pointerEvents: 'none', fontSize: '0.72rem', color: 'text.disabled' }}>—</Box>}
                                              </Box>
                                            )}
                                            {/* End Date */}
                                            {!!task.duration ? (
                                              <Box title="Calculated from start date + duration" sx={{ display: 'flex', alignItems: 'center', px: 1, height: 26, minWidth: 100, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.08)', cursor: 'not-allowed', fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>
                                                {(() => { if (!task.startDate) return '—'; const c = calcEndDate(task.startDate, Number(task.duration), task); if (!c) return '—'; const [y,m,d] = c.split('-'); return `${m}/${d}/${y}`; })()}
                                              </Box>
                                            ) : task.endDate ? (
                                              <Box sx={{ display: 'flex', alignItems: 'center', px: 1, height: 26, minWidth: 100, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.08)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>
                                                {(() => { const [y,m,d] = task.endDate.split('-'); return `${m}/${d}/${y}`; })()}
                                              </Box>
                                            ) : (
                                              <Box sx={{ position: 'relative', '&:focus-within .date-empty-end': { display: 'none' } }}>
                                                <TextField size="small" type="date"
                                                  value={task.endDate || ''}
                                                  onChange={e => { updateTaskInline(task.id, 'endDate', e.target.value); e.target.blur(); }}
                                                  sx={{ ...taskFieldSx, '& input': { color: 'transparent' }, '& input:focus': { color: 'inherit' }, '& input::-webkit-calendar-picker-indicator': { opacity: 0 }, '& input:focus::-webkit-calendar-picker-indicator': { opacity: 1 } }} />
                                                <Box className="date-empty-end" sx={{ position: 'absolute', inset: 0, pl: 1.5, display: 'flex', alignItems: 'center', pointerEvents: 'none', fontSize: '0.72rem', color: 'text.disabled' }}>—</Box>
                                              </Box>
                                            )}
                                            {/* Actions */}
                                            <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
                                              <IconButton size="small" title="Discussion" onClick={() => setCommentModalTask({ id: task.id, name: task.name || 'Task' })}
                                                sx={{ opacity: (taskCommentCounts[task.id] || 0) > 0 ? 1 : 0.6, color: (taskCommentCounts[task.id] || 0) > 0 ? accentColor : 'inherit', '&:hover': { opacity: 1, color: accentColor } }}>
                                                <ChatBubbleOutlineIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                              <IconButton size="small" title="Dependencies" onClick={async () => {
                                                await loadTaskDeps(task.id);
                                                setDepDialogTaskId(task.id);
                                                setDepSearchTerm('');
                                                await loadCycleTasksForDep(task.id);
                                              }} sx={{ opacity: (taskDeps[task.id] || []).length > 0 ? 1 : 0.6, color: (taskDeps[task.id] || []).length > 0 ? accentColor : 'inherit', '&:hover': { opacity: 1, color: accentColor } }}>
                                                <ChevronRightIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                              <IconButton size="small" title="More task actions" onClick={(e) => openTaskRowMenu(e, task)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                                <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
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
                                              const res = await apiClient.post(`/api/tasks/project/${activeProjectId}`, { taskType: 'custom', projectObjectId: objectId, name: 'New Task', durationUnit: 'days' });
                                              setProjectTasks(prev => [...prev, normalizeTaskDateFields(res.data.data)]);
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
                              if (planSearchTerm && !group.name.toLowerCase().includes(planSearchTerm.toLowerCase())) return null;
                              if (planStatusFilter && !groupTasks.some(t => t.status === planStatusFilter)) return null;
                              if (planAssignedFilter && !groupTasks.some(t => t.draUserId === planAssignedFilter || t.developerUserId === planAssignedFilter)) return null;
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
                                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 60px 150px 108px 68px 100px 100px 100px', gap: 0, px: 2, py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        {['TASK', 'STATUS', '%', 'ASSIGNED TO', 'DURATION\n(DAYS)', 'INCL\nWKND', 'START DATE', 'END DATE', 'ACTIONS'].map(h => (
                                          <Typography key={h} variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'pre-line', lineHeight: 1.05 }}>{h}</Typography>
                                        ))}
                                      </Box>
                                      {groupTasks.length === 0
                                        ? <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1, display: 'block' }}>No tasks</Typography>
                                        : groupTasks.map((task) => (
                                          <Box key={task.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 60px 150px 108px 68px 100px 100px 100px', gap: 0, px: 2, py: 0.5, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
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
                                            {/* Duration */}
                                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                              <TextField size="small" type="number"
                                                value={task.duration != null ? Number(task.duration) : ''}
                                                placeholder="—"
                                                onChange={e => {
                                                  const dur = parseFloat(e.target.value) || null;
                                                  setProjectTasks(prev => prev.map(t => {
                                                    if (t.id !== task.id) return t;
                                                    const updates: any = { duration: dur };
                                                    if (dur && t.startDate) {
                                                      const newEnd = calcEndDate(t.startDate, dur, t);
                                                      if (newEnd) updates.endDate = newEnd;
                                                    }
                                                    return { ...t, ...updates };
                                                  }));
                                                }}
                                                onBlur={e => {
                                                  const dur = parseFloat(e.target.value) || 0;
                                                  const freshStart = projectTasksRef.current.find(t => t.id === task.id)?.startDate || task.startDate;
                                                  const newEnd = dur && freshStart ? calcEndDate(freshStart, dur, task) : null;
                                                  const patch: any = { duration: dur || null, durationUnit: 'days' };
                                                  if (newEnd) patch.endDate = newEnd;
                                                  // Immediate state update
                                                  setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...patch } : t));
                                                  // Single PATCH, then cascade
                                                  apiClient.patch(`/api/tasks/${task.id}`, patch)
                                                    .then(() => {
                                                      if (newEnd) {
                                                        const snap = projectTasksRef.current.map(t => t.id === task.id ? { ...t, ...patch } : t);
                                                        cascadeAllDates(snap, taskDepsRef.current);
                                                      }
                                                    })
                                                    .catch(() => {});
                                                }}
                                                slotProps={{ htmlInput: { min: 0, step: 1 } }}
                                                sx={{ ...taskFieldSx, '& input': { textAlign: 'center', px: 0.5, width: 38 } }} />
                                            </Box>
                                            {/* Include weekends override */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <Checkbox
                                                size="small"
                                                checked={getTaskCalendarMode(task) === 'all_days'}
                                                onChange={e => {
                                                  const cycleIsAllDays = activeCycleScheduleMode === 'all_days';
                                                  const checked = e.target.checked;
                                                  const scheduleModeOverride = checked === cycleIsAllDays
                                                    ? null
                                                    : (checked ? 'all_days' : 'working_days');
                                                  const taskSnapshot = projectTasksRef.current.find(t => t.id === task.id) || task;
                                                  const nextTask = { ...taskSnapshot, scheduleModeOverride };
                                                  const patchData: any = { scheduleModeOverride };
                                                  if (nextTask.startDate && nextTask.duration) {
                                                    const recalculatedEnd = calcEndDate(nextTask.startDate, Number(nextTask.duration), nextTask);
                                                    if (recalculatedEnd) patchData.endDate = recalculatedEnd;
                                                  }
                                                  setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...patchData } : t));
                                                  apiClient.patch(`/api/tasks/${task.id}`, patchData)
                                                    .then(() => {
                                                      const snap = projectTasksRef.current.map(t => t.id === task.id ? { ...t, ...patchData } : t);
                                                      cascadeAllDates(snap, taskDepsRef.current);
                                                    })
                                                    .catch(() => {});
                                                }}
                                                sx={{ p: 0, m: 0 }}
                                              />
                                            </Box>
                                            {/* Start Date */}
                                            {(taskDeps[task.id] || []).length > 0 ? (
                                              <Box title="Set by dependency — adjust via › button" sx={{ display: 'flex', alignItems: 'center', px: 1, height: 26, minWidth: 100, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.08)', cursor: 'not-allowed', fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>
                                                {task.startDate ? (() => { const [y,m,d] = task.startDate.split('-'); return `${m}/${d}/${y}`; })() : '—'}
                                              </Box>
                                            ) : (
                                              <Box sx={{ position: 'relative', '&:focus-within .date-empty': { display: 'none' } }}>
                                                <TextField size="small" type="date"
                                                  value={task.startDate || ''}
                                                  onChange={e => {
                                                    const newStart = e.target.value;
                                                    const freshTask = projectTasksRef.current.find(t => t.id === task.id);
                                                    const dur = freshTask?.duration ?? task.duration;
                                                    const endToSet = dur ? (calcEndDate(newStart, Number(dur), task) || null) : null;
                                                    const patchData: any = { startDate: newStart };
                                                    if (endToSet) patchData.endDate = endToSet;
                                                    setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, startDate: newStart, ...(endToSet ? { endDate: endToSet } : {}) } : t));
                                                    apiClient.patch(`/api/tasks/${task.id}`, patchData)
                                                      .then(() => {
                                                        const snap = projectTasksRef.current.map(t => t.id === task.id ? { ...t, startDate: newStart, ...(endToSet ? { endDate: endToSet } : {}) } : t);
                                                        cascadeAllDates(snap, taskDepsRef.current);
                                                      })
                                                      .catch(() => {});
                                                    e.target.blur();
                                                  }}
                                                  sx={{ ...taskFieldSx, ...(!task.startDate ? { '& input': { color: 'transparent' }, '& input:focus': { color: 'inherit' }, '& input::-webkit-calendar-picker-indicator': { opacity: 0 }, '& input:focus::-webkit-calendar-picker-indicator': { opacity: 1 } } : {}) }} />
                                                {!task.startDate && <Box className="date-empty" sx={{ position: 'absolute', inset: 0, pl: 1.5, display: 'flex', alignItems: 'center', pointerEvents: 'none', fontSize: '0.72rem', color: 'text.disabled' }}>—</Box>}
                                              </Box>
                                            )}
                                            {/* End Date */}
                                            {!!task.duration ? (
                                              <Box title="Calculated from start date + duration" sx={{ display: 'flex', alignItems: 'center', px: 1, height: 26, minWidth: 100, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.08)', cursor: 'not-allowed', fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>
                                                {(() => { if (!task.startDate) return '—'; const c = calcEndDate(task.startDate, Number(task.duration), task); if (!c) return '—'; const [y,m,d] = c.split('-'); return `${m}/${d}/${y}`; })()}
                                              </Box>
                                            ) : task.endDate ? (
                                              <Box sx={{ display: 'flex', alignItems: 'center', px: 1, height: 26, minWidth: 100, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.08)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>
                                                {(() => { const [y,m,d] = task.endDate.split('-'); return `${m}/${d}/${y}`; })()}
                                              </Box>
                                            ) : (
                                              <Box sx={{ position: 'relative', '&:focus-within .date-empty-end': { display: 'none' } }}>
                                                <TextField size="small" type="date"
                                                  value={task.endDate || ''}
                                                  onChange={e => { updateTaskInline(task.id, 'endDate', e.target.value); e.target.blur(); }}
                                                  sx={{ ...taskFieldSx, '& input': { color: 'transparent' }, '& input:focus': { color: 'inherit' }, '& input::-webkit-calendar-picker-indicator': { opacity: 0 }, '& input:focus::-webkit-calendar-picker-indicator': { opacity: 1 } }} />
                                                <Box className="date-empty-end" sx={{ position: 'absolute', inset: 0, pl: 1.5, display: 'flex', alignItems: 'center', pointerEvents: 'none', fontSize: '0.72rem', color: 'text.disabled' }}>—</Box>
                                              </Box>
                                            )}
                                            <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
                                              <IconButton size="small" title="Discussion" onClick={() => setCommentModalTask({ id: task.id, name: task.name || 'Task' })}
                                                sx={{ opacity: (taskCommentCounts[task.id] || 0) > 0 ? 1 : 0.6, color: (taskCommentCounts[task.id] || 0) > 0 ? accentColor : 'inherit', '&:hover': { opacity: 1, color: accentColor } }}>
                                                <ChatBubbleOutlineIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                              <IconButton size="small" onClick={async () => {
                                                await loadTaskDeps(task.id);
                                                setDepDialogTaskId(task.id);
                                                setDepSearchTerm('');
                                                await loadCycleTasksForDep(task.id);
                                              }} sx={{ opacity: (taskDeps[task.id] || []).length > 0 ? 1 : 0.6, color: (taskDeps[task.id] || []).length > 0 ? accentColor : 'inherit', '&:hover': { opacity: 1, color: accentColor } }}>
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
                                              const res = await apiClient.post(`/api/tasks/project/${activeProjectId}`, { taskType: 'custom', taskGroupId: group.id, name: 'New Task', durationUnit: 'days' });
                                              setProjectTasks(prev => [...prev, normalizeTaskDateFields(res.data.data)]);
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
                      {selectedItem.type === 'program' ? (
                        <>
                          <Typography variant="h6" sx={{ mb: 0.75 }}>{selectedDetails?.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                            High-level program summary derived from cycles, projects, objects, and tasks.
                          </Typography>

                          {isLoadingProgramOverview ? (
                            <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                              <CircularProgress size={22} />
                            </Box>
                          ) : programOverview ? (
                            <>
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(110px, 1fr))', gap: 1, mb: 1.5 }}>
                                {[
                                  { label: 'Projects', value: programOverview.projectCount },
                                  { label: 'Objects', value: programOverview.objectCount },
                                  { label: 'Task Groups', value: programOverview.taskGroupCount },
                                  { label: 'Tasks', value: programOverview.taskCount },
                                ].map((metric) => (
                                  <Box key={metric.label} sx={{ p: 1, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <Typography variant="caption" color="text.secondary">{metric.label}</Typography>
                                    <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{metric.value}</Typography>
                                  </Box>
                                ))}
                              </Box>

                              <Box sx={{ mb: 1.2 }}>
                                <Typography variant="body2" sx={{ mb: 0.4, fontWeight: 600 }}>
                                  Overall Progress: {programOverview.progressPct}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.max(0, Math.min(100, programOverview.progressPct))}
                                  sx={{ height: 8, borderRadius: 99 }}
                                />
                              </Box>

                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.2 }}>
                                <Chip size="small" label={`Complete: ${programOverview.statusCounts.complete}`} color="success" variant="outlined" />
                                <Chip size="small" label={`In Progress: ${programOverview.statusCounts.in_progress}`} color="info" variant="outlined" />
                                <Chip size="small" label={`Blocked: ${programOverview.statusCounts.blocked}`} color="error" variant="outlined" />
                                <Chip size="small" label={`Not Started: ${programOverview.statusCounts.not_started}`} variant="outlined" />
                              </Box>

                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Timeline: {programOverview.timelineStart || 'TBD'} → {programOverview.timelineEnd || 'TBD'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Cycles: {(mockCycles[selectedItem.id] || []).length}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">Unable to load program overview.</Typography>
                          )}
                        </>
                      ) : selectedItem.type === 'cycle' ? (
                        <>
                          <Typography variant="h6" sx={{ mb: 0.75 }}>{selectedDetails?.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                            High-level cycle summary derived from projects, objects, and tasks.
                          </Typography>

                          {isLoadingCycleOverview ? (
                            <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                              <CircularProgress size={22} />
                            </Box>
                          ) : cycleOverview ? (
                            <>
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(110px, 1fr))', gap: 1, mb: 1.5 }}>
                                {[
                                  { label: 'Projects', value: cycleOverview.projectCount },
                                  { label: 'Objects', value: cycleOverview.objectCount },
                                  { label: 'Task Groups', value: cycleOverview.taskGroupCount },
                                  { label: 'Tasks', value: cycleOverview.taskCount },
                                ].map((metric) => (
                                  <Box key={metric.label} sx={{ p: 1, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <Typography variant="caption" color="text.secondary">{metric.label}</Typography>
                                    <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{metric.value}</Typography>
                                  </Box>
                                ))}
                              </Box>

                              <Box sx={{ mb: 1.2 }}>
                                <Typography variant="body2" sx={{ mb: 0.4, fontWeight: 600 }}>
                                  Overall Progress: {cycleOverview.progressPct}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.max(0, Math.min(100, cycleOverview.progressPct))}
                                  sx={{ height: 8, borderRadius: 99 }}
                                />
                              </Box>

                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.2 }}>
                                <Chip size="small" label={`Complete: ${cycleOverview.statusCounts.complete}`} color="success" variant="outlined" />
                                <Chip size="small" label={`In Progress: ${cycleOverview.statusCounts.in_progress}`} color="info" variant="outlined" />
                                <Chip size="small" label={`Blocked: ${cycleOverview.statusCounts.blocked}`} color="error" variant="outlined" />
                                <Chip size="small" label={`Not Started: ${cycleOverview.statusCounts.not_started}`} variant="outlined" />
                              </Box>

                              <Typography variant="body2" color="text.secondary">
                                Timeline: {cycleOverview.timelineStart || 'TBD'} → {cycleOverview.timelineEnd || 'TBD'}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">Unable to load cycle overview.</Typography>
                          )}
                        </>
                      ) : (
                        <>
                          <Typography variant="h6" sx={{ mb: 1 }}>{selectedDetails?.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedDetails?.description || ''}
                          </Typography>
                        </>
                      )}
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
                        {inventoryProjects.length === 0 ? (
                          <Typography variant="caption" sx={{ color: '#8EA3CB' }}>
                            No projects available
                          </Typography>
                        ) : (
                          inventoryProjects.map((project: Project) => (
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
                          ))
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
                                <Typography variant="caption" sx={{ display: 'block', color: '#8EA3CB', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {getPriorityTaskBreadcrumb(task)}
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
                      <Box sx={{ p: 1.25, minHeight: 190, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {(() => {
                          const weekStart = scheduleWeekDates[0];
                          const weekEnd = scheduleWeekDates[6];
                          const scheduledItems = cycleScheduleItems
                            .filter((item: any) => {
                              if (schedulePhaseFilter !== 'all' && (item.cutoverPhase || '') !== schedulePhaseFilter) return false;
                              const loadStart = normalizeDateOnly(item.loadStartDate || undefined);
                              const loadEnd = normalizeDateOnly(item.loadEndDate || item.loadStartDate || undefined);
                              if (!loadStart && !loadEnd) return false;
                              const rangeStart = loadStart || loadEnd;
                              const rangeEnd = loadEnd || loadStart;
                              if (!rangeStart || !rangeEnd) return false;
                              return rangeEnd >= weekStart && rangeStart <= weekEnd;
                            })
                            .sort((a: any, b: any) => {
                              const aStart = normalizeDateOnly(a.loadStartDate || a.loadEndDate || undefined);
                              const bStart = normalizeDateOnly(b.loadStartDate || b.loadEndDate || undefined);
                              return (aStart?.getTime() || 0) - (bStart?.getTime() || 0);
                            });

                          if (scheduledItems.length === 0) {
                            return <Typography variant="caption" color="text.disabled">No loads this week</Typography>;
                          }

                          return scheduledItems.map((item: any) => {
                            const start = normalizeDateOnly(item.loadStartDate || item.loadEndDate || undefined);
                            const end = normalizeDateOnly(item.loadEndDate || item.loadStartDate || undefined);
                            if (!start || !end) return null;

                            const clampedStart = start < weekStart ? weekStart : start;
                            const clampedEnd = end > weekEnd ? weekEnd : end;
                            const startIndex = Math.max(0, Math.min(6, Math.floor((clampedStart.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))));
                            const endIndex = Math.max(0, Math.min(6, Math.floor((clampedEnd.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))));

                            return (
                              <Box key={`sched-${item.id}-${item.projectId}`} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75 }}>
                                <Box
                                  sx={{
                                    gridColumn: `${startIndex + 1} / ${endIndex + 2}`,
                                    p: 0.75,
                                    borderRadius: 1,
                                    backgroundColor: toRgba(item.projectColor, 0.28),
                                    border: `1px solid ${toRgba(item.projectColor, 0.6)}`,
                                    minWidth: 0,
                                  }}
                                >
                                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontWeight: 700, color: item.projectColor }}>
                                    {item.objectId || 'Object'}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: '#D2DDF8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.description || 'Load Object'}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', color: '#9FB0D8' }}>
                                    {item.projectName}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', color: '#9FB0D8' }}>
                                    {(() => {
                                      const s = item.loadStartDate;
                                      const e = item.loadEndDate || item.loadStartDate;
                                      if (!s && !e) return '';
                                      const fmt = (v: string) => {
                                        const [yy, mm, dd] = v.split('-');
                                        return `${mm}/${dd}`;
                                      };
                                      if (s && e) return s === e ? fmt(s) : `${fmt(s)} - ${fmt(e)}`;
                                      return fmt((s || e) as string);
                                    })()}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          });
                        })()}
                      </Box>
                    )}
                  </Box>
                </>
              )}
            </Box>
          )}

          {/* Defects Tab Content */}
          {tabValue === 4 && (
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <ProjectDefectsPage />
            </Box>
          )}

          {/* My Tasks Tab Content */}
          {tabValue === 5 && (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{
                border: '1px solid rgba(93,121,176,0.35)',
                borderRadius: 2,
                backgroundColor: 'rgba(18,33,65,0.72)',
                p: 2,
              }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>My Tasks</Typography>
                <Typography variant="body2" sx={{ color: '#8EA3CB' }}>
                  {myTasksData?.selectedCycleName
                    ? `Tasks assigned to you in ${myTasksData.selectedCycleName}.`
                    : 'Tasks assigned to you across all programs and cycles.'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9FB0D8', display: 'block', mt: 0.8 }}>
                  Assigned Tasks: {myTasksData?.totalAssigned ?? 0}
                </Typography>
              </Box>

              {isLoadingMyTasks ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : myTasksError ? (
                <Alert severity="error">Unable to load your tasks right now.</Alert>
              ) : !myTasksData || myTasksData.totalAssigned === 0 ? (
                <Alert severity="info">No tasks are currently assigned to your account for this scope.</Alert>
              ) : (
                [
                  { title: 'Late Tasks', tasks: myTasksData.sections.late, border: 'rgba(214,77,119,0.45)', chipBg: 'rgba(168,58,87,0.32)', chipColor: '#FF809A' },
                  { title: 'In Progress', tasks: myTasksData.sections.in_progress, border: 'rgba(61,152,213,0.45)', chipBg: 'rgba(44,122,175,0.32)', chipColor: '#6EC7FF' },
                  { title: 'Due This Week', tasks: myTasksData.sections.due_this_week, border: 'rgba(205,145,53,0.45)', chipBg: 'rgba(156,108,43,0.32)', chipColor: '#FFC567' },
                  { title: 'Blocked', tasks: myTasksData.sections.blocked, border: 'rgba(216,83,83,0.45)', chipBg: 'rgba(150,58,58,0.32)', chipColor: '#FF8E8E' },
                  { title: 'Completed', tasks: myTasksData.sections.complete, border: 'rgba(82,163,106,0.45)', chipBg: 'rgba(63,130,83,0.32)', chipColor: '#8CE09F' },
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
                                {task.name || task.taskName || 'Untitled Task'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {(task.programName || 'Program') + ' / ' + (task.mockCycleName || 'Cycle') + ' / ' + (task.projectName || 'Project')}
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block', color: '#8EA3CB' }}>
                                {task.endDate ? `Due ${new Date(task.endDate).toLocaleDateString()}` : 'No due date'}
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
                ))
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
            <>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <TextField
                  label="Accent Color"
                  type="color"
                  value={newItemAccentColor || '#5B67CA'}
                  onChange={(e) => setNewItemAccentColor(e.target.value)}
                  sx={{ width: '100px' }}
                  variant="outlined"
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">Used for program icon color in the tree</Typography>
              </Box>
            </>
          )}
          {dialogMode === 'cycle' && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Include Weekends</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox
                  checked={newCycleScheduleMode === 'all_days'}
                  onChange={(e) => setNewCycleScheduleMode(e.target.checked ? 'all_days' : 'working_days')}
                  sx={{ p: 0.25 }}
                />
                <Typography variant="body2">{newCycleScheduleMode === 'all_days' ? 'Checked: all days' : 'Unchecked: working days only'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <TextField
                  label="Accent Color"
                  type="color"
                  value={newItemAccentColor || '#64B5F6'}
                  onChange={(e) => setNewItemAccentColor(e.target.value)}
                  sx={{ width: '100px' }}
                  variant="outlined"
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">Used for mock cycle icon color in the tree</Typography>
              </Box>
            </Box>
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

      {/* Copy Mock Cycle Dialog */}
      <Dialog open={cloneCycleDialogOpen} onClose={() => !isCloningCycle && setCloneCycleDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{
          background: theme => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark || theme.palette.primary.main} 100%)`,
          color: 'white',
          fontWeight: 600,
          fontSize: '1.1rem',
          pb: 2,
        }}>
          Copy Mock Cycle
        </DialogTitle>
        <DialogContent sx={{ pt: 2, px: 3 }}>
          <Typography variant="body2" sx={{ mt: 2, mb: 2, color: 'text.secondary' }}>
            This will create a new mock cycle and copy projects, inventory, dependencies, tasks, and schedule data.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="New Mock Cycle Name"
            value={cloneCycleName}
            onChange={(e) => setCloneCycleName(e.target.value)}
            placeholder="Enter name"
            variant="outlined"
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setCloneCycleDialogOpen(false)} disabled={isCloningCycle} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleCloneCycleConfirm}
            variant="contained"
            disabled={isCloningCycle || !cloneCycleName.trim()}
            sx={{ textTransform: 'none' }}
          >
            {isCloningCycle ? 'Copying...' : 'Copy'}
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={taskRowMenuAnchorEl}
        open={Boolean(taskRowMenuAnchorEl && taskRowMenuTask)}
        onClose={closeTaskRowMenu}
      >
        {taskRowMenuTask ? (
          <>
            <MenuItem
              onClick={() => {
                openDeleteDialog('taskSingle' as any, taskRowMenuTask.id, taskRowMenuTask.name || 'Task');
                closeTaskRowMenu();
              }}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
            </MenuItem>
          </>
        ) : null}
      </Menu>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => {
          setMenuAnchorEl(null);
          setMenuType(null);
        }}
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
            if (menuType !== 'cycle' || !menuItemId) return;
            setMenuAnchorEl(null);
            handleCloneCycle(menuItemId);
          }}
          sx={{ display: menuType === 'cycle' ? 'flex' : 'none' }}
        >
          <AddIcon fontSize="small" sx={{ mr: 1 }} /> Copy Mock Cycle
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!menuItemId || !menuType) return;
            if (menuType === 'task' || menuType === 'taskGroup') {
              // For tasks and task groups, open the detail modal so defects and validation stats are available.
              if (menuType === 'task') {
                const task = projectTasks.find(t => t.id === menuItemId);
                if (task) {
                  openTaskDetails(task, 0);
                } else {
                  setEditingTaskId(menuItemId);
                }
              } else {
                setEditingTaskGroupId(menuItemId);
              }
            } else {
              openEditDialog(menuType, menuItemId);
            }
            setMenuAnchorEl(null);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Task Details / Defects
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
            <>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  label="Accent Color"
                  type="color"
                  value={editAccentColor || '#5B67CA'}
                  onChange={(e) => setEditAccentColor(e.target.value)}
                  sx={{ width: '100px' }}
                  variant="outlined"
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">Used for program icon color in the tree</Typography>
              </Box>
            </>
          )}

          {editItemType === 'cycle' && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  label="Accent Color"
                  type="color"
                  value={editAccentColor || '#64B5F6'}
                  onChange={(e) => setEditAccentColor(e.target.value)}
                  sx={{ width: '100px' }}
                  variant="outlined"
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">Used for mock cycle icon color in the tree</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Include Weekends</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Checkbox
                    checked={editCycleScheduleMode === 'all_days'}
                    onChange={(e) => setEditCycleScheduleMode(e.target.checked ? 'all_days' : 'working_days')}
                    sx={{ p: 0.25 }}
                  />
                  <Typography variant="body2">{editCycleScheduleMode === 'all_days' ? 'Checked: all days' : 'Unchecked: working days only'}</Typography>
                </Box>
              </Box>
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
                const newTasks = (tasksResponse.data.data || []).map((t: any) => normalizeTaskDateFields(t));
                const updatedTasks = [...projectTasks, ...newTasks];
                setProjectTasks(updatedTasks);

                // Load deps for new tasks (server auto-creates sequential deps)
                const newDepsTs = Date.now();
                const newDepsMap: Record<string, any[]> = {};
                await Promise.all(newTasks.map(async (t: any) => {
                  try {
                    const dRes = await apiClient.get(`/api/tasks/${t.id}/dependencies?t=${newDepsTs}`);
                    newDepsMap[t.id] = dRes.data.data || [];
                  } catch { newDepsMap[t.id] = []; }
                }));
                const updatedDeps = { ...taskDeps, ...newDepsMap };
                setTaskDeps(updatedDeps);
                // Cascade dates for the new tasks (no-op if no dates set yet, but primes for when user sets them)
                await cascadeAllDates(updatedTasks, updatedDeps);
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
            position: 'fixed', top: 0, right: 0, bottom: 0, width: { xs: '100vw', sm: 380 },
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
                      {person.isSystemUser ? (
                        <Typography variant="caption" color="text.secondary">System</Typography>
                      ) : (
                        <>
                          <IconButton size="small" onClick={() => { setEditingPersonId(person.id); setEditPersonName(person.name); setEditPersonRole(person.role || ''); setEditPersonEmail(person.email || ''); }} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                            <EditIcon sx={{ fontSize: '0.9rem' }} />
                          </IconButton>
                          <IconButton size="small" onClick={async () => { await apiClient.delete(`/api/people/${person.id}`); setPeople(prev => prev.filter(p => p.id !== person.id)); }} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                            <DeleteIcon sx={{ fontSize: '0.9rem' }} />
                          </IconButton>
                        </>
                      )}
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

      <TaskDetailModal
        open={!!priorityModalTask}
        onClose={() => setPriorityModalTask(null)}
        taskId={priorityModalTask?.id}
        task={priorityModalTask}
        peopleById={Object.fromEntries((people || []).map((person: any) => [person.id, person]))}
        people={people}
        accentColor="#ffa726"
      />

      <TaskDetailModal
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        taskId={editingTask?.id}
        task={editingTask}
        peopleById={Object.fromEntries((people || []).map((person: any) => [person.id, person]))}
        people={people}
        accentColor="#5B67CA"
        initialTab={editingTaskInitialTab}
      />

      <TaskDetailModal
        open={!!editingTaskId}
        onClose={() => setEditingTaskId(null)}
        taskId={editingTaskId || undefined}
        peopleById={Object.fromEntries((people || []).map((person: any) => [person.id, person]))}
        people={people}
        accentColor="#5B67CA"
      />

      {/* Task Dependency Dialog */}
      <Dialog open={!!depDialogTaskId} onClose={() => setDepDialogTaskId(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Task Dependencies</DialogTitle>
        <DialogContent sx={{ pb: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Select tasks that must complete before this task can start.
          </Typography>
          <TextField
            fullWidth size="small" placeholder="Search tasks..."
            value={depSearchTerm}
            sx={{ mb: 1.5 }}
            slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 0.5, fontSize: '1rem', color: 'text.secondary' }} /> } }}
            onChange={e => setDepSearchTerm(e.target.value.toLowerCase())}
          />
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {(() => {
              // Get cycle name
              let cycleName = 'Current Cycle';
              for (const progId in mockCycles) {
                const cycle = (mockCycles[progId] || []).find((c: any) => c.id === activeCycleId);
                if (cycle) { cycleName = cycle.name; break; }
              }

              // Group by project
              const projectMap: Record<string, { name: string; color: string; objects: Record<string, { label: string; tasks: any[] }> }> = {};
              cycleTasksForDep
                .filter(t => t.id !== depDialogTaskId && (!depSearchTerm || (t.name || '').toLowerCase().includes(depSearchTerm) || (t.objectLabel || '').toLowerCase().includes(depSearchTerm) || (t.groupLabel || '').toLowerCase().includes(depSearchTerm)))
                .forEach(t => {
                  const pid = t.projectId || activeProjectId || '';
                  if (!projectMap[pid]) projectMap[pid] = { name: t.projectName || 'Project', color: t.projectAccentColor || '#00BFA5', objects: {} };
                  const oKey = t.objectLabel ? `obj-${t.projectObjectId}` : t.groupLabel ? `grp-${t.taskGroupId}` : 'ungrouped';
                  const oLabel = t.objectLabel || t.groupLabel || 'Other Tasks';
                  if (!projectMap[pid].objects[oKey]) projectMap[pid].objects[oKey] = { label: oLabel, tasks: [] };
                  projectMap[pid].objects[oKey].tasks.push(t);
                });

              return (
                <Box>
                  {/* Cycle label */}
                  <Box sx={{ px: 0.5, pb: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <SyncIcon sx={{ fontSize: '0.8rem', color: 'text.disabled' }} />
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.65rem' }}>{cycleName}</Typography>
                  </Box>

                  {Object.entries(projectMap).map(([pid, proj]) => {
                    const projKey = `proj-${pid}`;
                    const projExpanded = depTreeExpanded[projKey] === true;
                    return (
                      <Box key={pid} sx={{ mb: 0.25 }}>
                        {/* Project row */}
                        <Box onClick={() => setDepTreeExpanded(prev => ({ ...prev, [projKey]: !projExpanded }))}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.5, px: 0.75, borderRadius: 1, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                          <ChevronRightIcon sx={{ fontSize: '0.85rem', color: 'text.secondary', transform: projExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: proj.color, flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, color: proj.color }}>{proj.name}</Typography>
                        </Box>

                        {projExpanded && Object.entries(proj.objects).map(([oKey, objData]) => {
                          const objExpKey = `${projKey}-${oKey}`;
                          const objExpanded = depTreeExpanded[objExpKey] === true;
                          return (
                            <Box key={oKey} sx={{ ml: 2.5, mb: 0.25 }}>
                              {/* Object/Group row */}
                              <Box onClick={() => setDepTreeExpanded(prev => ({ ...prev, [objExpKey]: !objExpanded }))}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.4, px: 0.75, borderRadius: 1, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                <ChevronRightIcon sx={{ fontSize: '0.75rem', color: 'text.disabled', transform: objExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.72rem' }}>{objData.label}</Typography>
                              </Box>

                              {objExpanded && objData.tasks.map((t: any) => {
                                const isDep = (taskDeps[depDialogTaskId || ''] || []).some((d: any) => d.dependsOnTaskId === t.id);
                                return (
                                  <Box key={t.id} sx={{ ml: 2.5, display: 'flex', alignItems: 'center', gap: 1.25, py: 0.5, px: 0.75, borderRadius: 1, cursor: 'pointer', backgroundColor: isDep ? 'rgba(91,103,202,0.14)' : 'transparent', '&:hover': { backgroundColor: isDep ? 'rgba(91,103,202,0.2)' : 'rgba(255,255,255,0.05)' } }}
                                    onClick={async () => {
                                      const taskId = depDialogTaskId;
                                      if (!taskId) return;
                                      try {
                                        if (isDep) {
                                          await apiClient.delete(`/api/tasks/${taskId}/dependencies/${t.id}`);
                                        } else {
                                          await apiClient.post(`/api/tasks/${taskId}/dependencies`, { dependsOnTaskId: t.id });
                                        }
                                      } catch (depErr) { console.error('Dep toggle failed', depErr); return; }

                                      // Reload fresh deps from server
                                      const freshDeps = await loadTaskDeps(taskId);
                                      const affectedTask = projectTasks.find(pt => pt.id === taskId);

                                      // Recalculate startDate/endDate when task has duration + deps
                                      if (affectedTask?.duration && freshDeps.length > 0) {
                                        let maxEndDate: string | null = null;
                                        for (const dep of freshDeps) {
                                          // dep.endDate comes directly from server (most reliable)
                                          const depEnd = dep.endDate
                                                      || projectTasks.find((ct: any) => ct.id === dep.dependsOnTaskId)?.endDate
                                                      || cycleTasksForDep.find((ct: any) => ct.id === dep.dependsOnTaskId)?.endDate;
                                          if (depEnd && (!maxEndDate || depEnd > maxEndDate)) maxEndDate = depEnd;
                                        }
                                        if (maxEndDate) {
                                          let newStart: string;
                                          const ddep = new Date(maxEndDate.substring(0, 10) + 'T00:00:00');
                                          ddep.setDate(ddep.getDate() + 1);
                                          const taskMode = getTaskCalendarMode(affectedTask);
                                          if (taskMode === 'working_days') {
                                            while (isWeekend(ddep)) ddep.setDate(ddep.getDate() + 1);
                                          }
                                          newStart = formatDateOnly(ddep);
                                          const patchPayload: any = { startDate: newStart };
                                          const newEnd = calcEndDate(newStart, affectedTask.duration, affectedTask);
                                          if (newEnd) patchPayload.endDate = newEnd;
                                          try {
                                            await apiClient.patch(`/api/tasks/${taskId}`, patchPayload);
                                            setProjectTasks(prev => prev.map(pt => pt.id === taskId ? { ...pt, ...patchPayload } : pt));
                                            // Cascade dates downstream to all dependent tasks
                                            const updatedTasks = projectTasks.map(pt => pt.id === taskId ? { ...pt, ...patchPayload } : pt);
                                            const updatedDeps = { ...taskDeps, [taskId]: freshDeps };
                                            await cascadeAllDates(updatedTasks, updatedDeps);
                                          } catch (e) { /* ignore */ }
                                        }
                                      }
                                    }}>
                                    <Box sx={{ width: 14, height: 14, borderRadius: '3px', border: '1.5px solid', borderColor: isDep ? 'primary.main' : 'rgba(255,255,255,0.3)', backgroundColor: isDep ? 'primary.main' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      {isDep && <Box sx={{ width: 6, height: 6, backgroundColor: 'white', borderRadius: '1px' }} />}
                                    </Box>
                                    <Typography variant="body2" sx={{ fontSize: '0.78rem', flex: 1 }}>{t.name || 'Unnamed'}</Typography>
                                    <Box sx={{ px: 0.75, py: 0.15, borderRadius: 0.5, fontSize: '0.65rem', fontWeight: 600, backgroundColor: `${getTaskStatusColor(t.status)}22`, color: getTaskStatusColor(t.status), flexShrink: 0, whiteSpace: 'nowrap' }}>{(t.status || '').replace(/_/g, ' ')}</Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })}
                  {Object.keys(projectMap).length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2, textAlign: 'center' }}>
                      {depSearchTerm ? 'No matching tasks' : 'Loading…'}
                    </Typography>
                  )}
                </Box>
              );
            })()}
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
