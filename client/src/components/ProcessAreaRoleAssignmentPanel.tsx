import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import apiClient from '../api/client';
import { UNIFIED_ROLE_MODEL, type UnifiedRoleKey } from '../constants/unifiedRoleModel';

type AssignmentMap = Record<string, Partial<Record<UnifiedRoleKey, string>>>;

type ResolvedAssignmentMap = Record<
  string,
  Record<
    UnifiedRoleKey,
    {
      userId: string | null;
      source: 'project' | 'global' | 'unassigned';
      projectUserId: string | null;
      globalUserId: string | null;
    }
  >
>;

interface ProcessAreaRoleAssignmentPanelProps {
  processAreaOptions: string[];
  people: Array<{ id: string; name?: string; email?: string }>;
  projects: Array<{ id: string; name: string; programId?: string }>;
  programs: Array<{ id: string; name: string }>;
  openAddProcessAreaTrigger?: number;
}

const getPersonLabel = (person: { name?: string; email?: string }) => {
  if (person.name && person.email) return `${person.name} (${person.email})`;
  return person.name || person.email || 'Unknown user';
};

const sourceChipColor = (source: 'project' | 'global' | 'unassigned') => {
  if (source === 'project') return 'success';
  if (source === 'global') return 'info';
  return 'default';
};

const sourceChipLabel = (source: 'project' | 'global' | 'unassigned') => {
  if (source === 'project') return 'Project';
  if (source === 'global') return 'Global';
  return 'Unassigned';
};

const cloneAssignments = (input: AssignmentMap) => JSON.parse(JSON.stringify(input || {})) as AssignmentMap;

