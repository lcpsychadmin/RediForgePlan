import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import DbtLogoIcon from '../icons/DbtLogoIcon';
import type {
  DbtEnvironment,
  DbtIntegrationSettings,
  SettingsProjectOption,
} from '../../types/integrationSettings';

interface DbtSettingsProps {
  globalDefaults: DbtIntegrationSettings;
  projectOverrides: Record<string, Partial<DbtIntegrationSettings>>;
  selectedProjectId: string;
  projects: SettingsProjectOption[];
  modelNames: string[];
  isValidatingPaths: boolean;
  onGlobalChange: (patch: Partial<DbtIntegrationSettings>) => void;
  onOverrideChange: (projectId: string, patch: Partial<DbtIntegrationSettings>) => void;
  onSelectProject: (projectId: string) => void;
  onValidatePaths: () => void;
  onRefreshModels: () => void;
}

const ENV_OPTIONS: DbtEnvironment[] = ['dev', 'test', 'prod'];

const DbtSettings: React.FC<DbtSettingsProps> = ({
  globalDefaults,
  projectOverrides,
  selectedProjectId,
  projects,
  modelNames,
  isValidatingPaths,
  onGlobalChange,
  onOverrideChange,
  onSelectProject,
  onValidatePaths,
  onRefreshModels,
}) => {
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;
  const selectedOverride = selectedProjectId ? (projectOverrides[selectedProjectId] || {}) : {};

  const effectiveSettings: DbtIntegrationSettings = {
    ...globalDefaults,
    ...(selectedProjectId ? selectedOverride : {}),
  };

  const setOverrideOrGlobal = (patch: Partial<DbtIntegrationSettings>) => {
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
          <DbtLogoIcon size={18} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>dbt Integration</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={onRefreshModels} sx={{ textTransform: 'none' }}>List Models</Button>
          <Button
            size="small"
            variant="contained"
            onClick={onValidatePaths}
            disabled={isValidatingPaths}
            sx={{ textTransform: 'none' }}
          >
            {isValidatingPaths ? 'Validating...' : 'Validate Paths'}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.08)' }}>
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

      <Paper sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Project Settings</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
          <TextField
            size="small"
            label="dbt Project Root Path"
            value={effectiveSettings.dbtProjectRootPath}
            onChange={(e) => setOverrideOrGlobal({ dbtProjectRootPath: e.target.value })}
            placeholder="/workspace/repo"
          />
          <TextField
            size="small"
            label="dbt Profiles Path"
            value={effectiveSettings.dbtProfilesPath}
            onChange={(e) => setOverrideOrGlobal({ dbtProfilesPath: e.target.value })}
            placeholder="~/.dbt/profiles.yml"
          />
          <TextField
            size="small"
            label="Target Profile Name"
            value={effectiveSettings.targetProfileName}
            onChange={(e) => setOverrideOrGlobal({ targetProfileName: e.target.value })}
          />
          <TextField
            select
            size="small"
            label="Environment"
            value={effectiveSettings.environment}
            onChange={(e) => setOverrideOrGlobal({ environment: e.target.value as DbtEnvironment })}
          >
            {ENV_OPTIONS.map((env) => (
              <MenuItem key={env} value={env}>{env}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Common Data Model Folder Path"
            value={effectiveSettings.canonicalModelFolderPath}
            onChange={(e) => setOverrideOrGlobal({ canonicalModelFolderPath: e.target.value })}
          />
          <TextField
            size="small"
            label="Target Projection Folder Path"
            value={effectiveSettings.targetProjectionFolderPath}
            onChange={(e) => setOverrideOrGlobal({ targetProjectionFolderPath: e.target.value })}
          />
          <FormControlLabel
            control={
              <Switch
                checked={effectiveSettings.enableCanonicalLayer}
                onChange={(e) => setOverrideOrGlobal({ enableCanonicalLayer: e.target.checked })}
              />
            }
            label="Enable Common Data Model Layer"
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Discovered Models</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {modelNames.length === 0 && <Typography variant="body2" color="text.secondary">No models loaded.</Typography>}
          {modelNames.map((modelName) => (
            <Chip
              key={modelName}
              label={modelName}
              variant="outlined"
              sx={{ borderColor: 'primary.main', color: 'primary.main' }}
            />
          ))}
        </Box>
      </Paper>

      <Paper sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Global Defaults</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Setting</TableCell>
              <TableCell>Global</TableCell>
              <TableCell>Project Override</TableCell>
              <TableCell>Effective</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Project Root Path</TableCell>
              <TableCell>{globalDefaults.dbtProjectRootPath || '-'}</TableCell>
              <TableCell>{selectedProjectId ? (selectedOverride.dbtProjectRootPath || '-') : '-'}</TableCell>
              <TableCell>{effectiveSettings.dbtProjectRootPath || '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Profiles Path</TableCell>
              <TableCell>{globalDefaults.dbtProfilesPath || '-'}</TableCell>
              <TableCell>{selectedProjectId ? (selectedOverride.dbtProfilesPath || '-') : '-'}</TableCell>
              <TableCell>{effectiveSettings.dbtProfilesPath || '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Environment</TableCell>
              <TableCell>{globalDefaults.environment}</TableCell>
              <TableCell>{selectedProjectId ? (selectedOverride.environment || '-') : '-'}</TableCell>
              <TableCell>{effectiveSettings.environment}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Common Data Model Layer</TableCell>
              <TableCell>{globalDefaults.enableCanonicalLayer ? 'Enabled' : 'Disabled'}</TableCell>
              <TableCell>{selectedProjectId ? (selectedOverride.enableCanonicalLayer === undefined ? '-' : (selectedOverride.enableCanonicalLayer ? 'Enabled' : 'Disabled')) : '-'}</TableCell>
              <TableCell>{effectiveSettings.enableCanonicalLayer ? 'Enabled' : 'Disabled'}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default DbtSettings;
