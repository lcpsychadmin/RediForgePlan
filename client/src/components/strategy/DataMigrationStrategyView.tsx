import React from 'react';
import ReactQuill from 'react-quill';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import 'react-quill/dist/quill.snow.css';

type StrategyRole = 'lead' | 'project_manager';

type MockCycleWorkflow = {
  mockCycleId: string;
  workflow: any;
};

type StrategyPayload = {
  project: { id: string; name: string };
  strategy: {
    sections: Record<string, string>;
    roles: { leadUserId: string | null; projectManagerUserId: string | null };
    roleUsers?: { leadEmail: string | null; projectManagerEmail: string | null };
    approvals: {
      leadApproved: boolean;
      leadApprovedAt: string | null;
      projectManagerApproved: boolean;
      projectManagerApprovedAt: string | null;
    };
  };
  mockCycles: Array<{ id: string; name: string; startDate?: string; endDate?: string }>;
  cycleWorkflow: MockCycleWorkflow[];
  documents: Array<{
    id: string;
    file_name: string;
    document_type: string;
    file_size: number;
    created_at: string;
    mock_cycle_name?: string | null;
    mock_cycle_id?: string | null;
    uploaded_by_email?: string | null;
  }>;
};

const SECTION_CONFIG: Array<{ key: string; label: string; rows?: number }> = [
  { key: 'purpose', label: 'Purpose', rows: 3 },
  { key: 'guidingPrinciples', label: 'Guiding Principles', rows: 4 },
  { key: 'dataReadiness', label: 'Data Readiness', rows: 4 },
  { key: 'dataConversion', label: 'Data Conversion', rows: 4 },
  { key: 'conversionScope', label: 'Conversion Scope', rows: 4 },
  { key: 'conversionMethods', label: 'Conversion Methods', rows: 4 },
  { key: 'conversionDocuments', label: 'Conversion Documents', rows: 4 },
  { key: 'dataValidationProcess', label: 'Data Validation Process', rows: 4 },
  { key: 'mockConversionCycles', label: 'Mock Conversion Cycles', rows: 4 },
  { key: 'entryCriteria', label: 'Mock Entry Criteria' },
  { key: 'exitCriteria', label: 'Mock Exit Criteria' },
  { key: 'goLiveSimulationCutover', label: 'Go-Live Simulation & Cutover', rows: 4 },
  { key: 'dependencies', label: 'Dependencies', rows: 3 },
  { key: 'assumptions', label: 'Assumptions', rows: 3 },
  { key: 'keyDesignDecisions', label: 'Key Design Decisions', rows: 4 },
  { key: 'strategyApproval', label: 'Strategy Approval' },
];

const SPECIAL_SECTION_KEYS = new Set(['entryCriteria', 'exitCriteria', 'strategyApproval']);
const SPECIAL_ACCENT = '#90CAF9';
const SPECIAL_SURFACE = {
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 2,
};
const NAV_SURFACE = {
  background: 'linear-gradient(180deg, rgba(144,202,249,0.12) 0%, rgba(255,255,255,0.035) 24%, rgba(255,255,255,0.02) 100%)',
  border: '1px solid rgba(144,202,249,0.18)',
  borderRadius: 2.5,
  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
};
const SECTION_ACCENTS: Record<string, string> = {
  purpose: '#7CC7FF',
  guidingPrinciples: '#8FE3CF',
  dataReadiness: '#F7C873',
  dataConversion: '#F4978E',
  conversionScope: '#A5B4FC',
  conversionMethods: '#63C7B2',
  conversionDocuments: '#F4A261',
  dataValidationProcess: '#7FD1AE',
  mockConversionCycles: '#F1B96B',
  entryCriteria: '#93C5FD',
  exitCriteria: '#F4A261',
  goLiveSimulationCutover: '#F59E9E',
  dependencies: '#C4B5FD',
  assumptions: '#A7F3D0',
  keyDesignDecisions: '#F9C74F',
  strategyApproval: '#7FD1AE',
};
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'clean'],
  ],
};
const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'blockquote',
  'list',
  'bullet',
  'link',
];

interface Props {
  projectId: string;
  projectName?: string;
  userId?: string;
  userRole?: string;
  onEditProject: () => void;
  onEditCycle: (cycleId: string) => void;
}