const ProcessAreaRoleAssignmentPanel: React.FC<ProcessAreaRoleAssignmentPanelProps> = ({
  processAreaOptions,
  people,
  projects,
  programs,
  openAddProcessAreaTrigger = 0,
}) => {
  const [globalAssignments, setGlobalAssignments] = React.useState<AssignmentMap>({});

  const [selectedProjectId, setSelectedProjectId] = React.useState('');
  const [isLoadingProject, setIsLoadingProject] = React.useState(false);
  const [isSavingProject, setIsSavingProject] = React.useState(false);
  const [projectProcessAreas, setProjectProcessAreas] = React.useState<string[]>([]);
  const [manualProcessAreas, setManualProcessAreas] = React.useState<string[]>([]);
  const [projectAssignments, setProjectAssignments] = React.useState<AssignmentMap>({});
  const [resolvedAssignments, setResolvedAssignments] = React.useState<ResolvedAssignmentMap>({});
  const [expandedProcessAreas, setExpandedProcessAreas] = React.useState<Set<string>>(new Set());
  const [addProcessAreaDialogOpen, setAddProcessAreaDialogOpen] = React.useState(false);
  const [newProcessAreaName, setNewProcessAreaName] = React.useState('');

  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  const peopleById = React.useMemo(() => {
    const map: Record<string, { id: string; name?: string; email?: string }> = {};
    people.forEach((person) => {
      if (person.id) map[person.id] = person;
    });
    return map;
  }, [people]);

  const programById = React.useMemo(() => {
    const map: Record<string, string> = {};
    programs.forEach((program) => {
      map[program.id] = program.name;
    });
    return map;
  }, [programs]);

  const loadProjectAssignments = React.useCallback(async (projectId: string) => {
    if (!projectId) {
      setProjectProcessAreas([]);
      setProjectAssignments({});
      setResolvedAssignments({});
      return;
    }

    setIsLoadingProject(true);
    try {
      const response = await apiClient.get(`/api/hierarchy-preferences/project-role-assignments/${projectId}`);
      const payload = response.data?.data || {};
      setProjectProcessAreas(payload.processAreas || []);
      setManualProcessAreas(payload.manualProcessAreas || []);
      setProjectAssignments(payload.projectAssignments || {});
      setResolvedAssignments(payload.resolvedAssignments || {});
      setGlobalAssignments(payload.globalAssignments || {});
    } finally {
      setIsLoadingProject(false);
    }
  }, []);

  React.useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  React.useEffect(() => {
    loadProjectAssignments(selectedProjectId).catch(() => {});
  }, [selectedProjectId, loadProjectAssignments]);

  React.useEffect(() => {
    setExpandedProcessAreas((prev) => {
      const next = new Set<string>();
      projectProcessAreas.forEach((area) => {
        if (prev.has(area)) next.add(area);
      });
      return next;
    });
  }, [projectProcessAreas]);

  React.useEffect(() => {
    if (openAddProcessAreaTrigger > 0) {
      setAddProcessAreaDialogOpen(true);
    }
  }, [openAddProcessAreaTrigger]);

  const handleProjectRoleChange = (processArea: string, roleKey: UnifiedRoleKey, userId: string) => {
    setProjectAssignments((prev) => {
      const next = cloneAssignments(prev);
      if (!next[processArea]) next[processArea] = {};
      if (userId) {
        next[processArea][roleKey] = userId;
      } else {
        delete next[processArea][roleKey];
      }
      return next;
    });

    setResolvedAssignments((prev) => {
      const next = { ...prev };
      const processResolved = { ...(next[processArea] || ({} as any)) };
      const existing = processResolved[roleKey] || {
        userId: null,
        source: 'unassigned' as const,
        projectUserId: null,
        globalUserId: globalAssignments[processArea]?.[roleKey] || null,
      };

      processResolved[roleKey] = {
        userId: userId || existing.globalUserId || null,
        source: userId ? 'project' : existing.globalUserId ? 'global' : 'unassigned',
        projectUserId: userId || null,
        globalUserId: existing.globalUserId,
      };

      next[processArea] = processResolved;
      return next;
    });
  };

  const handleSaveProject = async () => {
    if (!selectedProjectId) return;
    setIsSavingProject(true);
    setSaveMessage(null);
    try {
      await apiClient.put(`/api/hierarchy-preferences/project-role-assignments/${selectedProjectId}`, {
        assignments: projectAssignments,
        manualProcessAreas,
      });
      setSaveMessage('Project role assignments saved.');
      await loadProjectAssignments(selectedProjectId);
    } finally {
      setIsSavingProject(false);
    }
  };

  const toggleProcessAreaExpanded = (processArea: string) => {
    setExpandedProcessAreas((prev) => {
      const next = new Set(prev);
      if (next.has(processArea)) next.delete(processArea);
      else next.add(processArea);
      return next;
    });
  };

  const handleAddProcessArea = () => {
    const trimmed = newProcessAreaName.trim();
    if (!trimmed) return;

    const exists = projectProcessAreas.some((area) => area.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setAddProcessAreaDialogOpen(false);
      setNewProcessAreaName('');
      return;
    }

    const nextManual = Array.from(new Set([...manualProcessAreas, trimmed])).sort((a, b) => a.localeCompare(b));
    const nextAreas = Array.from(new Set([...projectProcessAreas, trimmed])).sort((a, b) => a.localeCompare(b));

    setManualProcessAreas(nextManual);
    setProjectProcessAreas(nextAreas);
    setExpandedProcessAreas((prev) => new Set(prev).add(trimmed));
    setAddProcessAreaDialogOpen(false);
    setNewProcessAreaName('');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {saveMessage && <Typography variant="caption" sx={{ color: '#8FE39A', fontWeight: 600 }}>{saveMessage}</Typography>}

      <Card sx={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h6" sx={{ color: '#DCE6FF', fontWeight: 700, fontSize: '1rem' }}>
                Process Area Assignment
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                Set project-specific assignees. Project values override global only for project workflows.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                select
                size="small"
                label="Project"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                sx={{ minWidth: 260 }}
              >
                {projects.map((project) => (
                  <MenuItem key={`project-${project.id}`} value={project.id}>
                    {(programById[project.programId || ''] ? `${programById[project.programId || '']} / ` : '') + project.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddProcessAreaDialogOpen(true)} disabled={!selectedProjectId} sx={{ textTransform: 'none' }}>
                Process Area
              </Button>
              <Button variant="contained" onClick={handleSaveProject} disabled={isSavingProject || isLoadingProject || !selectedProjectId} sx={{ textTransform: 'none' }}>
                {isSavingProject ? 'Saving...' : 'Save Project Assignments'}
              </Button>
            </Box>
          </Box>

          {projectProcessAreas.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              No process areas were found for the selected project yet.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {projectProcessAreas.map((processArea) => (
                <Box key={`project-${processArea}`} sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1.5, overflow: 'hidden' }}>
                  <Box sx={{ px: 1.25, py: 0.9, backgroundColor: 'rgba(255,255,255,0.06)', borderBottom: expandedProcessAreas.has(processArea) ? '1px solid rgba(255,255,255,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontWeight: 700, color: '#E2EBFF', fontSize: '0.9rem' }}>{processArea}</Typography>
                    <IconButton size="small" onClick={() => toggleProcessAreaExpanded(processArea)}>
                      {expandedProcessAreas.has(processArea) ? <ExpandLessIcon sx={{ fontSize: '1rem' }} /> : <ExpandMoreIcon sx={{ fontSize: '1rem' }} />}
                    </IconButton>
                  </Box>
                  {expandedProcessAreas.has(processArea) && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 2.4fr 1.4fr 1.4fr 0.8fr', gap: 0 }}>
                    {['Role', 'Definition', 'Project Assignment', 'Global Fallback', 'Source'].map((header) => (
                      <Box key={`${processArea}-${header}`} sx={{ p: 0.8, backgroundColor: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.55)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.35px' }}>
                        {header.toUpperCase()}
                      </Box>
                    ))}
                    {UNIFIED_ROLE_MODEL.map((role) => {
                      const resolved = resolvedAssignments[processArea]?.[role.key] || {
                        userId: null,
                        source: 'unassigned' as const,
                        projectUserId: null,
                        globalUserId: globalAssignments[processArea]?.[role.key] || null,
                      };
                      const globalPerson = resolved.globalUserId ? peopleById[resolved.globalUserId] : null;

                      return (
                        <React.Fragment key={`${processArea}-${role.key}`}>
                          <Box sx={{ p: 0.8, borderTop: '1px solid rgba(255,255,255,0.08)', color: '#E2EBFF', fontWeight: 700, fontSize: '0.82rem' }}>
                            {role.name}
                          </Box>
                          <Box sx={{ p: 0.8, borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem' }}>
                            {role.definition}
                          </Box>
                          <Box sx={{ p: 0.6, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <TextField
                              select
                              size="small"
                              fullWidth
                              value={projectAssignments[processArea]?.[role.key] || ''}
                              onChange={(event) => handleProjectRoleChange(processArea, role.key, event.target.value)}
                            >
                              <MenuItem value="">Use Global</MenuItem>
                              {people.map((person) => (
                                <MenuItem key={`project-${selectedProjectId}-${processArea}-${role.key}-${person.id}`} value={person.id}>
                                  {getPersonLabel(person)}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Box>
                          <Box sx={{ p: 0.8, borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', display: 'flex', alignItems: 'center' }}>
                            {globalPerson ? getPersonLabel(globalPerson) : 'Unassigned'}
                          </Box>
                          <Box sx={{ p: 0.8, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center' }}>
                            <Chip
                              size="small"
                              color={sourceChipColor(resolved.source)}
                              variant={resolved.source === 'unassigned' ? 'outlined' : 'filled'}
                              label={sourceChipLabel(resolved.source)}
                            />
                          </Box>
                        </React.Fragment>
                      );
                    })}
                  </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={addProcessAreaDialogOpen} onClose={() => setAddProcessAreaDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Process Area</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <TextField
            select
            size="small"
            label="Process Area"
            value={newProcessAreaName}
            onChange={(event) => setNewProcessAreaName(event.target.value)}
          >
            {processAreaOptions.map((area) => (
              <MenuItem key={`process-area-option-${area}`} value={area}>{area}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddProcessAreaDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleAddProcessArea} variant="contained" disabled={!newProcessAreaName.trim()} sx={{ textTransform: 'none' }}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProcessAreaRoleAssignmentPanel;
