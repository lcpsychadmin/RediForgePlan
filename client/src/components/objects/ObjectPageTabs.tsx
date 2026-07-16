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

  const tabs = [
    { label: 'Overview', path: `/objects/${objectId}` },
    { label: 'Applications', path: `/objects/${objectId}/applications` },
    { label: 'Common Data Model', path: `/objects/${objectId}/cdm` },
    { label: 'Relationships', path: `/objects/${objectId}/relationships` },
    ...(showAiOverrides ? [{ label: 'AI Overrides', path: `/objects/${objectId}/ai-overrides` }] : []),
  ];

  const activePath = tabs.find((tab) => location.pathname === tab.path)?.path || tabs[0].path;

  return (
    <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.12)', mb: 2 }}>
      <Tabs
        value={activePath}
        onChange={(_e, path) => navigate(path)}
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
