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
  Breadcrumbs,
  Link,
  Badge,
  Checkbox,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LayersIcon from '@mui/icons-material/Layers';
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
  description?: string;
  startDate: string;
  endDate: string;
  accentColor?: string;
  scheduleMode?: 'all_days' | 'working_days';
}

type CalendarMode = 'all_days' | 'working_days';
type TaskCalendarOverride = 'inherit' | CalendarMode;

interface Project {
  id: string;
  programId?: string;
  mockCycleId?: string | null;
  name: string;
  startDate?: string;
  endDate?: string;
  accentColor?: string;
  progressPercentage?: number;
}

type SelectableItem =
  | { type: 'program'; id: string }
  | { type: 'cycle'; id: string; programId: string; projectId?: string }
  | { type: 'project'; id: string; cycleId?: string }
  | { type: 'processArea'; projectId: string; cycleId: string; area: string };
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

type HierarchyIconChoice = 'corporateFare' | 'sync' | 'folderOutlined' | 'accountTree' | 'layers' | 'viewList' | 'event';
type HierarchyLevel = 'program' | 'cycle' | 'project' | 'processArea' | 'planGroup';
type HierarchyLevelIcons = Record<HierarchyLevel, HierarchyIconChoice>;

const DEFAULT_HIERARCHY_LEVEL_ICONS: HierarchyLevelIcons = {
  program: 'corporateFare',
  cycle: 'sync',
  project: 'folderOutlined',
  processArea: 'accountTree',
  planGroup: 'layers',
};

const HIERARCHY_ICON_OPTIONS: { value: HierarchyIconChoice; label: string }[] = [
  { value: 'corporateFare', label: 'Corporate / Building' },
  { value: 'sync', label: 'Cycle / Sync' },
  { value: 'folderOutlined', label: 'Folder (Outline)' },
  { value: 'accountTree', label: 'Hierarchy Tree' },
  { value: 'layers', label: 'Layers' },
  { value: 'viewList', label: 'List (Outline)' },
  { value: 'event', label: 'Calendar' },
];

interface ProjectsPageProps {
  sectionMode?: 'planning' | 'execution';
}

