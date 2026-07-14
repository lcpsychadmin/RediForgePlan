import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import type {
  DatabricksIntegrationSettings,
  MetadataSyncFrequency,
  SettingsProjectOption,
} from '../../types/integrationSettings';

interface DatabricksSettingsProps {
  globalDefaults: DatabricksIntegrationSettings;
  projectOverrides: Record<string, Partial<DatabricksIntegrationSettings>>;
  selectedProjectId: string;
  projects: SettingsProjectOption[];
  catalogs: string[];
  schemas: string[];
  isTestingConnection: boolean;
  onGlobalChange: (patch: Partial<DatabricksIntegrationSettings>) => void;
  onOverrideChange: (projectId: string, patch: Partial<DatabricksIntegrationSettings>) => void;
  onSelectProject: (projectId: string) => void;
  onTestConnection: () => void;
  onRefreshCatalogs: () => void;
  onRefreshSchemas: () => void;
}

const FREQUENCY_OPTIONS: MetadataSyncFrequency[] = ['manual', 'daily', 'weekly'];

const DatabricksSettings: React.FC<DatabricksSettingsProps> = ({
  globalDefaults,
  projectOverrides,
  selectedProjectId,
  projects,
  catalogs,
  schemas,
  isTestingConnection,
  onGlobalChange,
  onOverrideChange,
  onSelectProject,
  onTestConnection,
  onRefreshCatalogs,
  onRefreshSchemas,
}) => {
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;
  const selectedOverride = selectedProjectId ? (projectOverrides[selectedProjectId] || {}) : {};

  const effectiveSettings: DatabricksIntegrationSettings = {
    ...globalDefaults,
    ...(selectedProjectId ? selectedOverride : {}),
  };

  const setOverrideOrGlobal = (patch: Partial<DatabricksIntegrationSettings>) => {
    if (selectedProjectId) {
      onOverrideChange(selectedProjectId, patch);
    } else {
      onGlobalChange(patch);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ViewInArIcon sx={{ color: '#4FC3F7' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Databricks Integration</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={onRefreshCatalogs} sx={{ textTransform: 'none' }}>List Catalogs</Button>
          <Button size="small" variant="outlined" onClick={onRefreshSchemas} sx={{ textTransform: 'none' }}>List Schemas</Button>
          <Button
            size="small"
            variant="contained"
            onClick={onTestConnection}
            disabled={isTestingConnection}
            sx={{ textTransform: 'none' }}
          >
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Scope</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, alignItems: 'center' }}>
          <Alert severity="info" sx={{ py: 0.5 }}>
            {selectedProject ? `Editing override for ${selectedProject.name}` : 'Editing global defaults'}
          </Alert>
          <TextField
            select
            size="small"
            label="Project Override"
            value={selectedProjectId}
            onChange={(e) => onSelectProject(e.target.value)}
          >
            <MenuItem value="">Global Defaults</MenuItem>
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.programName ? `${project.programName} - ${project.name}` : project.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Paper>

      <Paper sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Connection Settings</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
          <TextField
            size="small"
            label="Server Hostname"
            value={effectiveSettings.serverHostname}
            onChange={(e) => setOverrideOrGlobal({ serverHostname: e.target.value })}
            placeholder="dbc-66ee8566-3d5b.cloud.databricks.com"
          />
          <TextField
            size="small"
            label="HTTP Path"
            value={effectiveSettings.httpPath}
            onChange={(e) => setOverrideOrGlobal({ httpPath: e.target.value })}
            placeholder="/sql/1.0/warehouses/3c09c759117707af"
          />
          <TextField
            size="small"
            type="password"
            label="Personal Access Token"
            value={effectiveSettings.personalAccessToken}
            onChange={(e) => setOverrideOrGlobal({ personalAccessToken: e.target.value })}
            placeholder="dapi..."
          />
          <TextField
            size="small"
            label="Workspace URL (Optional)"
            value={effectiveSettings.workspaceUrl}
            onChange={(e) => setOverrideOrGlobal({ workspaceUrl: e.target.value })}
            placeholder="https://dbc-66ee8566-3d5b.cloud.databricks.com"
          />
          <TextField
            size="small"
            label="Default Catalog"
            value={effectiveSettings.defaultCatalog}
            onChange={(e) => setOverrideOrGlobal({ defaultCatalog: e.target.value })}
          />
          <TextField
            size="small"
            label="Default Schema"
            value={effectiveSettings.defaultSchema}
            onChange={(e) => setOverrideOrGlobal({ defaultSchema: e.target.value })}
          />
          <TextField
            select
            size="small"
            label="Metadata Sync Frequency"
            value={effectiveSettings.metadataSyncFrequency}
            onChange={(e) => setOverrideOrGlobal({ metadataSyncFrequency: e.target.value as MetadataSyncFrequency })}
          >
            {FREQUENCY_OPTIONS.map((frequency) => (
              <MenuItem key={frequency} value={frequency}>{frequency}</MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={effectiveSettings.metadataSyncEnabled}
                onChange={(e) => setOverrideOrGlobal({ metadataSyncEnabled: e.target.checked })}
              />
            }
            label="Enable Metadata Sync"
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Dynamic Metadata</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Catalogs</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
              {catalogs.length === 0 && <Typography variant="body2" color="text.secondary">No catalogs loaded.</Typography>}
              {catalogs.map((catalog) => (
                <Chip
                  key={catalog}
                  label={catalog}
                  variant="outlined"
                  onClick={() => setOverrideOrGlobal({ defaultCatalog: catalog })}
                  sx={{ borderColor: 'primary.main', color: 'primary.main' }}
                />
              ))}
            </Box>
          </Box>
          <Divider />
          <Box>
            <Typography variant="caption" color="text.secondary">Schemas</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
              {schemas.length === 0 && <Typography variant="body2" color="text.secondary">No schemas loaded.</Typography>}
              {schemas.map((schema) => (
                <Chip
                  key={schema}
                  label={schema}
                  variant="outlined"
                  onClick={() => setOverrideOrGlobal({ defaultSchema: schema })}
                  sx={{ borderColor: 'primary.main', color: 'primary.main' }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Global Defaults</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Setting</TableCell>
              <TableCell>Global</TableCell>
              <TableCell>{selectedProject ? 'Project Override' : 'Project Override'}</TableCell>
              <TableCell>Effective</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Server Hostname</TableCell>
              <TableCell>{globalDefaults.serverHostname || '-'}</TableCell>
              <TableCell>{selectedProjectId ? (selectedOverride.serverHostname || '-') : '-'}</TableCell>
              <TableCell>{effectiveSettings.serverHostname || '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>HTTP Path</TableCell>
              <TableCell>{globalDefaults.httpPath || '-'}</TableCell>
              <TableCell>{selectedProjectId ? (selectedOverride.httpPath || '-') : '-'}</TableCell>
              <TableCell>{effectiveSettings.httpPath || '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Default Catalog</TableCell>
              <TableCell>{globalDefaults.defaultCatalog || '-'}</TableCell>
              <TableCell>{selectedProjectId ? (selectedOverride.defaultCatalog || '-') : '-'}</TableCell>
              <TableCell>{effectiveSettings.defaultCatalog || '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Default Schema</TableCell>
              <TableCell>{globalDefaults.defaultSchema || '-'}</TableCell>
              <TableCell>{selectedProjectId ? (selectedOverride.defaultSchema || '-') : '-'}</TableCell>
              <TableCell>{effectiveSettings.defaultSchema || '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Metadata Sync Frequency</TableCell>
              <TableCell>{globalDefaults.metadataSyncFrequency}</TableCell>
              <TableCell>{selectedProjectId ? (selectedOverride.metadataSyncFrequency || '-') : '-'}</TableCell>
              <TableCell>{effectiveSettings.metadataSyncFrequency}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default DatabricksSettings;
