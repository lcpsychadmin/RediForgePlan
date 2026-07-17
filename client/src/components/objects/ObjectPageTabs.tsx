import React from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

interface ObjectPageTabsProps {
  objectId: string;
  showAiOverrides?: boolean;
}

const ObjectPageTabs: React.FC<ObjectPageTabsProps> = ({ objectId, showAiOverrides = true }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const search = location.search || '';

  const tabs = [
    { label: 'Object Inventory', path: `/objects/${objectId}` },
    { label: 'Sub Objects', path: `/objects/${objectId}/sub-objects` },
    { label: 'Application Assignment', path: `/objects/${objectId}/application-assignment` },
    { label: 'Application Schema', path: `/objects/${objectId}/application-schema` },
    { label: 'Object ↔ App Mapping', path: `/objects/${objectId}/application-mapping` },
    { label: 'CDM Builder', path: `/objects/${objectId}/cdm` },
    { label: 'Relationships', path: `/objects/${objectId}/relationships` },
    { label: 'Metadata', path: `/objects/${objectId}/metadata` },
    ...(showAiOverrides ? [{ label: 'AI Overrides', path: `/objects/${objectId}/ai-overrides` }] : []),
  ];

  const activePath = tabs.find((tab) => location.pathname === tab.path)?.path || tabs[0].path;

  return (
    <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.12)', mb: 2 }}>
      <Tabs
        value={activePath}
        onChange={(_e, path) => navigate(`${path}${search}`)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.path}
            value={tab.path}
            label={tab.label}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default ObjectPageTabs;