const ProjectsPage: React.FC<ProjectsPageProps> = ({ sectionMode = 'execution' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const canManageHierarchy = sectionMode === 'planning';
  const canAccessInventory = sectionMode === 'planning';
  const [planningStrategyDraft, setPlanningStrategyDraft] = useState('');
  const [isSavingPlanningStrategy, setIsSavingPlanningStrategy] = useState(false);
  const [planningAdditionalGroups, setPlanningAdditionalGroups] = useState<Record<string, string[]>>({});
  const [planningAdditionalProcessAreas, setPlanningAdditionalProcessAreas] = useState<Record<string, string[]>>({});
  const [hiddenProcessAreas, setHiddenProcessAreas] = useState<Record<string, string[]>>({});
  const [selectedExecutionProcessArea, setSelectedExecutionProcessArea] = useState('');
  
  // State for expanded nodes in tree
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());
  const [expandedProjectGroups, setExpandedProjectGroups] = useState<Set<string>>(new Set());
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
  
  // State for selected item
  const [selectedItem, setSelectedItem] = useState<SelectableItem | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const isPlanningMaintainTab = sectionMode === 'planning' && tabValue === 6;
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'program' | 'cycle' | 'project'>('program');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemAccentColor, setNewItemAccentColor] = useState('');
  const [selectedExistingProjectOptionId, setSelectedExistingProjectOptionId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCycleScheduleMode, setNewCycleScheduleMode] = useState<CalendarMode>('all_days');
  const [contextProgramId, setContextProgramId] = useState<string | null>(null);
  const [contextCycleId, setContextCycleId] = useState<string | null>(null);
  
  // Context menu states
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuType, setMenuType] = useState<'program' | 'cycle' | 'project' | 'processArea' | 'task' | 'taskGroup' | null>(null);
  const [menuItemId, setMenuItemId] = useState<string | null>(null);
  const [processAreaMenuContext, setProcessAreaMenuContext] = useState<{ projectId: string; cycleId: string; area: string; nodeType: 'processArea' | 'planGroup' } | null>(null);
  const [processAreaSettingsDialogOpen, setProcessAreaSettingsDialogOpen] = useState(false);
  const [editingProcessAreaContext, setEditingProcessAreaContext] = useState<{ projectId: string; area: string } | null>(null);
  const [editingProcessAreaAccent, setEditingProcessAreaAccent] = useState('#64B5F6');
  const [editingProcessAreaDescription, setEditingProcessAreaDescription] = useState('');
  const [editingProcessAreaIconLevel, setEditingProcessAreaIconLevel] = useState<'processArea' | 'planGroup'>('processArea');
  const [processAreaAccentOverrides, setProcessAreaAccentOverrides] = useState<Record<string, Record<string, string>>>({});
  const [processAreaDescriptions, setProcessAreaDescriptions] = useState<Record<string, Record<string, string>>>({});
  const [settingsProcessAreaDescriptions, setSettingsProcessAreaDescriptions] = useState<Record<string, string>>({});
  const [hierarchyLevelIcons, setHierarchyLevelIcons] = useState<HierarchyLevelIcons>(DEFAULT_HIERARCHY_LEVEL_ICONS);
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
  const [editCycleParentProjectId, setEditCycleParentProjectId] = useState('');
  const [editProjectParentProgramId, setEditProjectParentProgramId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [cloneCycleDialogOpen, setCloneCycleDialogOpen] = useState(false);
  const [cloneCycleSourceId, setCloneCycleSourceId] = useState<string | null>(null);
  const [cloneCycleTargetId, setCloneCycleTargetId] = useState<string | null>(null);
  const [attachCycleDialogOpen, setAttachCycleDialogOpen] = useState(false);
  const [attachCycleProgramId, setAttachCycleProgramId] = useState<string | null>(null);
  const [attachCycleId, setAttachCycleId] = useState('');
  const [isCloningCycle, setIsCloningCycle] = useState(false);
  const [cycleOverview, setCycleOverview] = useState<PlanOverview | null>(null);
  const [isLoadingCycleOverview, setIsLoadingCycleOverview] = useState(false);
  const [programOverview, setProgramOverview] = useState<PlanOverview | null>(null);
  const [isLoadingProgramOverview, setIsLoadingProgramOverview] = useState(false);

  // Data object dialog states
  const [dataObjectDialogOpen, setDataObjectDialogOpen] = useState(false);
  const [newDataObjectName, setNewDataObjectName] = useState('');
  const [newDataObjectId, setNewDataObjectId] = useState('');
  const [newDataObjectProcessArea, setNewDataObjectProcessArea] = useState('');
  const [isCreatingDataObject, setIsCreatingDataObject] = useState(false);

  // Task group dialog states
  const [taskGroupDialogOpen, setTaskGroupDialogOpen] = useState(false);
  const [newTaskGroupName, setNewTaskGroupName] = useState('');
  const [newTaskGroupProcessArea, setNewTaskGroupProcessArea] = useState('');
  const [isCreatingTaskGroup, setIsCreatingTaskGroup] = useState(false);
  const [planGroupDialogOpen, setPlanGroupDialogOpen] = useState(false);
  const [newPlanGroupName, setNewPlanGroupName] = useState('');
  const [planGroupTargetProjectId, setPlanGroupTargetProjectId] = useState<string | null>(null);
  const [processAreaDialogOpen, setProcessAreaDialogOpen] = useState(false);
  const [newProcessAreaName, setNewProcessAreaName] = useState('');
  const [processAreaTargetProjectId, setProcessAreaTargetProjectId] = useState<string | null>(null);

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
  const [maintainFormView, setMaintainFormView] = useState<'program' | 'cycle' | 'project'>('program');
  const [maintainCycleParentProjectId, setMaintainCycleParentProjectId] = useState('');
  const [maintainCycleParentProgramId, setMaintainCycleParentProgramId] = useState('');
  const [maintainCycleFilterProgramId, setMaintainCycleFilterProgramId] = useState<'all' | string>('all');
  const [maintainProjectParentProgramId, setMaintainProjectParentProgramId] = useState('');
  const [maintainProjectParentCycleId, setMaintainProjectParentCycleId] = useState('');
  const [maintainProjectFilterCycleId, setMaintainProjectFilterCycleId] = useState<'all' | string>('all');
  const [maintainPendingCycleProjectId, setMaintainPendingCycleProjectId] = useState<string | null>(null);
  const [inventoryObjects, setInventoryObjects] = useState<{ id: string; objectId: string; description: string; processArea: string }[]>([]);
  const [projectInventoryItems, setProjectInventoryItems] = useState<any[]>([]);
  const [projectHierarchySummaries, setProjectHierarchySummaries] = useState<Record<string, {
    processAreas: Record<string, { objectCount: number; taskGroupCount: number; taskCount: number; progressPct: number }>;
    projectProgressPct: number;
    projectObjectCount: number;
    projectTaskGroupCount: number;
  }>>({});
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
    parentProjectObjectId: '',
    subObjectSuffix: '',
    subObjectDescription: '',
    isSubObject: false,
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

  const getEmptyProjectInventoryItem = () => ({
    dataObjectId: '',
    parentProjectObjectId: '',
    subObjectSuffix: '',
    subObjectDescription: '',
    isSubObject: false,
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

  // Plan tab states
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [projectTaskGroups, setProjectTaskGroups] = useState<any[]>([]);
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
  const projectTasksLoadedRef = React.useRef(false);
  const projectInventoryLoadedRef = React.useRef(false);
  const seededDefaultTaskObjectsRef = React.useRef<Set<string>>(new Set());
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
    | { type: 'cycle'; id: string; programId: string; projectId?: string }
    | { type: 'project'; id: string; cycleId?: string }
    | { type: 'projectGroup'; key: string; programId: string }
    | { type: 'processArea'; area: string; projectId: string }
    | null
  >(null);
  const [treeOrder, setTreeOrder] = useState<{ programs: string[]; cycles: Record<string, string[]>; projects: Record<string, string[]>; projectGroups: Record<string, string[]>; processAreas: Record<string, string[]> }>({
    programs: [],
    cycles: {},
    projects: {},
    projectGroups: {},
    processAreas: {},
  });
  const [isHierarchySidebarOpen, setIsHierarchySidebarOpen] = useState(false);
  const [hierarchyStateHydrated, setHierarchyStateHydrated] = useState(false);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rf-planning-additional-groups');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setPlanningAdditionalGroups(parsed);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rf-planning-additional-groups', JSON.stringify(planningAdditionalGroups));
  }, [planningAdditionalGroups]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rf-planning-additional-process-areas');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setPlanningAdditionalProcessAreas(parsed);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rf-planning-additional-process-areas', JSON.stringify(planningAdditionalProcessAreas));
  }, [planningAdditionalProcessAreas]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rf-hidden-process-areas');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setHiddenProcessAreas(parsed);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rf-hidden-process-areas', JSON.stringify(hiddenProcessAreas));
  }, [hiddenProcessAreas]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rf-process-area-accent-overrides');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setProcessAreaAccentOverrides(parsed);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rf-process-area-accent-overrides', JSON.stringify(processAreaAccentOverrides));
  }, [processAreaAccentOverrides]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rf-process-area-descriptions');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setProcessAreaDescriptions(parsed);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rf-process-area-descriptions', JSON.stringify(processAreaDescriptions));
  }, [processAreaDescriptions]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rf-settings-process-area-descriptions');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setSettingsProcessAreaDescriptions(parsed);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rf-hierarchy-level-icons');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      setHierarchyLevelIcons({
        ...DEFAULT_HIERARCHY_LEVEL_ICONS,
        ...parsed,
      });
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rf-hierarchy-level-icons', JSON.stringify(hierarchyLevelIcons));
  }, [hierarchyLevelIcons]);

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

  const handleHierarchySelection = (item: SelectableItem, options?: { preserveProcessArea?: boolean }) => {
    if (!options?.preserveProcessArea) {
      setSelectedExecutionProcessArea('');
    }
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

  const { data: projectsByProgram = {} } = useQuery({
    queryKey: ['projectsByProgram'],
    queryFn: async () => {
      const projects: Record<string, Project[]> = {};
      await Promise.all(
        programs.map(async (program: Program) => {
          try {
            const response = await apiClient.get(`/api/projects/by-program/${program.id}`);
            projects[program.id] = response.data.data;
          } catch {
            projects[program.id] = [];
          }
        })
      );
      return projects;
    },
    enabled: programs.length > 0,
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
    Object.values(projectsByProgram).flat().forEach((project: any) => {
      const nameKey = (project.name || '').trim().toLowerCase();
      const dedupeKey = `${project.programId || ''}::${nameKey || project.id}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        unique.push(project);
      }
    });
    return unique;
  }, [projectsByProgram]);

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

  useEffect(() => {
    const loadHierarchySummaries = async () => {
      const projectIds = Array.from(new Set(
        Object.values(projectsByMockCycle)
          .flat()
          .map((project: any) => project.id)
          .filter(Boolean)
      ));

      if (projectIds.length === 0) {
        setProjectHierarchySummaries({});
        return;
      }

      try {
        const entries = await Promise.all(projectIds.map(async (projectId: string) => {
          const [objectsRes, groupsRes, tasksRes] = await Promise.all([
            apiClient.get(`/api/project-objects/project/${projectId}`),
            apiClient.get(`/api/tasks/groups/project/${projectId}`),
            apiClient.get(`/api/tasks/project/${projectId}`),
          ]);

          const objects = objectsRes.data?.data || [];
          const groups = groupsRes.data?.data || [];
          const tasks = tasksRes.data?.data || [];

          const processAreaSummary: Record<string, { objectCount: number; taskGroupCount: number; taskCount: number; progressPct: number }> = {};
          const objectAreaMap = new Map<string, string>();
          const groupAreaMap = new Map<string, string>();

          objects.forEach((obj: any) => {
            const area = (obj.processArea || '').trim();
            if (!area) return;
            objectAreaMap.set(obj.id, area);
            if (!processAreaSummary[area]) processAreaSummary[area] = { objectCount: 0, taskGroupCount: 0, taskCount: 0, progressPct: 0 };
            processAreaSummary[area].objectCount += 1;
          });

          groups.forEach((group: any) => {
            const area = (group.processArea || '').trim();
            if (!area) return;
            groupAreaMap.set(group.id, area);
            if (!processAreaSummary[area]) processAreaSummary[area] = { objectCount: 0, taskGroupCount: 0, taskCount: 0, progressPct: 0 };
            processAreaSummary[area].taskGroupCount += 1;
          });

          const progressBuckets: Record<string, number[]> = {};
          tasks.forEach((task: any) => {
            const objectArea = task.projectObjectId ? objectAreaMap.get(task.projectObjectId) : null;
            const groupArea = task.taskGroupId ? groupAreaMap.get(task.taskGroupId) : null;
            const area = objectArea || groupArea || null;
            if (!area) return;
            if (!progressBuckets[area]) progressBuckets[area] = [];
            progressBuckets[area].push(Number(task.progressPercentage ?? 0));
          });

          Object.keys(processAreaSummary).forEach((area) => {
            const values = progressBuckets[area] || [];
            processAreaSummary[area].taskCount = values.length;
            processAreaSummary[area].progressPct = values.length > 0 ? getProgressAverage(values) : 0;
          });

          const projectProgressPct = tasks.length > 0
            ? getProgressAverage(tasks.map((task: any) => Number(task.progressPercentage ?? 0)))
            : 0;

          return [projectId, {
            processAreas: processAreaSummary,
            projectProgressPct,
            projectObjectCount: objects.length,
            projectTaskGroupCount: groups.length,
          }] as const;
        }));

        setProjectHierarchySummaries(Object.fromEntries(entries));
      } catch (error) {
        console.error('Failed to load hierarchy summaries:', error);
      }
    };

    loadHierarchySummaries();
  }, [projectsByMockCycle]);

  // Keep inventory and plan project contexts isolated.
  const activeProjectId = canAccessInventory && tabValue === 1
    ? selectedProjectForInventory
    : (selectedItem?.type === 'project'
      ? selectedItem.id
      : selectedItem?.type === 'processArea'
        ? selectedItem.projectId
        : selectedItem?.type === 'cycle'
          ? (selectedItem.projectId || null)
          : null);
  const selectedCycleProjectId = selectedItem?.type === 'cycle'
    ? (selectedItem.projectId || null)
    : selectedItem?.type === 'processArea'
      ? selectedItem.projectId
      : null;
  const activeCycleId = selectedItem?.type === 'project'
    ? (selectedItem.cycleId || null)
    : selectedItem?.type === 'processArea'
      ? selectedItem.cycleId
    : selectedItem?.type === 'cycle'
      ? selectedItem.id
      : null;
  const allMaintainCycles: MockCycle[] = React.useMemo(() => (
    Object.values(mockCycles).flatMap((cycles) => cycles || []) as MockCycle[]
  ), [mockCycles]);
  const allMaintainProjects: Project[] = React.useMemo(() => (
    Object.values(projectsByProgram).flatMap((projects) => projects || []) as Project[]
  ), [projectsByProgram]);
  const maintainCycleParentProjectOptions = React.useMemo(() => {
    const byName = new Map<string, Project>();
    allMaintainProjects.forEach((project) => {
      const key = (project.name || '').trim().toLowerCase();
      if (!key) return;
      if (!byName.has(key)) {
        byName.set(key, project);
      }
    });
    return Array.from(byName.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allMaintainProjects]);
  const maintainCycleRows = React.useMemo(() => (
    allMaintainCycles
      .map((cycle) => {
        const linkedProject = allMaintainProjects.find((project) => project.id === cycle.projectId) || null;
        return {
          ...cycle,
          linkedProjectId: linkedProject?.id || '',
          linkedProjectName: linkedProject?.name || 'Unassigned Project',
          programName: programs.find((program) => program.id === cycle.programId)?.name || 'Program',
        };
      })
      .sort((a, b) => a.programName.localeCompare(b.programName) || a.name.localeCompare(b.name))
  ), [allMaintainCycles, allMaintainProjects, programs]);
  const maintainProjectRows = React.useMemo(() => (
    allMaintainProjects
      .map((project) => {
        const projectCycles = allMaintainCycles.filter((entry) => entry.projectId === project.id);
        const firstCycle = projectCycles[0] || null;
        const resolvedProgramId = project.programId || firstCycle?.programId || '';
        const programName = programs.find((program) => program.id === resolvedProgramId)?.name || 'Program';
        return {
          ...project,
          cycleName: firstCycle?.name || 'No Mock Cycles',
          programId: resolvedProgramId,
          programName,
        };
      })
      .sort((a, b) => a.programName.localeCompare(b.programName) || a.cycleName.localeCompare(b.cycleName) || a.name.localeCompare(b.name))
  ), [allMaintainProjects, allMaintainCycles, programs]);
  const visibleMaintainCycleRows = maintainCycleFilterProgramId === 'all'
    ? maintainCycleRows
    : maintainCycleRows.filter((row) => row.programId === maintainCycleFilterProgramId);
  const visibleMaintainProjectRows = React.useMemo(() => {
    const scopedRows = maintainProjectRows.filter((row) => row.programId === maintainProjectParentProgramId);
    const byName = new Map<string, typeof scopedRows[number]>();
    scopedRows.forEach((row) => {
      const key = `${row.programId}::${(row.name || '').trim().toLowerCase()}`;
      if (!byName.has(key)) {
        byName.set(key, row);
      }
    });
    return Array.from(byName.values());
  }, [maintainProjectRows, maintainProjectParentProgramId]);
  const treeProjectOptionsForProgram = React.useMemo(() => {
    if (!contextProgramId) return [] as Project[];
    const scoped = maintainProjectRows.filter((row: any) => row.programId === contextProgramId);
    const byName = new Map<string, Project>();
    scoped.forEach((row: any) => {
      const key = `${row.programId}::${(row.name || '').trim().toLowerCase()}`;
      if (!byName.has(key)) {
        byName.set(key, row as Project);
      }
    });
    return Array.from(byName.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [contextProgramId, maintainProjectRows]);
  const cyclesForMaintainProjectProgram = maintainProjectParentProgramId
    ? allMaintainCycles.filter((cycle) => cycle.programId === maintainProjectParentProgramId)
    : [];
  const maintainCycleParentProject = allMaintainProjects.find((project) => project.id === maintainCycleParentProjectId) || null;
  const getScopedProjectsForCycle = (cycleId: string, projectId?: string | null): Project[] => {
    const projects = (projectsByMockCycle[cycleId] || []) as Project[];
    if (!projectId) return projects;
    return projects.filter((project) => project.id === projectId);
  };

  useEffect(() => {
    if (!selectedItem) return;

    const payload = selectedItem.type === 'project'
      ? { type: 'project', projectId: selectedItem.id, cycleId: selectedItem.cycleId }
      : selectedItem.type === 'processArea'
        ? { type: 'processArea', projectId: selectedItem.projectId, cycleId: selectedItem.cycleId, area: selectedItem.area }
      : selectedItem.type === 'cycle'
        ? { type: 'cycle', cycleId: selectedItem.id, programId: selectedItem.programId, projectId: selectedItem.projectId || null }
        : { type: 'program', programId: selectedItem.id };

    localStorage.setItem(HIERARCHY_SELECTION_STORAGE_KEY, JSON.stringify(payload));
  }, [selectedItem]);

  useEffect(() => {
    if (!maintainCycleParentProgramId || !programs.some((program) => program.id === maintainCycleParentProgramId)) {
      setMaintainCycleParentProgramId(programs[0]?.id || '');
    }
  }, [programs, maintainCycleParentProgramId]);

  useEffect(() => {
    if (!maintainCycleParentProjectId || !allMaintainProjects.some((project) => project.id === maintainCycleParentProjectId)) {
      setMaintainCycleParentProjectId(maintainCycleParentProjectOptions[0]?.id || '');
    }
  }, [maintainCycleParentProjectOptions, maintainCycleParentProjectId, allMaintainProjects]);

  useEffect(() => {
    if (!maintainCycleParentProject) return;
    const parentProgramId = maintainCycleParentProject.programId || '';
    if (parentProgramId && parentProgramId !== maintainCycleParentProgramId) {
      setMaintainCycleParentProgramId(parentProgramId);
    }
  }, [maintainCycleParentProject, maintainCycleParentProgramId]);

  useEffect(() => {
    if (!maintainProjectParentProgramId || !programs.some((program) => program.id === maintainProjectParentProgramId)) {
      setMaintainProjectParentProgramId(programs[0]?.id || '');
    }
  }, [programs, maintainProjectParentProgramId]);

  useEffect(() => {
    const validCycles = maintainProjectParentProgramId
      ? allMaintainCycles.filter((cycle) => cycle.programId === maintainProjectParentProgramId)
      : allMaintainCycles;
    if (!maintainProjectParentCycleId || !validCycles.some((cycle) => cycle.id === maintainProjectParentCycleId)) {
      setMaintainProjectParentCycleId(validCycles[0]?.id || '');
    }
  }, [allMaintainCycles, maintainProjectParentProgramId, maintainProjectParentCycleId]);

  useEffect(() => {
    const isTreeProjectSelectionMode = dialogMode === 'project' && !isPlanningMaintainTab;
    if (!createDialogOpen || !isTreeProjectSelectionMode) return;
    const currentStillValid = treeProjectOptionsForProgram.some((project) => project.id === selectedExistingProjectOptionId);
    if (!currentStillValid) {
      setSelectedExistingProjectOptionId(treeProjectOptionsForProgram[0]?.id || '');
    }
  }, [createDialogOpen, dialogMode, isPlanningMaintainTab, treeProjectOptionsForProgram, selectedExistingProjectOptionId]);

  useEffect(() => {
    if (maintainCycleFilterProgramId === 'all') return;
    if (!programs.some((program) => program.id === maintainCycleFilterProgramId)) {
      setMaintainCycleFilterProgramId('all');
    }
  }, [programs, maintainCycleFilterProgramId]);

  useEffect(() => {
    if (maintainProjectFilterCycleId === 'all') return;
    if (!allMaintainCycles.some((cycle) => cycle.id === maintainProjectFilterCycleId)) {
      setMaintainProjectFilterCycleId('all');
    }
  }, [allMaintainCycles, maintainProjectFilterCycleId]);
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
    queryKey: ['projects-my-tasks', user?.id, user?.email, activeCycleId, selectedCycleProjectId, programs.length, Object.keys(mockCycles).length, Object.keys(projectsByMockCycle).length],
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
        const projects = getScopedProjectsForCycle(cycle.id, selectedCycleProjectId);
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
  const objectRowKey = (id: string) => `obj:${id}`;
  const taskGroupRowKey = (id: string) => `grp:${id}`;

  const persistPlanRowOrder = (projectId: string, rows: string[]) => {
    const objectIds = rows.filter((k: string) => k.startsWith('obj:')).map((k: string) => k.slice(4));
    const groupIds = rows.filter((k: string) => k.startsWith('grp:')).map((k: string) => k.slice(4));
    localStorage.setItem(getOrderStorageKey(projectId), JSON.stringify({
      rows,
      objects: objectIds,
      groups: groupIds,
    }));
  };

  const getOrderedPrograms = () => {
    const ids = mergeOrder(treeOrder.programs, programs.map((p: Program) => p.id));
    return ids.map(id => programs.find((p: Program) => p.id === id)).filter(Boolean) as Program[];
  };

  const getOrderedCycles = (programId: string) => {
    const source = mockCycles[programId] || [];
    const existing = treeOrder.cycles[programId] || [];
    const sourceIds = new Set(source.map((c: MockCycle) => c.id));
    const ids = existing.filter((id: string) => sourceIds.has(id));
    return ids.map(id => source.find((c: MockCycle) => c.id === id)).filter(Boolean) as MockCycle[];
  };

  const getAttachableCyclesForProgram = (programId: string) => {
    const visibleIds = new Set(treeOrder.cycles[programId] || []);
    return (mockCycles[programId] || []).filter((cycle: MockCycle) => !visibleIds.has(cycle.id));
  };

  const getOrderedProjects = (cycleId: string) => {
    const source = projectsByMockCycle[cycleId] || [];
    const existing = treeOrder.projects[cycleId] || [];
    const ids = mergeOrder(existing, source.map((p: Project) => p.id));
    return ids.map(id => source.find((p: Project) => p.id === id)).filter(Boolean) as Project[];
  };

  const getProjectGroupOrderKey = (name: string) => (name || '').trim().toLowerCase();

  const getProjectsByProgram = (programId: string) => {
    const programProjects = (projectsByProgram[programId] || []) as Project[];
    const byName = new Map<string, Project>();
    programProjects.forEach((project: Project) => {
      const key = getProjectGroupOrderKey(project.name || '');
      if (key && !byName.has(key)) {
        byName.set(key, project);
      }
    });
    const keys = mergeOrder(treeOrder.projectGroups[programId] || [], Array.from(byName.keys()));
    return keys
      .map((key) => byName.get(key))
      .filter(Boolean) as Project[];
  };

  const getCyclesForProjectInProgram = (programId: string, projectName: string) => {
    const cycleList = getOrderedCycles(programId);
    return cycleList.filter((cycle: MockCycle) =>
      (projectsByMockCycle[cycle.id] || []).some((p: Project) => (p.name || '').trim().toLowerCase() === projectName.trim().toLowerCase())
    );
  };

  const getPrimaryProjectIdForCycle = (cycleId: string) => {
    const projects = (projectsByMockCycle[cycleId] || []) as Project[];
    return projects[0]?.id || null;
  };

  const getInventoryProcessAreaOptions = (projectId: string) => {
    const labels = new Set<string>();
    projectInventoryItems
      .filter((item: any) => item.projectId === projectId)
      .forEach((item: any) => {
        const label = (item.processArea || '').trim();
        if (label) labels.add(label);
      });
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  };

  const getProcessAreasForProjectCycle = (projectId: string) => {
    const areas = new Set<string>();
    const attached = treeOrder.processAreas[projectId] || [];
    attached.forEach((area) => {
      const label = (area || '').trim();
      if (label) areas.add(label);
    });
    const additional = planningAdditionalGroups[projectId] || [];
    additional.forEach((groupName) => {
      const label = (groupName || '').trim();
      if (label) areas.add(label);
    });
    const additionalProcessAreaNodes = planningAdditionalProcessAreas[projectId] || [];
    additionalProcessAreaNodes.forEach((areaName) => {
      const label = (areaName || '').trim();
      if (label) areas.add(label);
    });

    const hiddenAreaSet = new Set((hiddenProcessAreas[projectId] || []).map((area) => (area || '').trim().toLowerCase()));
    const allAreas = Array.from(areas).filter((area) => !hiddenAreaSet.has((area || '').trim().toLowerCase()));
    const ordered = mergeOrder(attached, allAreas);
    return ordered;
  };

  const getProcessAreaAccent = (projectId: string, area: string, fallback: string) => {
    return processAreaAccentOverrides[projectId]?.[area] || fallback;
  };

  const getProcessAreaDisplayName = (projectId: string, area: string) => {
    const description = (processAreaDescriptions[projectId]?.[area] || settingsProcessAreaDescriptions[area] || '').trim();
    return description || area;
  };

  const renderHierarchyIcon = (level: HierarchyLevel, color: string, size: string) => {
    const iconChoice = hierarchyLevelIcons[level];
    const sx = { fontSize: size, color, flexShrink: 0 };
    switch (iconChoice) {
      case 'sync':
        return <SyncIcon sx={sx} />;
      case 'folderOutlined':
        return <FolderOutlinedIcon sx={sx} />;
      case 'accountTree':
        return <AccountTreeIcon sx={sx} />;
      case 'layers':
        return <LayersIcon sx={sx} />;
      case 'viewList':
        return <ViewListIcon sx={sx} />;
      case 'event':
        return <EventIcon sx={sx} />;
      case 'corporateFare':
      default:
        return <CorporateFareIcon sx={sx} />;
    }
  };

  const renderIconChoice = (choice: HierarchyIconChoice, color: string, size: string) => {
    const sx = { fontSize: size, color, flexShrink: 0 };
    switch (choice) {
      case 'sync':
        return <SyncIcon sx={sx} />;
      case 'folderOutlined':
        return <FolderOutlinedIcon sx={sx} />;
      case 'accountTree':
        return <AccountTreeIcon sx={sx} />;
      case 'layers':
        return <LayersIcon sx={sx} />;
      case 'viewList':
        return <ViewListIcon sx={sx} />;
      case 'event':
        return <EventIcon sx={sx} />;
      case 'corporateFare':
      default:
        return <CorporateFareIcon sx={sx} />;
    }
  };

  const renderIconPicker = (level: HierarchyLevel, accent: string) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
      {HIERARCHY_ICON_OPTIONS.map((option) => {
        const selected = hierarchyLevelIcons[level] === option.value;
        return (
          <IconButton
            key={`${level}-${option.value}`}
            size="small"
            title={option.label}
            onClick={() => setHierarchyLevelIcons((prev) => ({ ...prev, [level]: option.value }))}
            sx={{
              width: 30,
              height: 30,
              border: '1px solid',
              borderColor: selected ? accent : 'rgba(255,255,255,0.2)',
              backgroundColor: selected ? toRgba(accent, 0.18) : 'rgba(255,255,255,0.04)',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: selected ? toRgba(accent, 0.24) : 'rgba(255,255,255,0.08)',
              },
            }}
          >
            {renderIconChoice(option.value, selected ? accent : 'rgba(255,255,255,0.78)', '0.95rem')}
          </IconButton>
        );
      })}
    </Box>
  );

  const getProgressAverage = (values: number[]) => {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + Math.max(0, Math.min(100, value || 0)), 0) / values.length);
  };

  const getProcessAreaProgress = (projectId: string, area: string, fallbackPct: number) => {
    const cachedProcessAreas = projectHierarchySummaries[projectId]?.processAreas || {};
    if (cachedProcessAreas[area]) {
      return cachedProcessAreas[area].progressPct;
    }
    if (activeProjectId !== projectId) return fallbackPct;
    const normalizedArea = (area || '').trim().toLowerCase();
    const areaObjectIds = new Set(
      projectInventoryItems
        .filter((item: any) => item.projectId === projectId && ((item.processArea || '').trim().toLowerCase() === normalizedArea))
        .map((item: any) => item.id)
    );
    const areaGroupIds = new Set(
      projectTaskGroups
        .filter((group: any) => group.projectId === projectId && ((group.processArea || '').trim().toLowerCase() === normalizedArea))
        .map((group: any) => group.id)
    );
    const areaTasks = projectTasks.filter((task: any) =>
      (task.projectObjectId && areaObjectIds.has(task.projectObjectId)) ||
      (task.taskGroupId && areaGroupIds.has(task.taskGroupId))
    );
    if (areaTasks.length === 0) return fallbackPct;
    return getProgressAverage(areaTasks.map((task: any) => Number(task.progressPercentage ?? 0)));
  };

  const handleAddAdditionalGroup = (projectId: string) => {
    setPlanGroupTargetProjectId(projectId);
    setNewPlanGroupName('');
    setPlanGroupDialogOpen(true);
  };

  const handleAddProcessArea = (projectId: string) => {
    const options = getInventoryProcessAreaOptions(projectId);
    if (options.length === 0) {
      alert('No process areas are available from current project inventory.');
      return;
    }
    setProcessAreaTargetProjectId(projectId);
    setNewProcessAreaName(options[0]);
    setProcessAreaDialogOpen(true);
  };

  const handleCreatePlanGroup = () => {
    const projectId = planGroupTargetProjectId;
    const name = newPlanGroupName.trim();
    if (!projectId) {
      alert('Project context missing for Plan Group.');
      return;
    }
    if (!name) {
      alert('Plan Group name is required.');
      return;
    }
    setPlanningAdditionalGroups(prev => {
      const existing = prev[projectId] || [];
      if (existing.some(g => g.toLowerCase() === name.toLowerCase())) return prev;
      return {
        ...prev,
        [projectId]: [...existing, name],
      };
    });
    setPlanGroupDialogOpen(false);
    setPlanGroupTargetProjectId(null);
    setNewPlanGroupName('');
  };

  const handleRemovePlanGroup = (projectId: string, areaName: string) => {
    const normalizedTarget = (areaName || '').trim().toLowerCase();
    if (!normalizedTarget) return;

    setPlanningAdditionalGroups((prev) => {
      const existing = prev[projectId] || [];
      const next = existing.filter((group) => (group || '').trim().toLowerCase() !== normalizedTarget);
      return {
        ...prev,
        [projectId]: next,
      };
    });
  };

  const handleCreateProcessArea = () => {
    const projectId = processAreaTargetProjectId;
    const name = newProcessAreaName.trim();
    if (!projectId) {
      alert('Project context missing for Process Area.');
      return;
    }
    if (!name) {
      alert('Process Area name is required.');
      return;
    }

    const allowedOptions = getInventoryProcessAreaOptions(projectId);
    if (!allowedOptions.some((option) => option.toLowerCase() === name.toLowerCase())) {
      alert('Select a process area that exists in the current project inventory.');
      return;
    }

    setPlanningAdditionalProcessAreas((prev) => {
      const existing = prev[projectId] || [];
      if (existing.some((entry) => (entry || '').trim().toLowerCase() === name.toLowerCase())) return prev;
      return {
        ...prev,
        [projectId]: [...existing, name],
      };
    });

    setHiddenProcessAreas((prev) => {
      const existing = prev[projectId] || [];
      const next = existing.filter((entry) => (entry || '').trim().toLowerCase() !== name.toLowerCase());
      return {
        ...prev,
        [projectId]: next,
      };
    });

    setTreeOrder((prev) => ({
      ...prev,
      processAreas: {
        ...prev.processAreas,
        [projectId]: mergeOrder(prev.processAreas[projectId] || [], [name]),
      },
    }));

    setProcessAreaDialogOpen(false);
    setProcessAreaTargetProjectId(null);
    setNewProcessAreaName('');
  };

  const handleHideProcessAreaFromTree = (projectId: string, areaName: string) => {
    const normalizedTarget = (areaName || '').trim().toLowerCase();
    if (!normalizedTarget) return;

    setHiddenProcessAreas((prev) => {
      const existing = prev[projectId] || [];
      if (existing.some((entry) => (entry || '').trim().toLowerCase() === normalizedTarget)) return prev;
      return {
        ...prev,
        [projectId]: [...existing, areaName],
      };
    });

    setPlanningAdditionalProcessAreas((prev) => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter((entry) => (entry || '').trim().toLowerCase() !== normalizedTarget),
    }));

    setTreeOrder((prev) => ({
      ...prev,
      processAreas: {
        ...prev.processAreas,
        [projectId]: (prev.processAreas[projectId] || []).filter(
          (entry) => (entry || '').trim().toLowerCase() !== normalizedTarget
        ),
      },
    }));
  };

  // Load schedule rows for all projects in the selected cycle.
  useEffect(() => {
    const loadCycleSchedule = async () => {
      if (tabValue !== 3 || !activeCycleId) {
        setCycleScheduleItems([]);
        return;
      }

      const cycleProjects = getScopedProjectsForCycle(activeCycleId, selectedCycleProjectId);
      if (cycleProjects.length === 0) {
        setCycleScheduleItems([]);
        return;
      }

      let activeCycle: MockCycle | null = null;
      for (const programId in mockCycles) {
        const cycle = (mockCycles[programId] || []).find((c: MockCycle) => c.id === activeCycleId) || null;
        if (cycle) {
          activeCycle = cycle;
          break;
        }
      }

      const mockCycleName = activeCycle?.name || 'Mock Cycle';
      const mockCycleDescription = (activeCycle as any)?.description || activeCycle?.name || '';

      setIsLoadingCycleSchedule(true);
      try {
        const all = await Promise.all(
          cycleProjects.map(async (project: Project, index: number) => {
            try {
              const [objectsResponse, tasksResponse, groupsResponse] = await Promise.all([
                apiClient.get(`/api/project-objects/project/${project.id}`),
                apiClient.get(`/api/tasks/project/${project.id}`),
                apiClient.get(`/api/tasks/groups/project/${project.id}`),
              ]);

              const items = objectsResponse.data?.data || [];
              const tasks = tasksResponse.data?.data || [];
              const groups = groupsResponse.data?.data || [];

              // Map each project object to a load date window (start/end).
              const loadWindowByObjectId: Record<string, { startDate: string | null; endDate: string | null }> = {};
              const loadWindowByTaskGroupId: Record<string, { startDate: string | null; endDate: string | null }> = {};
              tasks.forEach((task: any) => {
                const objectId = task.projectObjectId;
                const taskGroupId = task.taskGroupId;

                const isLoadTask =
                  (task.taskType || '').toLowerCase() === 'load' ||
                  (task.name || '').trim().toLowerCase() === 'load';

                if (!isLoadTask) return;
                if (!objectId && !taskGroupId) return;

                const startDate = task.startDate || null;
                const endDate = task.endDate || task.startDate || null;
                if (!startDate && !endDate) return;

                if (objectId) {
                  const existing = loadWindowByObjectId[objectId];
                  if (!existing) {
                    loadWindowByObjectId[objectId] = { startDate, endDate };
                  } else {
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
                  }
                }

                if (taskGroupId) {
                  const groupExisting = loadWindowByTaskGroupId[taskGroupId];
                  if (!groupExisting) {
                    loadWindowByTaskGroupId[taskGroupId] = { startDate, endDate };
                  } else {
                    const groupNextStart = startDate && (!groupExisting.startDate || startDate < groupExisting.startDate)
                      ? startDate
                      : groupExisting.startDate;
                    const groupNextEnd = endDate && (!groupExisting.endDate || endDate > groupExisting.endDate)
                      ? endDate
                      : groupExisting.endDate;
                    loadWindowByTaskGroupId[taskGroupId] = {
                      startDate: groupNextStart,
                      endDate: groupNextEnd,
                    };
                  }
                }
              });

              const projectColor = getProjectAccentColor(project, index);
              const objectRows = items.map((item: any) => {
                const processArea = (item.processArea || '').trim() || 'Unassigned Process Area';
                const processAreaAccent = getProcessAreaAccent(project.id, processArea, projectColor);
                return {
                  ...item,
                  scheduleEntityType: 'object',
                  entityLabel: item.objectId || 'Data Object',
                  processArea,
                  processAreaAccent,
                  taskGroupName: '',
                  mockCycleName,
                  mockCycleDescription,
                  projectName: project.name,
                  projectColor,
                  projectId: project.id,
                  loadStartDate: loadWindowByObjectId[item.id]?.startDate || null,
                  loadEndDate: loadWindowByObjectId[item.id]?.endDate || null,
                };
              });

              const taskGroupRows = groups.map((group: any) => {
                const processArea = (group.processArea || '').trim() || 'Unassigned Process Area';
                const processAreaAccent = getProcessAreaAccent(project.id, processArea, projectColor);
                return {
                  id: group.id,
                  description: group.name || 'Task Group',
                  scheduleEntityType: 'taskGroup',
                  entityLabel: group.name || 'Task Group',
                  processArea,
                  processAreaAccent,
                  taskGroupName: group.name || 'Task Group',
                  mockCycleName,
                  mockCycleDescription,
                  projectName: project.name,
                  projectColor,
                  projectId: project.id,
                  loadStartDate: loadWindowByTaskGroupId[group.id]?.startDate || null,
                  loadEndDate: loadWindowByTaskGroupId[group.id]?.endDate || null,
                };
              });

              return [...objectRows, ...taskGroupRows];
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
  }, [tabValue, activeCycleId, selectedCycleProjectId, projectsByMockCycle]);

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
    const objectIds = projectInventoryItems.map((item: any) => item.id);
    const groupIds = projectTaskGroups.map(g => g.id);
    const currentKeys = [
      ...objectIds.map((id: string) => objectRowKey(id)),
      ...groupIds.map((id: string) => taskGroupRowKey(id)),
    ];
    setPlanRowOrder(prev => mergeOrder(prev, currentKeys));
  }, [activeProjectId, projectInventoryItems, projectTaskGroups]);

  // Load persisted tree ordering.
  useEffect(() => {
    let cancelled = false;

    const applyTreeOrder = (parsed: any) => {
      setTreeOrder({
        programs: Array.isArray(parsed?.programs) ? parsed.programs : [],
        cycles: typeof parsed?.cycles === 'object' && parsed?.cycles ? parsed.cycles : {},
        projects: typeof parsed?.projects === 'object' && parsed?.projects ? parsed.projects : {},
        projectGroups: typeof parsed?.projectGroups === 'object' && parsed?.projectGroups ? parsed.projectGroups : {},
        processAreas: typeof parsed?.processAreas === 'object' && parsed?.processAreas ? parsed.processAreas : {},
      });
    };

    const applyExpandedState = (parsed: any) => {
      setExpandedPrograms(new Set(Array.isArray(parsed?.expandedPrograms) ? parsed.expandedPrograms : []));
      setExpandedCycles(new Set(Array.isArray(parsed?.expandedCycles) ? parsed.expandedCycles : []));
      setExpandedProjectGroups(new Set(Array.isArray(parsed?.expandedProjectGroups) ? parsed.expandedProjectGroups : []));
      // Object rows should start collapsed on load; users can expand them manually in-session.
      setExpandedObjects(new Set());
    };

    const hydrateHierarchyState = async () => {
      try {
        const response = await apiClient.get('/api/hierarchy-preferences/state');
        const parsed = response.data?.data;
        if (!cancelled && parsed && typeof parsed === 'object') {
          if (parsed?.treeOrder) applyTreeOrder(parsed.treeOrder);
          if (parsed?.expandedPrograms || parsed?.expandedCycles || parsed?.expandedProjectGroups || parsed?.expandedObjects) {
            applyExpandedState(parsed);
          }
          if (parsed?.planningAdditionalGroups && typeof parsed.planningAdditionalGroups === 'object') setPlanningAdditionalGroups(parsed.planningAdditionalGroups);
          if (parsed?.planningAdditionalProcessAreas && typeof parsed.planningAdditionalProcessAreas === 'object') setPlanningAdditionalProcessAreas(parsed.planningAdditionalProcessAreas);
          if (parsed?.hiddenProcessAreas && typeof parsed.hiddenProcessAreas === 'object') setHiddenProcessAreas(parsed.hiddenProcessAreas);
          if (parsed?.processAreaAccentOverrides && typeof parsed.processAreaAccentOverrides === 'object') setProcessAreaAccentOverrides(parsed.processAreaAccentOverrides);
          if (parsed?.processAreaDescriptions && typeof parsed.processAreaDescriptions === 'object') setProcessAreaDescriptions(parsed.processAreaDescriptions);
          if (parsed?.hierarchyLevelIcons && typeof parsed.hierarchyLevelIcons === 'object') {
            setHierarchyLevelIcons({
              ...DEFAULT_HIERARCHY_LEVEL_ICONS,
              ...parsed.hierarchyLevelIcons,
            });
          }
          setHierarchyStateHydrated(true);
          return;
        }
      } catch {
        // Fallback to local storage when no DB preference exists yet.
      }

      if (!cancelled) {
        setHierarchyStateHydrated(true);
      }
    };

    hydrateHierarchyState();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync tree ordering when data changes.
  useEffect(() => {
    setTreeOrder(prev => {
      const nextPrograms = mergeOrder(prev.programs, programs.map((p: Program) => p.id));
      const nextCycles: Record<string, string[]> = { ...prev.cycles };
      for (const programId in mockCycles) {
        const cycles = mockCycles[programId] || [];
        const cycleIds = new Set(cycles.map((c: MockCycle) => c.id));
        nextCycles[programId] = (prev.cycles[programId] || []).filter((id: string) => cycleIds.has(id));
      }
      const nextProjects: Record<string, string[]> = { ...prev.projects };
      for (const cycleId in projectsByMockCycle) {
        const projects = projectsByMockCycle[cycleId] || [];
        nextProjects[cycleId] = mergeOrder(prev.projects[cycleId] || [], projects.map((p: Project) => p.id));
      }
      const nextProjectGroups: Record<string, string[]> = { ...prev.projectGroups };
      for (const programId in projectsByProgram) {
        const groups = Array.from(new Set(
          ((projectsByProgram[programId] || []) as Project[])
            .map((project: Project) => getProjectGroupOrderKey(project.name || ''))
            .filter(Boolean)
        ));
        nextProjectGroups[programId] = mergeOrder(prev.projectGroups[programId] || [], groups);
      }
      const nextProcessAreas: Record<string, string[]> = { ...prev.processAreas };
      for (const cycleId in projectsByMockCycle) {
        const cycleProjects = projectsByMockCycle[cycleId] || [];
        cycleProjects.forEach((project: Project) => {
          const areaLabels = new Set<string>();
          const cachedAreas = projectHierarchySummaries[project.id]?.processAreas || {};
          Object.keys(cachedAreas).forEach((area) => {
            const label = (area || '').trim();
            if (label) areaLabels.add(label);
          });
          projectInventoryItems
            .filter((item: any) => item.projectId === project.id)
            .forEach((item: any) => {
              const label = (item.processArea || '').trim();
              if (label) areaLabels.add(label);
            });
          (planningAdditionalGroups[project.id] || []).forEach((groupName) => {
            const label = (groupName || '').trim();
            if (label) areaLabels.add(label);
          });
          nextProcessAreas[project.id] = mergeOrder(prev.processAreas[project.id] || [], Array.from(areaLabels));
        });
      }
      return { programs: nextPrograms, cycles: nextCycles, projects: nextProjects, projectGroups: nextProjectGroups, processAreas: nextProcessAreas };
    });
  }, [programs, mockCycles, projectsByMockCycle, projectsByProgram, projectHierarchySummaries, projectInventoryItems, planningAdditionalGroups]);

  // Persist tree ordering.
  useEffect(() => {
    if (!hierarchyStateHydrated) return;

    const timeout = setTimeout(() => {
      apiClient.put('/api/hierarchy-preferences/state', {
        treeOrder,
        expandedPrograms: Array.from(expandedPrograms),
        expandedCycles: Array.from(expandedCycles),
        expandedProjectGroups: Array.from(expandedProjectGroups),
        expandedObjects: Array.from(expandedObjects),
        planningAdditionalGroups,
        planningAdditionalProcessAreas,
        hiddenProcessAreas,
        processAreaAccentOverrides,
        processAreaDescriptions,
        hierarchyLevelIcons,
      }).catch(() => {
        // No-op: hierarchy state is shared through the database.
      });
    }, 350);

    return () => clearTimeout(timeout);
  }, [
    treeOrder,
    expandedPrograms,
    expandedCycles,
    expandedProjectGroups,
    expandedObjects,
    planningAdditionalGroups,
    planningAdditionalProcessAreas,
    hiddenProcessAreas,
    processAreaAccentOverrides,
    processAreaDescriptions,
    hierarchyLevelIcons,
    hierarchyStateHydrated,
  ]);

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
        setSelectedExecutionProcessArea('');
        projectInventoryLoadedRef.current = false;
        return;
      }

      projectInventoryLoadedRef.current = false;

      try {
        const response = await apiClient.get(`/api/project-objects/project/${activeProjectId}`);
        const items = response.data.data || [];
        setProjectInventoryItems(items.map((item: any) => ({
          id: item.id,
          projectId: item.projectId,
          dataObjectId: item.objectId,
          objectId: item.objectId,
          globalObjectId: item.globalObjectId,
          parentProjectObjectId: item.parentProjectObjectId || '',
          parentObjectId: item.parentObjectId || '',
          subObjectSuffix: item.subObjectSuffix || '',
          subObjectDescription: item.subObjectDescription || '',
          isSubObject: !!item.parentProjectObjectId,
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
        projectInventoryLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load project inventory:', error);
        setProjectInventoryItems([]);
        projectInventoryLoadedRef.current = false;
      }
    };

    loadProjectInventory();
  }, [activeProjectId]);

  useEffect(() => {
    if (selectedItem?.type === 'processArea') {
      setSelectedExecutionProcessArea(selectedItem.area);
      return;
    }
    setSelectedExecutionProcessArea('');
  }, [activeProjectId, selectedItem]);

  // Load tasks and task groups when project is selected
  useEffect(() => {
    const loadTasksAndGroups = async () => {
      if (!activeProjectId) {
        setProjectTasks([]);
        setProjectTaskGroups([]);
        setTaskCommentCounts({});
        projectTasksLoadedRef.current = false;
        return;
      }

      projectTasksLoadedRef.current = false;

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
        projectTasksLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load tasks:', error);
        setProjectTasks([]);
        setProjectTaskGroups([]);
        projectTasksLoadedRef.current = false;
      }
    };

    loadTasksAndGroups();
  }, [activeProjectId]);

  useEffect(() => {
    seededDefaultTaskObjectsRef.current = new Set();
    projectTasksLoadedRef.current = false;
    projectInventoryLoadedRef.current = false;
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId) return;
    if (!projectTasksLoadedRef.current || !projectInventoryLoadedRef.current) return;
    if (defaultTaskOrder.length === 0) return;

    const seededIds = seededDefaultTaskObjectsRef.current;
    const inventoryById = new Map(projectInventoryItems.map((item: any) => [item.id, item]));
    const assignedParentObjectIds = new Set(
      projectTasks
        .filter((task: any) => !!task.projectObjectId)
        .map((task: any) => task.projectObjectId)
        .filter((objectId: string) => {
          const item = inventoryById.get(objectId);
          return !!item && !item.parentProjectObjectId;
        })
    );
    const subObjectsNeedingDefaults = projectInventoryItems.filter((item: any) =>
      item.parentProjectObjectId &&
      assignedParentObjectIds.has(item.parentProjectObjectId) &&
      !projectTasks.some((task: any) => task.projectObjectId === item.id) &&
      !seededIds.has(item.id)
    );

    if (subObjectsNeedingDefaults.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const subObject of subObjectsNeedingDefaults) {
        seededIds.add(subObject.id);
        try {
          const tasksResponse = await apiClient.post(`/api/tasks/defaults/project-object/${subObject.id}`, {
            projectId: activeProjectId,
          });
          if (cancelled) return;
          const seededTasks = (tasksResponse.data.data || []).map((t: any) => normalizeTaskDateFields(t));
          if (seededTasks.length > 0) {
            setProjectTasks(prev => [...prev, ...seededTasks]);
          }
        } catch (error) {
          console.error('Failed to seed default tasks for sub-object:', error);
          seededIds.delete(subObject.id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, projectInventoryItems, projectTasks, defaultTaskOrder]);

  useEffect(() => {
    const loadCycleOverview = async () => {
      if (tabValue !== 0 || selectedItem?.type !== 'cycle') {
        setCycleOverview(null);
        return;
      }

      const cycleId = selectedItem.id;
      const projects = getScopedProjectsForCycle(cycleId, selectedItem.projectId || null);

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
    if (sectionMode === 'execution' && params.get('tab') === 'my-tasks') {
      setTabValue(5);
    }
  }, [location.search, sectionMode]);

  useEffect(() => {
    if (!canAccessInventory && tabValue === 1) {
      setTabValue(0);
    }
  }, [canAccessInventory, tabValue]);

  // Ensure Priorities tab has a project context so the panel doesn't appear blank.
  useEffect(() => {
    if (tabValue !== 2 || activeProjectId) return;

    if (selectedItem?.type === 'cycle') {
      if (selectedItem.projectId) {
        setSelectedItem({ type: 'project', id: selectedItem.projectId, cycleId: selectedItem.id });
        return;
      }
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
    const isTreeProjectSelectionMode = dialogMode === 'project' && !isPlanningMaintainTab;

    if (!isTreeProjectSelectionMode && !newItemName.trim()) {
      alert('Name is required');
      return;
    }

    if (isTreeProjectSelectionMode) {
      if (!selectedExistingProjectOptionId) {
        alert('Select a maintained project option first.');
        return;
      }

      const selectedProject = treeProjectOptionsForProgram.find((project) => project.id === selectedExistingProjectOptionId) || null;
      if (!selectedProject) {
        alert('Selected project option is no longer available.');
        return;
      }

      const targetProgramId = contextProgramId || selectedProject.programId || '';
      const existingCycles = targetProgramId ? getCyclesForProjectInProgram(targetProgramId, selectedProject.name || '') : [];
      if (existingCycles.length > 0) {
        const firstCycle = existingCycles[0];
        setExpandedPrograms((prev) => new Set(prev).add(targetProgramId));
        setExpandedCycles((prev) => new Set(prev).add(firstCycle.id));
        setSelectedExecutionProcessArea('');
        handleHierarchySelection({ type: 'project', id: selectedProject.id, cycleId: firstCycle.id });
      } else {
        if (targetProgramId) {
          setExpandedPrograms((prev) => new Set(prev).add(targetProgramId));
        }
        setSelectedExecutionProcessArea('');
        handleHierarchySelection({ type: 'project', id: selectedProject.id });
      }

      setCreateDialogOpen(false);
      setContextProgramId(null);
      setContextCycleId(null);
      setSelectedExistingProjectOptionId('');
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
          projectId: maintainPendingCycleProjectId || undefined,
        });
        queryClient.invalidateQueries({ queryKey: ['mockCycles'] });
        setExpandedPrograms(new Set(expandedPrograms).add(contextProgramId));
      } else if (dialogMode === 'project' && contextProgramId) {
        await apiClient.post(`/api/projects/by-program/${contextProgramId}`, {
          name: newItemName,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        queryClient.invalidateQueries({ queryKey: ['projectsByProgram'] });
      }
      setNewItemName('');
      setNewItemDesc('');
      setNewItemAccentColor('');
      setCreateDialogOpen(false);
      setContextProgramId(null);
      setContextCycleId(null);
      setSelectedExistingProjectOptionId('');
      setMaintainPendingCycleProjectId(null);
    } catch (error) {
      console.error('Failed to create:', error);
      alert('Failed to create. Please try again.');
    } finally {
      setIsCreating(false);
      setSelectedExistingProjectOptionId('');
      setMaintainPendingCycleProjectId(null);
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
    apiClient.put('/api/hierarchy-preferences/state', {
      treeOrder,
      expandedPrograms: Array.from(newSet),
      expandedCycles: Array.from(expandedCycles),
      expandedProjectGroups: Array.from(expandedProjectGroups),
      expandedObjects: Array.from(expandedObjects),
      planningAdditionalGroups,
      planningAdditionalProcessAreas,
      hiddenProcessAreas,
      processAreaAccentOverrides,
      processAreaDescriptions,
      hierarchyLevelIcons,
    }).catch(() => {});
  };

  const toggleCycleExpanded = (cycleId: string) => {
    const newSet = new Set(expandedCycles);
    if (newSet.has(cycleId)) {
      newSet.delete(cycleId);
    } else {
      newSet.add(cycleId);
    }
    setExpandedCycles(newSet);
    apiClient.put('/api/hierarchy-preferences/state', {
      treeOrder,
      expandedPrograms: Array.from(expandedPrograms),
      expandedCycles: Array.from(newSet),
      expandedProjectGroups: Array.from(expandedProjectGroups),
      expandedObjects: Array.from(expandedObjects),
      planningAdditionalGroups,
      planningAdditionalProcessAreas,
      hiddenProcessAreas,
      processAreaAccentOverrides,
      processAreaDescriptions,
      hierarchyLevelIcons,
    }).catch(() => {});
  };

  const toggleProjectGroupExpanded = (projectGroupKey: string) => {
    const next = new Set(expandedProjectGroups);
    if (next.has(projectGroupKey)) {
      next.delete(projectGroupKey);
    } else {
      next.add(projectGroupKey);
    }
    setExpandedProjectGroups(next);
    apiClient.put('/api/hierarchy-preferences/state', {
      treeOrder,
      expandedPrograms: Array.from(expandedPrograms),
      expandedCycles: Array.from(expandedCycles),
      expandedProjectGroups: Array.from(next),
      expandedObjects: Array.from(expandedObjects),
      planningAdditionalGroups,
      planningAdditionalProcessAreas,
      hiddenProcessAreas,
      processAreaAccentOverrides,
      processAreaDescriptions,
      hierarchyLevelIcons,
    }).catch(() => {});
  };

  const openCreateDialog = (mode: 'program' | 'cycle' | 'project', programId?: string, cycleId?: string) => {
    setDialogMode(mode);
    setContextProgramId(programId || null);
    setContextCycleId(cycleId || null);
    setNewItemName('');
    setNewItemDesc('');
    setNewItemAccentColor('');
    setSelectedExistingProjectOptionId('');
    setNewCycleScheduleMode('all_days');
    setCreateDialogOpen(true);
  };

  const openAttachCycleDialog = (programId: string) => {
    const attachableCycles = getAttachableCyclesForProgram(programId);
    if (attachableCycles.length === 0) {
      alert('No maintained mock cycles are available to add for this program.');
      return;
    }
    setAttachCycleProgramId(programId);
    setAttachCycleId(attachableCycles[0].id);
    setAttachCycleDialogOpen(true);
  };

  const handleAttachCycleConfirm = async () => {
    if (!attachCycleProgramId || !attachCycleId) return;

    const cycle = (mockCycles[attachCycleProgramId] || []).find((entry: MockCycle) => entry.id === attachCycleId) || null;
    if (!cycle) {
      alert('Selected mock cycle is no longer available.');
      return;
    }

    const nextTreeOrder = {
      ...treeOrder,
      cycles: {
        ...treeOrder.cycles,
        [attachCycleProgramId]: mergeOrder(treeOrder.cycles[attachCycleProgramId] || [], [attachCycleId]),
      },
    };

    setTreeOrder(nextTreeOrder);
    await apiClient.put('/api/hierarchy-preferences/state', {
      treeOrder: nextTreeOrder,
      planningAdditionalGroups,
      planningAdditionalProcessAreas,
      hiddenProcessAreas,
      processAreaAccentOverrides,
      processAreaDescriptions,
      hierarchyLevelIcons,
    }).catch(() => {
      // The debounced saver will retry; this is just to avoid refresh races.
    });
    setExpandedPrograms((prev) => new Set(prev).add(attachCycleProgramId));
    setExpandedCycles((prev) => new Set(prev).add(attachCycleId));
    setSelectedItem({ type: 'cycle', id: attachCycleId, programId: attachCycleProgramId, projectId: cycle.projectId });
    setTabValue(0);

    setAttachCycleDialogOpen(false);
    setAttachCycleProgramId(null);
    setAttachCycleId('');
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
      const deletedItemId = deleteItemId;
      const deletedItemType = deleteItemType;
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
      
      // Refresh hierarchy queries immediately so deleted items disappear without stale selection errors.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['programs'] }),
        queryClient.invalidateQueries({ queryKey: ['mockCycles'] }),
        queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] }),
        queryClient.invalidateQueries({ queryKey: ['projectsByProgram'] }),
      ]);

      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['programs'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['mockCycles'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['projectsByMockCycle'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['projectsByProgram'], type: 'active' }),
      ]);
      
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
      
      // Clear selection if it now points to a deleted hierarchy node or its deleted parent.
      const shouldClearSelection = (() => {
        if (!selectedItem) return false;
        if (selectedItem.id === deletedItemId) return true;

        if (deletedItemType === 'program') {
          return (
            (selectedItem as any).programId === deletedItemId ||
            ((selectedItem.type === 'cycle' || selectedItem.type === 'project' || selectedItem.type === 'processArea') &&
              (selectedItem as any).programId === deletedItemId)
          );
        }

        if (deletedItemType === 'cycle') {
          return (
            (selectedItem as any).cycleId === deletedItemId ||
            (selectedItem.type === 'cycle' && selectedItem.id === deletedItemId)
          );
        }

        if (deletedItemType === 'project') {
          return (
            (selectedItem.type === 'project' && selectedItem.id === deletedItemId) ||
            (selectedItem.type === 'processArea' && selectedItem.projectId === deletedItemId)
          );
        }

        return false;
      })();

      if (shouldClearSelection) {
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
      const linkedCycle = allMaintainCycles.find((cycle) => cycle.id === itemId) || null;
      const linkedProject = allMaintainProjects.find((project) => project.id === linkedCycle?.projectId) || null;
      setEditCycleParentProjectId(linkedProject?.id || maintainCycleParentProjectOptions[0]?.id || '');
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
      const project = allMaintainProjects.find((p) => p.id === itemId) || null;
      if (project) {
        setEditItemName(project.name);
        setEditItemDesc('');
        setEditStartDate(project.startDate || '');
        setEditEndDate(project.endDate || '');
        setEditAccentColor(project.accentColor || '');
        setEditProjectParentProgramId(project.programId || '');
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
        if (!editCycleParentProjectId) {
          alert('A parent project is required for mock cycles.');
          return;
        }

        await apiClient.patch(`/api/mock-cycles/${editItemId}`, {
          name: editItemName,
          scheduleMode: editCycleScheduleMode,
          accentColor: editAccentColor || null,
        });
        await apiClient.patch(`/api/projects/${editCycleParentProjectId}`, { mockCycleId: editItemId });
      } else if (editItemType === 'project') {
        await apiClient.patch(`/api/projects/${editItemId}`, {
          name: editItemName,
          startDate: editStartDate,
          endDate: editEndDate,
          accentColor: editAccentColor,
          programId: editProjectParentProgramId,
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['mockCycles'] });
      queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] });
      queryClient.invalidateQueries({ queryKey: ['projectsByProgram'] });

      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update:', error);
      alert('Failed to update. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleCloneCycle = (cycleId: string) => {
    const sourceCycle = allMaintainCycles.find((cycle) => cycle.id === cycleId) || null;

    if (!sourceCycle) {
      alert('Unable to locate source mock cycle.');
      return;
    }

    if (allMaintainCycles.length < 2) {
      alert('At least two mock cycles must exist in Maintain to copy between cycles.');
      return;
    }

    const defaultTarget = maintainCycleRows.find((cycle: any) => cycle.id !== cycleId) || null;

    setCloneCycleSourceId(cycleId);
    setCloneCycleTargetId(defaultTarget?.id || null);
    setCloneCycleDialogOpen(true);
  };

  const handleCloneCycleConfirm = async () => {
    if (!cloneCycleSourceId || !cloneCycleTargetId) return;

    const selectedSourceCycle = allMaintainCycles.find((cycle) => cycle.id === cloneCycleSourceId) || null;
    const selectedTargetCycle = allMaintainCycles.find((cycle) => cycle.id === cloneCycleTargetId) || null;
    if (!selectedSourceCycle) {
      alert('Select a valid mock cycle from Maintain to copy.');
      return;
    }
    if (!selectedTargetCycle) {
      alert('Select a valid destination mock cycle from Maintain.');
      return;
    }
    if (selectedSourceCycle.id === selectedTargetCycle.id) {
      alert('Source and destination mock cycles must be different.');
      return;
    }

    try {
      setIsCloningCycle(true);
      const res = await apiClient.post(`/api/mock-cycles/${cloneCycleSourceId}/copy-to`, {
        targetMockCycleId: cloneCycleTargetId,
      });
      const copiedToCycle = res?.data?.data;

      queryClient.invalidateQueries({ queryKey: ['mockCycles'] });
      queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] });
      queryClient.invalidateQueries({ queryKey: ['projectsByProgram'] });

      setExpandedPrograms(prev => new Set(prev).add(selectedTargetCycle.programId));
      if (copiedToCycle?.id) {
        setSelectedItem({ type: 'cycle', id: copiedToCycle.id, programId: selectedTargetCycle.programId });
      }
      setTabValue(0);
      setCloneCycleDialogOpen(false);
      setCloneCycleSourceId(null);
      setCloneCycleTargetId(null);
    } catch (error) {
      console.error('Failed to copy mock cycle to destination:', error);
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
      await apiClient.patch(`/api/global-objects/${objectId}`, {
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
      item.complexity?.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
      item.subObjectDescription?.toLowerCase().includes(inventorySearchTerm.toLowerCase())
    );

    const byId = new Map(filtered.map((item: any) => [item.id, item]));
    const getRootItem = (item: any) => {
      if (!item?.parentProjectObjectId) return item;
      return byId.get(item.parentProjectObjectId) || projectInventoryItems.find((entry: any) => entry.id === item.parentProjectObjectId) || item;
    };

    filtered.sort((a, b) => {
      const rootA = getRootItem(a);
      const rootB = getRootItem(b);
      const rootNameA = ((rootA?.dataObjectId || rootA?.objectId || '') as string).toLowerCase();
      const rootNameB = ((rootB?.dataObjectId || rootB?.objectId || '') as string).toLowerCase();
      if (rootNameA !== rootNameB) {
        return rootNameA.localeCompare(rootNameB);
      }

      const aIsSub = !!a.parentProjectObjectId;
      const bIsSub = !!b.parentProjectObjectId;
      if (aIsSub !== bIsSub) return aIsSub ? 1 : -1;

      if (aIsSub && bIsSub) {
        const aSuffix = (a.subObjectSuffix || '').toString().toLowerCase();
        const bSuffix = (b.subObjectSuffix || '').toString().toLowerCase();
        if (aSuffix !== bSuffix) return aSuffix.localeCompare(bSuffix);
      }

      const aVal = (a[inventorySortColumn] || '')?.toString().toLowerCase();
      const bVal = (b[inventorySortColumn] || '')?.toString().toLowerCase();
      return inventorySortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return filtered;
  };

  const getParentInventoryObjects = () => {
    return projectInventoryItems
      .filter((item: any) => !item.parentProjectObjectId)
      .sort((a: any, b: any) => (a.objectId || '').localeCompare(b.objectId || ''));
  };

  const getSubObjectsForParent = (parentId: string) => {
    return projectInventoryItems
      .filter((item: any) => item.parentProjectObjectId === parentId)
      .sort((a: any, b: any) => (a.subObjectSuffix || '').localeCompare(b.subObjectSuffix || ''));
  };

  // Handle edit inventory item
  const handleEditInventoryItem = (item: any) => {
    setEditingInventoryItemId(item.id);
    setProjectInventoryItem({
      dataObjectId: item.dataObjectId || item.objectId || '',
      parentProjectObjectId: item.parentProjectObjectId || '',
      subObjectSuffix: item.subObjectSuffix || '',
      subObjectDescription: item.subObjectDescription || '',
      isSubObject: !!item.parentProjectObjectId,
      processArea: item.processArea || '',
      complexity: item.complexity || '',
      deploymentDisposition: item.deploymentDisposition || '',
      buildType: item.buildType || '',
      objectType: item.objectType || '',
      dra: item.dra || '',
      developer: item.developer || '',
      systemsAnalyst: item.systemsAnalyst || '',
      cutoverPhase: item.cutoverPhase || '',
      ddmApproach: item.ddmApproach || '',
      riskSecurityType: item.riskSecurityType || '',
      migrationType: item.migrationType || '',
      factorType: item.factorType || '',
      loadMethod: item.loadMethod || '',
    });
    setProjectInventoryDialogOpen(true);
  };

  const startSubObjectCreateFromParent = (parentItem: any) => {
    setEditingInventoryItemId(null);
    setProjectInventoryItem({
      ...getEmptyProjectInventoryItem(),
      isSubObject: true,
      parentProjectObjectId: parentItem.id,
      dataObjectId: parentItem.objectId || parentItem.dataObjectId || '',
      processArea: parentItem.processArea || '',
    });
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
      if (field === 'processArea') {
        const item = projectInventoryItems.find((entry: any) => entry.id === itemId);
        if (!item?.globalObjectId) {
          throw new Error('Missing global object id for process area update');
        }

        await apiClient.patch(`/api/global-objects/${item.globalObjectId}`, {
          processArea: value || null,
        });

        setProjectInventoryItems(prev => prev.map(entry => entry.id === itemId ? { ...entry, processArea: value } : entry));
        setInventoryObjects(prev => prev.map(obj => obj.id === item.globalObjectId ? { ...obj, processArea: value } : obj));
        return;
      }

      await apiClient.patch(`/api/project-objects/${itemId}`, {
        [field]: value || null,
      });
      setProjectInventoryItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    } catch (error) {
      console.error('Failed to update inventory item field:', error);
      alert('Failed to update inventory item. Please try again.');
    }
  };

  useEffect(() => {
    if (sectionMode !== 'planning') return;
    if (selectedItem?.type === 'program') {
      const program = programs.find((p: Program) => p.id === selectedItem.id) as Program | undefined;
      setPlanningStrategyDraft(program?.description || '');
      return;
    }
    setPlanningStrategyDraft('');
  }, [sectionMode, selectedItem, programs]);

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
      for (const programId in projectsByProgram) {
        const project = projectsByProgram[programId]?.find((p: Project) => p.id === selectedItem.id);
        if (project) return project;
      }
    } else if (selectedItem.type === 'processArea') {
      for (const cycleId in projectsByMockCycle) {
        const project = projectsByMockCycle[cycleId]?.find(p => p.id === selectedItem.projectId);
        if (project) return project;
      }
    }
    return null;
  };

  const selectedDetails = getSelectedItemDetails();

  const handleSavePlanningStrategy = async () => {
    if (sectionMode !== 'planning' || selectedItem?.type !== 'program') return;
    try {
      setIsSavingPlanningStrategy(true);
      await apiClient.patch(`/api/programs/${selectedItem.id}`, {
        description: planningStrategyDraft,
      });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    } catch (error) {
      console.error('Failed to save migration strategy:', error);
      alert('Failed to save migration strategy. Please try again.');
    } finally {
      setIsSavingPlanningStrategy(false);
    }
  };

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
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] });
              queryClient.invalidateQueries({ queryKey: ['projectsByProgram'] });
            })
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
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['projectsByMockCycle'] });
          queryClient.invalidateQueries({ queryKey: ['projectsByProgram'] });
        }).catch(() => {});
    }
  };

  const loadCycleTasksForDep = async (currentTaskId: string) => {
    const currentTask = projectTasks.find(t => t.id === currentTaskId);
    const cycleProjects: any[] = activeCycleId ? getScopedProjectsForCycle(activeCycleId, selectedCycleProjectId) : [];
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
          const parentInvItem = invItem?.parentProjectObjectId ? projInv.find(o => o.id === invItem.parentProjectObjectId) : null;
          const group = projGroups.find(g => g.id === t.taskGroupId);
          const taskCycle = activeCycleId
            ? (mockCycles[proj.programId || ''] || []).find((cycle: any) => cycle.id === activeCycleId)
            : null;
          const taskProcessArea = ((invItem?.processArea || group?.processArea || '') as string).trim() || 'Unassigned';
          enriched.push({
            ...t,
            projectId: proj.id,
            projectName: proj.name,
            programId: proj.programId || null,
            cycleId: activeCycleId || null,
            cycleName: taskCycle?.name || 'Current Cycle',
            projectAccentColor: proj.accentColor || '#00BFA5',
            processArea: taskProcessArea,
            objectLabel: invItem ? (invItem.objectId + (invItem.description ? ' — ' + invItem.description : '')) : null,
            objectDescription: invItem?.description || invItem?.subObjectDescription || null,
            parentProjectObjectId: invItem?.parentProjectObjectId || null,
            parentObjectLabel: parentInvItem ? (parentInvItem.objectId + (parentInvItem.description ? ' — ' + parentInvItem.description : '')) : null,
            parentObjectDescription: parentInvItem?.description || parentInvItem?.subObjectDescription || null,
            isSubObject: !!invItem?.parentProjectObjectId,
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
      const currentTaskArea = (
        projectInventoryItems.find((item: any) => item.id === currentTask.projectObjectId)?.processArea
        || projectTaskGroups.find((group: any) => group.id === currentTask.taskGroupId)?.processArea
        || 'Unassigned'
      ).trim() || 'Unassigned';
      expanded[`proj-${activeProjectId}-area-${currentTaskArea}`] = true;
      if (currentTask.projectObjectId) {
        expanded[`proj-${activeProjectId}-area-${currentTaskArea}-obj-${currentTask.projectObjectId}`] = true;
      } else if (currentTask.taskGroupId) {
        expanded[`proj-${activeProjectId}-area-${currentTaskArea}-grp-${currentTask.taskGroupId}`] = true;
      } else {
        expanded[`proj-${activeProjectId}-area-${currentTaskArea}-ungrouped`] = true;
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

          {isPlanningMaintainTab && (
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.25, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Typography variant="caption" sx={{ color: '#9FB0D8', fontWeight: 700, letterSpacing: '0.3px' }}>
                Maintain Program Hierarchy
              </Typography>
              <Button
                variant={maintainFormView === 'program' ? 'contained' : 'text'}
                onClick={() => setMaintainFormView('program')}
                sx={{
                  textTransform: 'none',
                  justifyContent: 'flex-start',
                  fontWeight: 700,
                  borderRadius: 1.6,
                  color: maintainFormView === 'program' ? '#0D1933' : 'rgba(230,238,255,0.88)',
                  backgroundColor: maintainFormView === 'program' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.06)',
                  '&:hover': { backgroundColor: maintainFormView === 'program' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.12)' },
                }}
              >
                Program
              </Button>
              <Button
                variant={maintainFormView === 'project' ? 'contained' : 'text'}
                onClick={() => setMaintainFormView('project')}
                sx={{
                  textTransform: 'none',
                  justifyContent: 'flex-start',
                  fontWeight: 700,
                  borderRadius: 1.6,
                  color: maintainFormView === 'project' ? '#0D1933' : 'rgba(230,238,255,0.88)',
                  backgroundColor: maintainFormView === 'project' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.06)',
                  '&:hover': { backgroundColor: maintainFormView === 'project' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.12)' },
                }}
              >
                Project
              </Button>
              <Button
                variant={maintainFormView === 'cycle' ? 'contained' : 'text'}
                onClick={() => setMaintainFormView('cycle')}
                sx={{
                  textTransform: 'none',
                  justifyContent: 'flex-start',
                  fontWeight: 700,
                  borderRadius: 1.6,
                  color: maintainFormView === 'cycle' ? '#0D1933' : 'rgba(230,238,255,0.88)',
                  backgroundColor: maintainFormView === 'cycle' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.06)',
                  '&:hover': { backgroundColor: maintainFormView === 'cycle' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.12)' },
                }}
              >
                Mock Cycle
              </Button>
            </Box>
          )}

          <Box sx={{ flex: 1, overflowY: 'auto', pt: 1, display: isPlanningMaintainTab ? 'none' : 'block' }}>
            {programs.length === 0 ? (
              <Typography variant="caption" color="textSecondary" sx={{ px: 2 }}>
                No programs
              </Typography>
            ) : (
              <List sx={{ p: 0 }}>
                {getOrderedPrograms().map((program: Program) => {
                  const isProgramSelected = selectedItem?.type === 'program' && selectedItem?.id === program.id;
                  const isProgramExpanded = expandedPrograms.has(program.id);
                  const visibleProgramCycles = getOrderedCycles(program.id);
                  const programColor = program.accentColor || '#5B67CA';
                  const programCycleCount = (mockCycles[program.id] || []).length;
                  const programProjectProgressValues = (mockCycles[program.id] || []).flatMap((cycle: MockCycle) =>
                    (projectsByMockCycle[cycle.id] || []).map((project: Project) => Number(project.progressPercentage || 0))
                  );
                  const programProjectCount = programProjectProgressValues.length;
                  const programProgressPct = getProgressAverage(programProjectProgressValues);
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
                        <Box sx={{ mx: 0.75, display: 'inline-flex', alignItems: 'center' }}>
                          {renderHierarchyIcon('program', programColor, '1.1rem')}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isProgramSelected ? programColor : 'inherit' }}>
                          {program.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: isProgramSelected ? programColor : 'text.secondary', fontWeight: 700, fontSize: '0.68rem', mr: 0.5, minWidth: 34, textAlign: 'right' }}>
                          {programProgressPct}%
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuAnchorEl(e.currentTarget);
                            setMenuType('program');
                            setMenuItemId(program.id);
                            setProcessAreaMenuContext(null);
                          }}
                          sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                        >
                          <MoreVertIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Box>

                      {/* Planning Hierarchy: Program > Project > Mock Cycle > Process Area */}
                      {isProgramExpanded && (
                        <Box sx={{ position: 'relative', ml: 3.5 }}>
                          <Box sx={{
                            position: 'absolute',
                            left: 8,
                            top: 0,
                            bottom: 32,
                            width: '1px',
                            backgroundColor: 'rgba(255,255,255,0.12)',
                          }} />

                          {getProjectsByProgram(program.id).map((project: Project) => {
                            const projectCycles = getCyclesForProjectInProgram(program.id, project.name || '');
                            const projectGroupKey = `${program.id}:${(project.name || '').trim().toLowerCase()}`;
                            const isProjectExpanded = expandedProjectGroups.has(projectGroupKey);
                            const projectAccent = project.accentColor || '#90caf9';
                            const firstCycle = projectCycles[0];
                            const firstCycleProject = firstCycle
                              ? (projectsByMockCycle[firstCycle.id] || []).find((p: Project) => (p.name || '').trim().toLowerCase() === (project.name || '').trim().toLowerCase()) || project
                              : project;
                            const isProjectSelected = selectedItem?.type === 'project' && selectedItem?.id === firstCycleProject.id;
                            const projectInstances = projectCycles
                              .map((cycle: MockCycle) => (projectsByMockCycle[cycle.id] || []).find((p: Project) => (p.name || '').trim().toLowerCase() === (project.name || '').trim().toLowerCase()))
                              .filter(Boolean) as Project[];
                            const projectProgressPct = getProgressAverage(projectInstances.map((instance: Project) => Number(instance.progressPercentage || 0)));
                            return (
                              <Box key={`pgrp-${program.id}-${project.name}`}>
                                <Box
                                  draggable
                                  onDragStart={(e) => {
                                    const groupKey = getProjectGroupOrderKey(project.name || '');
                                    const payload = JSON.stringify({ type: 'projectGroup', key: groupKey, programId: program.id });
                                    e.dataTransfer.setData('text/plain', payload);
                                    e.dataTransfer.effectAllowed = 'move';
                                    setTreeDragItem({ type: 'projectGroup', key: groupKey, programId: program.id });
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
                                    const targetKey = getProjectGroupOrderKey(project.name || '');
                                    const dragKey = parsed?.type === 'projectGroup' && parsed?.programId === program.id
                                      ? parsed.key
                                      : treeDragItem?.type === 'projectGroup' && treeDragItem.programId === program.id
                                        ? treeDragItem.key
                                        : null;
                                    if (!dragKey) return;
                                    const orderedKeys = mergeOrder(
                                      treeOrder.projectGroups[program.id] || [],
                                      getProjectsByProgram(program.id).map((p: Project) => getProjectGroupOrderKey(p.name || ''))
                                    );
                                    setTreeOrder(prev => ({
                                      ...prev,
                                      projectGroups: {
                                        ...prev.projectGroups,
                                        [program.id]: reorderByDrop(orderedKeys, dragKey, targetKey),
                                      },
                                    }));
                                    setTreeDragItem(null);
                                  }}
                                  onDragEnd={() => setTreeDragItem(null)}
                                  onClick={() => {
                                    setSelectedExecutionProcessArea('');
                                    if (firstCycle) {
                                      handleHierarchySelection({ type: 'project', id: firstCycleProject.id, cycleId: firstCycle.id });
                                    } else {
                                      handleHierarchySelection({ type: 'project', id: project.id });
                                    }
                                    toggleProjectGroupExpanded(projectGroupKey);
                                  }}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    py: 0.55,
                                    pl: 0,
                                    pr: 0.5,
                                    cursor: 'pointer',
                                    position: 'relative',
                                    borderRadius: 0.75,
                                    backgroundColor: isProjectSelected ? 'rgba(91, 103, 202, 0.16)' : 'transparent',
                                    '&::before': isProjectSelected ? {
                                      content: '""',
                                      position: 'absolute',
                                      left: 0,
                                      top: '4px',
                                      bottom: '4px',
                                      width: '3px',
                                      backgroundColor: projectAccent,
                                      borderRadius: '2px',
                                    } : {},
                                    '&:hover': { backgroundColor: isProjectSelected ? 'rgba(91, 103, 202, 0.22)' : 'rgba(255,255,255,0.05)' },
                                  }}
                                >
                                  <Box sx={{ width: 8, flexShrink: 0 }} />
                                  <DragIndicatorIcon sx={{ fontSize: '0.82rem', opacity: 0.45, mr: 0.2, flexShrink: 0 }} />
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleProjectGroupExpanded(projectGroupKey);
                                    }}
                                    sx={{ p: 0.2, mr: 0.15 }}
                                  >
                                    <ChevronRightIcon sx={{ fontSize: '0.9rem', color: 'text.secondary', transform: isProjectExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                  </IconButton>
                                  <Box sx={{ mx: 0.5, display: 'inline-flex', alignItems: 'center' }}>
                                    {renderHierarchyIcon('project', projectAccent, '0.95rem')}
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {project.name}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: isProjectSelected ? projectAccent : 'text.secondary', fontWeight: 700, fontSize: '0.68rem', mr: 0.5, minWidth: 34, textAlign: 'right' }}>
                                    {projectProgressPct}%
                                  </Typography>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuAnchorEl(e.currentTarget);
                                      setMenuType('project');
                                      setMenuItemId(firstCycleProject.id);
                                      setProcessAreaMenuContext(null);
                                    }}
                                    sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                  >
                                    <MoreVertIcon sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                </Box>

                                {isProjectExpanded && (
                                <Box sx={{ ml: 2.75 }}>
                                  {projectCycles.map((cycle: MockCycle) => {
                                    const realProject = (projectsByMockCycle[cycle.id] || []).find((p: Project) => (p.name || '').trim().toLowerCase() === (project.name || '').trim().toLowerCase()) || project;
                                    const isCycleSelected = selectedItem?.type === 'cycle' && selectedItem?.id === cycle.id && selectedItem?.projectId === realProject.id;
                                    const isCycleExpanded = expandedCycles.has(cycle.id);
                                    const cycleColor = cycle.accentColor || '#64B5F6';
                                    const processAreas = getProcessAreasForProjectCycle(realProject.id);
                                    const cycleProgressPct = Number(realProject.progressPercentage || 0);
                                    return (
                                      <Box key={`pc-${project.name}-${cycle.id}`}>
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
                                            const dragId = parsed?.type === 'cycle' && parsed?.programId === program.id
                                              ? parsed.id
                                              : treeDragItem?.type === 'cycle' && treeDragItem.programId === program.id
                                                ? treeDragItem.id
                                                : null;
                                            if (!dragId) return;
                                            const orderedIds = mergeOrder((treeOrder.cycles[program.id] || []), (mockCycles[program.id] || []).map((c: MockCycle) => c.id));
                                            setTreeOrder(prev => ({
                                              ...prev,
                                              cycles: {
                                                ...prev.cycles,
                                                [program.id]: reorderByDrop(orderedIds, dragId, cycle.id),
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
                                            backgroundColor: isCycleSelected ? 'rgba(91, 103, 202, 0.15)' : 'transparent',
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
                                            handleHierarchySelection({ type: 'cycle', id: cycle.id, programId: program.id, projectId: realProject.id });
                                            toggleCycleExpanded(cycle.id);
                                          }}
                                        >
                                          <DragIndicatorIcon sx={{ fontSize: '0.82rem', opacity: 0.45, mr: 0.1, flexShrink: 0 }} />
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleCycleExpanded(cycle.id);
                                            }}
                                            sx={{ p: 0.2, mr: 0.2 }}
                                          >
                                            <ChevronRightIcon sx={{ fontSize: '0.9rem', color: 'text.secondary', transform: isCycleExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                          </IconButton>
                                          <Box sx={{ mx: 0.5, display: 'inline-flex', alignItems: 'center' }}>
                                            {renderHierarchyIcon('cycle', cycleColor, '0.92rem')}
                                          </Box>
                                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.78rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {cycle.name}
                                          </Typography>
                                          <Typography variant="caption" sx={{ color: isCycleSelected ? cycleColor : 'text.secondary', fontWeight: 700, fontSize: '0.68rem', mr: 0.5, minWidth: 34, textAlign: 'right' }}>
                                            {cycleProgressPct}%
                                          </Typography>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setMenuAnchorEl(e.currentTarget);
                                              setMenuType('cycle');
                                              setMenuItemId(cycle.id);
                                              setProcessAreaMenuContext(null);
                                            }}
                                            sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                                          >
                                            <MoreVertIcon sx={{ fontSize: '1rem' }} />
                                          </IconButton>
                                        </Box>

                                        {isCycleExpanded && (
                                        <Box sx={{ ml: 2.5 }}>
                                          {processAreas.map((area) => {
                                            const normalizedArea = (area || '').trim().toLowerCase();
                                            const cachedAreaSummary = projectHierarchySummaries[realProject.id]?.processAreas?.[area];
                                            const activeAreaObjectCount = projectInventoryItems.filter((item: any) => item.projectId === realProject.id && ((item.processArea || '').trim().toLowerCase() === normalizedArea)).length;
                                            const activeAreaTaskGroupCount = projectTaskGroups.filter((group: any) => group.projectId === realProject.id && ((group.processArea || '').trim().toLowerCase() === normalizedArea)).length;
                                            const areaObjectCount = activeProjectId === realProject.id
                                              ? activeAreaObjectCount
                                              : (cachedAreaSummary?.objectCount ?? 0);
                                            const areaTaskGroupCount = activeProjectId === realProject.id
                                              ? activeAreaTaskGroupCount
                                              : (cachedAreaSummary?.taskGroupCount ?? 0);
                                            const areaTaskCount = activeProjectId === realProject.id
                                              ? projectTasks.filter((task: any) => {
                                                  const objectInArea = !!task.projectObjectId && projectInventoryItems.some((item: any) => item.id === task.projectObjectId && ((item.processArea || '').trim().toLowerCase() === normalizedArea));
                                                  const groupInArea = !!task.taskGroupId && projectTaskGroups.some((group: any) => group.id === task.taskGroupId && ((group.processArea || '').trim().toLowerCase() === normalizedArea));
                                                  return objectInArea || groupInArea;
                                                }).length
                                              : (cachedAreaSummary?.taskCount ?? 0);
                                            const processAreaProgressPct = getProcessAreaProgress(realProject.id, area, cycleProgressPct);
                                            const processAreaAccent = getProcessAreaAccent(realProject.id, area, cycleColor);
                                            const isProcessAreaSelected =
                                              selectedItem?.type === 'processArea' &&
                                              selectedItem?.projectId === realProject.id &&
                                              selectedItem?.area === area;
                                            const normalizedExistingArea = normalizedArea;
                                            const isAdditionalGroup = (planningAdditionalGroups[realProject.id] || []).some(
                                              (groupName: string) => (groupName || '').trim().toLowerCase() === normalizedExistingArea
                                            );
                                            return (
                                              <Box key={`area-${realProject.id}-${cycle.id}-${area}`}>
                                                <Box
                                                  draggable
                                                  onDragStart={(e) => {
                                                    const payload = JSON.stringify({ type: 'processArea', area, projectId: realProject.id });
                                                    e.dataTransfer.setData('text/plain', payload);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    setTreeDragItem({ type: 'processArea', area, projectId: realProject.id });
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
                                                    const dragArea = parsed?.type === 'processArea' && parsed?.projectId === realProject.id
                                                      ? parsed.area
                                                      : treeDragItem?.type === 'processArea' && treeDragItem.projectId === realProject.id
                                                        ? treeDragItem.area
                                                        : null;
                                                    if (!dragArea) return;
                                                    const orderedAreas = mergeOrder(treeOrder.processAreas[realProject.id] || [], getProcessAreasForProjectCycle(realProject.id));
                                                    setTreeOrder(prev => ({
                                                      ...prev,
                                                      processAreas: {
                                                        ...prev.processAreas,
                                                        [realProject.id]: reorderByDrop(orderedAreas, dragArea, area),
                                                      },
                                                    }));
                                                    setTreeDragItem(null);
                                                  }}
                                                  onDragEnd={() => setTreeDragItem(null)}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedExecutionProcessArea(area);
                                                    handleHierarchySelection({ type: 'processArea', projectId: realProject.id, cycleId: cycle.id, area }, { preserveProcessArea: true });
                                                  }}
                                                  sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    py: 0.4,
                                                    pl: 0.5,
                                                    pr: 0.5,
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    borderRadius: 0.75,
                                                    backgroundColor: isProcessAreaSelected ? 'rgba(91, 103, 202, 0.2)' : 'transparent',
                                                    '&::before': isProcessAreaSelected ? {
                                                      content: '""',
                                                      position: 'absolute',
                                                      left: 0,
                                                      top: '3px',
                                                      bottom: '3px',
                                                      width: '3px',
                                                      backgroundColor: processAreaAccent,
                                                      borderRadius: '2px',
                                                    } : {},
                                                    '&:hover': { backgroundColor: isProcessAreaSelected ? 'rgba(91, 103, 202, 0.24)' : 'rgba(255,255,255,0.06)' },
                                                  }}
                                                >
                                                  <DragIndicatorIcon sx={{ fontSize: '0.78rem', opacity: 0.45, mr: 0.35, flexShrink: 0 }} />
                                                  {isAdditionalGroup ? (
                                                    <Box sx={{ mr: 0.5, display: 'inline-flex', alignItems: 'center' }}>
                                                      {renderHierarchyIcon('planGroup', processAreaAccent, '0.82rem')}
                                                    </Box>
                                                  ) : (
                                                    <Box sx={{ mr: 0.5, display: 'inline-flex', alignItems: 'center' }}>
                                                      {renderHierarchyIcon('processArea', processAreaAccent, '0.82rem')}
                                                    </Box>
                                                  )}
                                                  <Typography variant="caption" sx={{ fontWeight: isProcessAreaSelected ? 700 : 500, color: isProcessAreaSelected ? processAreaAccent : 'inherit', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {getProcessAreaDisplayName(realProject.id, area)}
                                                  </Typography>
                                                  <Typography variant="caption" sx={{ color: isProcessAreaSelected ? processAreaAccent : 'text.secondary', fontWeight: 700, fontSize: '0.66rem', ml: 0.75, minWidth: 32, textAlign: 'right' }}>
                                                    {processAreaProgressPct}%
                                                  </Typography>
                                                  <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setMenuAnchorEl(e.currentTarget);
                                                      setMenuType('processArea');
                                                      setMenuItemId(area);
                                                      setProcessAreaMenuContext({ projectId: realProject.id, cycleId: cycle.id, area, nodeType: isAdditionalGroup ? 'planGroup' : 'processArea' });
                                                    }}
                                                    sx={{ opacity: 0.5, '&:hover': { opacity: 1 }, ml: 0.2 }}
                                                  >
                                                    <MoreVertIcon sx={{ fontSize: '0.95rem' }} />
                                                  </IconButton>
                                                </Box>
                                              </Box>
                                            );
                                          })}
                                          {canManageHierarchy && (
                                            <Button
                                              size="small"
                                              variant="text"
                                              startIcon={<AddIcon sx={{ fontSize: '0.8rem !important' }} />}
                                              onClick={() => handleAddAdditionalGroup(realProject.id)}
                                              sx={{ fontSize: '0.7rem', height: 24, color: '#7C83D0', textTransform: 'none', pl: 0.5 }}
                                            >
                                              Add Additional Group
                                            </Button>
                                          )}
                                        </Box>
                                        )}
                                      </Box>
                                    );
                                  })}
                                </Box>
                                )}
                              </Box>
                            );
                          })}

                          {visibleProgramCycles.length === 0 && (
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<AddIcon sx={{ fontSize: '0.85rem !important' }} />}
                              onClick={() => openAttachCycleDialog(program.id)}
                              sx={{ fontSize: '0.72rem', height: 26, color: '#64B5F6', textTransform: 'none', pl: 1, '&:hover': { color: '#90CAF9' } }}
                            >
                              Add Mock Cycle
                            </Button>
                          )}

                        </Box>
                      )}
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>

          {/* Add Program Button at Bottom */}
          {canManageHierarchy && !isPlanningMaintainTab && (
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
          )}
        </Paper>

        {/* Right Content Area - Details */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1.25, sm: 3 }, minWidth: 0 }}>
          {/* Planning Strategy Tab Content */}
          {sectionMode === 'planning' && tabValue === 0 && (
            <>
              {!selectedItem ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Alert severity="info">Select a program, mock cycle, or project to define planning deliverables.</Alert>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreateDialog('program')}>
                      Create Program
                    </Button>
                  </Box>
                </Box>
              ) : selectedItem.type === 'program' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', mb: 1.25 }}>
                      <Button size="small" variant="outlined" onClick={() => openEditDialog('program', selectedItem.id)}>
                        Edit Program
                      </Button>
                      <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openCreateDialog('project', selectedItem.id)}>
                        Create Project
                      </Button>
                      <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openCreateDialog('cycle', selectedItem.id)}>
                        Create Mock Cycle
                      </Button>
                    </Box>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>{selectedDetails?.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Program planning focuses on strategy definition, inventory scoping, and migration approach. Execution task planning is intentionally excluded from this phase.
                    </Typography>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Overall Migration Strategy</Typography>
                    <TextField
                      multiline
                      minRows={8}
                      fullWidth
                      placeholder="Define strategy scope, wave logic, cutover sequencing, data quality approach, and key dependencies."
                      value={planningStrategyDraft}
                      onChange={(e) => setPlanningStrategyDraft(e.target.value)}
                    />
                    <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        onClick={handleSavePlanningStrategy}
                        disabled={isSavingPlanningStrategy}
                      >
                        {isSavingPlanningStrategy ? 'Saving...' : 'Save Strategy'}
                      </Button>
                    </Box>
                  </Paper>

                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.25 }}>Planning Deliverables</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(170px, 1fr))' }, gap: 1 }}>
                      <Box sx={{ p: 1.25, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Mock Cycles</Typography>
                        <Typography variant="h6">{(mockCycles[selectedItem.id] || []).length}</Typography>
                      </Box>
                      <Box sx={{ p: 1.25, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Process Area Projects</Typography>
                        <Typography variant="h6">
                          {(mockCycles[selectedItem.id] || []).reduce((sum: number, cycle: MockCycle) => sum + ((projectsByMockCycle[cycle.id] || []).length), 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.25, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Global Data Objects</Typography>
                        <Typography variant="h6">{inventoryObjects.length}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Box>
              ) : selectedItem.type === 'cycle' ? (
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', mb: 1.25 }}>
                    <Button size="small" variant="outlined" onClick={() => openEditDialog('cycle', selectedItem.id)}>
                      Edit Mock Cycle
                    </Button>
                    <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openCreateDialog('project', selectedItem.programId)}>
                      Create Project
                    </Button>
                  </Box>
                  <Typography variant="h6" sx={{ mb: 0.5 }}>{selectedDetails?.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    This mock cycle is for planning sequence and scope only. No execution tasks are created in Planning.
                  </Typography>
                  <Typography variant="body2">
                    Projects in cycle: {getScopedProjectsForCycle(selectedItem.id, selectedItem.projectId || null).length}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Next deliverable: detail project-level data object inventory in the Inventory tab.
                  </Typography>
                </Paper>
              ) : (
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', mb: 1.25 }}>
                    <Button size="small" variant="outlined" onClick={() => openEditDialog('project', selectedItem.id)}>
                      Edit Project
                    </Button>
                  </Box>
                  <Typography variant="h6" sx={{ mb: 0.5 }}>{selectedDetails?.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Project-level planning deliverable is the detailed data object inventory and migration posture. Execution tasks are handled in Execution.
                  </Typography>
                  <Typography variant="body2">
                    Project inventory objects: {projectInventoryItems.length}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Use the Inventory tab to add or refine object-level scope and migration attributes.
                  </Typography>
                </Paper>
              )}
            </>
          )}

          {/* Execution Plan Tab Content */}
          {sectionMode === 'execution' && tabValue === 0 && (
            <>
              {!selectedItem ? (
                <Alert severity="info">Select an item from the list to view details</Alert>
              ) : selectedDetails ? (
                <>
                  {selectedItem.type === 'project' || selectedItem.type === 'processArea' ? (() => {
                    const project = selectedDetails as Project;
                    const accentColor = project.accentColor || '#00BFA5';
                    const parentCycleId = selectedItem.type === 'project' ? selectedItem.cycleId : selectedItem.cycleId;
                    const selectedAreaLabel = selectedItem.type === 'processArea'
                      ? getProcessAreaDisplayName(project.id, selectedItem.area)
                      : '';
                    const selectedAreaAccent = selectedItem.type === 'processArea'
                      ? getProcessAreaAccent(project.id, selectedItem.area, accentColor)
                      : accentColor;
                    const effectiveProcessArea = (selectedAreaLabel || selectedExecutionProcessArea || '').trim();
                    const planAccentColor = effectiveProcessArea
                      ? getProcessAreaAccent(project.id, effectiveProcessArea, accentColor)
                      : accentColor;
                    let parentCycleName = '';
                    let parentProgramName = '';
                    let parentProgramId = '';
                    for (const progId in mockCycles) {
                      const cycle = (mockCycles[progId] || []).find((c: MockCycle) => c.id === parentCycleId);
                      if (cycle) {
                        parentCycleName = cycle.name;
                        const prog = programs.find((p: Program) => p.id === progId);
                        parentProgramName = prog?.name || '';
                        parentProgramId = progId;
                        break;
                      }
                    }
                    const normalizedProjectName = (project.name || '').trim().toLowerCase();
                    const projectCycleInstances = (parentProgramId ? (mockCycles[parentProgramId] || []) : [])
                      .map((cycle: MockCycle) => (projectsByMockCycle[cycle.id] || []).find((p: Project) => (p.name || '').trim().toLowerCase() === normalizedProjectName))
                      .filter(Boolean) as Project[];
                    const allPlanTasks = projectTasks.filter(t => t.projectObjectId || t.taskGroupId);
                    const progressPct = allPlanTasks.length > 0 ? Math.round(allPlanTasks.reduce((s, t) => s + (t.progressPercentage ?? 0), 0) / allPlanTasks.length) : 0;
                    const normalizedProcessAreaFilter = (selectedExecutionProcessArea || '').trim().toLowerCase();
                    const showProjectSummaryOnly = !normalizedProcessAreaFilter;
                    const getObjectProcessArea = (objectId: string) => {
                      const inventoryObject = projectInventoryItems.find(obj => obj.id === objectId);
                      return (inventoryObject?.processArea || 'Unassigned Process Area').trim() || 'Unassigned Process Area';
                    };
                    const getRootInventoryObjectId = (objectId: string) => {
                      let currentObject = projectInventoryItems.find((item: any) => item.id === objectId);
                      while (currentObject?.parentProjectObjectId) {
                        currentObject = projectInventoryItems.find((item: any) => item.id === currentObject.parentProjectObjectId);
                      }
                      return currentObject?.id || objectId;
                    };
                    const rootPlanObjectIds = Array.from(new Set([
                      ...projectTasks.filter(t => t.projectObjectId).map(t => getRootInventoryObjectId(t.projectObjectId)),
                      ...projectInventoryItems
                        .filter((item: any) => !item.parentProjectObjectId && getSubObjectsForParent(item.id).length > 0)
                        .map((item: any) => item.id),
                    ]));
                    const sortedObjectIds = (showProjectSummaryOnly ? [] : [...rootPlanObjectIds])
                      .filter((objectId: string) => {
                        return getObjectProcessArea(objectId).toLowerCase() === normalizedProcessAreaFilter;
                      })
                      .sort((a: string, b: string) => {
                      const areaA = getObjectProcessArea(a).toLowerCase();
                      const areaB = getObjectProcessArea(b).toLowerCase();
                      if (areaA !== areaB) return areaA.localeCompare(areaB);
                      const objA = (projectInventoryItems.find(obj => obj.id === a)?.objectId || '').toLowerCase();
                      const objB = (projectInventoryItems.find(obj => obj.id === b)?.objectId || '').toLowerCase();
                      return objA.localeCompare(objB);
                    });
                    const allGroupIds = projectTaskGroups.map(g => g.id);
                    const getTaskGroupProcessArea = (group: any) => (group?.processArea || '').trim();
                    const filteredGroupIds = (showProjectSummaryOnly ? [] : allGroupIds).filter((id: string) => {
                      const group = projectTaskGroups.find(g => g.id === id);
                      return getTaskGroupProcessArea(group).toLowerCase() === normalizedProcessAreaFilter;
                    });
                    const projectProcessAreas = new Set<string>();
                    Object.keys(projectHierarchySummaries[project.id]?.processAreas || {}).forEach((area) => {
                      const label = (area || '').trim();
                      if (label) projectProcessAreas.add(label);
                    });
                    projectInventoryItems.forEach((item: any) => {
                      const label = (item.processArea || '').trim();
                      if (label) projectProcessAreas.add(label);
                    });
                    projectTaskGroups.forEach((group: any) => {
                      const label = (group.processArea || '').trim();
                      if (label) projectProcessAreas.add(label);
                    });
                    const processAreaSummaryRows = Array.from(projectProcessAreas)
                      .sort((a, b) => a.localeCompare(b))
                      .map((area) => {
                        const summary = projectHierarchySummaries[project.id]?.processAreas?.[area];
                        return {
                          area,
                          taskCount: summary?.taskCount ?? 0,
                          progressPct: summary?.progressPct ?? 0,
                        };
                      });
                    const currentPlanRowKeys = [
                      ...sortedObjectIds.map((id: string) => objectRowKey(id)),
                      ...filteredGroupIds.map((id: string) => taskGroupRowKey(id)),
                    ];
                    const orderedPlanRowKeys = mergeOrder(planRowOrder, currentPlanRowKeys);
                    const rowOrderIndex = new Map(orderedPlanRowKeys.map((k, idx) => [k, idx]));
                    const sortedTaskGroupIds = [...filteredGroupIds].sort((a: string, b: string) => {
                      const groupA = projectTaskGroups.find(g => g.id === a);
                      const groupB = projectTaskGroups.find(g => g.id === b);
                      const areaA = getTaskGroupProcessArea(groupA).toLowerCase();
                      const areaB = getTaskGroupProcessArea(groupB).toLowerCase();
                      if (areaA !== areaB) return areaA.localeCompare(areaB);
                      const nameA = (groupA?.name || '').toLowerCase();
                      const nameB = (groupB?.name || '').toLowerCase();
                      return nameA.localeCompare(nameB);
                    });
                    const orderedTaskGroups = sortedTaskGroupIds
                      .map(id => projectTaskGroups.find(g => g.id === id))
                      .filter(Boolean) as any[];
                    const canReorderPlan = orderedPlanRowKeys.length > 1;
                    const canAddDataObjectHere = !showProjectSummaryOnly && !!activeProjectId;
                    const activePlanGroup = selectedItem?.type === 'processArea' ? selectedItem.area : '';
                    const taskFieldSx = {
                      '& .MuiInputBase-root': { fontSize: '0.72rem', height: 26 },
                      '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: planAccentColor },
                      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: planAccentColor },
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
                          {selectedAreaLabel && <><Typography variant="caption" color="text.disabled">›</Typography><Typography variant="caption" sx={{ color: selectedAreaAccent, fontWeight: 700 }}>{selectedAreaLabel}</Typography></>}
                        </Box>

                        {/* Title */}
                        <Typography variant="h4" sx={{ fontWeight: 700, color: planAccentColor, mb: 0.75, fontSize: { xs: '1.55rem', sm: '2.125rem' } }}>
                          {selectedAreaLabel || project.name}
                        </Typography>

                        {/* Progress */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <LinearProgress variant="determinate" value={progressPct} sx={{ width: 160, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { backgroundColor: planAccentColor, borderRadius: 3 } }} />
                          <Typography variant="body2" sx={{ color: planAccentColor, fontWeight: 600 }}>{progressPct}%</Typography>
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
                          {!showProjectSummaryOnly && (
                            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, ml: { xs: 0, md: 2 }, width: { xs: '100%', md: 'auto' }, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                              {canAddDataObjectHere && (
                                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                                  if (activePlanGroup) setNewDataObjectProcessArea(activePlanGroup);
                                  setDataObjectDialogOpen(true);
                                }}
                                  sx={{ background: `linear-gradient(135deg, ${planAccentColor} 0%, ${planAccentColor}99 100%)`, textTransform: 'none', fontWeight: 600, boxShadow: 'none', width: { xs: '100%', sm: 'auto' } }}>
                                  Add Data Object
                                </Button>
                              )}
                              <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                                if (activePlanGroup) setNewTaskGroupProcessArea(activePlanGroup);
                                setTaskGroupDialogOpen(true);
                              }}
                                sx={{ background: 'linear-gradient(135deg, #5B67CA 0%, #3B4DB3 100%)', textTransform: 'none', fontWeight: 600, boxShadow: 'none', width: { xs: '100%', sm: 'auto' } }}>
                                Add Task Group
                              </Button>
                            </Box>
                          )}
                        </Box>{/* end top section flex row */}

                        {/* Filter Row */}
                        {!showProjectSummaryOnly && (
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                          <TextField placeholder="Search by name or ID..." size="small" value={planSearchTerm} onChange={(e) => setPlanSearchTerm(e.target.value)}
                            sx={{ width: { xs: '100%', sm: 240 }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: planAccentColor }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: planAccentColor } }}
                            slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 0.5, fontSize: '1rem', color: 'text.secondary' }} /> } }} />
                          <TextField select size="small" label="Status" value={planStatusFilter} onChange={(e) => setPlanStatusFilter(e.target.value)}
                            sx={{ width: { xs: 'calc(50% - 6px)', sm: 150 }, minWidth: { xs: 140, sm: 150 }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: planAccentColor }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: planAccentColor }, '& .MuiInputLabel-root.Mui-focused': { color: planAccentColor } }}>
                            <MenuItem value="">All Statuses</MenuItem>
                            <MenuItem value="not_started">Not Started</MenuItem>
                            <MenuItem value="in_progress">In Progress</MenuItem>
                            <MenuItem value="complete">Completed</MenuItem>
                          </TextField>
                          <TextField select size="small" label="Assigned To" value={planAssignedFilter} onChange={(e) => setPlanAssignedFilter(e.target.value)}
                            sx={{ width: { xs: 'calc(50% - 6px)', sm: 170 }, minWidth: { xs: 140, sm: 170 }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: planAccentColor }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: planAccentColor }, '& .MuiInputLabel-root.Mui-focused': { color: planAccentColor } }}>
                            <MenuItem value="">All Assignees</MenuItem>
                            {people.map((p: any) => (
                              <MenuItem key={p.id} value={p.id}>{p.name || p.email}</MenuItem>
                            ))}
                          </TextField>
                          {selectedItem?.type !== 'processArea' && (
                            <TextField
                              select
                              size="small"
                              label="Process Area"
                              value={selectedExecutionProcessArea}
                              onChange={(e) => setSelectedExecutionProcessArea(e.target.value)}
                              sx={{ width: { xs: '100%', sm: 170 }, minWidth: { xs: 140, sm: 170 }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: planAccentColor }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: planAccentColor }, '& .MuiInputLabel-root.Mui-focused': { color: planAccentColor } }}
                            >
                              <MenuItem value="">Project Summary</MenuItem>
                              {Array.from(new Set(projectInventoryItems
                                .map((item: any) => (item.processArea || '').trim())
                                .filter((area: string) => area.length > 0)))
                                .sort((a: string, b: string) => a.localeCompare(b))
                                .map((area: string) => (
                                  <MenuItem key={area} value={area}>{getProcessAreaDisplayName(project.id, area)}</MenuItem>
                                ))}
                            </TextField>
                          )}
                          {(planSearchTerm || planStatusFilter || planAssignedFilter || selectedExecutionProcessArea) && (
                            <Button size="small" variant="text" onClick={() => { setPlanSearchTerm(''); setPlanStatusFilter(''); setPlanAssignedFilter(''); setSelectedExecutionProcessArea(''); }} sx={{ textTransform: 'none', color: 'text.secondary' }}>Clear</Button>
                          )}
                        </Box>
                        )}

                        {/* Objects + Groups */}
                        {showProjectSummaryOnly ? (
                          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(180px, 1fr))', lg: 'repeat(3, minmax(180px, 1fr))' } }}>
                            {processAreaSummaryRows.length === 0 ? (
                              <Alert severity="info" sx={{ gridColumn: '1 / -1' }}>
                                Project summary is shown at this level. Select a Process Area to view detailed data objects and task groups.
                              </Alert>
                            ) : (
                              processAreaSummaryRows.map((row) => (
                                <Paper key={`summary-${row.area}`} sx={{ p: 1.25, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.04em' }}>{getProcessAreaDisplayName(project.id, row.area)}</Typography>
                                  <Typography variant="caption" sx={{ color: planAccentColor, fontWeight: 700 }}>{row.progressPct}% complete</Typography>
                                </Paper>
                              ))
                            )}
                          </Box>
                        ) : sortedObjectIds.length === 0 && filteredGroupIds.length === 0 ? (
                          <Alert severity="info">No tasks added to plan yet</Alert>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {!canReorderPlan && (
                              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, mb: 0.5 }}>
                                Add at least 2 total rows (Objects and/or Task Groups) to reorder.
                              </Typography>
                            )}
                            {sortedObjectIds.map((objectId, objectIndex) => {
                              const rowKey = objectRowKey(objectId || '');
                              const inventoryObject = projectInventoryItems.find(obj => obj.id === objectId);
                              const parentObjectId = inventoryObject?.parentProjectObjectId || '';
                              const subObjects = getSubObjectsForParent(objectId || '');
                              const isHierarchyNode = !parentObjectId && subObjects.length > 0;
                              if (parentObjectId && !expandedObjects.has(parentObjectId)) return null;
                              const directTasksForObject = projectTasks
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
                              const objectName = inventoryObject?.objectId || 'Unknown Object';
                              const globalObj = inventoryObjects.find(o => o.id === inventoryObject?.globalObjectId || o.objectId === inventoryObject?.objectId);
                              const description = globalObj?.description || inventoryObject?.description || '';
                              const currentArea = getObjectProcessArea(objectId || '');
                              const previousArea = objectIndex > 0 ? getObjectProcessArea(sortedObjectIds[objectIndex - 1] || '') : null;
                              const showAreaHeader = currentArea !== previousArea;
                              const isExpanded = expandedObjects.has(objectId || '');
                              const hierarchyChildTasks = isHierarchyNode
                                ? subObjects.flatMap((subObject: any) => projectTasks.filter(t => t.projectObjectId === subObject.id))
                                : [];
                              const hierarchyChildObjectStatuses = isHierarchyNode
                                ? subObjects.map((subObject: any) => {
                                    const childTasks = projectTasks.filter(t => t.projectObjectId === subObject.id);
                                    return childTasks.length > 0 && childTasks.every(t => t.status === 'complete')
                                      ? 'complete'
                                      : childTasks.some(t => t.status === 'in_progress')
                                        ? 'in_progress'
                                        : childTasks.some(t => t.status === 'blocked')
                                          ? 'blocked'
                                          : 'not_started';
                                  })
                                : [];
                              const displayTasks = isHierarchyNode ? [] : directTasksForObject;
                              const relevantTasks = isHierarchyNode ? hierarchyChildTasks : directTasksForObject;
                              const hierarchyStatus = hierarchyChildTasks.length > 0 && hierarchyChildTasks.every(t => t.status === 'complete')
                                ? 'complete'
                                : hierarchyChildTasks.some(t => t.status === 'in_progress')
                                  ? 'in_progress'
                                  : hierarchyChildTasks.some(t => t.status === 'blocked')
                                    ? 'blocked'
                                    : 'not_started';
                              const matchesSearch = (() => {
                                const term = planSearchTerm.toLowerCase();
                                if (objectName.toLowerCase().includes(term) || description.toLowerCase().includes(term)) return true;
                                return isHierarchyNode && subObjects.some((subObject: any) => {
                                  const subName = (subObject.objectId || '').toLowerCase();
                                  const subDescription = ((inventoryObjects.find(o => o.id === subObject.globalObjectId || o.objectId === subObject.objectId)?.description || subObject.description || '') as string).toLowerCase();
                                  return subName.includes(term) || subDescription.includes(term);
                                });
                              })();
                              if (planSearchTerm && !matchesSearch) return null;
                              if (planStatusFilter && !relevantTasks.some(t => t.status === planStatusFilter)) return null;
                              if (planAssignedFilter && !relevantTasks.some(t => t.draUserId === planAssignedFilter || t.developerUserId === planAssignedFilter)) return null;
                              const overallStatus = !isHierarchyNode && displayTasks.length > 0 && displayTasks.every(t => t.status === 'complete') ? 'complete' : !isHierarchyNode && displayTasks.some(t => t.status === 'in_progress') ? 'in_progress' : !isHierarchyNode && displayTasks.some(t => t.status === 'blocked') ? 'blocked' : 'not_started';
                              return (
                                <React.Fragment key={`obj-${objectId}`}>
                                  {showAreaHeader && selectedItem?.type !== 'processArea' && (
                                    <Box sx={{ px: 0.5, pt: objectIndex === 0 ? 0 : 1.25, pb: 0.25 }}>
                                      <Typography variant="caption" sx={{ color: planAccentColor, letterSpacing: '0.08em', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                        {renderHierarchyIcon('processArea', planAccentColor, '0.8rem')}
                                        {getProcessAreaDisplayName(project.id, currentArea)}
                                      </Typography>
                                    </Box>
                                  )}
                                <Box
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
                                    setPlanRowOrder(prev => {
                                      const nextRows = reorderByDrop(mergeOrder(prev, orderedPlanRowKeys), dragKey, rowKey);
                                      if (activeProjectId) persistPlanRowOrder(activeProjectId, nextRows);
                                      return nextRows;
                                    });
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
                                    <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: planAccentColor }} />
                                  <Box onClick={() => { const next = new Set(expandedObjects); if (isExpanded) next.delete(objectId || ''); else next.add(objectId || ''); setExpandedObjects(next); apiClient.put('/api/hierarchy-preferences/state', { treeOrder, expandedPrograms: Array.from(expandedPrograms), expandedCycles: Array.from(expandedCycles), expandedProjectGroups: Array.from(expandedProjectGroups), expandedObjects: Array.from(next), planningAdditionalGroups, planningAdditionalProcessAreas, hiddenProcessAreas, processAreaAccentOverrides, processAreaDescriptions, hierarchyLevelIcons }).catch(() => {}); }}
                                    sx={{ pl: 2.5, pr: 1, py: 1.25, display: 'flex', alignItems: 'center', gap: { xs: 0.8, sm: 1.5 }, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' } }}>
                                    <DragIndicatorIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0, cursor: canReorderPlan ? 'grab' : 'not-allowed', opacity: canReorderPlan ? 1 : 0.45 }} />
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); const next = new Set(expandedObjects); if (isExpanded) next.delete(objectId || ''); else next.add(objectId || ''); setExpandedObjects(next); apiClient.put('/api/hierarchy-preferences/state', { treeOrder, expandedPrograms: Array.from(expandedPrograms), expandedCycles: Array.from(expandedCycles), expandedProjectGroups: Array.from(expandedProjectGroups), expandedObjects: Array.from(next), planningAdditionalGroups, planningAdditionalProcessAreas, hiddenProcessAreas, processAreaAccentOverrides, processAreaDescriptions, hierarchyLevelIcons }).catch(() => {}); }} sx={{ p: 0.2, flexShrink: 0 }}>
                                      <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                                    </IconButton>
                                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: { xs: '0.76rem', sm: '0.82rem' }, color: planAccentColor, flexShrink: 0, minWidth: { xs: 0, sm: 90 }, maxWidth: { xs: '38vw', sm: 'none' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{objectName}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</Typography>
                                    {isHierarchyNode ? (
                                      <>
                                        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.4, alignItems: 'center', flexShrink: 0 }}>
                                          {hierarchyChildObjectStatuses.slice(0, 10).map((status, i) => (<Box key={i} sx={{ width: 16, height: 4, borderRadius: 2, backgroundColor: getTaskStatusColor(status) }} />))}
                                        </Box>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getTaskStatusColor(hierarchyStatus), flexShrink: 0 }} />
                                      </>
                                    ) : (
                                      <>
                                        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.4, alignItems: 'center', flexShrink: 0 }}>
                                          {displayTasks.slice(0, 10).map((task, i) => (<Box key={i} sx={{ width: 16, height: 4, borderRadius: 2, backgroundColor: getTaskStatusColor(task.status) }} />))}
                                        </Box>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getTaskStatusColor(overallStatus), flexShrink: 0 }} />
                                      </>
                                    )}
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuAnchorEl(e.currentTarget); setMenuType('task'); setMenuItemId(objectId || ''); }}><MoreVertIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                  </Box>
                                  {isHierarchyNode && isExpanded && (
                                    <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', px: 2, py: 1.25 }}>
                                      <Box sx={{ pl: 2.5, borderLeft: '2px solid rgba(111, 180, 78, 0.28)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {subObjects.map((subObject: any) => {
                                          const childTasks = projectTasks
                                            .filter(t => t.projectObjectId === subObject.id)
                                            .sort((a, b) => {
                                              const aDate = a.startDate ? new Date(a.startDate).getTime() : Infinity;
                                              const bDate = b.startDate ? new Date(b.startDate).getTime() : Infinity;
                                              if (aDate !== bDate) return aDate - bDate;
                                              const aIdx = defaultTaskOrder.indexOf(a.name);
                                              const bIdx = defaultTaskOrder.indexOf(b.name);
                                              const aOrder = aIdx === -1 ? 999 : aIdx;
                                              const bOrder = bIdx === -1 ? 999 : bIdx;
                                              if (aOrder !== bOrder) return aOrder - bOrder;
                                              return (a.name || '').localeCompare(b.name || '');
                                            });
                                          const childStatus = childTasks.length > 0 && childTasks.every(t => t.status === 'complete') ? 'complete' : childTasks.some(t => t.status === 'in_progress') ? 'in_progress' : childTasks.some(t => t.status === 'blocked') ? 'blocked' : 'not_started';
                                          const childGlobal = inventoryObjects.find(o => o.id === subObject.globalObjectId || o.objectId === subObject.objectId);
                                          const childDescription = childGlobal?.description || subObject.subObjectDescription || subObject.description || '';
                                            const childExpanded = expandedObjects.has(subObject.id);
                                          return (
                                              <Box key={subObject.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                                <Box
                                                  sx={{
                                                    ml: 1,
                                                    pl: 1.5,
                                                    pr: 1.5,
                                                    py: 1,
                                                    borderRadius: 2,
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    cursor: 'pointer',
                                                  }}
                                                  onClick={() => {
                                                    const next = new Set(expandedObjects);
                                                    if (childExpanded) next.delete(subObject.id);
                                                    else next.add(subObject.id);
                                                    setExpandedObjects(next);
                                                    apiClient.put('/api/hierarchy-preferences/state', {
                                                      treeOrder,
                                                      expandedPrograms: Array.from(expandedPrograms),
                                                      expandedCycles: Array.from(expandedCycles),
                                                      expandedProjectGroups: Array.from(expandedProjectGroups),
                                                      expandedObjects: Array.from(next),
                                                      planningAdditionalGroups,
                                                      planningAdditionalProcessAreas,
                                                      hiddenProcessAreas,
                                                      processAreaAccentOverrides,
                                                      processAreaDescriptions,
                                                      hierarchyLevelIcons,
                                                    }).catch(() => {});
                                                  }}
                                                >
                                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); const next = new Set(expandedObjects); if (childExpanded) next.delete(subObject.id); else next.add(subObject.id); setExpandedObjects(next); apiClient.put('/api/hierarchy-preferences/state', { treeOrder, expandedPrograms: Array.from(expandedPrograms), expandedCycles: Array.from(expandedCycles), expandedProjectGroups: Array.from(expandedProjectGroups), expandedObjects: Array.from(next), planningAdditionalGroups, planningAdditionalProcessAreas, hiddenProcessAreas, processAreaAccentOverrides, processAreaDescriptions, hierarchyLevelIcons }).catch(() => {}); }} sx={{ p: 0.2, flexShrink: 0 }}>
                                                    <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary', transition: 'transform 0.2s', transform: childExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                                                  </IconButton>
                                                  <Box sx={{ width: 16, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: getTaskStatusColor(childStatus) }} />
                                                  </Box>
                                                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', color: planAccentColor, flexShrink: 0 }}>
                                                    {subObject.objectId}
                                                  </Typography>
                                                  <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {childDescription || 'Sub-object'}
                                                  </Typography>
                                                  <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.4, alignItems: 'center', flexShrink: 0 }}>
                                                    {childTasks.slice(0, 10).map((task: any, i: number) => (
                                                      <Box key={i} sx={{ width: 16, height: 4, borderRadius: 2, backgroundColor: getTaskStatusColor(task.status) }} />
                                                    ))}
                                                  </Box>
                                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getTaskStatusColor(childStatus), flexShrink: 0 }} />
                                                </Box>
                                                {childExpanded && (
                                                  <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                    {(taskDeps[subObject.id] || []).length > 0 && (
                                                      <Box sx={{ px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        <Typography variant="caption" color="text.disabled">Depends on:</Typography>
                                                        {(taskDeps[subObject.id] || []).map((dep: any) => (
                                                          <Box key={dep.id} sx={{ px: 1, py: 0.25, borderRadius: 1, backgroundColor: 'rgba(91,103,202,0.2)', fontSize: '0.7rem', color: '#9FA8DA' }}>{dep.objectId || dep.dependsOnName}</Box>
                                                        ))}
                                                      </Box>
                                                    )}
                                                    <Box sx={{ width: '100%', overflowX: 'auto' }}>
                                                      <Box sx={{ minWidth: 930, display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 120px 60px 150px 84px 44px 100px 100px 92px', gap: 0, px: 2, py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                        {['TASK', 'STATUS', '%', 'ASSIGNED TO', 'DUR', 'WKND', 'START DATE', 'END DATE', 'ACTIONS'].map(h => (
                                                          <Typography key={h} variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'pre-line', lineHeight: 1.05 }}>{h}</Typography>
                                                        ))}
                                                      </Box>
                                                      {childTasks.length === 0
                                                        ? <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1, display: 'block', minWidth: 930 }}>No tasks</Typography>
                                                        : childTasks.map((task) => (
                                                        <Box key={task.id} sx={{ minWidth: 930, display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 120px 60px 150px 84px 44px 100px 100px 92px', gap: 0, px: 2, py: 0.5, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: getTaskStatusColor(task.status), flexShrink: 0 }} />
                                                            <TextField size="small" value={task.name || ''} onBlur={e => updateTaskInline(task.id, 'name', e.target.value)}
                                                              onChange={e => setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: e.target.value } : t))}
                                                              sx={{ ...taskFieldSx, flex: 1 }} />
                                                          </Box>
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
                                                          <TextField size="small" type="number" value={task.progressPercentage ?? 0}
                                                            disabled={task.status !== 'in_progress'}
                                                            onChange={e => {
                                                              const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                              updateTaskInline(task.id, 'progressPercentage', String(val));
                                                            }}
                                                            slotProps={{ htmlInput: { min: 0, max: 100 } }}
                                                            sx={{ ...taskFieldSx, '& input': { textAlign: 'center', px: 0.5 } }} />
                                                          <TextField select size="small" value={task.assignedTo || ''}
                                                            onChange={e => updateTaskInline(task.id, 'assignedTo', e.target.value)}
                                                            sx={taskFieldSx}>
                                                            <MenuItem value=""><em>Unassigned</em></MenuItem>
                                                            {people.map(p => <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>)}
                                                          </TextField>
                                                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
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
                                                                setProjectTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...patch } : t));
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
                                                              sx={{ ...taskFieldSx, '& input': { textAlign: 'center', px: 0.25, width: 32 } }} />
                                                          </Box>
                                                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', pl: 0 }}>
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
                                                              sx={{ opacity: (taskCommentCounts[task.id] || 0) > 0 ? 1 : 0.6, color: (taskCommentCounts[task.id] || 0) > 0 ? planAccentColor : 'inherit', '&:hover': { opacity: 1, color: planAccentColor } }}>
                                                              <ChatBubbleOutlineIcon sx={{ fontSize: '0.9rem' }} />
                                                            </IconButton>
                                                            <IconButton size="small" title="Dependencies" onClick={async () => {
                                                              await loadTaskDeps(task.id);
                                                              setDepDialogTaskId(task.id);
                                                              setDepSearchTerm('');
                                                              await loadCycleTasksForDep(task.id);
                                                            }} sx={{ opacity: (taskDeps[task.id] || []).length > 0 ? 1 : 0.6, color: (taskDeps[task.id] || []).length > 0 ? planAccentColor : 'inherit', '&:hover': { opacity: 1, color: planAccentColor } }}>
                                                              <ChevronRightIcon sx={{ fontSize: '0.9rem' }} />
                                                            </IconButton>
                                                            <IconButton size="small" title="More task actions" onClick={(e) => openTaskRowMenu(e, task)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                                              <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
                                                            </IconButton>
                                                          </Box>
                                                        </Box>
                                                      ))
                                                      }
                                                    </Box>
                                                    <Box sx={{ px: 2, py: 0.5, minWidth: 930 }}>
                                                      <Button size="small" variant="text" startIcon={<AddIcon sx={{ fontSize: '0.8rem !important' }} />}
                                                        onClick={async () => {
                                                          try {
                                                            const res = await apiClient.post(`/api/tasks/project/${activeProjectId}`, { taskType: 'custom', projectObjectId: subObject.id, name: 'New Task', durationUnit: 'days' });
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
                                    </Box>
                                  )}
                                  {/* Timeline and Status Info Line */}
                                  {!isHierarchyNode && displayTasks.length > 0 && (() => {
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
                                    for (const task of displayTasks) {
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
                                  {!isHierarchyNode && isExpanded && (
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
                                      <Box sx={{ width: '100%', overflowX: 'auto' }}>
                                        {/* Table header */}
                                        <Box sx={{ minWidth: 930, display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 120px 60px 150px 84px 44px 100px 100px 92px', gap: 0, px: 2, py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                          {['TASK', 'STATUS', '%', 'ASSIGNED TO', 'DUR', 'WKND', 'START DATE', 'END DATE', 'ACTIONS'].map(h => (
                                            <Typography key={h} variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'pre-line', lineHeight: 1.05 }}>{h}</Typography>
                                          ))}
                                        </Box>
                                        {displayTasks.length === 0
                                          ? <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1, display: 'block', minWidth: 930 }}>No tasks</Typography>
                                          : displayTasks.map((task) => (
                                          <Box key={task.id} sx={{ minWidth: 930, display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 120px 60px 150px 84px 44px 100px 100px 92px', gap: 0, px: 2, py: 0.5, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
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
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
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
                                                sx={{ ...taskFieldSx, '& input': { textAlign: 'center', px: 0.25, width: 32 } }} />
                                            </Box>
                                            {/* Include weekends override */}
                                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', pl: 0 }}>
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
                                                sx={{ opacity: (taskCommentCounts[task.id] || 0) > 0 ? 1 : 0.6, color: (taskCommentCounts[task.id] || 0) > 0 ? planAccentColor : 'inherit', '&:hover': { opacity: 1, color: planAccentColor } }}>
                                                <ChatBubbleOutlineIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                              <IconButton size="small" title="Dependencies" onClick={async () => {
                                                await loadTaskDeps(task.id);
                                                setDepDialogTaskId(task.id);
                                                setDepSearchTerm('');
                                                await loadCycleTasksForDep(task.id);
                                              }} sx={{ opacity: (taskDeps[task.id] || []).length > 0 ? 1 : 0.6, color: (taskDeps[task.id] || []).length > 0 ? planAccentColor : 'inherit', '&:hover': { opacity: 1, color: planAccentColor } }}>
                                                <ChevronRightIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                              <IconButton size="small" title="More task actions" onClick={(e) => openTaskRowMenu(e, task)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                                <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                            </Box>
                                          </Box>
                                        ))}
                                        {subObjects.length > 0 && isExpanded && (
                                          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', px: 2, py: 1.25 }}>
                                            <Box sx={{ pl: 2.5, borderLeft: '2px solid rgba(111, 180, 78, 0.28)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                              {subObjects.map((subObject: any) => {
                                                const childTasks = projectTasks
                                                  .filter(t => t.projectObjectId === subObject.id)
                                                  .sort((a, b) => {
                                                    const aDate = a.startDate ? new Date(a.startDate).getTime() : Infinity;
                                                    const bDate = b.startDate ? new Date(b.startDate).getTime() : Infinity;
                                                    if (aDate !== bDate) return aDate - bDate;
                                                    const aIdx = defaultTaskOrder.indexOf(a.name);
                                                    const bIdx = defaultTaskOrder.indexOf(b.name);
                                                    const aOrder = aIdx === -1 ? 999 : aIdx;
                                                    const bOrder = bIdx === -1 ? 999 : bIdx;
                                                    if (aOrder !== bOrder) return aOrder - bOrder;
                                                    return (a.name || '').localeCompare(b.name || '');
                                                  });
                                                const childStatus = childTasks.length > 0 && childTasks.every(t => t.status === 'complete') ? 'complete' : childTasks.some(t => t.status === 'in_progress') ? 'in_progress' : childTasks.some(t => t.status === 'blocked') ? 'blocked' : 'not_started';
                                                const childGlobal = inventoryObjects.find(o => o.id === subObject.globalObjectId || o.objectId === subObject.objectId);
                                                const childDescription = childGlobal?.description || subObject.subObjectDescription || subObject.description || '';
                                                return (
                                                  <Box
                                                    key={subObject.id}
                                                    sx={{
                                                      ml: 1,
                                                      pl: 1.5,
                                                      pr: 1.5,
                                                      py: 1,
                                                      borderRadius: 2,
                                                      border: '1px solid rgba(255,255,255,0.08)',
                                                      backgroundColor: 'rgba(255,255,255,0.03)',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      gap: 1,
                                                    }}
                                                  >
                                                    <ChevronRightIcon sx={{ fontSize: 15, color: 'text.secondary', transform: 'rotate(90deg)', flexShrink: 0 }} />
                                                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', color: planAccentColor, flexShrink: 0 }}>
                                                      {subObject.objectId}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                      {childDescription || 'Sub-object'}
                                                    </Typography>
                                                    <Box sx={{ px: 1, py: 0.25, borderRadius: 1, backgroundColor: 'rgba(111, 180, 78, 0.14)', border: '1px solid rgba(111, 180, 78, 0.25)', color: '#B7E08D', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                                                      {childTasks.length} task{childTasks.length === 1 ? '' : 's'}
                                                    </Box>
                                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getTaskStatusColor(childStatus), flexShrink: 0 }} />
                                                  </Box>
                                                );
                                              })}
                                            </Box>
                                          </Box>
                                        )}
                                        {/* Add Task row */}
                                        <Box sx={{ px: 2, py: 0.5, minWidth: 930 }}>
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
                                      </Box>
                                      {/* Object Notes */}
                                      <Box sx={{ px: 2, pb: 1.5 }}>
                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 600, display: 'block', mb: 0.5 }}>OBJECT NOTES</Typography>
                                        <TextField fullWidth size="small" multiline rows={1} placeholder="Add object-level notes..." sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' }, '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: planAccentColor }, '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: planAccentColor } }} />
                                      </Box>
                                    </Box>
                                  )}
                                </Box>
                                </React.Fragment>
                              );
                            })}
                            {orderedTaskGroups.map((group, groupIndex) => {
                              const rowKey = taskGroupRowKey(group.id);
                              const groupArea = getTaskGroupProcessArea(group);
                              const prevGroupArea = groupIndex > 0 ? getTaskGroupProcessArea(orderedTaskGroups[groupIndex - 1]) : null;
                              const showGroupAreaHeader = groupArea !== prevGroupArea;
                              const groupAreaHeader = groupArea ? getProcessAreaDisplayName(project.id, groupArea) : 'ADDITIONAL GROUPING';
                              const isExpanded = expandedTaskGroups.has(group.id);
                              const groupTasks = projectTasks.filter(t => t.taskGroupId === group.id);
                              const overallStatus = groupTasks.length > 0 && groupTasks.every(t => t.status === 'complete') ? 'complete' : groupTasks.some(t => t.status === 'in_progress') ? 'in_progress' : groupTasks.some(t => t.status === 'blocked') ? 'blocked' : 'not_started';
                              if (planSearchTerm && !group.name.toLowerCase().includes(planSearchTerm.toLowerCase())) return null;
                              if (planStatusFilter && !groupTasks.some(t => t.status === planStatusFilter)) return null;
                              if (planAssignedFilter && !groupTasks.some(t => t.draUserId === planAssignedFilter || t.developerUserId === planAssignedFilter)) return null;
                              return (
                                <React.Fragment key={`group-${group.id}`}>
                                  {showGroupAreaHeader && selectedItem?.type !== 'processArea' && (
                                    <Box sx={{ px: 0.5, pt: groupIndex === 0 ? 1.25 : 1.25, pb: 0.25 }}>
                                      <Typography variant="caption" sx={{ color: planAccentColor, letterSpacing: '0.08em', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                        {renderHierarchyIcon('planGroup', planAccentColor, '0.8rem')}
                                        {groupAreaHeader}
                                      </Typography>
                                    </Box>
                                  )}
                                <Box
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
                                    setPlanRowOrder(prev => {
                                      const nextRows = reorderByDrop(mergeOrder(prev, orderedPlanRowKeys), dragKey, rowKey);
                                      if (activeProjectId) persistPlanRowOrder(activeProjectId, nextRows);
                                      return nextRows;
                                    });
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
                                  <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: planAccentColor }} />
                                  <Box onClick={() => { const next = new Set(expandedTaskGroups); if (isExpanded) next.delete(group.id); else next.add(group.id); setExpandedTaskGroups(next); }}
                                    sx={{ pl: 2.5, pr: 1, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' } }}>
                                    <DragIndicatorIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0, cursor: canReorderPlan ? 'grab' : 'not-allowed', opacity: canReorderPlan ? 1 : 0.45 }} />
                                    <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                                    {renderHierarchyIcon('planGroup', planAccentColor, '0.9rem')}
                                    <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', flex: 1, color: planAccentColor }}>{group.name}</Typography>
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
                                      <Box sx={{ width: '100%', overflowX: 'auto' }}>
                                        {/* Table header */}
                                        <Box sx={{ minWidth: 930, display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 120px 60px 150px 84px 44px 100px 100px 92px', gap: 0, px: 2, py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                          {['TASK', 'STATUS', '%', 'ASSIGNED TO', 'DUR', 'WKND', 'START DATE', 'END DATE', 'ACTIONS'].map(h => (
                                            <Typography key={h} variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'pre-line', lineHeight: 1.05 }}>{h}</Typography>
                                          ))}
                                        </Box>
                                      {groupTasks.length === 0
                                        ? <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1, display: 'block', minWidth: 930 }}>No tasks</Typography>
                                        : groupTasks.map((task) => (
                                          <Box key={task.id} sx={{ minWidth: 930, display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 120px 60px 150px 84px 44px 100px 100px 92px', gap: 0, px: 2, py: 0.5, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
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
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
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
                                                sx={{ ...taskFieldSx, '& input': { textAlign: 'center', px: 0.25, width: 32 } }} />
                                            </Box>
                                            {/* Include weekends override */}
                                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', pl: 0 }}>
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
                                                sx={{ opacity: (taskCommentCounts[task.id] || 0) > 0 ? 1 : 0.6, color: (taskCommentCounts[task.id] || 0) > 0 ? planAccentColor : 'inherit', '&:hover': { opacity: 1, color: planAccentColor } }}>
                                                <ChatBubbleOutlineIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                              <IconButton size="small" onClick={async () => {
                                                await loadTaskDeps(task.id);
                                                setDepDialogTaskId(task.id);
                                                setDepSearchTerm('');
                                                await loadCycleTasksForDep(task.id);
                                              }} sx={{ opacity: (taskDeps[task.id] || []).length > 0 ? 1 : 0.6, color: (taskDeps[task.id] || []).length > 0 ? planAccentColor : 'inherit', '&:hover': { opacity: 1, color: planAccentColor } }}>
                                                <ChevronRightIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                              <IconButton size="small" title="More task actions" onClick={(e) => openTaskRowMenu(e, task)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                                <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
                                              </IconButton>
                                            </Box>
                                          </Box>
                                        ))}
                                      {/* Add Task to group */}
                                      <Box sx={{ px: 2, py: 0.5, minWidth: 930 }}>
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
                                    </Box>
                                  )}
                                </Box>
                                </React.Fragment>
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
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<AddIcon />}
                              onClick={() => {
                                const targetProjectId = getPrimaryProjectIdForCycle(selectedItem.id);
                                if (!targetProjectId) {
                                  alert('No project found for this mock cycle.');
                                  return;
                                }
                                handleAddAdditionalGroup(targetProjectId);
                              }}
                              sx={{ textTransform: 'none' }}
                            >
                              Add Plan Group
                            </Button>
                          </Box>
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
          {canAccessInventory && tabValue === 1 && (
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
                        onClick={() => {
                          setEditingInventoryItemId(null);
                          setProjectInventoryItem(getEmptyProjectInventoryItem());
                          setProjectInventoryDialogOpen(true);
                        }}
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
                            const description = item.subObjectDescription || catalogObj?.description || '';
                            const inPlan = projectTasks.some(task => task.projectObjectId === item.id);
                            const isSubObject = !!item.parentProjectObjectId;
                            const parentObject = isSubObject
                              ? projectInventoryItems.find((entry: any) => entry.id === item.parentProjectObjectId)
                              : null;
                            const subObjectCount = !isSubObject ? getSubObjectsForParent(item.id).length : 0;

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
                                  {isSubObject && (
                                    <Box sx={{ width: 12, textAlign: 'center', color: '#8FA6D4', fontSize: '0.72rem', lineHeight: 1 }}>
                                      ↳
                                    </Box>
                                  )}
                                  <Box sx={{ px: 0.7, py: 0.22, borderRadius: 0.8, backgroundColor: 'rgba(92,118,204,0.35)', color: '#BFD2FF', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                                    {item.dataObjectId}
                                  </Box>
                                  <Typography sx={{ color: '#CBD9F7', fontSize: '0.79rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                    {description || 'No description'}
                                  </Typography>
                                  {isSubObject && parentObject && (
                                    <Box sx={{ px: 0.55, py: 0.1, borderRadius: 0.7, backgroundColor: 'rgba(124,131,208,0.18)', border: '1px solid rgba(124,131,208,0.35)', color: '#AAB4F2', fontSize: '0.62rem', fontWeight: 700, flexShrink: 0 }}>
                                      Sub of {parentObject.objectId}
                                    </Box>
                                  )}
                                  {!isSubObject && subObjectCount > 0 && (
                                    <Box sx={{ px: 0.55, py: 0.1, borderRadius: 0.7, backgroundColor: 'rgba(86,180,255,0.18)', border: '1px solid rgba(86,180,255,0.35)', color: '#8ED8FF', fontSize: '0.62rem', fontWeight: 700, flexShrink: 0 }}>
                                      {subObjectCount} sub-object{subObjectCount === 1 ? '' : 's'}
                                    </Box>
                                  )}
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

          {/* Planning Maintain Tab Content */}
          {sectionMode === 'planning' && tabValue === 6 && (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  p: 2,
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#DCE6FF', mb: 0.75 }}>
                  Maintain Planning Hierarchy
                </Typography>
                <Typography variant="body2" sx={{ color: '#9FB0D8' }}>
                  View existing records, edit or delete them, and add new records via modal dialogs.
                </Typography>
              </Box>

              {!canManageHierarchy ? (
                <Alert severity="info">You have read-only access. Admin role is required to submit hierarchy forms.</Alert>
              ) : (
                <Card sx={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2 }}>
                  <CardHeader
                    title={maintainFormView === 'program' ? 'Programs' : maintainFormView === 'cycle' ? 'Mock Cycles' : 'Projects'}
                    titleTypographyProps={{ sx: { color: '#E8F0FF', fontWeight: 800, fontSize: '1.02rem' } }}
                    action={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {maintainFormView === 'cycle' && (
                          <TextField
                            select
                            size="small"
                            label="Parent Project"
                            value={maintainCycleParentProjectId}
                            onChange={(e) => setMaintainCycleParentProjectId(e.target.value)}
                            sx={{ minWidth: 200 }}
                          >
                            {maintainCycleParentProjectOptions.map((project) => (
                              <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
                            ))}
                          </TextField>
                        )}
                        {maintainFormView === 'project' && (
                          <TextField
                            select
                            size="small"
                            label="Parent Program"
                            value={maintainProjectParentProgramId}
                            onChange={(e) => {
                              setMaintainProjectParentProgramId(e.target.value);
                            }}
                            sx={{ minWidth: 220 }}
                          >
                            {programs.map((program) => (
                              <MenuItem key={program.id} value={program.id}>{program.name}</MenuItem>
                            ))}
                          </TextField>
                        )}
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => {
                            if (maintainFormView === 'program') {
                              openCreateDialog('program');
                            } else if (maintainFormView === 'cycle') {
                              setMaintainPendingCycleProjectId(maintainCycleParentProjectId || null);
                              openCreateDialog('cycle', maintainCycleParentProgramId);
                            } else if (maintainFormView === 'project') {
                              const targetProgramId = maintainProjectParentProgramId || programs[0]?.id || '';
                              if (!targetProgramId) {
                                alert('Create a program first before adding a project.');
                                return;
                              }
                              openCreateDialog('project', targetProgramId);
                            }
                          }}
                          disabled={(maintainFormView === 'cycle' && !maintainCycleParentProjectId) || (maintainFormView === 'project' && programs.length === 0)}
                          sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                          Add New
                        </Button>
                      </Box>
                    }
                  />
                  <CardContent sx={{ pt: 0 }}>
                    {maintainFormView === 'program' && (
                      <TableContainer sx={{ border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
                              <TableCell sx={{ color: '#E6EFFF', fontWeight: 700 }}>Program</TableCell>
                              <TableCell sx={{ color: '#E6EFFF', fontWeight: 700 }}>Description</TableCell>
                              <TableCell sx={{ color: '#E6EFFF', fontWeight: 700 }}>Accent</TableCell>
                              <TableCell sx={{ color: '#E6EFFF', fontWeight: 700, width: 130 }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {programs.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} sx={{ color: '#9FB0D8' }}>No programs found.</TableCell>
                              </TableRow>
                            ) : programs.map((program, idx) => (
                              <TableRow key={program.id} sx={{ backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)' }}>
                                <TableCell sx={{ color: '#DCE7FF', fontWeight: 700 }}>{program.name}</TableCell>
                                <TableCell sx={{ color: '#BFD0F3' }}>{program.description || '—'}</TableCell>
                                <TableCell sx={{ color: '#BFD0F3' }}>{program.accentColor || '—'}</TableCell>
                                <TableCell>
                                  <IconButton size="small" onClick={() => openEditDialog('program', program.id)} sx={{ color: '#8FB7FF' }}><EditIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                  <IconButton size="small" onClick={() => openDeleteDialog('program', program.id, program.name)} sx={{ color: '#FF9AA8' }}><DeleteIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}

                    {maintainFormView === 'cycle' && (
                      <>
                        <Box sx={{ mb: 1.2, display: 'flex', justifyContent: 'flex-end' }}>
                          <TextField
                            select
                            size="small"
                            label="Show Program"
                            value={maintainCycleFilterProgramId}
                            onChange={(e) => setMaintainCycleFilterProgramId(e.target.value as 'all' | string)}
                            sx={{ minWidth: 220 }}
                          >
                            <MenuItem value="all">All Programs</MenuItem>
                            {programs.map((program) => (
                              <MenuItem key={program.id} value={program.id}>{program.name}</MenuItem>
                            ))}
                          </TextField>
                        </Box>
                        <TableContainer sx={{ border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
                                <TableCell sx={{ color: '#E6EFFF', fontWeight: 700 }}>Mock Cycle</TableCell>
                                <TableCell sx={{ color: '#E6EFFF', fontWeight: 700 }}>Project</TableCell>
                                <TableCell sx={{ color: '#E6EFFF', fontWeight: 700 }}>Program</TableCell>
                                <TableCell sx={{ color: '#E6EFFF', fontWeight: 700 }}>Date Range</TableCell>
                                <TableCell sx={{ color: '#E6EFFF', fontWeight: 700 }}>Mode</TableCell>
                                <TableCell sx={{ color: '#E6EFFF', fontWeight: 700, width: 130 }}>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {visibleMaintainCycleRows.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} sx={{ color: '#9FB0D8' }}>No mock cycles found.</TableCell>
                                </TableRow>
                              ) : visibleMaintainCycleRows.map((cycle, idx) => (
                                <TableRow key={cycle.id} sx={{ backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)' }}>
                                  <TableCell sx={{ color: '#DCE7FF', fontWeight: 700 }}>{cycle.name}</TableCell>
                                  <TableCell sx={{ color: '#BFD0F3' }}>{cycle.linkedProjectName}</TableCell>
                                  <TableCell sx={{ color: '#BFD0F3' }}>{cycle.programName}</TableCell>
                                  <TableCell sx={{ color: '#BFD0F3' }}>{toDateInputValue(cycle.startDate)} to {toDateInputValue(cycle.endDate)}</TableCell>
                                  <TableCell sx={{ color: '#BFD0F3' }}>{cycle.scheduleMode === 'working_days' ? 'Working Days' : 'All Days'}</TableCell>
                                  <TableCell>
                                    <IconButton size="small" onClick={() => openEditDialog('cycle', cycle.id)} sx={{ color: '#8FB7FF' }}><EditIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                    <IconButton size="small" onClick={() => openDeleteDialog('cycle', cycle.id, cycle.name)} sx={{ color: '#FF9AA8' }}><DeleteIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}

                    {maintainFormView === 'project' && (
                      <>
                        <TableContainer sx={{ border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
                                <TableCell sx={{ color: '#E6EFFF', fontWeight: 700 }}>Project</TableCell>
                                <TableCell sx={{ color: '#E6EFFF', fontWeight: 700 }}>Program</TableCell>
                                <TableCell sx={{ color: '#E6EFFF', fontWeight: 700 }}>Date Range</TableCell>
                                <TableCell sx={{ color: '#E6EFFF', fontWeight: 700, width: 130 }}>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {visibleMaintainProjectRows.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} sx={{ color: '#9FB0D8' }}>No projects found.</TableCell>
                                </TableRow>
                              ) : visibleMaintainProjectRows.map((project, idx) => (
                                <TableRow key={project.id} sx={{ backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)' }}>
                                  <TableCell sx={{ color: '#DCE7FF', fontWeight: 700 }}>{project.name}</TableCell>
                                  <TableCell sx={{ color: '#BFD0F3' }}>{project.programName}</TableCell>
                                  <TableCell sx={{ color: '#BFD0F3' }}>{toDateInputValue(project.startDate) || '—'} to {toDateInputValue(project.endDate) || '—'}</TableCell>
                                  <TableCell>
                                    <IconButton size="small" onClick={() => openEditDialog('project', project.id)} sx={{ color: '#8FB7FF' }}><EditIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                    <IconButton size="small" onClick={() => openDeleteDialog('project', project.id, project.name)} sx={{ color: '#FF9AA8' }}><DeleteIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card sx={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 2 }}>
                <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  <Chip size="small" label={`Programs: ${programs.length}`} variant="outlined" sx={{ color: '#E7EEFF', borderColor: 'rgba(255,255,255,0.28)' }} />
                  <Chip size="small" label={`Mock Cycles: ${allMaintainCycles.length}`} variant="outlined" sx={{ color: '#E7EEFF', borderColor: 'rgba(255,255,255,0.28)' }} />
                  <Chip size="small" label={`Projects: ${allMaintainProjects.length}`} variant="outlined" sx={{ color: '#E7EEFF', borderColor: 'rgba(255,255,255,0.28)' }} />
                </CardContent>
              </Card>
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
                        Weekly calendar view for process area and task group load dates. Colors represent process areas.
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
                    {Array.from(new Map(
                      cycleScheduleItems
                        .map((item: any) => {
                          const area = (item.processArea || '').trim();
                          if (!area) return null;
                          return [area, { label: getProcessAreaDisplayName(item.projectId, area), color: item.processAreaAccent || item.projectColor }];
                        })
                        .filter(Boolean) as any
                    ).values()).map((entry: any) => {
                      return (
                        <Box key={entry.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: entry.color }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{entry.label}</Typography>
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
                            const catalogDescription = item.scheduleEntityType === 'object'
                              ? (inventoryObjects.find((obj) => obj.id === item.globalObjectId || obj.objectId === item.objectId)?.description || '')
                              : '';
                            const resolvedDescription = ((item.description || '').trim() || catalogDescription || '').trim();

                            return (
                              <Box key={`sched-${item.id}-${item.projectId}`} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75 }}>
                                <Box
                                  sx={{
                                    gridColumn: `${startIndex + 1} / ${endIndex + 2}`,
                                    p: 0.75,
                                    borderRadius: 1,
                                    backgroundColor: toRgba(item.processAreaAccent || item.projectColor, 0.26),
                                    border: `1px solid ${toRgba(item.processAreaAccent || item.projectColor, 0.62)}`,
                                    minWidth: 0,
                                  }}
                                >
                                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontWeight: 700, color: item.processAreaAccent || item.projectColor }}>
                                    {getProcessAreaDisplayName(item.projectId, item.processArea || 'Unassigned Process Area')}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: '#D2DDF8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.scheduleEntityType === 'object'
                                      ? (item.entityLabel || item.objectId || 'Object')
                                      : (item.taskGroupName || item.entityLabel || 'Task Group')}
                                  </Typography>
                                  {item.scheduleEntityType === 'object' && (
                                    <Typography variant="caption" sx={{ display: 'block', color: '#B9CAE9', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {resolvedDescription || 'No description'}
                                    </Typography>
                                  )}
                                  <Typography variant="caption" sx={{ display: 'block', color: '#9FB0D8' }}>
                                    {(item.projectName || 'Project') + ' / ' + (item.mockCycleDescription || item.mockCycleName || 'Mock Cycle')}
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
          {dialogMode === 'project' && !isPlanningMaintainTab ? (
            <>
              <TextField
                select
                autoFocus
                fullWidth
                label="Maintained Project Option"
                value={selectedExistingProjectOptionId}
                onChange={(e) => setSelectedExistingProjectOptionId(e.target.value)}
                variant="outlined"
                size="small"
                sx={{ mb: 1.5, mt: 3 }}
              >
                {treeProjectOptionsForProgram.map((project) => (
                  <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
                ))}
              </TextField>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Only projects configured in Maintain are available from the tree.
              </Typography>
            </>
          ) : (
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
          )}
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
            disabled={isCreating || ((dialogMode === 'project' && !isPlanningMaintainTab) ? !selectedExistingProjectOptionId : !newItemName.trim())}
            sx={{ textTransform: 'none' }}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Existing Mock Cycle Dialog */}
      <Dialog
        open={attachCycleDialogOpen}
        onClose={() => {
          setAttachCycleDialogOpen(false);
          setAttachCycleProgramId(null);
          setAttachCycleId('');
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{
          background: theme => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark || theme.palette.primary.main} 100%)`,
          color: 'white',
          fontWeight: 600,
          fontSize: '1.1rem',
          pb: 2,
        }}>
          Add Existing Mock Cycle
        </DialogTitle>
        <DialogContent sx={{ pt: 2, px: 3 }}>
          <Typography variant="body2" sx={{ mt: 2, mb: 2, color: 'text.secondary' }}>
            Select a mock cycle already maintained for this program to show in the hierarchy tree.
          </Typography>
          <TextField
            select
            fullWidth
            autoFocus
            label="Maintained Mock Cycle"
            value={attachCycleId}
            onChange={(e) => setAttachCycleId(e.target.value)}
            variant="outlined"
            size="small"
          >
            {(attachCycleProgramId ? getAttachableCyclesForProgram(attachCycleProgramId) : []).map((cycle: MockCycle) => (
              <MenuItem key={cycle.id} value={cycle.id}>{cycle.name}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={() => {
              setAttachCycleDialogOpen(false);
              setAttachCycleProgramId(null);
              setAttachCycleId('');
            }}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAttachCycleConfirm}
            variant="contained"
            disabled={!attachCycleId}
            sx={{ textTransform: 'none' }}
          >
            Add
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
            This will copy projects, inventory, dependencies, tasks, and schedule data from one existing mock cycle to another.
          </Typography>
          <TextField
            select
            fullWidth
            label="Copy From Mock Cycle"
            value={cloneCycleSourceId || ''}
            onChange={(e) => {
              const nextCycleId = e.target.value;
              setCloneCycleSourceId(nextCycleId || null);
              if (nextCycleId && cloneCycleTargetId === nextCycleId) {
                const nextTarget = maintainCycleRows.find((cycle: any) => cycle.id !== nextCycleId) || null;
                setCloneCycleTargetId(nextTarget?.id || null);
              }
            }}
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          >
            {maintainCycleRows.map((cycle: any) => (
              <MenuItem key={cycle.id} value={cycle.id}>
                {`${cycle.programName} / ${cycle.name}`}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="Copy To Mock Cycle"
            value={cloneCycleTargetId || ''}
            onChange={(e) => setCloneCycleTargetId(e.target.value || null)}
            variant="outlined"
            size="small"
          >
            {maintainCycleRows
              .filter((cycle: any) => cycle.id !== cloneCycleSourceId)
              .map((cycle: any) => (
                <MenuItem key={cycle.id} value={cycle.id}>
                  {`${cycle.programName} / ${cycle.name}`}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={() => {
              setCloneCycleDialogOpen(false);
              setCloneCycleSourceId(null);
              setCloneCycleTargetId(null);
            }}
            disabled={isCloningCycle}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCloneCycleConfirm}
            variant="contained"
            disabled={isCloningCycle || !cloneCycleSourceId || !cloneCycleTargetId || cloneCycleSourceId === cloneCycleTargetId}
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
                openTaskDetails(taskRowMenuTask, 0);
                closeTaskRowMenu();
              }}
            >
              <EditIcon fontSize="small" sx={{ mr: 1 }} /> Task Details
            </MenuItem>
            <MenuItem
              onClick={() => {
                openTaskDetails(taskRowMenuTask, (taskRowMenuTask.taskType === 'preload_validation' || taskRowMenuTask.taskType === 'postload_validation') ? 2 : 1);
                closeTaskRowMenu();
              }}
            >
              <WarningAmberIcon fontSize="small" sx={{ mr: 1 }} /> Add Defect
            </MenuItem>
            {(taskRowMenuTask.taskType === 'preload_validation' || taskRowMenuTask.taskType === 'postload_validation') && (
              <MenuItem
                onClick={() => {
                  openTaskDetails(taskRowMenuTask, 1);
                  closeTaskRowMenu();
                }}
              >
                <WarningAmberIcon fontSize="small" sx={{ mr: 1 }} /> {taskRowMenuTask.taskType === 'preload_validation' ? 'Preload Quality' : 'Postload Quality'}
              </MenuItem>
            )}
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
          setProcessAreaMenuContext(null);
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
            if (menuType !== 'program' || !menuItemId) return;
            setMenuAnchorEl(null);
            openAttachCycleDialog(menuItemId);
          }}
          sx={{
            display: menuType === 'program' && !!menuItemId && getOrderedCycles(menuItemId).length === 0
              ? 'flex'
              : 'none',
          }}
        >
          <AddIcon fontSize="small" sx={{ mr: 1 }} /> Add Mock Cycle
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuType !== 'cycle' || !menuItemId) return;
            const targetProjectId = getPrimaryProjectIdForCycle(menuItemId);
            if (!targetProjectId) {
              alert('No project found for this mock cycle.');
              return;
            }
            handleAddAdditionalGroup(targetProjectId);
            setMenuAnchorEl(null);
          }}
          sx={{ display: menuType === 'cycle' ? 'flex' : 'none' }}
        >
          <AddIcon fontSize="small" sx={{ mr: 1 }} /> Add Plan Group
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuType !== 'cycle' || !menuItemId) return;
            const targetProjectId = getPrimaryProjectIdForCycle(menuItemId);
            if (!targetProjectId) {
              alert('No project found for this mock cycle.');
              return;
            }
            setMenuAnchorEl(null);
            handleAddProcessArea(targetProjectId);
          }}
          sx={{ display: menuType === 'cycle' ? 'flex' : 'none' }}
        >
          <AddIcon fontSize="small" sx={{ mr: 1 }} /> Add Process Area
        </MenuItem>
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
            if (menuType !== 'processArea' || !processAreaMenuContext) return;
            setMenuAnchorEl(null);
            handleAddAdditionalGroup(processAreaMenuContext.projectId);
          }}
          sx={{ display: menuType === 'processArea' ? 'flex' : 'none' }}
        >
          <AddIcon fontSize="small" sx={{ mr: 1 }} /> Add Plan Group
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuType !== 'processArea' || !processAreaMenuContext) return;
            setMenuAnchorEl(null);
            handleAddProcessArea(processAreaMenuContext.projectId);
          }}
          sx={{ display: menuType === 'processArea' ? 'flex' : 'none' }}
        >
          <AddIcon fontSize="small" sx={{ mr: 1 }} /> Add Process Area
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuType !== 'processArea' || !processAreaMenuContext) return;
            const currentAccent = getProcessAreaAccent(processAreaMenuContext.projectId, processAreaMenuContext.area, '#64B5F6');
            const currentDescription = processAreaDescriptions[processAreaMenuContext.projectId]?.[processAreaMenuContext.area] || '';
            setEditingProcessAreaContext({ projectId: processAreaMenuContext.projectId, area: processAreaMenuContext.area });
            setEditingProcessAreaAccent(currentAccent);
            setEditingProcessAreaDescription(currentDescription);
            setEditingProcessAreaIconLevel(processAreaMenuContext.nodeType);
            setProcessAreaSettingsDialogOpen(true);
            setMenuAnchorEl(null);
            setProcessAreaMenuContext(null);
          }}
          sx={{ display: menuType === 'processArea' ? 'flex' : 'none' }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> {processAreaMenuContext?.nodeType === 'planGroup' ? 'Plan Group Settings' : 'Process Area Settings'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuType !== 'processArea' || !processAreaMenuContext) return;
            const isPlanGroup = processAreaMenuContext.nodeType === 'planGroup';
            if (isPlanGroup) {
              handleRemovePlanGroup(processAreaMenuContext.projectId, processAreaMenuContext.area);
            } else {
              handleHideProcessAreaFromTree(processAreaMenuContext.projectId, processAreaMenuContext.area);
            }
            setMenuAnchorEl(null);
            setProcessAreaMenuContext(null);
          }}
          sx={{ color: 'error.main', display: menuType === 'processArea' ? 'flex' : 'none' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> {processAreaMenuContext?.nodeType === 'planGroup' ? 'Remove Plan Group' : 'Remove Process Area'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!menuItemId || !menuType) return;
            if (menuType === 'processArea') return;
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
          sx={{ display: menuType === 'processArea' ? 'none' : 'flex' }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> {
            menuType === 'program'
              ? 'Program Settings'
              : menuType === 'cycle'
                ? 'Mock Cycle Settings'
                : menuType === 'project'
                  ? 'Project Settings'
                  : menuType === 'taskGroup'
                    ? 'Task Group Details / Defects'
                    : 'Task Details / Defects'
          }
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!menuItemId || !menuType) return;
            if (menuType === 'processArea') return;

            if (menuType === 'cycle') {
              let parentProgramId: string | null = null;
              for (const progId in mockCycles) {
                if ((mockCycles[progId] || []).some((c) => c.id === menuItemId)) {
                  parentProgramId = progId;
                  break;
                }
              }
              if (parentProgramId) {
                setTreeOrder((prev) => ({
                  ...prev,
                  cycles: {
                    ...prev.cycles,
                    [parentProgramId as string]: (prev.cycles[parentProgramId as string] || []).filter((id) => id !== menuItemId),
                  },
                }));
                setExpandedCycles((prev) => {
                  const next = new Set(prev);
                  next.delete(menuItemId);
                  return next;
                });
                if (selectedItem?.type === 'cycle' && selectedItem.id === menuItemId) {
                  setSelectedItem({ type: 'program', id: parentProgramId });
                }
              }
              setMenuAnchorEl(null);
              return;
            }
            
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
          sx={{ color: 'error.main', display: menuType === 'processArea' ? 'none' : 'flex' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> {menuType === 'cycle' ? 'Remove from Hierarchy' : 'Delete'}
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
                <>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    • The mock cycle, its project, and all descendants will be permanently deleted
                  </Typography>
                  <Typography variant="body2">
                    • This cannot be undone
                  </Typography>
                </>
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
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Program Icon</Typography>
                {renderIconPicker('program', editAccentColor || '#5B67CA')}
              </Box>
            </>
          )}

          {editItemType === 'cycle' && (
            <>
              <TextField
                select
                label="Parent Project"
                value={editCycleParentProjectId}
                onChange={(e) => setEditCycleParentProjectId(e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
              >
                {maintainCycleParentProjectOptions.map((project) => (
                  <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
                ))}
              </TextField>
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
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Mock Cycle Icon</Typography>
                {renderIconPicker('cycle', editAccentColor || '#64B5F6')}
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
                select
                label="Program"
                value={editProjectParentProgramId}
                onChange={(e) => setEditProjectParentProgramId(e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
              >
                {programs.map((program) => (
                  <MenuItem key={program.id} value={program.id}>{program.name}</MenuItem>
                ))}
              </TextField>
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
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Project Icon</Typography>
                {renderIconPicker('project', editAccentColor || '#90caf9')}
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
            disabled={isEditing || (editItemType === 'cycle' && !editCycleParentProjectId)}
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
          {(() => {
            const selectedProcessAreaRaw = (selectedItem?.type === 'processArea' ? selectedItem.area : '').trim().toLowerCase();
            const selectedProcessAreaDisplay = (
              selectedItem?.type === 'processArea' && selectedItem?.projectId
                ? getProcessAreaDisplayName(selectedItem.projectId, selectedItem.area)
                : ''
            ).trim().toLowerCase();
            const inventoryById = new Map(projectInventoryItems.map((item: any) => [item.id, item]));
            const assignedParentObjectIds = new Set(
              projectTasks
                .filter((task: any) => !!task.projectObjectId)
                .map((task: any) => task.projectObjectId)
                .filter((objectId: string) => {
                  const item = inventoryById.get(objectId);
                  return !!item && !item.parentProjectObjectId;
                })
            );
            const areaMatchesSelectedNode = (areaValue: string, projectIdValue: string) => {
              if (!selectedProcessAreaRaw && !selectedProcessAreaDisplay) return true;
              const areaRaw = (areaValue || '').trim().toLowerCase();
              const areaDisplay = getProcessAreaDisplayName(
                projectIdValue,
                areaValue || ''
              ).trim().toLowerCase();

              const canonical = (value: string) => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const acronym = (value: string) => {
                const tokens = (value || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
                if (tokens.length === 0) return '';
                return tokens.map((token) => token[0]).join('');
              };

              const selectedTokens = new Set<string>([
                selectedProcessAreaRaw,
                selectedProcessAreaDisplay,
                canonical(selectedProcessAreaRaw),
                canonical(selectedProcessAreaDisplay),
                acronym(selectedProcessAreaRaw),
                acronym(selectedProcessAreaDisplay),
              ].filter(Boolean));

              const itemTokens = [
                areaRaw,
                areaDisplay,
                canonical(areaRaw),
                canonical(areaDisplay),
                acronym(areaRaw),
                acronym(areaDisplay),
              ].filter(Boolean);

              if (itemTokens.some((token) => selectedTokens.has(token))) {
                return true;
              }

              const selectedCanonical = canonical(selectedProcessAreaRaw || selectedProcessAreaDisplay);
              const itemCanonical = canonical(areaRaw || areaDisplay);
              if (selectedCanonical && itemCanonical) {
                return itemCanonical.includes(selectedCanonical) || selectedCanonical.includes(itemCanonical);
              }

              return false;
            };
            const selectableObjects = projectInventoryItems
              .filter((item: any) => {
                const projectIdForItem = activeProjectId || item.projectId || '';
                if (areaMatchesSelectedNode(item.processArea || '', projectIdForItem)) {
                  return true;
                }

                // Some objects are effectively assigned to a node through sub-objects.
                const childItems = projectInventoryItems.filter((entry: any) => entry.parentProjectObjectId === item.id);
                return childItems.some((child: any) => areaMatchesSelectedNode(child.processArea || '', activeProjectId || child.projectId || projectIdForItem));
              })
              .filter((item: any) => {
                // Parent rows are assigned only when the parent itself has plan tasks.
                if (!item.parentProjectObjectId) {
                  return !assignedParentObjectIds.has(item.id);
                }

                // Child rows should only be treated as assigned when their parent is assigned.
                if (!assignedParentObjectIds.has(item.parentProjectObjectId)) {
                  return true;
                }

                return !projectTasks.some((task: any) => task.projectObjectId === item.id);
              })
              .sort((a: any, b: any) => (a.objectId || '').localeCompare(b.objectId || ''));

            return (
          <TextField
            select
            autoFocus
            fullWidth
            label="Select Object from Inventory"
            value={newDataObjectId}
            onChange={(e) => {
              const value = e.target.value;
              setNewDataObjectId(value);
            }}
            margin="normal"
            helperText={(selectedProcessAreaRaw || selectedProcessAreaDisplay)
              ? 'Only unassigned objects in this process area are available'
              : "Only unassigned objects in this project's inventory are available"}
            variant="outlined"
            size="small"
          >
            {selectableObjects.length > 0 ? (
              selectableObjects
                .map((item: any) => {
                  const subObjectCount = projectInventoryItems.filter((entry: any) => entry.parentProjectObjectId === item.id).length;
                  const parentObject = item.parentProjectObjectId ? inventoryById.get(item.parentProjectObjectId) : null;
                  return (
                    <MenuItem key={item.id} value={item.id}>
                      {item.objectId}
                      {parentObject ? ` (Sub-object of ${parentObject.objectId})` : ''}
                      {item.processArea && ` (${getProcessAreaDisplayName(activeProjectId || item.projectId || '', item.processArea)})`}
                      {subObjectCount > 0 ? ` + ${subObjectCount} sub-object${subObjectCount === 1 ? '' : 's'}` : ''}
                    </MenuItem>
                  );
                })
            ) : (
              <MenuItem disabled>
                {(selectedProcessAreaRaw || selectedProcessAreaDisplay) ? 'No unassigned objects in this process area' : 'No unassigned objects in project inventory'}
              </MenuItem>
            )}
          </TextField>
            );
          })()}
          <Box sx={{ mt: 2, p: 1.25, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35 }}>
              Process Area / Plan Group
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectedItem?.type === 'processArea' && selectedItem?.projectId
                ? getProcessAreaDisplayName(selectedItem.projectId, selectedItem.area)
                : 'Unassigned'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => {
            setDataObjectDialogOpen(false);
            setNewDataObjectId('');
            setNewDataObjectName('');
            setNewDataObjectProcessArea('');
          }}
          sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const targetProjectId = activeProjectId;
              if (!targetProjectId) {
                alert('Project ID not found');
                return;
              }

              const targetProcessArea = (selectedItem?.type === 'processArea' ? selectedItem.area : '').trim();

              try {
                setIsCreatingDataObject(true);
                
                // Find the project object for the selected inventory item
                const inventoryItem = projectInventoryItems.find(item => item.id === newDataObjectId);
                if (!inventoryItem) {
                  alert('Selected object not found');
                  return;
                }

                if ((inventoryItem.processArea || '') !== targetProcessArea) {
                  await handleProjectInventoryInlineChange(inventoryItem.id, 'processArea', targetProcessArea);
                }

                const childItems = projectInventoryItems
                  .filter((item: any) => item.parentProjectObjectId === inventoryItem.id)
                  .sort((a: any, b: any) => (a.subObjectSuffix || '').localeCompare(b.subObjectSuffix || ''));
                const objectIdsToAdd = [inventoryItem.id, ...childItems.map((item: any) => item.id)];

                const taskBatches = await Promise.all(
                  objectIdsToAdd.map(async (objectId) => {
                    const tasksResponse = await apiClient.post(`/api/tasks/defaults/project-object/${objectId}`, {
                      projectId: targetProjectId,
                    });
                    return (tasksResponse.data.data || []).map((t: any) => normalizeTaskDateFields(t));
                  })
                );
                const newTasks = taskBatches.flat();
                const updatedTasks = [...projectTasks, ...newTasks];
                setProjectTasks(updatedTasks);

                // If defaults endpoint returns no new tasks, reload project tasks to reflect existing assignments.
                if (newTasks.length === 0) {
                  const refreshed = await apiClient.get(`/api/tasks/project/${targetProjectId}`);
                  setProjectTasks((refreshed.data.data || []).map((t: any) => normalizeTaskDateFields(t)));
                }

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
                setNewDataObjectProcessArea('');
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

              // Group by project -> process area -> hierarchy node
              const projectMap: Record<string, {
                name: string;
                color: string;
                areas: Record<string, { nodes: Record<string, { label: string; type: 'object' | 'taskGroup' | 'other'; tasks: any[]; children: string[]; parentObjectId?: string | null }> }>;
              }> = {};
              cycleTasksForDep
                .filter(t => t.id !== depDialogTaskId && (!depSearchTerm
                  || (t.name || '').toLowerCase().includes(depSearchTerm)
                  || (t.objectLabel || '').toLowerCase().includes(depSearchTerm)
                  || (t.groupLabel || '').toLowerCase().includes(depSearchTerm)
                  || (t.processArea || '').toLowerCase().includes(depSearchTerm)))
                .forEach(t => {
                  const pid = t.projectId || activeProjectId || '';
                  if (!projectMap[pid]) {
                    projectMap[pid] = {
                      name: t.projectName || 'Project',
                      color: t.projectAccentColor || '#00BFA5',
                      areas: {},
                    };
                  }
                  const area = (t.processArea || 'Unassigned').trim() || 'Unassigned';
                  if (!projectMap[pid].areas[area]) {
                    projectMap[pid].areas[area] = { nodes: {} };
                  }
                  const areaNodes = projectMap[pid].areas[area].nodes;
                  if (t.objectLabel) {
                    const childKey = `obj-${t.projectObjectId}`;
                    const childLabel = t.objectLabel;
                    const childParentId = t.parentProjectObjectId || null;
                    if (!areaNodes[childKey]) {
                      areaNodes[childKey] = { label: childLabel, type: 'object', tasks: [], children: [], parentObjectId: childParentId };
                    }
                    areaNodes[childKey].tasks.push(t);

                    if (childParentId) {
                      const parentKey = `obj-${childParentId}`;
                      const parentLabel = t.parentObjectLabel || 'Parent Object';
                      if (!areaNodes[parentKey]) {
                        areaNodes[parentKey] = { label: parentLabel, type: 'object', tasks: [], children: [], parentObjectId: null };
                      }
                      if (!areaNodes[parentKey].children.includes(childKey)) areaNodes[parentKey].children.push(childKey);
                    }
                  } else if (t.groupLabel) {
                    const groupKey = `grp-${t.taskGroupId}`;
                    if (!areaNodes[groupKey]) {
                      areaNodes[groupKey] = { label: t.groupLabel || 'Task Group', type: 'taskGroup', tasks: [], children: [] };
                    }
                    areaNodes[groupKey].tasks.push(t);
                  } else {
                    const otherKey = 'ungrouped';
                    if (!areaNodes[otherKey]) {
                      areaNodes[otherKey] = { label: 'Other Tasks', type: 'other', tasks: [], children: [] };
                    }
                    areaNodes[otherKey].tasks.push(t);
                  }
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

                        {projExpanded && Object.entries(proj.areas)
                          .sort(([areaA], [areaB]) => areaA.localeCompare(areaB))
                          .map(([areaName, areaData]) => {
                          const areaKey = `${projKey}-area-${areaName}`;
                          const areaExpanded = depTreeExpanded[areaKey] === true;
                          const areaAccent = getProcessAreaAccent(pid, areaName, proj.color);
                          return (
                            <Box key={areaName} sx={{ ml: 2.5, mb: 0.25 }}>
                              {/* Process area row */}
                              <Box onClick={() => setDepTreeExpanded(prev => ({ ...prev, [areaKey]: !areaExpanded }))}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.4, px: 0.75, borderRadius: 1, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                <ChevronRightIcon sx={{ fontSize: '0.75rem', color: 'text.disabled', transform: areaExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                                {renderHierarchyIcon('processArea', areaAccent, '0.75rem')}
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.04em' }}>{getProcessAreaDisplayName(pid, areaName)}</Typography>
                              </Box>

                              {areaExpanded && Object.entries(areaData.nodes).filter(([, objData]) => !objData.parentObjectId).map(([oKey, objData]) => {
                                const objExpKey = `${areaKey}-${oKey}`;
                                const objExpanded = depTreeExpanded[objExpKey] === true;
                                return (
                                  <Box key={oKey} sx={{ ml: 2.5, mb: 0.25 }}>
                                    {/* Object/Group row */}
                                    <Box onClick={() => setDepTreeExpanded(prev => ({ ...prev, [objExpKey]: !objExpanded }))}
                                      sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.4, px: 0.75, borderRadius: 1, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                      <ChevronRightIcon sx={{ fontSize: '0.75rem', color: 'text.disabled', transform: objExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                                      {objData.type === 'taskGroup'
                                        ? renderHierarchyIcon('planGroup', areaAccent, '0.75rem')
                                        : <ViewListIcon sx={{ fontSize: '0.75rem', color: 'text.secondary' }} />
                                      }
                                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.72rem' }}>{objData.label}</Typography>
                                    </Box>

                                    {objExpanded && objData.children.length > 0 && objData.children.map((childKey: string) => {
                                      const childNode = areaData.nodes[childKey];
                                      if (!childNode) return null;
                                      const childExpKey = `${areaKey}-${childKey}`;
                                      const childExpanded = depTreeExpanded[childExpKey] === true;
                                      return (
                                        <Box key={childKey} sx={{ ml: 2.5, mt: 0.25 }}>
                                          <Box onClick={() => setDepTreeExpanded(prev => ({ ...prev, [childExpKey]: !childExpanded }))}
                                            sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.4, px: 0.75, borderRadius: 1, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                            <ChevronRightIcon sx={{ fontSize: '0.7rem', color: 'text.disabled', transform: childExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                                            <ViewListIcon sx={{ fontSize: '0.75rem', color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.72rem' }}>{childNode.label}</Typography>
                                          </Box>

                                          {childExpanded && childNode.tasks.map((t: any) => {
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

                                                  const freshDeps = await loadTaskDeps(taskId);
                                                  const affectedTask = projectTasks.find(pt => pt.id === taskId);

                                                  if (affectedTask?.duration && freshDeps.length > 0) {
                                                    let maxEndDate: string | null = null;
                                                    for (const dep of freshDeps) {
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

                                    {objExpanded && !objData.children.length && objData.tasks.map((t: any) => {
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
          <Box sx={{ mt: 2, p: 1.25, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35 }}>
              Process Area / Plan Group
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectedItem?.type === 'processArea' && selectedItem?.projectId
                ? getProcessAreaDisplayName(selectedItem.projectId, selectedItem.area)
                : 'Additional Grouping (Unassigned)'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => {
            setTaskGroupDialogOpen(false);
            setNewTaskGroupName('');
            setNewTaskGroupProcessArea('');
          }}
          sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!activeProjectId) {
                alert('Project ID not found');
                return;
              }

              try {
                setIsCreatingTaskGroup(true);
                const resolvedGrouping = (selectedItem?.type === 'processArea' ? selectedItem.area : '').trim();
                
                const response = await apiClient.post(`/api/tasks/groups/project/${activeProjectId}`, {
                  name: newTaskGroupName,
                  processArea: resolvedGrouping || null,
                });

                console.log('Task group created successfully:', response.data);
                const newGroup = response.data.data;
                setProjectTaskGroups([...projectTaskGroups, newGroup]);
                setTaskGroupDialogOpen(false);
                setNewTaskGroupName('');
                setNewTaskGroupProcessArea('');
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

      {/* Plan Group Dialog */}
      <Dialog open={planGroupDialogOpen} onClose={() => setPlanGroupDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', pb: 2 }}>
          Add Plan Group
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Plan Group Name"
            value={newPlanGroupName}
            onChange={(e) => setNewPlanGroupName(e.target.value)}
            margin="normal"
            placeholder="e.g., OTC Hypercare"
            variant="outlined"
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={() => {
              setPlanGroupDialogOpen(false);
              setPlanGroupTargetProjectId(null);
              setNewPlanGroupName('');
            }}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreatePlanGroup}
            variant="contained"
            disabled={!newPlanGroupName.trim()}
            sx={{ textTransform: 'none' }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Process Area Dialog */}
      <Dialog open={processAreaDialogOpen} onClose={() => setProcessAreaDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', pb: 2 }}>
          Add Process Area
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            select
            autoFocus
            fullWidth
            label="Process Area"
            value={newProcessAreaName}
            onChange={(e) => setNewProcessAreaName(e.target.value)}
            margin="normal"
            variant="outlined"
            size="small"
          >
            {(processAreaTargetProjectId ? getInventoryProcessAreaOptions(processAreaTargetProjectId) : []).map((areaName) => (
              <MenuItem key={areaName} value={areaName}>{areaName}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={() => {
              setProcessAreaDialogOpen(false);
              setProcessAreaTargetProjectId(null);
              setNewProcessAreaName('');
            }}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateProcessArea}
            variant="contained"
            disabled={!newProcessAreaName.trim()}
            sx={{ textTransform: 'none' }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Process Area Settings Dialog */}
      <Dialog open={processAreaSettingsDialogOpen} onClose={() => setProcessAreaSettingsDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', pb: 2 }}>
          {editingProcessAreaIconLevel === 'planGroup' ? 'Plan Group Settings' : 'Process Area Settings'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {editingProcessAreaContext?.area || 'Process Area'}
          </Typography>
          <TextField
            fullWidth
            label="Description"
            value={editingProcessAreaDescription}
            onChange={(e) => setEditingProcessAreaDescription(e.target.value)}
            margin="normal"
            size="small"
            placeholder="Displayed on the Projects page"
          />
          <TextField
            fullWidth
            type="color"
            label="Accent Color"
            value={editingProcessAreaAccent}
            onChange={(e) => setEditingProcessAreaAccent(e.target.value)}
            margin="normal"
            size="small"
          />
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {editingProcessAreaIconLevel === 'planGroup' ? 'Plan Group Icon' : 'Process Area Icon'}
            </Typography>
            {renderIconPicker(editingProcessAreaIconLevel, editingProcessAreaAccent || '#64B5F6')}
          </Box>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={() => {
              setProcessAreaSettingsDialogOpen(false);
              setEditingProcessAreaContext(null);
              setEditingProcessAreaDescription('');
            }}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!editingProcessAreaContext) return;
              const { projectId, area } = editingProcessAreaContext;
              const nextDescription = editingProcessAreaDescription.trim();
              setProcessAreaAccentOverrides((prev) => ({
                ...prev,
                [projectId]: {
                  ...(prev[projectId] || {}),
                  [area]: editingProcessAreaAccent,
                },
              }));
              setProcessAreaDescriptions((prev) => {
                const currentProject = { ...(prev[projectId] || {}) };
                if (nextDescription) {
                  currentProject[area] = nextDescription;
                } else {
                  delete currentProject[area];
                }
                return {
                  ...prev,
                  [projectId]: currentProject,
                };
              });
              setProcessAreaSettingsDialogOpen(false);
              setEditingProcessAreaContext(null);
              setEditingProcessAreaDescription('');
            }}
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            Save
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
                  await apiClient.patch(`/api/global-objects/${editingCatalogObjectId}`, {
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
        setProjectInventoryItem(getEmptyProjectInventoryItem());
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
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Checkbox
                checked={!!projectInventoryItem.isSubObject}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (checked && editingInventoryItemId) {
                    const editingItem = projectInventoryItems.find((entry: any) => entry.id === editingInventoryItemId);
                    if (editingItem) {
                      if (editingItem.parentProjectObjectId) {
                        alert('Sub-objects cannot contain nested sub-objects. Select a parent data object.');
                        return;
                      }
                      startSubObjectCreateFromParent(editingItem);
                      return;
                    }
                  }
                  const parentOptions = getParentInventoryObjects();
                  const nextParent = checked ? (projectInventoryItem.parentProjectObjectId || parentOptions[0]?.id || '') : '';
                  const parentItem = parentOptions.find((entry: any) => entry.id === nextParent) || null;
                  setProjectInventoryItem({
                    ...projectInventoryItem,
                    isSubObject: checked,
                    parentProjectObjectId: nextParent,
                    dataObjectId: checked ? (parentItem?.objectId || '') : projectInventoryItem.dataObjectId,
                    processArea: checked ? (parentItem?.processArea || projectInventoryItem.processArea) : projectInventoryItem.processArea,
                  });
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Create as sub-object
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 3 }}>
            {projectInventoryItem.isSubObject && (
              <TextField
                select
                fullWidth
                label="Parent Object"
                value={projectInventoryItem.parentProjectObjectId}
                onChange={(e) => {
                  const parentId = e.target.value;
                  const parent = getParentInventoryObjects().find((entry: any) => entry.id === parentId) || null;
                  setProjectInventoryItem({
                    ...projectInventoryItem,
                    parentProjectObjectId: parentId,
                    dataObjectId: parent?.objectId || '',
                    processArea: parent?.processArea || projectInventoryItem.processArea,
                  });
                }}
                disabled={editingInventoryItemId !== null}
                variant="outlined"
                size="small"
              >
                {getParentInventoryObjects().map((obj: any) => (
                  <MenuItem key={obj.id} value={obj.id}>
                    {obj.objectId}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              select
              fullWidth
              label={projectInventoryItem.isSubObject ? 'Parent Data Object ID' : 'Data Object ID'}
              value={projectInventoryItem.dataObjectId}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, dataObjectId: e.target.value })}
              disabled={editingInventoryItemId !== null || projectInventoryItem.isSubObject}
              variant="outlined"
              size="small"
            >
              {inventoryObjects.map((obj) => (
                <MenuItem key={obj.id} value={obj.objectId}>
                  {obj.objectId}
                </MenuItem>
              ))}
            </TextField>

            {projectInventoryItem.isSubObject && (
              <>
                <TextField
                  fullWidth
                  label="Sub-object ID Suffix"
                  value={projectInventoryItem.subObjectSuffix}
                  onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, subObjectSuffix: e.target.value })}
                  variant="outlined"
                  size="small"
                  placeholder="e.g., 01"
                  helperText="This suffix is appended to the parent object ID."
                />
                <TextField
                  fullWidth
                  label="Sub-object Description"
                  value={projectInventoryItem.subObjectDescription}
                  onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, subObjectDescription: e.target.value })}
                  variant="outlined"
                  size="small"
                  placeholder="Describe this sub-object"
                />
              </>
            )}

            <TextField
              select
              fullWidth
              label="Process Area"
              value={projectInventoryItem.processArea}
              onChange={(e) => setProjectInventoryItem({ ...projectInventoryItem, processArea: e.target.value })}
              disabled={projectInventoryItem.isSubObject}
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
              setProjectInventoryItem(getEmptyProjectInventoryItem());
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
                if (!projectInventoryItem.isSubObject && !globalObj) {
                  alert('Selected object not found');
                  return;
                }

                if (projectInventoryItem.isSubObject) {
                  if (!projectInventoryItem.parentProjectObjectId) {
                    alert('Parent object is required for sub-objects.');
                    return;
                  }
                  if (!projectInventoryItem.subObjectSuffix.trim()) {
                    alert('Sub-object ID suffix is required.');
                    return;
                  }
                  if (!projectInventoryItem.subObjectDescription.trim()) {
                    alert('Sub-object description is required.');
                    return;
                  }
                  const normalizedSuffix = projectInventoryItem.subObjectSuffix.trim().replace(/^[-\s]+/, '');
                  if (!normalizedSuffix) {
                    alert('Sub-object ID suffix is required.');
                    return;
                  }
                }

                const addingSubObject = !editingInventoryItemId && projectInventoryItem.isSubObject;
                const parentIdForAdditionalSubObjects = projectInventoryItem.parentProjectObjectId;

                if (editingInventoryItemId) {
                  // Update existing item
                  await apiClient.patch(`/api/project-objects/${editingInventoryItemId}`, {
                    subObjectSuffix: projectInventoryItem.subObjectSuffix || null,
                    subObjectDescription: projectInventoryItem.subObjectDescription || null,
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
                          dataObjectId: projectInventoryItem.dataObjectId,
                          objectId: projectInventoryItem.dataObjectId,
                          parentProjectObjectId: projectInventoryItem.parentProjectObjectId,
                          subObjectSuffix: projectInventoryItem.subObjectSuffix,
                          subObjectDescription: projectInventoryItem.subObjectDescription,
                          isSubObject: !!projectInventoryItem.parentProjectObjectId,
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
                    globalObjectId: projectInventoryItem.isSubObject ? undefined : globalObj.id,
                    parentProjectObjectId: projectInventoryItem.isSubObject ? projectInventoryItem.parentProjectObjectId : undefined,
                    subObjectSuffix: projectInventoryItem.isSubObject ? projectInventoryItem.subObjectSuffix.trim() : undefined,
                    subObjectDescription: projectInventoryItem.isSubObject ? projectInventoryItem.subObjectDescription.trim() : undefined,
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
                    parentProjectObjectId: apiData.parentProjectObjectId || '',
                    parentObjectId: apiData.parentObjectId || '',
                    subObjectSuffix: apiData.subObjectSuffix || '',
                    subObjectDescription: apiData.subObjectDescription || '',
                    isSubObject: !!apiData.parentProjectObjectId,
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

                if (addingSubObject && parentIdForAdditionalSubObjects) {
                  const parentItem = projectInventoryItems.find((entry: any) => entry.id === parentIdForAdditionalSubObjects);
                  setProjectInventoryItem({
                    ...getEmptyProjectInventoryItem(),
                    isSubObject: true,
                    parentProjectObjectId: parentIdForAdditionalSubObjects,
                    dataObjectId: parentItem?.objectId || parentItem?.dataObjectId || '',
                    processArea: parentItem?.processArea || '',
                  });
                } else {
                  setProjectInventoryDialogOpen(false);
                  setProjectInventoryItem(getEmptyProjectInventoryItem());
                }
              } catch (error) {
                console.error('Failed to save item:', error);
                const errorMessage = (error as any)?.response?.data?.message || 'Failed to save item. Please try again.';
                alert(errorMessage);
              } finally {
                setIsCreatingProjectInventoryItem(false);
              }
            }}
            variant="contained"
            disabled={
              isCreatingProjectInventoryItem ||
              !selectedProjectForInventory ||
              (projectInventoryItem.isSubObject
                ? !projectInventoryItem.parentProjectObjectId.trim() || !projectInventoryItem.subObjectSuffix.trim() || !projectInventoryItem.subObjectDescription.trim()
                : !projectInventoryItem.dataObjectId.trim())
            }
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
