// client/src/components/objects/DataObjectDependenciesSection.tsx

import React, { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  TextField,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDependencies, useAddDependency, useRemoveDependency, useGlobalObjects } from '../../api/hooks';
import { ObjectDependency, GlobalObject } from '../../api/types';

interface DataObjectDependenciesSectionProps {
  projectId: string;
  projectObjectId: string;
}

/**
 * Section displaying dependencies for a project object
 * Allows adding and removing dependencies
 */
export const DataObjectDependenciesSection: React.FC<DataObjectDependenciesSectionProps> = ({
  projectId,
  projectObjectId,
}) => {
  const theme = useTheme();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDependency, setSelectedDependency] = useState<GlobalObject | null>(null);

  // Fetch dependencies
  const { data: dependencies = [], isLoading, error } = useDependencies(projectObjectId);

  // Fetch available objects to add as dependencies
  const { data: availableObjects = [], isLoading: objectsLoading } = useGlobalObjects();

  // Mutations
  const { mutate: addDependency, isPending: isAdding } = useAddDependency(projectObjectId);
  const { mutate: removeDependency, isPending: isRemoving } = useRemoveDependency(projectObjectId);

  const handleAddDependency = () => {
    if (selectedDependency) {
      addDependency({
        target_project_object_id: selectedDependency.id,
        dependency_type: 'depends_on',
      });
      setAddDialogOpen(false);
      setSelectedDependency(null);
    }
  };

  const handleRemoveDependency = (dependencyId: string) => {
    removeDependency(dependencyId);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load dependencies: {error.message}</Alert>;
  }

  return (
    <Stack spacing={2}>
      {/* Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
          size="small"
          variant="outlined"
        >
          Add Dependency
        </Button>
      </Box>

      {/* Dependencies List */}
      {dependencies.length === 0 ? (
        <Alert severity="info">No dependencies defined</Alert>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.background.elevated }}>
                <TableCell sx={{ fontWeight: 600 }}>Object ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Dependency Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dependencies.map((dep) => (
                <TableRow key={dep.id} hover>
                  <TableCell>
                    <Chip
                      label={dep.source_id || dep.target_id}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{dep.source_id ? 'Target Object' : 'Source Dependency'}</TableCell>
                  <TableCell>
                    <Chip label={dep.dependency_type || 'depends_on'} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveDependency(dep.id)}
                      title="Remove dependency"
                      disabled={isRemoving}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Add Dependency Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Dependency</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="textSecondary">
              Select an object that this object depends on:
            </Typography>
            <Autocomplete
              options={availableObjects}
              getOptionLabel={(obj) => `${obj.name} (${obj.id})`}
              value={selectedDependency}
              onChange={(_, value) => setSelectedDependency(value)}
              renderInput={(params) => (
                <TextField {...params} label="Select Object" placeholder="Search objects..." />
              )}
              loading={objectsLoading}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddDependency}
            variant="contained"
            disabled={isAdding || !selectedDependency}
          >
            {isAdding ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default DataObjectDependenciesSection;
