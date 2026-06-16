// client/src/components/inventory/InventoryFilters.tsx

import React from 'react';
import { Box, Stack, TextField, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

interface InventoryFiltersProps {
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onExport?: (format: 'csv' | 'excel') => void;
}

const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filters,
  onFilterChange,
  onExport,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
          <TextField
            label="Process Area"
            value={filters.processArea || ''}
            onChange={(e) => onFilterChange('processArea', e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />

          <TextField
            label="Status"
            value={filters.status || ''}
            onChange={(e) => onFilterChange('status', e.target.value)}
            select
            SelectProps={{ native: true }}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <option value="">All Statuses</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="complete">Complete</option>
          </TextField>

          <TextField
            label="Complexity"
            value={filters.complexity || ''}
            onChange={(e) => onFilterChange('complexity', e.target.value)}
            select
            SelectProps={{ native: true }}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <option value="">All Complexities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </TextField>

          {onExport && (
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<DownloadIcon />}
                onClick={() => onExport('csv')}
                size="small"
              >
                CSV
              </Button>
              <Button
                startIcon={<DownloadIcon />}
                onClick={() => onExport('excel')}
                size="small"
              >
                Excel
              </Button>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default InventoryFilters;
