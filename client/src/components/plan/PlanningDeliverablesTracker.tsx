import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import apiClient from '../../api/client';

type CriterionDraft = {
  checked?: boolean;
  percentValue?: number | null;
  severities?: string[];
};

type MockCycleLite = {
  id: string;
  name: string;
  entryCriteriaItems?: CriterionDraft[];
  exitCriteriaItems?: CriterionDraft[];
};

type ProcessAreaRolesPayload = {
  processAreas?: string[];
  resolvedAssignments?: Record<string, Record<string, { userId: string | null }>>;
};

type DeliverableStatus = 'complete' | 'in_progress' | 'not_started' | 'blocked' | 'not_built';

type Deliverable = {
  id: string;
  title: string;
  description: string;
  status: DeliverableStatus;
  note?: string;
  allowManual?: boolean;
};

interface PlanningDeliverablesTrackerProps {
  projectId: string;
  projectName: string;
  projectCycles: MockCycleLite[];
  inventoryItems: Array<{ id: string; processArea?: string | null }>;
  workflowUsers: Array<{ id: string; email: string; role: string }>;
  currentUserId?: string;
  selectedDeliverableId?: string;
  selectedDeliverableLabel?: string;
  selectedDeliverableAccent?: string;
}

const LOCAL_STORAGE_PREFIX = 'planningDeliverablesTracker:';

type DeliverableTaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete';

type DeliverableTask = {
  id: string;
  title: string;
  ownerUserId: string | null;
  dueDate: string;
  status: DeliverableTaskStatus;
};

type DeliverableApprovals = {
  leadApprovedBy: string | null;
  leadApprovedAt: string | null;
  projectManagerApprovedBy: string | null;
  projectManagerApprovedAt: string | null;
};

type DeliverableWorkflow = {
  tasks: DeliverableTask[];
  approvals: DeliverableApprovals;
};

type DeliverableWorkflowMap = Record<string, DeliverableWorkflow>;

const EMPTY_APPROVALS: DeliverableApprovals = {
  leadApprovedBy: null,
  leadApprovedAt: null,
  projectManagerApprovedBy: null,
  projectManagerApprovedAt: null,
};

const taskStatusOptions: Array<{ value: DeliverableTaskStatus; label: string }> = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'complete', label: 'Complete' },
];

const hasCriteriaValues = (items: CriterionDraft[] | undefined) => {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.some((item) => {
    if (item.checked) return true;
    if (typeof item.percentValue === 'number' && item.percentValue > 0) return true;
    if (Array.isArray(item.severities) && item.severities.length > 0) return true;
    return false;
  });
};

const statusColor = (status: DeliverableStatus): 'success' | 'warning' | 'default' | 'error' | 'info' => {
  if (status === 'complete') return 'success';
  if (status === 'in_progress') return 'warning';
  if (status === 'blocked') return 'error';
  if (status === 'not_built') return 'info';
  return 'default';
};

const statusLabel = (status: DeliverableStatus) => {
  if (status === 'complete') return 'Complete';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'blocked') return 'Blocked';
  if (status === 'not_built') return 'Not Built Yet';
  return 'Not Started';
};

