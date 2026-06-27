// client/src/pages/InventoryPage.tsx

import React, { useState } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import PageContainer from '../layout/PageContainer';
import ContentHeader from '../layout/ContentHeader';
import { ExportMenu } from '../components/export';
import InventoryFilters from '../components/inventory/InventoryFilters';
import InventoryTable from '../components/inventory/InventoryTable';
import { useProjectObjects } from '../hooks/useProjectObjects';
import { useParams } from 'react-router-dom';
import { useFilter } from '../contexts/FilterContext';

const InventoryPage: React.FC = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const { selectedProjectId: contextProjectId } = useFilter();
  // Prefer route param (project workspace context), fall back to global filter
  const projectId = routeProjectId || contextProjectId || undefined;
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data: objects = [], isLoading, error } = useProjectObjects(projectId!, {
    status: filters.status,
    processArea: filters.processArea,
  });

  if (!projectId) {
    return <Alert severity="info">Select a project using the filter above to view inventory.</Alert>;
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleExport = (format: 'csv' | 'excel') => {
    let content = '';
    const headers = [
      'Object ID',
      'Description',
      'Process Area',
      'Complexity',
      'Build Type',
      'Status',
      'DRA',
      'Developer',
    ];

    if (format === 'csv') {
      content = headers.join(',') + '\n';
      objects.forEach((obj) => {
        content += [
          obj.objectId,
          `"${obj.description || ''}"`,
          obj.processArea,
          obj.complexity,
          obj.buildType,
          obj.status,
          obj.draUserId || '',
          obj.developerUserId || '',
        ].join(',') + '\n';
      });
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory.${format === 'csv' ? 'csv' : 'xlsx'}`;
    a.click();
  };

  return (
    <PageContainer>
      <ContentHeader
        title="Inventory"
        stats={[{ label: 'Total Objects', value: objects.length }]}
        actions={projectId ? <ExportMenu projectId={projectId} variant="icon" /> : null}
      />

      <Box sx={{ mb: 3 }}>
        <InventoryFilters filters={filters} onFilterChange={handleFilterChange} onExport={handleExport} />
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error.message}</Alert>
      ) : (
        <InventoryTable objects={objects} />
      )}
    </PageContainer>
  );
};

export default InventoryPage;
