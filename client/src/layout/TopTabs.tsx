// client/src/layout/TopTabs.tsx

import React from 'react';
import { Box, Tabs, Tab, useTheme, useMediaQuery } from '@mui/material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { palette } from '../theme/palette';

interface TopTabsProps {
  projectId?: string;
}

const TopTabs: React.FC<TopTabsProps> = ({ projectId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!projectId) {
    return null;
  }

  const tabs = [
    { label: 'Plan', path: `plan` },
    { label: 'Inventory', path: `inventory` },
    { label: 'Priorities', path: `priorities` },
    { label: 'Schedule', path: `schedule` },
    { label: 'Reporting', path: `reporting` },
  ];

  const getCurrentTab = () => {
    for (let i = 0; i < tabs.length; i++) {
      if (location.pathname.includes(tabs[i].path)) {
        return i;
      }
    }
    return 0;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    navigate(tabs[newValue].path);
  };

  return (
    <Box
      sx={{
        backgroundColor: palette.background.paper,
        borderBottom: `1px solid ${palette.divider}`,
      }}
    >
      <Tabs
        value={getCurrentTab()}
        onChange={handleTabChange}
        aria-label="project tabs"
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons={isMobile ? 'auto' : undefined}
        sx={{
          '& .MuiTabs-indicator': {
            height: 3,
            backgroundColor: palette.primary.main,
          },
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.path}
            label={tab.label}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.95rem',
              color: palette.text.secondary,
              transition: theme.transitions.create(['color', 'background-color']),
              '&:hover': {
                color: palette.text.primary,
                backgroundColor: `${palette.primary.main}08`,
              },
              '&.Mui-selected': {
                color: palette.primary.main,
                fontWeight: 600,
              },
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default TopTabs;
