// client/src/pages/SettingsPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Divider,
  Paper,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import SyncIcon from '@mui/icons-material/Sync';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LayersIcon from '@mui/icons-material/Layers';
import EventIcon from '@mui/icons-material/Event';
import ViewListIcon from '@mui/icons-material/ViewList';
import StorageIcon from '@mui/icons-material/Storage';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BuildIcon from '@mui/icons-material/Build';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faServer, faCloud, faCode, faGears, faDiagramProject, faListCheck, faFileLines, faCircleNodes, faNetworkWired, faTableCells, faChartGantt, faClipboardList, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/Layout';
import DatabricksIcon from '../components/icons/DatabricksIcon';
import apiClient from '../api/client';
import DatabricksSettings from '../components/settings/DatabricksSettings';
import DbtSettings from '../components/settings/DbtSettings';
import { UNIFIED_ROLE_MODEL, type UnifiedRoleKey } from '../constants/unifiedRoleModel';
import {
  DEFAULT_DATABRICKS_SETTINGS,
  DEFAULT_DBT_SETTINGS,
  type DatabricksIntegrationSettings,
  type DbtIntegrationSettings,
  type SettingsProjectOption,
} from '../types/integrationSettings';
import {
  DEFAULT_DESIGN_BUILD_ESTIMATION_ROWS,
  DEFAULT_DESIGN_BUILD_ESTIMATION_TASKS,
  DESIGN_BUILD_TASK_ID_BY_NAME,
  type DesignBuildEstimationRow,
  type DesignBuildEstimationTaskOption,
  type DesignBuildTaskType,
} from '../constants/designBuildEstimationDefaults';

interface Picklist {
  name: string;
  values: string[];
}

const SETTINGS_PROCESS_AREA_DESCRIPTIONS_KEY = 'rf-settings-process-area-descriptions';

type HierarchyIconChoice =
  | 'corporateFare' | 'sync' | 'folderOutlined' | 'accountTree' | 'layers' | 'viewList' | 'event'
  | 'storage' | 'dashboard' | 'build' | 'assignment' | 'settings' | 'barChart'
  | 'fa-database' | 'fa-server' | 'fa-cloud' | 'fa-code' | 'fa-gears'
  | 'fa-diagram-project' | 'fa-list-check' | 'fa-file-lines' | 'fa-circle-nodes'
  | 'fa-network-wired' | 'fa-table-cells' | 'fa-chart-gantt' | 'fa-clipboard-list' | 'fa-triangle-exclamation';

const ICON_OPTIONS: { value: HierarchyIconChoice; label: string }[] = [
  { value: 'corporateFare', label: 'Building' }, { value: 'sync', label: 'Sync' },
  { value: 'folderOutlined', label: 'Folder' }, { value: 'accountTree', label: 'Hierarchy' },
  { value: 'layers', label: 'Layers' }, { value: 'viewList', label: 'List' },
  { value: 'event', label: 'Calendar' }, { value: 'storage', label: 'Storage' },
  { value: 'dashboard', label: 'Dashboard' }, { value: 'build', label: 'Build' },
  { value: 'assignment', label: 'Assignment' }, { value: 'settings', label: 'Settings' },
  { value: 'barChart', label: 'Bar Chart' },
  { value: 'fa-database', label: 'FA: Database' }, { value: 'fa-server', label: 'FA: Server' },
  { value: 'fa-cloud', label: 'FA: Cloud' }, { value: 'fa-code', label: 'FA: Code' },
  { value: 'fa-gears', label: 'FA: Gears' }, { value: 'fa-diagram-project', label: 'FA: Project Diagram' },
  { value: 'fa-list-check', label: 'FA: Checklist' }, { value: 'fa-file-lines', label: 'FA: File' },
  { value: 'fa-circle-nodes', label: 'FA: Nodes' }, { value: 'fa-network-wired', label: 'FA: Network' },
  { value: 'fa-table-cells', label: 'FA: Table' }, { value: 'fa-chart-gantt', label: 'FA: Gantt' },
  { value: 'fa-clipboard-list', label: 'FA: Clipboard' }, { value: 'fa-triangle-exclamation', label: 'FA: Warning' },
];

