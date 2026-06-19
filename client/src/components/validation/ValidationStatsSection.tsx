import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useValidationStats } from '../../api/hooks/useValidationStats';

interface ValidationStatsSectionProps {
  taskId: string;
}

const ValidationStatsSection: React.FC<ValidationStatsSectionProps> = ({ taskId }) => {
  const { data: stats, isLoading, error, saveValidationStats, isSaving } = useValidationStats(taskId);
  const [form, setForm] = React.useState({
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
  });

  React.useEffect(() => {
    if (stats) {
      setForm({
        totalRecords: Number(stats.totalRecords || 0),
        validRecords: Number(stats.validRecords || 0),
        invalidRecords: Number(stats.invalidRecords || 0),
      });
    }
  }, [stats]);

  const handleChange = (field: 'totalRecords' | 'validRecords' | 'invalidRecords', value: string) => {
    const parsed = Number(value);
    setForm((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
    }));
  };

  const handleSave = () => {
    saveValidationStats(form);
  };

  if (!taskId) {
    return <Alert severity="info">Select a validation task to view stats.</Alert>;
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">Failed to load validation stats.</Alert> : null}

      {!isLoading && !stats ? <Alert severity="info">No validation stats yet</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Total Records
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {stats?.totalRecords ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Valid Records
              </Typography>
              <Typography variant="h5" color="success.main" fontWeight={700}>
                {stats?.validRecords ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Invalid Records
              </Typography>
              <Typography variant="h5" color="error.main" fontWeight={700}>
                {stats?.invalidRecords ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={700}>
              Update Validation Stats
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              <TextField
                type="number"
                label="Total Records"
                value={form.totalRecords}
                onChange={(e) => handleChange('totalRecords', e.target.value)}
                inputProps={{ min: 0 }}
                fullWidth
              />
              <TextField
                type="number"
                label="Valid Records"
                value={form.validRecords}
                onChange={(e) => handleChange('validRecords', e.target.value)}
                inputProps={{ min: 0 }}
                fullWidth
              />
              <TextField
                type="number"
                label="Invalid Records"
                value={form.invalidRecords}
                onChange={(e) => handleChange('invalidRecords', e.target.value)}
                inputProps={{ min: 0 }}
                fullWidth
              />
            </Box>
            <Box>
              <Button variant="contained" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default ValidationStatsSection;
