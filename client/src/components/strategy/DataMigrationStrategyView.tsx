import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';

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
  { key: 'mockSuccessTargets', label: 'Mock Success Targets', rows: 3 },
  { key: 'goLiveSimulationCutover', label: 'Go-Live Simulation & Cutover', rows: 4 },
  { key: 'dependencies', label: 'Dependencies', rows: 3 },
  { key: 'assumptions', label: 'Assumptions', rows: 3 },
  { key: 'keyDesignDecisions', label: 'Key Design Decisions', rows: 4 },
];

interface Props {
  projectId: string;
  projectName?: string;
  userId?: string;
  userRole?: string;
  onEditProject: () => void;
  onEditCycle: (cycleId: string) => void;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

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
  const canUploadDocs = userRole === 'admin' || userRole === 'analyst';

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

  const [isApproving, setIsApproving] = React.useState<null | StrategyRole>(null);

  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = React.useState('cycle_report');
  const [uploadCycleId, setUploadCycleId] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    if (data?.strategy?.sections) {
      setSectionsDraft(data.strategy.sections);
    }
  }, [data]);

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

  const handleUpload = async () => {
    if (!uploadFile) {
      alert('Choose a file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('documentType', uploadDocType);
      if (uploadCycleId) formData.append('mockCycleId', uploadCycleId);

      await apiClient.post(`/api/projects/${projectId}/data-migration-strategy/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadFile(null);
      setUploadCycleId('');
      setUploadDocType('cycle_report');
      await refresh();
    } catch (error) {
      alert('Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await apiClient.delete(`/api/projects/${projectId}/data-migration-strategy/documents/${documentId}`);
      await refresh();
    } catch (error) {
      alert('Failed to delete document.');
    }
  };

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      const response = await apiClient.get(
        `/api/projects/${projectId}/data-migration-strategy/documents/${documentId}/download`,
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download document.');
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

  const isLeadAssignedUser = !!strategy.roles.leadUserId && strategy.roles.leadUserId === userId;
  const isPmAssignedUser = !!strategy.roles.projectManagerUserId && strategy.roles.projectManagerUserId === userId;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h6">Data Migration Strategy</Typography>
            <Typography variant="body2" color="text.secondary">Project: {projectName || data.project?.name || projectId}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={onEditProject}>Manage Roles</Button>
            <Button variant="outlined" onClick={handleExport}>Export Strategy</Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'grid', gap: 1.25 }}>
          {SECTION_CONFIG.map((section) => (
            <TextField
              key={section.key}
              label={section.label}
              multiline
              minRows={section.rows || 3}
              value={sectionsDraft[section.key] || ''}
              onChange={(e) => setSectionsDraft((prev) => ({ ...prev, [section.key]: e.target.value }))}
              disabled={!canEditSections}
              fullWidth
            />
          ))}
        </Box>

        {canEditSections ? (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
            <Button variant="contained" onClick={handleSaveSections} disabled={isSavingSections}>
              {isSavingSections ? 'Saving...' : 'Save Data Migration Strategy'}
            </Button>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 1.5 }}>Only admins can edit strategy sections.</Alert>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>Project Role Assignments (Read Only)</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
          <TextField label="Lead" value={strategy.roles.leadUserId || 'Unassigned'} InputProps={{ readOnly: true }} />
          <TextField label="Project Manager" value={strategy.roles.projectManagerUserId || 'Unassigned'} InputProps={{ readOnly: true }} />
        </Box>
        <Box sx={{ mt: 1.25 }}>
          <Button variant="outlined" onClick={onEditProject}>Open Existing Role Assignment Modal</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>Workflow Approval</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={`Lead: ${strategy.approvals.leadApproved ? 'Approved' : 'Pending'}`} color={strategy.approvals.leadApproved ? 'success' : 'default'} />
          <Chip label={`Project Manager: ${strategy.approvals.projectManagerApproved ? 'Approved' : 'Pending'}`} color={strategy.approvals.projectManagerApproved ? 'success' : 'default'} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
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
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>Supporting Documentation Uploads</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr auto' }, gap: 1, alignItems: 'center', mb: 1.5 }}>
          <TextField
            select
            label="Document Type"
            value={uploadDocType}
            onChange={(e) => setUploadDocType(e.target.value)}
            size="small"
            disabled={!canUploadDocs}
          >
            <MenuItem value="cycle_report">Cycle Report</MenuItem>
            <MenuItem value="validation_results">Validation Results</MenuItem>
            <MenuItem value="signoff_document">Sign-Off Document</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          <TextField
            select
            label="Related Mock Cycle"
            value={uploadCycleId}
            onChange={(e) => setUploadCycleId(e.target.value)}
            size="small"
            disabled={!canUploadDocs}
          >
            <MenuItem value="">Project Level</MenuItem>
            {data.mockCycles.map((cycle) => (
              <MenuItem key={cycle.id} value={cycle.id}>{cycle.name}</MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" component="label" disabled={!canUploadDocs}>
            {uploadFile ? uploadFile.name : 'Choose File'}
            <input type="file" hidden onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
          </Button>
          <Button variant="contained" onClick={handleUpload} disabled={!canUploadDocs || !uploadFile || isUploading}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gap: 1 }}>
          {data.documents.length === 0 && <Typography variant="body2" color="text.secondary">No documents uploaded yet.</Typography>}
          {data.documents.map((doc) => (
            <Card key={doc.id} variant="outlined">
              <CardContent sx={{ py: '10px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{doc.file_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {doc.document_type} • {formatBytes(doc.file_size)} • {doc.mock_cycle_name || 'Project Level'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => handleDownloadDocument(doc.id, doc.file_name)}>Download</Button>
                    {canUploadDocs && (
                      <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteDocument(doc.id)}>Delete</Button>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>Mock Cycles (Read Only)</Typography>
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {data.mockCycles.map((cycle) => {
            const workflow = cycleWorkflowById.get(cycle.id);
            const entryItems = workflow?.criteria?.entry || [];
            const exitItems = workflow?.criteria?.exit || [];
            return (
              <Card key={cycle.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{cycle.name}</Typography>
                    <Button size="small" variant="outlined" onClick={() => onEditCycle(cycle.id)}>
                      Open Existing Mock Cycle Modal
                    </Button>
                  </Box>

                  <Typography variant="caption" color="text.secondary">Entry Criteria</Typography>
                  <Box sx={{ mb: 1 }}>
                    {entryItems.length === 0 && <Typography variant="body2" color="text.secondary">No entry criteria.</Typography>}
                    {entryItems.map((item: any) => (
                      <Typography key={`${cycle.id}-entry-${item.key}`} variant="body2">• {item.label}</Typography>
                    ))}
                  </Box>

                  <Typography variant="caption" color="text.secondary">Exit Criteria</Typography>
                  <Box sx={{ mb: 1 }}>
                    {exitItems.length === 0 && <Typography variant="body2" color="text.secondary">No exit criteria.</Typography>}
                    {exitItems.map((item: any) => (
                      <Typography key={`${cycle.id}-exit-${item.key}`} variant="body2">• {item.label}</Typography>
                    ))}
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                    <TextField
                      label="Load Metrics"
                      value={`Scope ${workflow?.metrics?.totalRecordsScope ?? 0}, Invalid ${workflow?.metrics?.invalidRecords ?? 0}, Attempted ${workflow?.metrics?.recordsAttempted ?? 0}, Errors ${workflow?.metrics?.loadErrors ?? 0}, Loaded ${workflow?.metrics?.recordsLoaded ?? 0}`}
                      InputProps={{ readOnly: true }}
                      multiline
                      minRows={2}
                    />
                    <TextField
                      label="Target Load Percentages"
                      value={`Success Target ${workflow?.targets?.successRate ?? 95}% | Coverage Target ${workflow?.targets?.coverageRate ?? 95}%`}
                      InputProps={{ readOnly: true }}
                      multiline
                      minRows={2}
                    />
                    <TextField
                      label="Approval Status"
                      value={`Lead ${workflow?.approvals?.leadApproved ? 'Approved' : 'Pending'} | PM ${workflow?.approvals?.projectManagerApproved ? 'Approved' : 'Pending'}`}
                      InputProps={{ readOnly: true }}
                      multiline
                      minRows={2}
                    />
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
};

export default DataMigrationStrategyView;