const PlanningDeliverablesTracker: React.FC<PlanningDeliverablesTrackerProps> = ({
  projectId,
  projectName,
  projectCycles,
  inventoryItems,
  workflowUsers,
  currentUserId,
  selectedDeliverableId,
  selectedDeliverableLabel,
  selectedDeliverableAccent,
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [workflowRoles, setWorkflowRoles] = React.useState<{ leadUserId: string | null; projectManagerUserId: string | null }>({
    leadUserId: null,
    projectManagerUserId: null,
  });
  const [strategySectionsWithContent, setStrategySectionsWithContent] = React.useState(0);
  const [roadmapItemCount, setRoadmapItemCount] = React.useState(0);
  const [processAreaRoles, setProcessAreaRoles] = React.useState<ProcessAreaRolesPayload>({ processAreas: [], resolvedAssignments: {} });
  const [manualChecks, setManualChecks] = React.useState<Record<string, boolean>>({});
  const [allDeliverableWorkflows, setAllDeliverableWorkflows] = React.useState<Record<string, DeliverableWorkflowMap>>({});
  const [deliverableWorkflows, setDeliverableWorkflows] = React.useState<DeliverableWorkflowMap>({});
  const [isSavingWorkflow, setIsSavingWorkflow] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${projectId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setManualChecks(parsed);
        }
      }
    } catch {
      setManualChecks({});
    }
  }, [projectId]);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      try {
        const [workflowRes, strategyRes, processAreaRolesRes, hierarchyStateRes] = await Promise.all([
          apiClient.get(`/api/projects/${projectId}/workflow-roles`),
          apiClient.get(`/api/projects/${projectId}/data-migration-strategy`),
          apiClient.get(`/api/hierarchy-preferences/project-role-assignments/${projectId}`),
          apiClient.get('/api/hierarchy-preferences/state'),
        ]);

        if (!active) return;

        const workflow = workflowRes.data?.data || {};
        setWorkflowRoles({
          leadUserId: workflow.leadUserId || null,
          projectManagerUserId: workflow.projectManagerUserId || null,
        });

        const sections = strategyRes.data?.data?.strategy?.sections || {};
        const withContent = Object.values(sections).filter((value) => {
          const normalized = String(value || '').trim();
          return normalized && normalized !== '<p><br></p>' && normalized !== '<div><br></div>' && normalized !== '<p></p>';
        }).length;
        setStrategySectionsWithContent(withContent);

        const hierarchyState = hierarchyStateRes.data?.data || hierarchyStateRes.data?.preferences || hierarchyStateRes.data || {};
        const items = Array.isArray(hierarchyState.roadmapItems) ? hierarchyState.roadmapItems : [];
        const normalizedProject = (projectName || '').trim().toLowerCase();
        const linkedCount = items.filter((item: any) => (item?.projectKey || '').trim().toLowerCase() === normalizedProject).length;
        setRoadmapItemCount(linkedCount);

        const workflows = hierarchyState?.deliverableWorkflows && typeof hierarchyState.deliverableWorkflows === 'object'
          ? hierarchyState.deliverableWorkflows
          : {};
        setAllDeliverableWorkflows(workflows);
        setDeliverableWorkflows(workflows[projectId] || {});

        setProcessAreaRoles(processAreaRolesRes.data?.data || { processAreas: [], resolvedAssignments: {} });
      } catch {
        if (!active) return;
        setWorkflowRoles({ leadUserId: null, projectManagerUserId: null });
        setStrategySectionsWithContent(0);
        setRoadmapItemCount(0);
        setAllDeliverableWorkflows({});
        setDeliverableWorkflows({});
        setProcessAreaRoles({ processAreas: [], resolvedAssignments: {} });
      } finally {
        if (active) setIsLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [projectId, projectName]);

  const processAreasInInventory = React.useMemo(() => {
    return new Set(
      inventoryItems
        .map((item) => (item.processArea || '').trim())
        .filter((area) => area.length > 0)
    );
  }, [inventoryItems]);

  const processAreaCoverage = React.useMemo(() => {
    const areas = processAreaRoles.processAreas || [];
    const resolved = processAreaRoles.resolvedAssignments || {};
    const coveredCount = areas.filter((area) => {
      const rolesByArea = resolved[area] || {};
      return Object.values(rolesByArea).some((role) => !!role?.userId);
    }).length;
    return { total: areas.length, covered: coveredCount };
  }, [processAreaRoles]);

  const mockCriteriaCoverage = React.useMemo(() => {
    const total = projectCycles.length;
    const completeCount = projectCycles.filter((cycle) => (
      hasCriteriaValues(cycle.entryCriteriaItems) && hasCriteriaValues(cycle.exitCriteriaItems)
    )).length;
    return { total, complete: completeCount };
  }, [projectCycles]);

  const autoDeliverables: Deliverable[] = React.useMemo(() => {
    const projectRolesAssigned = !!workflowRoles.leadUserId && !!workflowRoles.projectManagerUserId;
    const hasMockCycles = projectCycles.length > 0;

    const structureStatus: DeliverableStatus = projectRolesAssigned && hasMockCycles
      ? 'complete'
      : (projectRolesAssigned || hasMockCycles) ? 'in_progress' : 'not_started';

    const processAreaRolesStatus: DeliverableStatus = processAreaCoverage.total > 0 && processAreaCoverage.covered === processAreaCoverage.total
      ? 'complete'
      : processAreaCoverage.covered > 0
        ? 'in_progress'
        : 'not_started';

    const inventoryStatus: DeliverableStatus = inventoryItems.length > 0 && processAreasInInventory.size > 0
      ? 'complete'
      : inventoryItems.length > 0
        ? 'in_progress'
        : 'not_started';

    const strategyStatus: DeliverableStatus = strategySectionsWithContent >= 3
      ? 'complete'
      : strategySectionsWithContent > 0
        ? 'in_progress'
        : 'not_started';

    const roadmapStatus: DeliverableStatus = roadmapItemCount > 0 ? 'complete' : 'not_started';

    const mockCriteriaStatus: DeliverableStatus = mockCriteriaCoverage.total > 0 && mockCriteriaCoverage.complete === mockCriteriaCoverage.total
      ? 'complete'
      : mockCriteriaCoverage.complete > 0
        ? 'in_progress'
        : 'not_started';

    return [
      {
        id: 'projectStructure',
        title: 'Project Structure, Roles, and Mock Cycles',
        description: 'Track project role assignment and creation of project mock cycles.',
        status: structureStatus,
        note: `Roles assigned: ${projectRolesAssigned ? 'Yes' : 'No'} | Mock cycles: ${projectCycles.length}`,
      },
      {
        id: 'processAreaRoles',
        title: 'Process Areas and Assigned Roles',
        description: 'Ensure each process area has role assignments in place.',
        status: processAreaRolesStatus,
        note: `Process areas with assignments: ${processAreaCoverage.covered}/${processAreaCoverage.total}`,
      },
      {
        id: 'objectInventory',
        title: 'Project Object Inventory by Process Area',
        description: 'Maintain inventory coverage by process area for planning deliverables.',
        status: inventoryStatus,
        note: `Inventory objects: ${inventoryItems.length} | Process areas represented: ${processAreasInInventory.size}`,
      },
      {
        id: 'migrationStrategy',
        title: 'Data Migration Strategy',
        description: 'Maintain strategy narrative and supporting sections for planning.',
        status: strategyStatus,
        note: `Strategy sections with content: ${strategySectionsWithContent}`,
      },
      {
        id: 'projectRoadmap',
        title: 'Project Roadmap',
        description: 'Define and maintain roadmap milestones for planning through go-live.',
        status: roadmapStatus,
        note: `Roadmap items linked: ${roadmapItemCount}`,
      },
      {
        id: 'mockCriteria',
        title: 'Mock Entry and Exit Criteria',
        description: 'Define and complete mock cycle entry/exit criteria for each cycle.',
        status: mockCriteriaStatus,
        note: `Cycles with entry/exit criteria: ${mockCriteriaCoverage.complete}/${mockCriteriaCoverage.total}`,
      },
      {
        id: 'designBuildEstimation',
        title: 'Design and Build Phase Estimation',
        description: 'Estimate design/build effort from planning deliverables.',
        status: 'not_built',
        note: 'Capability not yet implemented in the application.',
      },
      {
        id: 'designBuildCompletion',
        title: 'Design and Build Phase Plan Completion',
        description: 'Track completion readiness for design/build phase plan handoff.',
        status: 'blocked',
        note: 'Blocked until design/build estimation capability is implemented.',
        allowManual: true,
      },
    ];
  }, [
    workflowRoles,
    projectCycles,
    processAreaCoverage,
    inventoryItems,
    processAreasInInventory,
    strategySectionsWithContent,
    roadmapItemCount,
    mockCriteriaCoverage,
  ]);

  const deliverables = autoDeliverables.map((item) => {
    if (item.allowManual && manualChecks[item.id]) {
      return {
        ...item,
        status: 'complete' as DeliverableStatus,
        note: 'Marked complete manually.',
      };
    }
    return item;
  });

  const visibleDeliverables = selectedDeliverableId
    ? deliverables.filter((item) => item.id === selectedDeliverableId)
    : deliverables;

  const completedCount = visibleDeliverables.filter((item) => item.status === 'complete').length;
  const completionPct = visibleDeliverables.length > 0 ? Math.round((completedCount / visibleDeliverables.length) * 100) : 0;

  const handleManualToggle = (id: string, checked: boolean) => {
    const next = { ...manualChecks, [id]: checked };
    setManualChecks(next);
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${projectId}`, JSON.stringify(next));
    } catch {
      // no-op
    }
  };

  const ensureWorkflow = React.useCallback((deliverableId: string) => {
    return deliverableWorkflows[deliverableId] || {
      tasks: [],
      approvals: { ...EMPTY_APPROVALS },
    };
  }, [deliverableWorkflows]);

  const persistWorkflows = React.useCallback(async (nextProjectWorkflows: DeliverableWorkflowMap) => {
    const nextAll = {
      ...allDeliverableWorkflows,
      [projectId]: nextProjectWorkflows,
    };
    setAllDeliverableWorkflows(nextAll);
    setDeliverableWorkflows(nextProjectWorkflows);
    setIsSavingWorkflow(true);
    try {
      await apiClient.put('/api/hierarchy-preferences/global-process-areas', {
        deliverableWorkflows: nextAll,
      });
    } catch {
      alert('Unable to save deliverable workflow updates. Please try again.');
    } finally {
      setIsSavingWorkflow(false);
    }
  }, [allDeliverableWorkflows, projectId]);

  const upsertTask = async (deliverableId: string, task: DeliverableTask) => {
    const current = ensureWorkflow(deliverableId);
    const exists = current.tasks.some((item) => item.id === task.id);
    const nextTasks = exists
      ? current.tasks.map((item) => (item.id === task.id ? task : item))
      : [...current.tasks, task];
    await persistWorkflows({
      ...deliverableWorkflows,
      [deliverableId]: {
        ...current,
        tasks: nextTasks,
      },
    });
  };

  const deleteTask = async (deliverableId: string, taskId: string) => {
    const current = ensureWorkflow(deliverableId);
    const nextTasks = current.tasks.filter((item) => item.id !== taskId);
    await persistWorkflows({
      ...deliverableWorkflows,
      [deliverableId]: {
        ...current,
        tasks: nextTasks,
      },
    });
  };

  const addTask = async (deliverableId: string) => {
    const newTask: DeliverableTask = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: 'New deliverable task',
      ownerUserId: null,
      dueDate: '',
      status: 'not_started',
    };
    await upsertTask(deliverableId, newTask);
  };

  const updateApproval = async (deliverableId: string, role: 'lead' | 'project_manager', approved: boolean) => {
    const current = ensureWorkflow(deliverableId);
    const approvals = { ...current.approvals };

    if (role === 'project_manager' && approved && !approvals.leadApprovedAt) {
      alert('Lead approval is required before Project Manager approval.');
      return;
    }

    if (role === 'lead') {
      approvals.leadApprovedBy = approved ? (currentUserId || null) : null;
      approvals.leadApprovedAt = approved ? new Date().toISOString() : null;
      if (!approved) {
        approvals.projectManagerApprovedBy = null;
        approvals.projectManagerApprovedAt = null;
      }
    } else {
      approvals.projectManagerApprovedBy = approved ? (currentUserId || null) : null;
      approvals.projectManagerApprovedAt = approved ? new Date().toISOString() : null;
    }

    await persistWorkflows({
      ...deliverableWorkflows,
      [deliverableId]: {
        ...current,
        approvals,
      },
    });
  };

  return (
    <Card sx={{ mt: 1.5, mb: 2, border: `1px solid ${selectedDeliverableAccent ? `${selectedDeliverableAccent}55` : 'rgba(255,255,255,0.1)'}`, backgroundColor: 'rgba(255,255,255,0.03)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: selectedDeliverableAccent || 'inherit' }}>
            {selectedDeliverableId ? (selectedDeliverableLabel || 'Deliverable Task Planning') : 'Planning Phase Deliverables'}
          </Typography>
          <Chip label={`${completedCount}/${visibleDeliverables.length} complete`} color={visibleDeliverables.length > 0 && completedCount === visibleDeliverables.length ? 'success' : 'default'} />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          {selectedDeliverableId
            ? `Deliverable-level task planning and approvals for ${projectName}.`
            : `Deliverable tracking for ${projectName} during planning phase.`}
        </Typography>

        <LinearProgress variant="determinate" value={completionPct} sx={{ height: 8, borderRadius: 999, mb: 2 }} />

        {isLoading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Loading deliverable status checks...
          </Alert>
        )}
        {isSavingWorkflow && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Saving deliverable workflow updates...
          </Alert>
        )}

        <Grid container spacing={1.5}>
          {visibleDeliverables.map((item) => (
            <Grid key={item.id} item xs={12} md={selectedDeliverableId ? 12 : 6}>
              {(() => {
                const workflow = ensureWorkflow(item.id);
                const tasks = workflow.tasks || [];
                const completedTasks = tasks.filter((task) => task.status === 'complete').length;
                const canLeadApprove = !!currentUserId && currentUserId === workflowRoles.leadUserId;
                const canPmApprove = !!currentUserId && currentUserId === workflowRoles.projectManagerUserId;

                return (
              <Box sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.4 }}>{item.title}</Typography>
                  <Chip size="small" label={statusLabel(item.status)} color={statusColor(item.status)} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>{item.description}</Typography>
                {item.note && (
                  <Typography variant="caption" sx={{ display: 'block', color: 'rgba(234,242,255,0.75)' }}>{item.note}</Typography>
                )}
                <Typography variant="caption" sx={{ display: 'block', color: 'rgba(234,242,255,0.8)', mt: 0.5 }}>
                  Tasks complete: {completedTasks}/{tasks.length}
                </Typography>
                {item.allowManual && item.status !== 'not_built' && (
                  <FormControlLabel
                    sx={{ mt: 0.25 }}
                    control={<Checkbox size="small" checked={!!manualChecks[item.id]} onChange={(e) => handleManualToggle(item.id, e.target.checked)} />}
                    label={<Typography variant="caption">Mark complete manually</Typography>}
                  />
                )}

                <Box sx={{ mt: 1.25, pt: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Deliverable Tasks</Typography>
                  <Stack spacing={0.8} sx={{ mt: 0.75 }}>
                    {tasks.map((task) => (
                      <Box key={task.id} sx={{ p: 0.75, borderRadius: 1, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75}>
                          <TextField
                            size="small"
                            label="Task"
                            value={task.title}
                            onChange={(e) => {
                              const next = { ...task, title: e.target.value };
                              setDeliverableWorkflows((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...ensureWorkflow(item.id),
                                  tasks: ensureWorkflow(item.id).tasks.map((t) => (t.id === task.id ? next : t)),
                                },
                              }));
                            }}
                            onBlur={async (e) => {
                              await upsertTask(item.id, { ...task, title: e.target.value });
                            }}
                            fullWidth
                          />
                          <TextField
                            select
                            size="small"
                            label="Owner"
                            value={task.ownerUserId || ''}
                            onChange={async (e) => {
                              await upsertTask(item.id, { ...task, ownerUserId: e.target.value || null });
                            }}
                            sx={{ minWidth: { xs: '100%', sm: 170 } }}
                          >
                            <MenuItem value="">Unassigned</MenuItem>
                            {workflowUsers.map((user) => (
                              <MenuItem key={user.id} value={user.id}>{user.email}</MenuItem>
                            ))}
                          </TextField>
                          <TextField
                            type="date"
                            size="small"
                            label="Due"
                            value={task.dueDate || ''}
                            onChange={(e) => {
                              const next = { ...task, dueDate: e.target.value };
                              setDeliverableWorkflows((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...ensureWorkflow(item.id),
                                  tasks: ensureWorkflow(item.id).tasks.map((t) => (t.id === task.id ? next : t)),
                                },
                              }));
                            }}
                            onBlur={async (e) => {
                              await upsertTask(item.id, { ...task, dueDate: e.target.value });
                            }}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: { xs: '100%', sm: 145 } }}
                          />
                          <TextField
                            select
                            size="small"
                            label="Status"
                            value={task.status}
                            onChange={async (e) => {
                              await upsertTask(item.id, { ...task, status: e.target.value as DeliverableTaskStatus });
                            }}
                            sx={{ minWidth: { xs: '100%', sm: 145 } }}
                          >
                            {taskStatusOptions.map((status) => (
                              <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                            ))}
                          </TextField>
                          <IconButton
                            onClick={async () => deleteTask(item.id, task.id)}
                            sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>
                    ))}
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={async () => addTask(item.id)}
                      sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                    >
                      Add Task
                    </Button>
                  </Stack>
                </Box>

                <Box sx={{ mt: 1.25, pt: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Deliverable Approvals</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: 'wrap' }}>
                    <Chip size="small" label={`Lead: ${workflow.approvals.leadApprovedAt ? 'Approved' : 'Pending'}`} color={workflow.approvals.leadApprovedAt ? 'success' : 'default'} />
                    <Chip size="small" label={`PM: ${workflow.approvals.projectManagerApprovedAt ? 'Approved' : 'Pending'}`} color={workflow.approvals.projectManagerApprovedAt ? 'success' : 'default'} />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} sx={{ mt: 0.75 }}>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!canLeadApprove}
                      onClick={async () => updateApproval(item.id, 'lead', true)}
                    >
                      Lead Approve
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!canLeadApprove}
                      onClick={async () => updateApproval(item.id, 'lead', false)}
                    >
                      Revoke Lead
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!canPmApprove || !workflow.approvals.leadApprovedAt}
                      onClick={async () => updateApproval(item.id, 'project_manager', true)}
                    >
                      PM Approve
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!canPmApprove}
                      onClick={async () => updateApproval(item.id, 'project_manager', false)}
                    >
                      Revoke PM
                    </Button>
                  </Stack>
                </Box>
              </Box>
                );
              })()}
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default PlanningDeliverablesTracker;