const renderIconPreview = (choice: HierarchyIconChoice, color: string) => {
  const faMap: Record<string, any> = {
    'fa-database': faDatabase, 'fa-server': faServer, 'fa-cloud': faCloud, 'fa-code': faCode,
    'fa-gears': faGears, 'fa-diagram-project': faDiagramProject, 'fa-list-check': faListCheck,
    'fa-file-lines': faFileLines, 'fa-circle-nodes': faCircleNodes, 'fa-network-wired': faNetworkWired,
    'fa-table-cells': faTableCells, 'fa-chart-gantt': faChartGantt, 'fa-clipboard-list': faClipboardList,
    'fa-triangle-exclamation': faTriangleExclamation,
  };
  if (faMap[choice]) return (
    <span style={{ fontSize: '1rem', color, display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>
      <FontAwesomeIcon icon={faMap[choice]} />
    </span>
  );
  const sx = { fontSize: '1rem', color };
  switch (choice) {
    case 'sync': return <SyncIcon sx={sx} />;
    case 'folderOutlined': return <FolderOutlinedIcon sx={sx} />;
    case 'accountTree': return <AccountTreeIcon sx={sx} />;
    case 'layers': return <LayersIcon sx={sx} />;
    case 'viewList': return <ViewListIcon sx={sx} />;
    case 'event': return <EventIcon sx={sx} />;
    case 'storage': return <StorageIcon sx={sx} />;
    case 'dashboard': return <DashboardIcon sx={sx} />;
    case 'build': return <BuildIcon sx={sx} />;
    case 'assignment': return <AssignmentIcon sx={sx} />;
    case 'settings': return <SettingsIcon sx={sx} />;
    case 'barChart': return <BarChartIcon sx={sx} />;
    default: return <CorporateFareIcon sx={sx} />;
  }
};

const normalizeDesignBuildTaskType = (value: unknown): DesignBuildTaskType => {
  return String(value || '').toLowerCase() === 'design' ? 'Design' : 'Build';
};

const normalizeTaskOptions = (rawTasks: any): DesignBuildEstimationTaskOption[] => {
  if (!Array.isArray(rawTasks)) return DEFAULT_DESIGN_BUILD_ESTIMATION_TASKS;
  const mapped = rawTasks.map((task: any, index: number) => ({
    id: String(task?.id || '').trim() || `task-${Date.now()}-${index}`,
    label: String(task?.label || task?.taskName || '').trim(),
    taskType: normalizeDesignBuildTaskType(task?.taskType),
  })).filter((task) => task.label.length > 0);
  return mapped.length > 0 ? mapped : DEFAULT_DESIGN_BUILD_ESTIMATION_TASKS;
};

const normalizeEstimationRows = (rawRows: any, taskOptions: DesignBuildEstimationTaskOption[]): DesignBuildEstimationRow[] => {
  if (!Array.isArray(rawRows)) return DEFAULT_DESIGN_BUILD_ESTIMATION_ROWS;
  const taskIds = new Set(taskOptions.map((task) => task.id));
  const mapped = rawRows.map((row: any, index: number) => {
    const legacyTaskName = String(row?.taskName || '').trim();
    const inferredTaskId = DESIGN_BUILD_TASK_ID_BY_NAME[legacyTaskName.toLowerCase()] || '';
    const rawTaskId = String(row?.taskId || '').trim();
    const resolvedTaskId = taskIds.has(rawTaskId)
      ? rawTaskId
      : taskIds.has(inferredTaskId)
        ? inferredTaskId
        : taskOptions[0]?.id || '';
    const resolvedTaskName = taskOptions.find((task) => task.id === resolvedTaskId)?.label || legacyTaskName || '';
    return {
      id: row?.id || `${Date.now()}-${index}`,
      buildType: String(row?.buildType || ''),
      factorType: String(row?.factorType || ''),
      complexity: String(row?.complexity || ''),
      taskId: resolvedTaskId,
      taskName: resolvedTaskName,
      hours: Number(row?.hours) || 0,
    };
  });
  return mapped.length > 0 ? mapped : DEFAULT_DESIGN_BUILD_ESTIMATION_ROWS;
};

const SettingsPage: React.FC = () => {
  // Picklists state
  const [picklists, setPicklists] = useState<Record<string, Picklist>>({
    processArea: {
      name: 'Process Area',
      values: ['A2R', 'CTRM', 'GTS', 'H2R', 'I2L', 'MDM', 'P2C', 'P2D', 'PSS', 'R2R', 'S2P', 'TM'],
    },
    complexity: {
      name: 'Complexity',
      values: ['1-Complex', '2-Medium', '3-Simple'],
    },
    deploymentDisposition: {
      name: 'Deployment Disposition',
      values: ['In Scope', 'Out of Scope', 'Pending Approval', 'Pending Confirmation'],
    },
    buildType: {
      name: 'Build Type',
      values: ['New', 'Modify'],
    },
    objectType: {
      name: 'Object Type',
      values: ['Master Data', 'Transactional', 'Document'],
    },
    cutoverPhase: {
      name: 'Cutover Phase',
      values: ['Pre-Cutover', 'Blackout', 'Post Go-Live'],
    },
    ddmApproach: {
      name: 'DDM Approach',
      values: ['Not in Scope', 'Automated', 'Manual'],
    },
    riskSecurityType: {
      name: 'Risk/Security Type',
      values: ['Standard', 'Risk & Control', 'Data Masking'],
    },
    migrationType: {
      name: 'Migration Type',
      values: ['Automated', 'Manual'],
    },
    factorType: {
      name: 'Factor Type',
      values: [
        'Conversion - Extract, Transform & Load',
        'Conversion - Construct & Load',
        'Conversion - Construct, Transform & Manual Load',
        'Conversion - Construct, Transform & Load',
        'Conversion - Extract, Transform & Manual Load',
        'Manual',
      ],
    },
    loadMethod: {
      name: 'Load Method',
      values: ['LTMC', 'IDOC', 'BAPI', 'LSMW', 'BODS - IDOC', 'BODS - BAPI', 'Custom ABAP Program', 'Informatica', 'Migration Cockpit', 'SAP Standard T Code', 'Manual'],
    },
  });

  const [selectedMenuItem, setSelectedMenuItem] = useState<string>('picklist:processArea');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newValueInput, setNewValueInput] = useState('');
  const [processAreaDescriptions, setProcessAreaDescriptions] = useState<Record<string, string>>({});
  const [globalProcessAreaAccents, setGlobalProcessAreaAccents] = useState<Record<string, string>>({});
  const [globalProcessAreaIcons, setGlobalProcessAreaIcons] = useState<Record<string, HierarchyIconChoice>>({});
  const [globalProcessAreaRoleAssignments, setGlobalProcessAreaRoleAssignments] = useState<Record<string, Partial<Record<UnifiedRoleKey, string>>>>({});
  const [peopleDirectory, setPeopleDirectory] = useState<any[]>([]);
  const [processAreaModalOpen, setProcessAreaModalOpen] = useState(false);
  const [editingProcessArea, setEditingProcessArea] = useState<string | null>(null);
  const [isSavingProcessAreaModal, setIsSavingProcessAreaModal] = useState(false);

  // Default task templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDuration, setNewTemplateDuration] = useState('8');
  const [newTemplateUnit, setNewTemplateUnit] = useState('hours');

  // People roles
  const [roles, setRoles] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [designBuildEstimationTasks, setDesignBuildEstimationTasks] = useState<DesignBuildEstimationTaskOption[]>(DEFAULT_DESIGN_BUILD_ESTIMATION_TASKS);
  const [designBuildEstimationRows, setDesignBuildEstimationRows] = useState<DesignBuildEstimationRow[]>(DEFAULT_DESIGN_BUILD_ESTIMATION_ROWS);

  // Applications state
  const [applications, setApplications] = useState<any[]>([]);
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [addAppOpen, setAddAppOpen] = useState(false);
  const [newApp, setNewApp] = useState({ name: '', description: '', vendor: '', version: '' });
  const [settingsProjects, setSettingsProjects] = useState<SettingsProjectOption[]>([]);
  const [databricksSettings, setDatabricksSettings] = useState<DatabricksIntegrationSettings>(DEFAULT_DATABRICKS_SETTINGS);
  const [databricksProjectOverrides, setDatabricksProjectOverrides] = useState<Record<string, Partial<DatabricksIntegrationSettings>>>({});
  const [selectedDatabricksProjectOverride, setSelectedDatabricksProjectOverride] = useState('');
  const [databricksCatalogs, setDatabricksCatalogs] = useState<string[]>([]);
  const [databricksSchemas, setDatabricksSchemas] = useState<string[]>([]);
  const [isTestingDatabricksConnection, setIsTestingDatabricksConnection] = useState(false);

  const [dbtSettings, setDbtSettings] = useState<DbtIntegrationSettings>(DEFAULT_DBT_SETTINGS);
  const [dbtProjectOverrides, setDbtProjectOverrides] = useState<Record<string, Partial<DbtIntegrationSettings>>>({});
  const [selectedDbtProjectOverride, setSelectedDbtProjectOverride] = useState('');
  const [dbtModels, setDbtModels] = useState<string[]>([]);
  const [isValidatingDbtPaths, setIsValidatingDbtPaths] = useState(false);

  const [menuGroupsExpanded, setMenuGroupsExpanded] = useState<Record<string, boolean>>({
    planning: false,
    reference: false,
    platform: false,
  });
  const [integrationStatus, setIntegrationStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    apiClient.get('/api/tasks/templates/defaults').then(res => {
      setTemplates(res.data.data || []);
    }).catch(() => {});
    apiClient.get('/api/people/roles').then(res => {
      setRoles(res.data.data || []);
    }).catch(() => {});

    apiClient.get('/api/people').then(res => {
      setPeopleDirectory(res.data.data || []);
    }).catch(() => {});

    apiClient.get('/api/applications').then(res => {
      setApplications(res.data.data || []);
    }).catch(() => {});

    apiClient.get('/api/settings/databricks').then((res) => {
      const payload = res.data?.data || {};
      setDatabricksSettings({ ...DEFAULT_DATABRICKS_SETTINGS, ...(payload.globalDefaults || {}) });
      setDatabricksProjectOverrides(payload.projectOverrides || {});
    }).catch(() => {});

    apiClient.get('/api/settings/dbt').then((res) => {
      const payload = res.data?.data || {};
      setDbtSettings({ ...DEFAULT_DBT_SETTINGS, ...(payload.globalDefaults || {}) });
      setDbtProjectOverrides(payload.projectOverrides || {});
    }).catch(() => {});

    apiClient.get('/api/programs').then(async (programRes) => {
      const programs = programRes.data?.data || [];
      const projectOptions: SettingsProjectOption[] = [];
      await Promise.all(programs.map(async (program: any) => {
        try {
          const projectsRes = await apiClient.get(`/api/projects/by-program/${program.id}`);
          (projectsRes.data?.data || []).forEach((project: any) => {
            projectOptions.push({ id: project.id, name: project.name, programName: program.name });
          });
        } catch {
          // no-op
        }
      }));
      projectOptions.sort((a, b) => `${a.programName || ''}${a.name}`.localeCompare(`${b.programName || ''}${b.name}`));
      setSettingsProjects(projectOptions);
    }).catch(() => {});

    // Load process area settings (descriptions + global accent/icon defaults) from hierarchy preferences
    apiClient.get('/api/hierarchy-preferences/state').then(res => {
      const parsed = res.data?.data;
      if (!parsed) return;
      let legacyFlatDescriptions: Record<string, string> = {};
      if (parsed.processAreaDescriptions && typeof parsed.processAreaDescriptions === 'object') {
        // Descriptions are stored keyed by area name at top level (not per-cycle) OR in legacy localStorage
        const flat: Record<string, string> = {};
        // Try to flatten descriptions from any key (could be stored under a projectId key)
        Object.values(parsed.processAreaDescriptions).forEach((v: any) => {
          if (v && typeof v === 'object') Object.assign(flat, v);
        });
        legacyFlatDescriptions = flat;
        if (Object.keys(flat).length > 0) setProcessAreaDescriptions(flat);
      }
      if (parsed.globalProcessAreaAccents && typeof parsed.globalProcessAreaAccents === 'object') {
        setGlobalProcessAreaAccents(parsed.globalProcessAreaAccents);
      }
      if (parsed.globalProcessAreaIcons && typeof parsed.globalProcessAreaIcons === 'object') {
        setGlobalProcessAreaIcons(parsed.globalProcessAreaIcons as Record<string, HierarchyIconChoice>);
      }
      if (parsed.globalProcessAreaDescriptions && typeof parsed.globalProcessAreaDescriptions === 'object') {
        setProcessAreaDescriptions(parsed.globalProcessAreaDescriptions);
      } else if (Object.keys(legacyFlatDescriptions).length > 0) {
        // Self-heal: backfill global descriptions so values persist across sessions/devices.
        apiClient.put('/api/hierarchy-preferences/global-process-areas', {
          globalProcessAreaDescriptions: legacyFlatDescriptions,
        }).catch(() => {});
      }
      if (parsed.globalProcessAreaRoleAssignments && typeof parsed.globalProcessAreaRoleAssignments === 'object') {
        setGlobalProcessAreaRoleAssignments(parsed.globalProcessAreaRoleAssignments as Record<string, Partial<Record<UnifiedRoleKey, string>>>);
      }
      // Restore saved picklist values, merging over the hardcoded defaults
      if (parsed.picklistValues && typeof parsed.picklistValues === 'object') {
        setPicklists(prev => {
          const merged = { ...prev };
          for (const [key, savedValues] of Object.entries(parsed.picklistValues as Record<string, string[]>)) {
            if (merged[key] && Array.isArray(savedValues) && savedValues.length > 0) {
              merged[key] = { ...merged[key], values: savedValues };
            }
          }
          return merged;
        });
      }
      const resolvedTaskOptions = normalizeTaskOptions(parsed.designBuildEstimationTasks);
      setDesignBuildEstimationTasks(resolvedTaskOptions);
      setDesignBuildEstimationRows(normalizeEstimationRows(parsed.designBuildEstimationRows, resolvedTaskOptions));
    }).catch(() => {
      // fall back to localStorage
      try {
        const raw = localStorage.getItem(SETTINGS_PROCESS_AREA_DESCRIPTIONS_KEY);
        if (raw) { const p = JSON.parse(raw); if (p) setProcessAreaDescriptions(p); }
      } catch { /* no-op */ }
    });
  }, []);

  const selectedPicklist = selectedMenuItem.startsWith('picklist:')
    ? selectedMenuItem.replace('picklist:', '')
    : null;
  const isPicklistMode = !!selectedPicklist;
  const isPeopleRolesMode = selectedMenuItem === 'peopleRoles';
  const isTaskTemplatesMode = selectedMenuItem === 'taskTemplates';
  const isDesignBuildTasksMode = selectedMenuItem === 'designBuildTasks';
  const isDesignBuildEstimationMode = selectedMenuItem === 'designBuildEstimation';
  const isApplicationsMode = selectedMenuItem === 'applications';
  const isDatabricksMode = selectedMenuItem === 'databricksIntegration';
  const isDbtMode = selectedMenuItem === 'dbtIntegration';

  const handleAddValue = () => {
    if (!selectedPicklist) return;
    if (newValueInput.trim()) {
      const updated = { ...picklists };
      if (!updated[selectedPicklist].values.includes(newValueInput.trim())) {
        updated[selectedPicklist].values.push(newValueInput.trim());
        setPicklists(updated);
      }
      setNewValueInput('');
    }
  };

  const handleRemoveValue = (value: string) => {
    if (!selectedPicklist) return;
    const updated = { ...picklists };
    updated[selectedPicklist].values = updated[selectedPicklist].values.filter((v) => v !== value);
    setPicklists(updated);
    if (selectedPicklist === 'processArea') {
      setProcessAreaDescriptions((prev) => {
        const next = { ...prev };
        delete next[value];
        return next;
      });
      setGlobalProcessAreaAccents((prev) => {
        const next = { ...prev };
        delete next[value];
        return next;
      });
      setGlobalProcessAreaIcons((prev) => {
        const next = { ...prev };
        delete next[value];
        return next;
      });
      setGlobalProcessAreaRoleAssignments((prev) => {
        const next = { ...prev };
        delete next[value];
        return next;
      });
    }
  };

  const openProcessAreaModal = (processArea: string) => {
    setEditingProcessArea(processArea);
    setProcessAreaModalOpen(true);
  };

  const closeProcessAreaModal = () => {
    setProcessAreaModalOpen(false);
    setEditingProcessArea(null);
  };

  const updateEditingProcessAreaRole = (roleKey: UnifiedRoleKey, userId: string) => {
    if (!editingProcessArea) return;
    setGlobalProcessAreaRoleAssignments((prev) => {
      const next = { ...prev };
      const roleMap = { ...(next[editingProcessArea] || {}) };
      if (userId) {
        roleMap[roleKey] = userId;
      } else {
        delete roleMap[roleKey];
      }
      next[editingProcessArea] = roleMap;
      return next;
    });
  };

  const saveProcessAreaModal = async () => {
    setIsSavingProcessAreaModal(true);
    setSaveStatus('saving');
    try {
      await apiClient.put('/api/hierarchy-preferences/global-process-areas', {
        globalProcessAreaAccents,
        globalProcessAreaIcons,
        globalProcessAreaDescriptions: processAreaDescriptions,
        globalProcessAreaRoleAssignments,
        picklistValues: Object.fromEntries(
          Object.entries(picklists).map(([key, pl]) => [key, pl.values])
        ),
      });
      localStorage.setItem(SETTINGS_PROCESS_AREA_DESCRIPTIONS_KEY, JSON.stringify(processAreaDescriptions));
      setSaveStatus('saved');
      closeProcessAreaModal();
    } catch (e) {
      console.error('Failed to save process area settings', e);
      setSaveStatus('error');
    } finally {
      setIsSavingProcessAreaModal(false);
    }
  };

  const handleSaveChanges = async () => {
    setSaveStatus('saving');
    try {
      // Use the dedicated merge endpoint so these settings are never overwritten
      // by the ProjectsPage hierarchy-state save (which initialises them to {}).
      await apiClient.put('/api/hierarchy-preferences/global-process-areas', {
        globalProcessAreaAccents,
        globalProcessAreaIcons,
        globalProcessAreaDescriptions: processAreaDescriptions,
        globalProcessAreaRoleAssignments,
        // Persist all picklist values so custom entries survive sessions
        picklistValues: Object.fromEntries(
          Object.entries(picklists).map(([key, pl]) => [key, pl.values])
        ),
        designBuildEstimationTasks: designBuildEstimationTasks.map((task) => ({
          id: task.id,
          label: task.label.trim(),
          taskType: task.taskType,
        })).filter((task) => task.label.length > 0),
        designBuildEstimationRows: designBuildEstimationRows.map((row) => ({
          id: row.id,
          buildType: row.buildType,
          factorType: row.factorType,
          complexity: row.complexity,
          taskId: row.taskId,
          taskName: (designBuildEstimationTasks.find((task) => task.id === row.taskId)?.label || row.taskName || '').trim(),
          hours: Number(row.hours) || 0,
        })),
      });
      localStorage.setItem(SETTINGS_PROCESS_AREA_DESCRIPTIONS_KEY, JSON.stringify(processAreaDescriptions));
      setSaveStatus('saved');
    } catch (e) {
      console.error('Failed to save settings', e);
      setSaveStatus('error');
    }
  };

  const updateDatabricksOverride = (projectId: string, patch: Partial<DatabricksIntegrationSettings>) => {
    setDatabricksProjectOverrides((prev) => ({
      ...prev,
      [projectId]: {
        ...(prev[projectId] || {}),
        ...patch,
      },
    }));
  };

  const updateDbtOverride = (projectId: string, patch: Partial<DbtIntegrationSettings>) => {
    setDbtProjectOverrides((prev) => ({
      ...prev,
      [projectId]: {
        ...(prev[projectId] || {}),
        ...patch,
      },
    }));
  };

  const handleSaveDatabricks = async () => {
    setSaveStatus('saving');
    try {
      await apiClient.put('/api/settings/databricks', {
        globalDefaults: databricksSettings,
        projectOverrides: databricksProjectOverrides,
      });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  const handleSaveDbt = async () => {
    setSaveStatus('saving');
    try {
      await apiClient.put('/api/settings/dbt', {
        globalDefaults: dbtSettings,
        projectOverrides: dbtProjectOverrides,
      });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  const handleTestDatabricksConnection = async () => {
    setIsTestingDatabricksConnection(true);
    try {
      const effective = {
        ...databricksSettings,
        ...(selectedDatabricksProjectOverride ? databricksProjectOverrides[selectedDatabricksProjectOverride] || {} : {}),
      };
      await apiClient.post('/api/settings/databricks/test-connection', { settings: effective });
      setIntegrationStatus({ type: 'success', message: 'Databricks connection successful.' });
    } catch (error: any) {
      setIntegrationStatus({ type: 'error', message: error?.response?.data?.message || 'Databricks connection failed.' });
    } finally {
      setIsTestingDatabricksConnection(false);
    }
  };

  const handleFetchDatabricksCatalogs = async () => {
    try {
      const effective = {
        ...databricksSettings,
        ...(selectedDatabricksProjectOverride ? databricksProjectOverrides[selectedDatabricksProjectOverride] || {} : {}),
      };
      const response = await apiClient.get('/api/settings/databricks/catalogs', {
        params: {
          serverHostname: effective.serverHostname,
          httpPath: effective.httpPath,
          workspaceUrl: effective.workspaceUrl,
          token: effective.personalAccessToken,
        },
      });
      setDatabricksCatalogs(response.data?.data?.catalogs || []);
    } catch {
      setDatabricksCatalogs([]);
    }
  };

  const handleFetchDatabricksSchemas = async () => {
    try {
      const effective = {
        ...databricksSettings,
        ...(selectedDatabricksProjectOverride ? databricksProjectOverrides[selectedDatabricksProjectOverride] || {} : {}),
      };
      const response = await apiClient.get('/api/settings/databricks/schemas', {
        params: {
          serverHostname: effective.serverHostname,
          httpPath: effective.httpPath,
          workspaceUrl: effective.workspaceUrl,
          token: effective.personalAccessToken,
          catalog: effective.defaultCatalog,
        },
      });
      setDatabricksSchemas(response.data?.data?.schemas || []);
    } catch {
      setDatabricksSchemas([]);
    }
  };

  const handleValidateDbtPaths = async () => {
    setIsValidatingDbtPaths(true);
    try {
      const effective = {
        ...dbtSettings,
        ...(selectedDbtProjectOverride ? dbtProjectOverrides[selectedDbtProjectOverride] || {} : {}),
      };
      const response = await apiClient.post('/api/settings/dbt/validate-paths', { settings: effective });
      if (response.data?.data?.valid) {
        setIntegrationStatus({ type: 'success', message: 'dbt paths validated successfully.' });
      } else {
        const firstError = response.data?.data?.errors?.[0] || 'dbt paths are invalid.';
        setIntegrationStatus({ type: 'error', message: firstError });
      }
    } catch (error: any) {
      setIntegrationStatus({ type: 'error', message: error?.response?.data?.message || 'Failed to validate dbt paths.' });
    } finally {
      setIsValidatingDbtPaths(false);
    }
  };

  const handleFetchDbtModels = async () => {
    try {
      const effective = {
        ...dbtSettings,
        ...(selectedDbtProjectOverride ? dbtProjectOverrides[selectedDbtProjectOverride] || {} : {}),
      };
      const response = await apiClient.get('/api/settings/dbt/models', {
        params: {
          dbtProjectRootPath: effective.dbtProjectRootPath,
        },
      });
      setDbtModels(response.data?.data?.models || []);
    } catch {
      setDbtModels([]);
    }
  };

  const toggleMenuGroup = (groupKey: 'planning' | 'reference' | 'platform') => {
    setMenuGroupsExpanded((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
          Settings
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 200px)', minHeight: 0 }}>
          {/* Left Sidebar - Picklist List */}
          <Card sx={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
            <CardHeader title="Settings" subheader="Organized by domain" />
            <Divider />
            <CardContent sx={{ p: 0, overflowY: 'auto' }}>
              <Box sx={{ p: 1 }}>
                <Accordion expanded={menuGroupsExpanded.planning} onChange={() => toggleMenuGroup('planning')} disableGutters sx={{ backgroundColor: 'transparent', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1, mb: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}> 
                    <Typography variant="subtitle2" color="text.secondary">Planning Defaults</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <List sx={{ p: 0 }}>
                      {Object.entries(picklists)
                        .filter(([key]) => key !== 'processArea')
                        .map(([key, picklist]) => (
                        <ListItem
                          key={key}
                          button
                          selected={selectedMenuItem === `picklist:${key}`}
                          onClick={() => setSelectedMenuItem(`picklist:${key}`)}
                          sx={{
                            backgroundColor: selectedMenuItem === `picklist:${key}` ? 'primary.lighter' : 'transparent',
                            '&:hover': { backgroundColor: 'action.hover' },
                            borderLeft: selectedMenuItem === `picklist:${key}` ? '4px solid' : 'none',
                            borderColor: 'primary.main',
                          }}
                        >
                          <ListItemText primary={picklist.name} />
                        </ListItem>
                      ))}

                      <ListItem
                        button
                        selected={selectedMenuItem === 'picklist:processArea'}
                        onClick={() => setSelectedMenuItem('picklist:processArea')}
                        sx={{
                          backgroundColor: selectedMenuItem === 'picklist:processArea' ? 'primary.lighter' : 'transparent',
                          '&:hover': { backgroundColor: 'action.hover' },
                          borderLeft: selectedMenuItem === 'picklist:processArea' ? '4px solid' : 'none',
                          borderColor: 'primary.main',
                        }}
                      >
                        <ListItemText primary="Process Areas" />
                      </ListItem>

                      <ListItem
                        button
                        selected={isPeopleRolesMode}
                        onClick={() => setSelectedMenuItem('peopleRoles')}
                        sx={{
                          backgroundColor: isPeopleRolesMode ? 'primary.lighter' : 'transparent',
                          '&:hover': { backgroundColor: 'action.hover' },
                          borderLeft: isPeopleRolesMode ? '4px solid' : 'none',
                          borderColor: 'primary.main',
                        }}
                      >
                        <ListItemText primary="People Roles" />
                      </ListItem>

                      <ListItem
                        button
                        selected={isTaskTemplatesMode}
                        onClick={() => setSelectedMenuItem('taskTemplates')}
                        sx={{
                          backgroundColor: isTaskTemplatesMode ? 'primary.lighter' : 'transparent',
                          '&:hover': { backgroundColor: 'action.hover' },
                          borderLeft: isTaskTemplatesMode ? '4px solid' : 'none',
                          borderColor: 'primary.main',
                        }}
                      >
                        <ListItemText primary="Default Task Templates" />
                      </ListItem>

                      <ListItem
                        button
                        selected={isDesignBuildTasksMode}
                        onClick={() => setSelectedMenuItem('designBuildTasks')}
                        sx={{
                          backgroundColor: isDesignBuildTasksMode ? 'primary.lighter' : 'transparent',
                          '&:hover': { backgroundColor: 'action.hover' },
                          borderLeft: isDesignBuildTasksMode ? '4px solid' : 'none',
                          borderColor: 'primary.main',
                        }}
                      >
                        <ListItemText primary="Design and Build Standard Tasks" />
                      </ListItem>

                      <ListItem
                        button
                        selected={isDesignBuildEstimationMode}
                        onClick={() => setSelectedMenuItem('designBuildEstimation')}
                        sx={{
                          backgroundColor: isDesignBuildEstimationMode ? 'primary.lighter' : 'transparent',
                          '&:hover': { backgroundColor: 'action.hover' },
                          borderLeft: isDesignBuildEstimationMode ? '4px solid' : 'none',
                          borderColor: 'primary.main',
                        }}
                      >
                        <ListItemText primary="Design and Build Estimation" />
                      </ListItem>
                    </List>
                  </AccordionDetails>
                </Accordion>

                <Accordion expanded={menuGroupsExpanded.reference} onChange={() => toggleMenuGroup('reference')} disableGutters sx={{ backgroundColor: 'transparent', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1, mb: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" color="text.secondary">Reference Data</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <List sx={{ p: 0 }}>
                      <ListItem
                        button
                        selected={isApplicationsMode}
                        onClick={() => setSelectedMenuItem('applications')}
                        sx={{
                          backgroundColor: isApplicationsMode ? 'primary.lighter' : 'transparent',
                          '&:hover': { backgroundColor: 'action.hover' },
                          borderLeft: isApplicationsMode ? '4px solid' : 'none',
                          borderColor: 'primary.main',
                        }}
                      >
                        <ListItemText primary="Applications" />
                      </ListItem>
                    </List>
                  </AccordionDetails>
                </Accordion>

                <Accordion expanded={menuGroupsExpanded.platform} onChange={() => toggleMenuGroup('platform')} disableGutters sx={{ backgroundColor: 'transparent', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" color="text.secondary">Common Data Platform</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <List sx={{ p: 0 }}>
                      <ListItem
                        button
                        selected={isDatabricksMode}
                        onClick={() => setSelectedMenuItem('databricksIntegration')}
                        sx={{
                          backgroundColor: isDatabricksMode ? 'primary.lighter' : 'transparent',
                          '&:hover': { backgroundColor: 'action.hover' },
                          borderLeft: isDatabricksMode ? '4px solid' : 'none',
                          borderColor: 'primary.main',
                          gap: 1,
                        }}
                      >
                        <DatabricksIcon sx={{ fontSize: '1rem' }} />
                        <ListItemText primary="Databricks Integration" />
                      </ListItem>

                      <ListItem
                        button
                        selected={isDbtMode}
                        onClick={() => setSelectedMenuItem('dbtIntegration')}
                        sx={{
                          backgroundColor: isDbtMode ? 'primary.lighter' : 'transparent',
                          '&:hover': { backgroundColor: 'action.hover' },
                          borderLeft: isDbtMode ? '4px solid' : 'none',
                          borderColor: 'primary.main',
                          gap: 1,
                        }}
                      >
                        <ChangeHistoryIcon sx={{ fontSize: '1rem', color: '#FF8A65' }} />
                        <ListItemText primary="dbt Integration" />
                      </ListItem>
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </CardContent>
          </Card>

          {/* Right Panel - Edit Picklist */}
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
            <CardHeader title={
              isPicklistMode
                ? `${picklists[selectedPicklist]?.name || 'Picklist'} Settings`
                : isPeopleRolesMode
                  ? 'People Roles'
                  : isDesignBuildTasksMode
                    ? 'Design and Build Standard Tasks'
                  : isDesignBuildEstimationMode
                    ? 'Design and Build Estimation'
                  : isDatabricksMode
                    ? 'Databricks Integration'
                  : isDbtMode
                    ? 'dbt Integration'
                  : isApplicationsMode
                    ? 'Applications'
                    : 'Default Task Templates'
            } />
            <Divider />
            <CardContent sx={{ overflowY: 'auto' }}>
              {isPicklistMode && (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Values
                  </Typography>

                  {/* Add New Value */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Enter new value"
                      value={newValueInput}
                      onChange={(e) => setNewValueInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddValue();
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
                      startIcon={<AddIcon />}
                      onClick={handleAddValue}
                    >
                      Add
                    </Button>
                  </Box>

                  {/* Values List */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
                    {picklists[selectedPicklist]?.values.map((value) => (
                      <Chip
                        key={value}
                        label={value}
                        onDelete={() => handleRemoveValue(value)}
                        deleteIcon={<DeleteIcon />}
                        variant="outlined"
                        sx={{
                          backgroundColor: 'background.paper',
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Box>

                  {selectedPicklist === 'processArea' && (
                    <Box sx={{ mt: 1, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Descriptions, Colors &amp; Icons</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Global defaults and role assignments used in the hierarchy and approval workflow when no project override is set.
                      </Typography>
                      {/* Column headers */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '80px 1fr 44px 130px 130px 90px', gap: 1, alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>CODE</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>DESCRIPTION</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>COLOR</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>ICON</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>GLOBAL ROLES</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>ACTION</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {picklists.processArea.values.map((value) => {
                          const accent = globalProcessAreaAccents[value] || '#64B5F6';
                          const icon: HierarchyIconChoice = globalProcessAreaIcons[value] || 'accountTree';
                          const assignedRoles = Object.keys(globalProcessAreaRoleAssignments[value] || {}).length;
                          return (
                            <Box key={`desc-${value}`} sx={{ display: 'grid', gridTemplateColumns: '80px 1fr 44px 130px 130px 90px', gap: 1, alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: accent }}>{value}</Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {processAreaDescriptions[value]?.trim() || 'No description'}
                              </Typography>
                              {/* Color swatch + picker */}
                              <Box sx={{ width: 36, height: 36, borderRadius: 1, backgroundColor: accent, border: '2px solid rgba(255,255,255,0.15)' }}>
                              </Box>
                              {/* Icon preview */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Box sx={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {renderIconPreview(icon, accent)}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>
                                  {ICON_OPTIONS.find(opt => opt.value === icon)?.label || 'Hierarchy'}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {assignedRoles}/7 assigned
                              </Typography>
                              <Button size="small" variant="outlined" startIcon={<EditIcon sx={{ fontSize: '0.95rem' }} />} onClick={() => openProcessAreaModal(value)} sx={{ textTransform: 'none' }}>
                                Edit
                              </Button>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  {picklists[selectedPicklist]?.values.length === 0 && (
                    <Typography color="textSecondary" align="center">
                      No values in this picklist
                    </Typography>
                  )}
                </>
              )}

              {/* People Roles Section */}
              {isPeopleRolesMode && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>People Roles</Typography>
                    <Typography variant="body2" color="text.secondary">Roles available when assigning people to tasks.</Typography>
                  </Box>
                  <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setAddRoleOpen(true)} sx={{ textTransform: 'none' }}>Add Role</Button>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {roles.map(role => (
                    <Box key={role.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.75, px: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{role.name}</Typography>
                      <IconButton size="small" onClick={async () => {
                        await apiClient.delete(`/api/people/roles/${role.id}`);
                        setRoles(prev => prev.filter(r => r.id !== role.id));
                      }}>
                        <DeleteIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
                {addRoleOpen && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
                    <TextField size="small" placeholder="Role name" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} autoFocus sx={{ flex: 1 }} />
                    <Button size="small" variant="contained" sx={{ textTransform: 'none' }} disabled={!newRoleName.trim()} onClick={async () => {
                      const res = await apiClient.post('/api/people/roles', { name: newRoleName.trim() });
                      setRoles(prev => [...prev, res.data.data]);
                      setNewRoleName('');
                      setAddRoleOpen(false);
                    }}>Add</Button>
                    <Button size="small" sx={{ textTransform: 'none' }} onClick={() => { setAddRoleOpen(false); setNewRoleName(''); }}>Cancel</Button>
                  </Box>
                )}
              </Box>
              )}

              {/* Default Task Templates Section */}
              {isTaskTemplatesMode && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Default Task Templates</Typography>
                    <Typography variant="body2" color="text.secondary">These tasks are automatically created when a data object is added to a plan.</Typography>
                  </Box>
                  <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setAddTemplateOpen(true)} sx={{ textTransform: 'none' }}>Add Task</Button>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {templates.map(tpl => (
                    <Box key={tpl.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.75, px: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: '1rem' }} />
                      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{tpl.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{tpl.duration} {tpl.durationUnit}</Typography>
                      <Switch size="small" checked={tpl.isActive} onChange={async (e) => {
                        await apiClient.patch(`/api/tasks/templates/defaults/${tpl.id}`, { isActive: e.target.checked });
                        setTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, isActive: e.target.checked } : t));
                      }} />
                      <IconButton size="small" onClick={async () => {
                        await apiClient.delete(`/api/tasks/templates/defaults/${tpl.id}`);
                        setTemplates(prev => prev.filter(t => t.id !== tpl.id));
                      }}>
                        <DeleteIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>
              )}

              {/* Design/Build Estimation Section */}
              {isDesignBuildTasksMode && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Maintain the standardized task catalog used by Design/Build Estimation. Each task has a description and a task type.
                </Typography>

                <Paper sx={{ p: 1.25, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Standardized Tasks</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const nextId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                        setDesignBuildEstimationTasks((prev) => [...prev, { id: nextId, label: '', taskType: 'Build' }]);
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Add Task
                    </Button>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 150px 36px', gap: 1, alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>TASK DESCRIPTION</Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>TYPE</Typography>
                    <span />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {designBuildEstimationTasks.map((task) => (
                      <Box key={task.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 150px 36px', gap: 1, alignItems: 'center' }}>
                        <TextField
                          size="small"
                          value={task.label}
                          placeholder="Task description"
                          onChange={(e) => {
                            const nextLabel = e.target.value;
                            setDesignBuildEstimationTasks((prev) => prev.map((entry) => entry.id === task.id ? { ...entry, label: nextLabel } : entry));
                            setDesignBuildEstimationRows((prev) => prev.map((row) => row.taskId === task.id ? { ...row, taskName: nextLabel } : row));
                          }}
                        />
                        <TextField
                          select
                          size="small"
                          value={task.taskType}
                          onChange={(e) => setDesignBuildEstimationTasks((prev) => prev.map((entry) => entry.id === task.id ? { ...entry, taskType: normalizeDesignBuildTaskType(e.target.value) } : entry))}
                        >
                          <MenuItem value="Build">Build</MenuItem>
                          <MenuItem value="Design">Design</MenuItem>
                        </TextField>
                        <IconButton
                          size="small"
                          disabled={designBuildEstimationTasks.length <= 1}
                          onClick={() => {
                            const remaining = designBuildEstimationTasks.filter((entry) => entry.id !== task.id);
                            if (remaining.length === 0) return;
                            const fallbackTaskId = remaining[0].id;
                            const fallbackTaskName = remaining[0].label;
                            setDesignBuildEstimationTasks(remaining);
                            setDesignBuildEstimationRows((prev) => prev.map((row) => row.taskId === task.id ? { ...row, taskId: fallbackTaskId, taskName: fallbackTaskName } : row));
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Box>
              )}

              {/* Design/Build Estimation Section */}
              {isDesignBuildEstimationMode && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Design/Build Estimation Matrix</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Global effort matrix used in Planning Design and Build Estimation. Rows are matched by Build Type, Factor Type, and Complexity.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Maintain task descriptions/types in the separate "Design/Build Standardized Tasks" page.
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const defaultBuildType = picklists.buildType.values[0] || '';
                      const defaultFactorType = picklists.factorType.values[0] || '';
                      const defaultComplexity = picklists.complexity.values[0] || '';
                      const defaultTaskId = designBuildEstimationTasks[0]?.id || '';
                      setDesignBuildEstimationRows((prev) => ([
                        ...prev,
                        {
                          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                          buildType: defaultBuildType,
                          factorType: defaultFactorType,
                          complexity: defaultComplexity,
                          taskId: defaultTaskId,
                          taskName: designBuildEstimationTasks.find((task) => task.id === defaultTaskId)?.label || '',
                          hours: 0,
                        },
                      ]));
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Add Row
                  </Button>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '170px 1fr 150px 180px 80px 36px', gap: 1, alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>BUILD TYPE</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>FACTOR TYPE</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>COMPLEXITY</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>TASK</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>HOURS</Typography>
                  <span />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {designBuildEstimationRows.map((row) => (
                    <Box key={row.id} sx={{ display: 'grid', gridTemplateColumns: '170px 1fr 150px 180px 80px 36px', gap: 1, alignItems: 'center' }}>
                      <TextField
                        select
                        size="small"
                        value={row.buildType}
                        onChange={(e) => setDesignBuildEstimationRows((prev) => prev.map((r) => r.id === row.id ? { ...r, buildType: e.target.value } : r))}
                      >
                        {picklists.buildType.values.map((option) => (
                          <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        size="small"
                        value={row.factorType}
                        onChange={(e) => setDesignBuildEstimationRows((prev) => prev.map((r) => r.id === row.id ? { ...r, factorType: e.target.value } : r))}
                      >
                        {picklists.factorType.values.map((option) => (
                          <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        size="small"
                        value={row.complexity}
                        onChange={(e) => setDesignBuildEstimationRows((prev) => prev.map((r) => r.id === row.id ? { ...r, complexity: e.target.value } : r))}
                      >
                        {picklists.complexity.values.map((option) => (
                          <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        size="small"
                        value={row.taskId}
                        onChange={(e) => {
                          const nextTaskId = e.target.value;
                          const selectedTask = designBuildEstimationTasks.find((task) => task.id === nextTaskId);
                          setDesignBuildEstimationRows((prev) => prev.map((r) => r.id === row.id ? { ...r, taskId: nextTaskId, taskName: selectedTask?.label || r.taskName } : r));
                        }}
                      >
                        {designBuildEstimationTasks.map((task) => (
                          <MenuItem key={task.id} value={task.id}>
                            {task.label || '(Unnamed Task)'} {task.taskType ? `(${task.taskType})` : ''}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        size="small"
                        type="number"
                        value={row.hours}
                        onChange={(e) => setDesignBuildEstimationRows((prev) => prev.map((r) => r.id === row.id ? { ...r, hours: Math.max(0, Number(e.target.value) || 0) } : r))}
                        inputProps={{ min: 0, step: 0.25 }}
                      />
                      <IconButton size="small" onClick={() => setDesignBuildEstimationRows((prev) => prev.filter((r) => r.id !== row.id))}>
                        <DeleteIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>

                {designBuildEstimationRows.length === 0 && (
                  <Alert severity="info" sx={{ mt: 1.5 }}>
                    No estimation rows yet. Add rows to define hours by Build Type, Factor Type, Complexity, and Task.
                  </Alert>
                )}
              </Box>
              )}

              {isDatabricksMode && (
                <Box>
                  <DatabricksSettings
                    globalDefaults={databricksSettings}
                    projectOverrides={databricksProjectOverrides}
                    selectedProjectId={selectedDatabricksProjectOverride}
                    projects={settingsProjects}
                    catalogs={databricksCatalogs}
                    schemas={databricksSchemas}
                    isTestingConnection={isTestingDatabricksConnection}
                    onGlobalChange={(patch) => setDatabricksSettings((prev) => ({ ...prev, ...patch }))}
                    onOverrideChange={updateDatabricksOverride}
                    onSelectProject={setSelectedDatabricksProjectOverride}
                    onTestConnection={handleTestDatabricksConnection}
                    onRefreshCatalogs={handleFetchDatabricksCatalogs}
                    onRefreshSchemas={handleFetchDatabricksSchemas}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button variant="contained" onClick={handleSaveDatabricks} sx={{ textTransform: 'none' }} disabled={saveStatus === 'saving'}>
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Databricks Settings'}
                    </Button>
                  </Box>
                </Box>
              )}

              {isDbtMode && (
                <Box>
                  <DbtSettings
                    globalDefaults={dbtSettings}
                    projectOverrides={dbtProjectOverrides}
                    selectedProjectId={selectedDbtProjectOverride}
                    projects={settingsProjects}
                    modelNames={dbtModels}
                    isValidatingPaths={isValidatingDbtPaths}
                    onGlobalChange={(patch) => setDbtSettings((prev) => ({ ...prev, ...patch }))}
                    onOverrideChange={updateDbtOverride}
                    onSelectProject={setSelectedDbtProjectOverride}
                    onValidatePaths={handleValidateDbtPaths}
                    onRefreshModels={handleFetchDbtModels}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button variant="contained" onClick={handleSaveDbt} sx={{ textTransform: 'none' }} disabled={saveStatus === 'saving'}>
                      {saveStatus === 'saving' ? 'Saving...' : 'Save dbt Settings'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Save Button */}
              {(isPicklistMode || isDesignBuildTasksMode || isDesignBuildEstimationMode) && (
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Button
                    variant="contained"
                    disabled={saveStatus === 'saving'}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                    onClick={handleSaveChanges}
                  >
                    {saveStatus === 'saving' ? 'Saving…' : 'Save Changes'}
                  </Button>
                </Box>
              )}

              {/* Applications Section */}
              {isApplicationsMode && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Applications</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Define the source/target applications that objects can be linked to for data definition management.
                    </Typography>
                  </Box>
                  <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setNewApp({ name: '', description: '', vendor: '', version: '' }); setAddAppOpen(true); }} sx={{ textTransform: 'none', flexShrink: 0 }}>Add Application</Button>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {applications.length === 0 && <Typography variant="body2" color="text.secondary">No applications yet. Add one to get started.</Typography>}
                  {applications.map(app => (
                    <Box key={app.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, px: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{app.name}</Typography>
                        {(app.vendor || app.version) && (
                          <Typography variant="caption" color="text.secondary">{[app.vendor, app.version].filter(Boolean).join(' · ')}</Typography>
                        )}
                        {app.description && <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>{app.description}</Typography>}
                      </Box>
                      {editingApp?.id === app.id ? (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 2 }}>
                          <TextField size="small" label="Name" value={editingApp.name} onChange={e => setEditingApp((p: any) => ({ ...p, name: e.target.value }))} sx={{ flex: 1 }} />
                          <TextField size="small" label="Vendor" value={editingApp.vendor || ''} onChange={e => setEditingApp((p: any) => ({ ...p, vendor: e.target.value }))} sx={{ flex: 1 }} />
                          <TextField size="small" label="Version" value={editingApp.version || ''} onChange={e => setEditingApp((p: any) => ({ ...p, version: e.target.value }))} sx={{ flex: 1 }} />
                          <Button size="small" variant="contained" sx={{ textTransform: 'none', flexShrink: 0 }} onClick={async () => {
                            const res = await apiClient.put(`/api/applications/${editingApp.id}`, editingApp);
                            setApplications(prev => prev.map(a => a.id === editingApp.id ? res.data.data : a));
                            setEditingApp(null);
                          }}>Save</Button>
                          <Button size="small" sx={{ textTransform: 'none' }} onClick={() => setEditingApp(null)}>Cancel</Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                          <Button size="small" sx={{ textTransform: 'none', minWidth: 0 }} onClick={() => setEditingApp({ ...app })}>Edit</Button>
                          <IconButton size="small" onClick={async () => {
                            await apiClient.delete(`/api/applications/${app.id}`);
                            setApplications(prev => prev.filter(a => a.id !== app.id));
                          }}><DeleteIcon sx={{ fontSize: '1rem' }} /></IconButton>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
                {addAppOpen && (
                  <Box sx={{ mt: 2, p: 1.5, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>New Application</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                      <TextField size="small" label="Name *" value={newApp.name} onChange={e => setNewApp(p => ({ ...p, name: e.target.value }))} autoFocus />
                      <TextField size="small" label="Vendor" value={newApp.vendor} onChange={e => setNewApp(p => ({ ...p, vendor: e.target.value }))} />
                      <TextField size="small" label="Version" value={newApp.version} onChange={e => setNewApp(p => ({ ...p, version: e.target.value }))} />
                      <TextField size="small" label="Description" value={newApp.description} onChange={e => setNewApp(p => ({ ...p, description: e.target.value }))} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="contained" sx={{ textTransform: 'none' }} disabled={!newApp.name.trim()} onClick={async () => {
                        const res = await apiClient.post('/api/applications', newApp);
                        setApplications(prev => [...prev, res.data.data]);
                        setAddAppOpen(false);
                        setNewApp({ name: '', description: '', vendor: '', version: '' });
                      }}>Add</Button>
                      <Button size="small" sx={{ textTransform: 'none' }} onClick={() => setAddAppOpen(false)}>Cancel</Button>
                    </Box>
                  </Box>
                )}
              </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Add Template Dialog */}
      <Dialog open={addTemplateOpen} onClose={() => setAddTemplateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Default Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Task Name" fullWidth size="small" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} autoFocus />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="Duration" size="small" type="number" value={newTemplateDuration} onChange={e => setNewTemplateDuration(e.target.value)} sx={{ flex: 1 }} />
            <TextField select label="Unit" size="small" value={newTemplateUnit} onChange={e => setNewTemplateUnit(e.target.value)} sx={{ flex: 1 }}>
              <MenuItem value="hours">Hours</MenuItem>
              <MenuItem value="days">Days</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddTemplateOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" sx={{ textTransform: 'none' }} onClick={async () => {
            const res = await apiClient.post('/api/tasks/templates/defaults', { name: newTemplateName, duration: parseFloat(newTemplateDuration), durationUnit: newTemplateUnit, sortOrder: templates.length + 1 });
            const refreshed = await apiClient.get('/api/tasks/templates/defaults');
            setTemplates(refreshed.data.data || []);
            setNewTemplateName(''); setNewTemplateDuration('8'); setNewTemplateUnit('hours');
            setAddTemplateOpen(false);
          }} disabled={!newTemplateName.trim()}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={processAreaModalOpen} onClose={closeProcessAreaModal} maxWidth="md" fullWidth>
        <DialogTitle>{editingProcessArea ? `Edit ${editingProcessArea}` : 'Edit Process Area'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {editingProcessArea && (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 220px', gap: 1.25, alignItems: 'center' }}>
                <TextField
                  label="Description"
                  size="small"
                  fullWidth
                  placeholder="Optional description"
                  value={processAreaDescriptions[editingProcessArea] || ''}
                  onChange={(e) => setProcessAreaDescriptions((prev) => ({ ...prev, [editingProcessArea]: e.target.value }))}
                />
                <Box sx={{ position: 'relative', width: 104, height: 40 }}>
                  <Box sx={{ width: 104, height: 40, borderRadius: 1, backgroundColor: globalProcessAreaAccents[editingProcessArea] || '#64B5F6', border: '2px solid rgba(255,255,255,0.15)', cursor: 'pointer', overflow: 'hidden' }}>
                    <input
                      type="color"
                      value={globalProcessAreaAccents[editingProcessArea] || '#64B5F6'}
                      onChange={e => setGlobalProcessAreaAccents(prev => ({ ...prev, [editingProcessArea]: e.target.value }))}
                      style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {renderIconPreview(globalProcessAreaIcons[editingProcessArea] || 'accountTree', globalProcessAreaAccents[editingProcessArea] || '#64B5F6')}
                  </Box>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    label="Icon"
                    value={globalProcessAreaIcons[editingProcessArea] || 'accountTree'}
                    onChange={e => setGlobalProcessAreaIcons(prev => ({ ...prev, [editingProcessArea]: e.target.value as HierarchyIconChoice }))}
                    sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
                  >
                    {ICON_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Global Roles</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                  These assignments are the global defaults for this process area and are used for global workflows.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {UNIFIED_ROLE_MODEL.map((role) => (
                    <Box key={`${editingProcessArea}-${role.key}`} sx={{ display: 'grid', gridTemplateColumns: '170px 1fr 260px', gap: 1, alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{role.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{role.definition}</Typography>
                      <TextField
                        select
                        size="small"
                        value={globalProcessAreaRoleAssignments[editingProcessArea]?.[role.key] || ''}
                        onChange={(e) => updateEditingProcessAreaRole(role.key, e.target.value)}
                      >
                        <MenuItem value="">Unassigned</MenuItem>
                        {peopleDirectory.map((person) => (
                          <MenuItem key={`assign-${editingProcessArea}-${role.key}-${person.id}`} value={person.id}>
                            {person.name && person.email ? `${person.name} (${person.email})` : person.name || person.email || person.id}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  ))}
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeProcessAreaModal} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={saveProcessAreaModal} variant="contained" disabled={isSavingProcessAreaModal} sx={{ textTransform: 'none' }}>
            {isSavingProcessAreaModal ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={saveStatus === 'saved' || saveStatus === 'error'}
        autoHideDuration={3000}
        onClose={() => setSaveStatus('idle')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={saveStatus === 'saved' ? 'success' : 'error'} onClose={() => setSaveStatus('idle')}>
          {saveStatus === 'saved' ? 'Settings saved successfully.' : 'Failed to save settings. Please try again.'}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!integrationStatus}
        autoHideDuration={4000}
        onClose={() => setIntegrationStatus(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={integrationStatus?.type || 'info'} onClose={() => setIntegrationStatus(null)}>
          {integrationStatus?.message || ''}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default SettingsPage;
