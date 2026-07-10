import React from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  LinearProgress,
  Typography,
} from '@mui/material';
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
}

const LOCAL_STORAGE_PREFIX = 'planningDeliverablesTracker:';

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

        setProcessAreaRoles(processAreaRolesRes.data?.data || { processAreas: [], resolvedAssignments: {} });
      } catch {
        if (!active) return;
        setWorkflowRoles({ leadUserId: null, projectManagerUserId: null });
        setStrategySectionsWithContent(0);
        setRoadmapItemCount(0);
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

  const completedCount = deliverables.filter((item) => item.status === 'complete').length;
  const completionPct = deliverables.length > 0 ? Math.round((completedCount / deliverables.length) * 100) : 0;

  const handleManualToggle = (id: string, checked: boolean) => {
    const next = { ...manualChecks, [id]: checked };
    setManualChecks(next);
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${projectId}`, JSON.stringify(next));
    } catch {
      // no-op
    }
  };

  return (
    <Card sx={{ mt: 1.5, mb: 2, border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Planning Phase Deliverables</Typography>
          <Chip label={`${completedCount}/${deliverables.length} complete`} color={completedCount === deliverables.length ? 'success' : 'default'} />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          Deliverable tracking for {projectName} during planning phase.
        </Typography>

        <LinearProgress variant="determinate" value={completionPct} sx={{ height: 8, borderRadius: 999, mb: 2 }} />

        {isLoading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Loading deliverable status checks...
          </Alert>
        )}

        <Grid container spacing={1.5}>
          {deliverables.map((item) => (
            <Grid key={item.id} item xs={12} md={6}>
              <Box sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.4 }}>{item.title}</Typography>
                  <Chip size="small" label={statusLabel(item.status)} color={statusColor(item.status)} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>{item.description}</Typography>
                {item.note && (
                  <Typography variant="caption" sx={{ display: 'block', color: 'rgba(234,242,255,0.75)' }}>{item.note}</Typography>
                )}
                {item.allowManual && item.status !== 'not_built' && (
                  <FormControlLabel
                    sx={{ mt: 0.25 }}
                    control={<Checkbox size="small" checked={!!manualChecks[item.id]} onChange={(e) => handleManualToggle(item.id, e.target.checked)} />}
                    label={<Typography variant="caption">Mark complete manually</Typography>}
                  />
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default PlanningDeliverablesTracker;