const DataMigrationStrategyView: React.FC<Props> = ({
  projectId,
  projectName,
  userId,
  userRole,
  onEditProject,
  onEditCycle,
}) => {
  const queryClient = useQueryClient();
  const canEditSections = userRole === 'admin';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['projectDataMigrationStrategy', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/projects/${projectId}/data-migration-strategy`);
      return (res.data?.data || {}) as StrategyPayload;
    },
    enabled: !!projectId,
  });

  const [sectionsDraft, setSectionsDraft] = React.useState<Record<string, string>>({});
  const [isSavingSections, setIsSavingSections] = React.useState(false);
  const [activeSectionKey, setActiveSectionKey] = React.useState(SECTION_CONFIG[0].key);

  const [isApproving, setIsApproving] = React.useState<null | StrategyRole>(null);

  React.useEffect(() => {
    if (data?.strategy?.sections) {
      setSectionsDraft(data.strategy.sections);
    }
  }, [data]);

  React.useEffect(() => {
    if (!SECTION_CONFIG.some((section) => section.key === activeSectionKey)) {
      setActiveSectionKey(SECTION_CONFIG[0].key);
    }
  }, [activeSectionKey]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['projectDataMigrationStrategy', projectId] });
  };

  const handleSaveSections = async () => {
    try {
      setIsSavingSections(true);
      await apiClient.put(`/api/projects/${projectId}/data-migration-strategy`, {
        sections: sectionsDraft,
      });
      await refresh();
    } catch (error) {
      alert('Failed to save Data Migration Strategy sections.');
    } finally {
      setIsSavingSections(false);
    }
  };

  const handleApproval = async (role: StrategyRole, approved: boolean) => {
    try {
      setIsApproving(role);
      await apiClient.post(`/api/projects/${projectId}/data-migration-strategy/approvals/${role}`, { approved });
      await refresh();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to update approval status.');
    } finally {
      setIsApproving(null);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/data-migration-strategy/export`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `data-migration-strategy-${projectId}.md`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export strategy document.');
    }
  };

  if (isLoading) {
    return <Alert severity="info">Loading Data Migration Strategy...</Alert>;
  }

  if (isError || !data) {
    return <Alert severity="error">Unable to load Data Migration Strategy.</Alert>;
  }

  const cycleWorkflowById = new Map(data.cycleWorkflow.map((entry) => [entry.mockCycleId, entry.workflow]));
  const strategy = data.strategy;
  const activeSection = SECTION_CONFIG.find((section) => section.key === activeSectionKey) || SECTION_CONFIG[0];
  const activeAccent = SECTION_ACCENTS[activeSection.key] || SPECIAL_ACCENT;
  const activeSectionIndex = SECTION_CONFIG.findIndex((section) => section.key === activeSection.key);
  const editableSectionCount = SECTION_CONFIG.filter((section) => !SPECIAL_SECTION_KEYS.has(section.key)).length;
  const completedSectionCount = SECTION_CONFIG.filter((section) => {
    if (SPECIAL_SECTION_KEYS.has(section.key)) return false;
    const value = sectionsDraft[section.key] || '';
    return value.trim().length > 0;
  }).length;
  const completionPct = editableSectionCount > 0
    ? Math.round((completedSectionCount / editableSectionCount) * 100)
    : 0;

  const isLeadAssignedUser = !!strategy.roles.leadUserId && strategy.roles.leadUserId === userId;
  const isPmAssignedUser = !!strategy.roles.projectManagerUserId && strategy.roles.projectManagerUserId === userId;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 1.25, position: 'sticky', top: 72, zIndex: 1, ...NAV_SURFACE }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 700, letterSpacing: '0.25px', color: SPECIAL_ACCENT }}>
          Section Navigator
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', overflowX: 'auto', pb: 0.25 }}>
          {SECTION_CONFIG.map((section) => (
            <Chip
              key={section.key}
              label={`${section.label}${(sectionsDraft[section.key] || '').trim() ? ' • Done' : ''}`}
              clickable
              variant={section.key === activeSection.key ? 'filled' : 'outlined'}
              onClick={() => setActiveSectionKey(section.key)}
              sx={{
                flexShrink: 0,
                fontWeight: section.key === activeSection.key ? 700 : 500,
                color: section.key === activeSection.key ? '#0D1933' : '#EAF2FF',
                backgroundColor: section.key === activeSection.key ? SECTION_ACCENTS[section.key] || SPECIAL_ACCENT : 'rgba(255,255,255,0.03)',
                borderColor: section.key === activeSection.key ? 'transparent' : 'rgba(255,255,255,0.14)',
              }}
            />
          ))}
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper
        sx={{
          p: 2,
          background: `linear-gradient(180deg, ${activeAccent}18 0%, rgba(255,255,255,0.03) 22%, rgba(255,255,255,0.02) 100%)`,
          border: `1px solid ${activeAccent}33`,
          borderRadius: 2.5,
          boxShadow: '0 10px 30px rgba(0,0,0,0.14)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
              <Chip
                label={activeSection.label}
                size="small"
                sx={{ backgroundColor: `${activeAccent}26`, color: activeAccent, fontWeight: 700 }}
              />
              <Typography variant="caption" sx={{ color: activeAccent, fontWeight: 700, letterSpacing: '0.25px' }}>
                Data Migration Strategy
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Project: {projectName || data.project?.name || projectId}</Typography>
            <Typography variant="caption" color="text.secondary">Completed Sections: {completedSectionCount} / {editableSectionCount}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={onEditProject} sx={{ borderColor: `${activeAccent}55`, color: activeAccent }}>Manage Roles</Button>
            <Button variant="outlined" onClick={handleExport} sx={{ borderColor: `${activeAccent}55`, color: activeAccent }}>Export Strategy</Button>
          </Box>
        </Box>

        <LinearProgress variant="determinate" value={completionPct} sx={{ mb: 1.5, borderRadius: 999, height: 7 }} />

        <Divider sx={{ mb: 2 }} />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 1, color: SPECIAL_SECTION_KEYS.has(activeSection.key) ? SPECIAL_ACCENT : undefined, fontWeight: SPECIAL_SECTION_KEYS.has(activeSection.key) ? 700 : 500 }}
        >
          Section {activeSectionIndex + 1} of {SECTION_CONFIG.length}
        </Typography>

        {activeSection.key === 'entryCriteria' ? (
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {data.mockCycles.map((cycle) => {
              const workflow = cycleWorkflowById.get(cycle.id);
              const entryItems = workflow?.criteria?.entry || [];
              return (
                <Card key={`${cycle.id}-entry`} variant="outlined" sx={{ ...SPECIAL_SURFACE, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: SPECIAL_ACCENT }}>{cycle.name}</Typography>
                      <Button size="small" variant="outlined" onClick={() => onEditCycle(cycle.id)} sx={{ borderColor: 'rgba(144,202,249,0.45)', color: SPECIAL_ACCENT }}>
                        Open Existing Mock Cycle Modal
                      </Button>
                    </Box>
                    {entryItems.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No entry criteria.</Typography>
                    ) : (
                      <Box sx={{ display: 'grid', gap: 0.5 }}>
                        {entryItems.map((item: any) => (
                          <Typography key={`${cycle.id}-entry-${item.key}`} variant="body2">• {item.label}</Typography>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        ) : activeSection.key === 'exitCriteria' ? (
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {data.mockCycles.map((cycle) => {
              const workflow = cycleWorkflowById.get(cycle.id);
              const exitItems = workflow?.criteria?.exit || [];
              return (
                <Card key={`${cycle.id}-exit`} variant="outlined" sx={{ ...SPECIAL_SURFACE, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: SPECIAL_ACCENT }}>{cycle.name}</Typography>
                      <Button size="small" variant="outlined" onClick={() => onEditCycle(cycle.id)} sx={{ borderColor: 'rgba(144,202,249,0.45)', color: SPECIAL_ACCENT }}>
                        Open Existing Mock Cycle Modal
                      </Button>
                    </Box>
                    {exitItems.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No exit criteria.</Typography>
                    ) : (
                      <Box sx={{ display: 'grid', gap: 0.5 }}>
                        {exitItems.map((item: any) => (
                          <Typography key={`${cycle.id}-exit-${item.key}`} variant="body2">• {item.label}</Typography>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        ) : activeSection.key === 'strategyApproval' ? (
          <Box sx={{ ...SPECIAL_SURFACE, p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 700, color: SPECIAL_ACCENT }}>
              Project Role Assignments (Read Only)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mb: 1.5 }}>
              <TextField label="Lead" value={strategy.roleUsers?.leadEmail || strategy.roles.leadUserId || 'Unassigned'} InputProps={{ readOnly: true }} />
              <TextField label="Project Manager" value={strategy.roleUsers?.projectManagerEmail || strategy.roles.projectManagerUserId || 'Unassigned'} InputProps={{ readOnly: true }} />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Button variant="outlined" onClick={onEditProject} sx={{ borderColor: 'rgba(144,202,249,0.45)', color: SPECIAL_ACCENT }}>Open Existing Role Assignment Modal</Button>
            </Box>

            <Divider sx={{ mb: 1.5 }} />

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 700, color: SPECIAL_ACCENT }}>
              Workflow Approval
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              <Chip
                label={`Lead: ${strategy.approvals.leadApproved ? 'Approved' : 'Pending'}`}
                sx={{ backgroundColor: strategy.approvals.leadApproved ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.08)', color: strategy.approvals.leadApproved ? '#81C784' : '#EAF2FF' }}
              />
              <Chip
                label={`Project Manager: ${strategy.approvals.projectManagerApproved ? 'Approved' : 'Pending'}`}
                sx={{ backgroundColor: strategy.approvals.projectManagerApproved ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.08)', color: strategy.approvals.projectManagerApproved ? '#81C784' : '#EAF2FF' }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                disabled={!isLeadAssignedUser || isApproving === 'lead'}
                onClick={() => handleApproval('lead', true)}
              >
                {isApproving === 'lead' ? 'Saving...' : 'Lead Approve'}
              </Button>
              <Button
                variant="outlined"
                disabled={!isLeadAssignedUser || isApproving === 'lead'}
                onClick={() => handleApproval('lead', false)}
              >
                Revoke Lead Approval
              </Button>
              <Button
                variant="contained"
                disabled={!isPmAssignedUser || isApproving === 'project_manager'}
                onClick={() => handleApproval('project_manager', true)}
              >
                {isApproving === 'project_manager' ? 'Saving...' : 'PM Final Sign-Off'}
              </Button>
              <Button
                variant="outlined"
                disabled={!isPmAssignedUser || isApproving === 'project_manager'}
                onClick={() => handleApproval('project_manager', false)}
              >
                Revoke PM Sign-Off
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 1.25 }}>
            <Box
              sx={{
                border: `1px solid ${activeAccent}3d`,
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.05)',
                '& .ql-toolbar.ql-snow': {
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.14)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                },
                '& .ql-container.ql-snow': {
                  border: 'none',
                  fontFamily: 'inherit',
                  minHeight: 240,
                },
                '& .ql-editor': {
                  minHeight: 240,
                  color: '#EAF2FF',
                  fontSize: '0.98rem',
                  lineHeight: 1.65,
                },
                '& .ql-editor.ql-blank::before': {
                  color: 'rgba(234,242,255,0.45)',
                  fontStyle: 'normal',
                },
                '& .ql-snow .ql-stroke': { stroke: '#D7E6FF' },
                '& .ql-snow .ql-fill': { fill: '#D7E6FF' },
                '& .ql-snow .ql-picker': { color: '#D7E6FF' },
              }}
            >
              <ReactQuill
                theme="snow"
                value={sectionsDraft[activeSection.key] || ''}
                onChange={(value) => setSectionsDraft((prev) => ({ ...prev, [activeSection.key]: value }))}
                modules={quillModules}
                formats={quillFormats}
                readOnly={!canEditSections}
                placeholder={`Document ${activeSection.label.toLowerCase()}...`}
              />
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5, gap: 1 }}>
          <Button
            variant="outlined"
            disabled={activeSectionIndex <= 0}
            onClick={() => setActiveSectionKey(SECTION_CONFIG[Math.max(activeSectionIndex - 1, 0)].key)}
          >
            Previous Section
          </Button>
          <Button
            variant="outlined"
            disabled={activeSectionIndex >= SECTION_CONFIG.length - 1}
            onClick={() => setActiveSectionKey(SECTION_CONFIG[Math.min(activeSectionIndex + 1, SECTION_CONFIG.length - 1)].key)}
          >
            Next Section
          </Button>
        </Box>

        {canEditSections && !SPECIAL_SECTION_KEYS.has(activeSection.key) ? (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
            <Button variant="contained" onClick={handleSaveSections} disabled={isSavingSections} sx={{ backgroundColor: activeAccent, color: '#0D1933', '&:hover': { backgroundColor: activeAccent } }}>
              {isSavingSections ? 'Saving...' : 'Save Data Migration Strategy'}
            </Button>
          </Box>
        ) : !SPECIAL_SECTION_KEYS.has(activeSection.key) ? (
          <Alert severity="info" sx={{ mt: 1.5 }}>Only admins can edit strategy sections.</Alert>
        ) : null}
      </Paper>
      </Box>
    </Box>
  );
};

export default DataMigrationStrategyView;
