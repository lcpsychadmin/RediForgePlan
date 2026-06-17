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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import Layout from '../components/Layout';
import apiClient from '../api/client';

interface Picklist {
  name: string;
  values: string[];
}

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

  const [selectedPicklist, setSelectedPicklist] = useState<string>('processArea');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newValueInput, setNewValueInput] = useState('');

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

  useEffect(() => {
    apiClient.get('/api/tasks/templates/defaults').then(res => {
      setTemplates(res.data.data || []);
    }).catch(() => {});
    apiClient.get('/api/people/roles').then(res => {
      setRoles(res.data.data || []);
    }).catch(() => {});
  }, []);

  const handleAddValue = () => {
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
    const updated = { ...picklists };
    updated[selectedPicklist].values = updated[selectedPicklist].values.filter((v) => v !== value);
    setPicklists(updated);
  };

  const handleSaveChanges = () => {
    // TODO: Implement API call to save picklist changes
    console.log('Saving picklists:', picklists);
    alert('Picklist changes saved (TODO: implement backend integration)');
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
          Settings
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, height: 'calc(100vh - 200px)' }}>
          {/* Left Sidebar - Picklist List */}
          <Card sx={{ width: '280px', flexShrink: 0 }}>
            <CardHeader title="Picklists" />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <List sx={{ p: 0 }}>
                {Object.entries(picklists).map(([key, picklist]) => (
                  <ListItem
                    key={key}
                    button
                    selected={selectedPicklist === key}
                    onClick={() => setSelectedPicklist(key)}
                    sx={{
                      backgroundColor: selectedPicklist === key ? 'primary.lighter' : 'transparent',
                      '&:hover': { backgroundColor: 'action.hover' },
                      borderLeft: selectedPicklist === key ? '4px solid' : 'none',
                      borderColor: 'primary.main',
                    }}
                  >
                    <ListItemText primary={picklist.name} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Right Panel - Edit Picklist */}
          <Card sx={{ flex: 1 }}>
            <CardHeader title={`Edit ${picklists[selectedPicklist]?.name || 'Picklist'}`} />
            <Divider />
            <CardContent>
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

              {picklists[selectedPicklist]?.values.length === 0 && (
                <Typography color="textSecondary" align="center">
                  No values in this picklist
                </Typography>
              )}

              {/* People Roles Section */}
              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
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

              {/* Default Task Templates Section */}
              <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
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

              {/* Save Button */}
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button variant="text">Reset</Button>
                <Button
                  variant="contained"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </Button>
              </Box>
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
    </Layout>
  );
};

export default SettingsPage;
