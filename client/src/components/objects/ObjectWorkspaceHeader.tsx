import React from 'react';
import { Breadcrumbs, Box, Button, Link, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';
import apiClient from '../../api/client';
import ObjectPageTabs from './ObjectPageTabs';

interface ObjectWorkspaceHeaderProps {
  objectId: string;
  title: string;
  showTabs?: boolean;
  showAiOverrides?: boolean;
}

const ObjectWorkspaceHeader: React.FC<ObjectWorkspaceHeaderProps> = ({
  objectId,
  title,
  showTabs = true,
  showAiOverrides = true,
}) => {
  const [objectLabel, setObjectLabel] = React.useState(objectId);

  React.useEffect(() => {
    let active = true;

    apiClient.get(`/api/global-objects/${objectId}`)
      .then((res) => {
        if (!active) return;
        const row = res.data?.data || {};
        setObjectLabel(row.objectId || row.object_id || objectId);
      })
      .catch(() => {
        if (!active) return;
        setObjectLabel(objectId);
      });

    return () => {
      active = false;
    };
  }, [objectId]);

  return (
    <Box className="object-workspace-header" sx={{ mb: 2.5 }}>
      <Button
        component={RouterLink}
        to="/object-inventory"
        startIcon={<ArrowBackIcon sx={{ fontSize: '1rem' }} />}
        className="object-workspace-back-link"
        sx={{ textTransform: 'none', px: 0, mb: 0.75, color: 'text.secondary' }}
      >
        Back to Object Inventory
      </Button>

      <Breadcrumbs
        className="object-workspace-breadcrumbs"
        separator="/"
        sx={{ mb: 1, '& .MuiBreadcrumbs-separator': { color: 'text.disabled' } }}
      >
        <Link
          component={RouterLink}
          underline="hover"
          to="/object-inventory"
          sx={{ color: 'text.secondary', fontSize: '0.82rem' }}
        >
          Object Inventory
        </Link>
        <Typography sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.82rem' }}>
          {objectLabel}
        </Typography>
      </Breadcrumbs>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5 }}>
        {title}
      </Typography>

      {showTabs && (
        <Box className="object-workspace-tabs">
          <ObjectPageTabs objectId={objectId} showAiOverrides={showAiOverrides} />
        </Box>
      )}
    </Box>
  );
};

export default ObjectWorkspaceHeader;
