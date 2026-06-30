// client/src/pages/SettingsPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
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
  Switch,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faServer, faCloud, faCode, faGears, faDiagramProject, faListCheck, faFileLines, faCircleNodes, faNetworkWired, faTableCells, faChartGantt, faClipboardList, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/Layout';
import apiClient from '../api/client';

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

  useEffect(() => {
    apiClient.get('/api/tasks/templates/defaults').then(res => {
      setTemplates(res.data.data || []);
    }).catch(() => {});
    apiClient.get('/api/people/roles').then(res => {
      setRoles(res.data.data || []);
    }).catch(() => {});

    // Load process area settings (descriptions + global accent/icon defaults) from hierarchy preferences
    apiClient.get('/api/hierarchy-preferences/state').then(res => {
      const parsed = res.data?.data;
      if (!parsed) return;
      if (parsed.processAreaDescriptions && typeof parsed.processAreaDescriptions === 'object') {
        // Descriptions are stored keyed by area name at top level (not per-cycle) OR in legacy localStorage
        const flat: Record<string, string> = {};
        // Try to flatten descriptions from any key (could be stored under a projectId key)
        Object.values(parsed.processAreaDescriptions).forEach((v: any) => {
          if (v && typeof v === 'object') Object.assign(flat, v);
        });
        if (Object.keys(flat).length > 0) setProcessAreaDescriptions(flat);
      }
      if (parsed.globalProcessAreaAccents && typeof parsed.globalProcessAreaAccents === 'object') {
        setGlobalProcessAreaAccents(parsed.globalProcessAreaAccents);
      }
      if (parsed.globalProcessAreaIcons && typeof parsed.globalProcessAreaIcons === 'object') {
        setGlobalProcessAreaIcons(parsed.globalProcessAreaIcons as Record<string, HierarchyIconChoice>);
      }
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
    }
  };

  const handleSaveChanges = async () => {
    setSaveStatus('saving');
    try {
      // Read current hierarchy state to merge into (preserving all other fields like treeOrder, etc.)
      const existing = await apiClient.get('/api/hierarchy-preferences/state').then(r => r.data?.data || {}).catch(() => ({}));
      // Clear any stale per-cycle accent/icon overrides that the old settings dialog may have
      // written. Now that global settings are the source of truth, per-cycle overrides would
      // block the global defaults from taking effect.
      await apiClient.put('/api/hierarchy-preferences/state', {
        ...existing,
        globalProcessAreaAccents,
        globalProcessAreaIcons,
        processAreaAccentOverrides: {},
        processAreaIconOverrides: {},
      });
      localStorage.removeItem('rf-process-area-accent-overrides');
      localStorage.setItem(SETTINGS_PROCESS_AREA_DESCRIPTIONS_KEY, JSON.stringify(processAreaDescriptions));
      setSaveStatus('saved');
    } catch (e) {
      console.error('Failed to save settings', e);
      setSaveStatus('error');
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
          Settings
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 200px)', minHeight: 0 }}>
          {/* Left Sidebar - Picklist List */}
          <Card sx={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <CardHeader title="Settings Menu" />
            <Divider />
            <CardContent sx={{ p: 0, overflowY: 'auto' }}>
              <List sx={{ p: 0 }}>
                <Box sx={{ px: 2, pt: 1.25, pb: 0.5 }}>
                  <Typography variant="subtitle2" color="text.secondary">Picklists</Typography>
                </Box>
                {Object.entries(picklists).map(([key, picklist]) => (
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
                <Divider sx={{ my: 0.75 }} />
                <Box sx={{ px: 2, pt: 0.5, pb: 0.5 }}>
                  <Typography variant="subtitle2" color="text.secondary">Tasking</Typography>
                </Box>
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
              </List>
            </CardContent>
          </Card>

          {/* Right Panel - Edit Picklist */}
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <CardHeader title={
              isPicklistMode
                ? `Edit ${picklists[selectedPicklist]?.name || 'Picklist'}`
                : isPeopleRolesMode
                  ? 'People Roles'
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
                        Global defaults used in the hierarchy when no per-cycle override is set.
                      </Typography>
                      {/* Column headers */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '80px 1fr 44px 180px', gap: 1, alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>CODE</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>DESCRIPTION</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>COLOR</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>ICON</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {picklists.processArea.values.map((value) => {
                          const accent = globalProcessAreaAccents[value] || '#64B5F6';
                          const icon: HierarchyIconChoice = globalProcessAreaIcons[value] || 'accountTree';
                          return (
                            <Box key={`desc-${value}`} sx={{ display: 'grid', gridTemplateColumns: '80px 1fr 44px 180px', gap: 1, alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: accent }}>{value}</Typography>
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="Optional description"
                                value={processAreaDescriptions[value] || ''}
                                onChange={(e) => setProcessAreaDescriptions((prev) => ({ ...prev, [value]: e.target.value }))}
                              />
                              {/* Color swatch + picker */}
                              <Box sx={{ position: 'relative', width: 36, height: 36 }}>
                                <Box sx={{ width: 36, height: 36, borderRadius: 1, backgroundColor: accent, border: '2px solid rgba(255,255,255,0.15)', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <input
                                    type="color"
                                    value={accent}
                                    onChange={e => setGlobalProcessAreaAccents(prev => ({ ...prev, [value]: e.target.value }))}
                                    style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
                                  />
                                </Box>
                              </Box>
                              {/* Icon select with preview */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Box sx={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {renderIconPreview(icon, accent)}
                                </Box>
                                <TextField
                                  select
                                  size="small"
                                  fullWidth
                                  value={icon}
                                  onChange={e => setGlobalProcessAreaIcons(prev => ({ ...prev, [value]: e.target.value as HierarchyIconChoice }))}
                                  sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
                                >
                                  {ICON_OPTIONS.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                  ))}
                                </TextField>
                              </Box>
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

              {/* Save Button */}
              {isPicklistMode && (
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
    </Layout>
  );
};

export default SettingsPage;
