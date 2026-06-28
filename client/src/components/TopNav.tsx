import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Menu, MenuItem, Divider, Button, LinearProgress, Badge, useMediaQuery, useTheme } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import ConstructionIcon from '@mui/icons-material/Construction';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import GroupIcon from '@mui/icons-material/Group';
import DownloadIcon from '@mui/icons-material/Download';
import GridViewIcon from '@mui/icons-material/GridView';
import TableChartIcon from '@mui/icons-material/TableChart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/client';

interface TopNavProps {
  onMenuClick: () => void;
  programCount?: number;
  cycleCount?: number;
  objectCount?: number;
  completionPercentage?: number;
  tabValue?: number;
  onTabChange?: (value: number) => void;
  onPeopleClick?: () => void;
}

const executionSubNavItems = [
  { label: 'Plan', icon: <GridViewIcon sx={{ fontSize: '0.95rem' }} />, tabIndex: 0 },
  { label: 'Priorities', icon: <WarningAmberIcon sx={{ fontSize: '0.95rem' }} />, path: '/priorities' },
  { label: 'Schedule', icon: <CalendarMonthIcon sx={{ fontSize: '0.95rem' }} />, path: '/schedule' },
  { label: 'Defects', icon: <WarningAmberIcon sx={{ fontSize: '0.95rem' }} />, path: '/defects' },
  { label: 'My Tasks', icon: <AssignmentTurnedInIcon sx={{ fontSize: '0.95rem' }} />, path: '/my-tasks' },
];

const planningSubNavItems = [
  { label: 'Strategy', icon: <GridViewIcon sx={{ fontSize: '0.95rem' }} />, tabIndex: 0 },
  { label: 'Inventory', icon: <TableChartIcon sx={{ fontSize: '0.95rem' }} />, tabIndex: 1 },
  { label: 'Maintain', icon: <FolderOpenIcon sx={{ fontSize: '0.95rem' }} />, tabIndex: 6 },
];

const TopNav: React.FC<TopNavProps> = ({ 
  onMenuClick, 
  programCount = 0,
  cycleCount = 0,
  objectCount = 0, 
  completionPercentage = 0,
  tabValue = 0,
  onTabChange,
  onPeopleClick
}) => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = React.useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const unopenedCount = React.useMemo(() => {
    const localUnread = notifications.filter(n => !n.isRead).length;
    return localUnread > 0 ? localUnread : unreadCount;
  }, [notifications, unreadCount]);
  const isExecutionPage = location.pathname === '/projects';
  const isPlanningPage = location.pathname === '/planning';
  // All pages that share the execution workspace header + sub-nav pills
  const executionRelatedPaths = ['/projects', '/priorities', '/schedule', '/defects', '/my-tasks'];
  const isExecutionRelated = executionRelatedPaths.includes(location.pathname);
  const isWorkspacePage = isExecutionRelated || isPlanningPage;
  const sectionTitle = isPlanningPage ? 'Planning Workspace' : 'Mock/Cutover Execution';
  const activeSubNavItems = isPlanningPage ? planningSubNavItems : executionSubNavItems;

  const loadNotifications = React.useCallback(() => {
    return apiClient.get('/api/comments/notifications/me').then(r => {
      setNotifications(r.data.notifications || []);
      setUnreadCount(r.data.unreadCount || 0);
    }).catch(() => {});
  }, []);

  // Poll notifications every 30s
  React.useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  const handleLogout = async () => {
    await logout();
    handleMenuClose();
    navigate('/login');
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead) {
      await apiClient.patch(`/api/comments/notifications/${n.id}/read`).catch(() => {});
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    if (n.projectId && n.taskId) {
      sessionStorage.setItem('pendingNotificationTarget', JSON.stringify({
        projectId: n.projectId,
        taskId: n.taskId,
        taskName: n.taskName || 'Task',
      }));
    }

    setNotifAnchorEl(null);
    const taskIdParam = encodeURIComponent(n.taskId || '');
    const projectIdParam = n.projectId ? `&projectId=${encodeURIComponent(n.projectId)}` : '';
    const taskNameParam = n.taskName ? `&taskName=${encodeURIComponent(n.taskName)}` : '';
    navigate(`/projects?openTask=${taskIdParam}${projectIdParam}${taskNameParam}`);
  };

  const handleDismissNotification = async (notificationId: string, isRead: boolean) => {
    await apiClient.delete(`/api/comments/notifications/${notificationId}`).catch(() => {});
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (!isRead) setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleClearNotifications = async () => {
    await apiClient.delete('/api/comments/notifications').catch(() => {});
    setNotifications([]);
    setUnreadCount(0);
    setNotifAnchorEl(null);
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1, sm: 2 } }}>
        {isWorkspacePage ? (
          isMobile ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
              <IconButton color="inherit" size="small" onClick={onMenuClick}>
                <MenuIcon />
              </IconButton>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                {sectionTitle}
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<GroupIcon />}
                onClick={onPeopleClick}
                sx={{ textTransform: 'none', minWidth: 0, px: 1.25, boxShadow: 'none' }}
              >
                People
              </Button>
            </Box>
          ) : (
          <>
            {/* Projects Page Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* Icon and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CompareArrowsIcon sx={{ fontSize: '1.4rem', color: 'secondary.light' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {sectionTitle}
                </Typography>
              </Box>

              {/* Stats Divider */}
              <Box sx={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

              {/* Stats */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ whiteSpace: 'nowrap', opacity: 0.75 }}>
                    Programs:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {programCount}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ whiteSpace: 'nowrap', opacity: 0.75 }}>                    Cycles:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {cycleCount}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ whiteSpace: 'nowrap', opacity: 0.75 }}>                    Objects:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {objectCount}
                  </Typography>
                </Box>
                {/* Progress bar + percentage */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={completionPercentage}
                    sx={{
                      width: 80,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      '& .MuiLinearProgress-bar': { borderRadius: 3 },
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.light', whiteSpace: 'nowrap' }}>
                    {completionPercentage}%
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Spacer */}
            <Box sx={{ flex: 1 }} />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<GroupIcon />}
                onClick={onPeopleClick}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  color: 'white',
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)', boxShadow: 'none' },
                }}
              >
                People
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<DownloadIcon />}
                sx={{ textTransform: 'none', fontWeight: 500 }}
              >
                Export CSV
              </Button>
            </Box>
          </>
          )
        ) : (
          <>
            {/* Default Header */}
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
              RediForge
            </Typography>
          </>
        )}

        {/* Account Menu */}
        <Box>
          {/* Notification Bell */}
          <IconButton color="inherit" onClick={async (e) => { setNotifAnchorEl(e.currentTarget); await loadNotifications(); }}>
            <Badge badgeContent={unopenedCount} color="error" max={99}>
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Menu anchorEl={notifAnchorEl} open={Boolean(notifAnchorEl)} onClose={() => setNotifAnchorEl(null)}
            PaperProps={{ sx: { width: 320, maxHeight: 400 } }}>
            <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Notifications</Typography>
              {notifications.length > 0 && (
                <Button size="small" onClick={handleClearNotifications} sx={{ textTransform: 'none', minWidth: 0, px: 1 }}>
                  Clear all
                </Button>
              )}
            </Box>
            <Divider />
            {notifications.length === 0 ? (
              <MenuItem disabled><Typography variant="body2" color="text.secondary">No notifications</Typography></MenuItem>
            ) : (
              notifications.slice(0, 15).map(n => (
                <MenuItem key={n.id} onClick={() => handleNotificationClick(n)} sx={{ whiteSpace: 'normal', py: 1, alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1, pr: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: n.isRead ? 400 : 700, display: 'block', lineHeight: 1.4 }}>{n.message}</Typography>
                    <Typography variant="caption" color="text.disabled">{new Date(n.createdAt).toLocaleString()}</Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismissNotification(n.id, n.isRead);
                    }}
                    sx={{ opacity: 0.6, mt: -0.25 }}
                    title="Dismiss"
                  >
                    <CloseIcon sx={{ fontSize: '0.85rem' }} />
                  </IconButton>
                </MenuItem>
              ))
            )}
          </Menu>

          <IconButton color="inherit" onClick={handleMenuOpen}>
            <AccountCircleIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            {/* User Info */}
            <MenuItem disabled>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {user?.email || 'User'}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase' }}>
                  {user?.role}
                </Typography>
              </Box>
            </MenuItem>

            <Divider sx={{ my: 1 }} />

            {/* Navigation */}
            <MenuItem
              onClick={() => handleNavigate('/dashboard')}
              selected={isActive('/dashboard')}
              sx={{ display: 'flex', gap: 1 }}
            >
              <DashboardIcon fontSize="small" />
              <Typography variant="body2">Dashboard</Typography>
            </MenuItem>

            <MenuItem
              onClick={() => handleNavigate('/projects')}
              selected={isActive('/projects')}
              sx={{ display: 'flex', gap: 1 }}
            >
              <FolderOpenIcon fontSize="small" />
              <Typography variant="body2">Execution</Typography>
            </MenuItem>

            <MenuItem
              onClick={() => handleNavigate('/planning')}
              selected={isActive('/planning')}
              sx={{ display: 'flex', gap: 1 }}
            >
              <ArchitectureIcon fontSize="small" />
              <Typography variant="body2">Planning</Typography>
            </MenuItem>

            <MenuItem disabled sx={{ display: 'flex', gap: 1, opacity: 0.6 }}>
              <DesignServicesIcon fontSize="small" />
              <Typography variant="body2">Design (Coming Soon)</Typography>
            </MenuItem>

            <MenuItem disabled sx={{ display: 'flex', gap: 1, opacity: 0.6 }}>
              <ConstructionIcon fontSize="small" />
              <Typography variant="body2">Build (Coming Soon)</Typography>
            </MenuItem>

            <MenuItem
              onClick={() => handleNavigate('/settings')}
              selected={isActive('/settings')}
              sx={{ display: 'flex', gap: 1 }}
            >
              <SettingsIcon fontSize="small" />
              <Typography variant="body2">Settings</Typography>
            </MenuItem>

            {/* Admin Section */}
            {user?.role === 'admin' && (
              <>
                <Divider sx={{ my: 1 }} />
                <MenuItem
                  onClick={() => handleNavigate('/admin/users')}
                  selected={isActive('/admin/users')}
                  sx={{ display: 'flex', gap: 1 }}
                >
                  <AdminPanelSettingsIcon fontSize="small" />
                  <Typography variant="body2">User Management</Typography>
                </MenuItem>
              </>
            )}

            <Divider sx={{ my: 1 }} />

            {/* Logout */}
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      {/* Sub-nav for Projects page */}
      {isWorkspacePage && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.75, sm: 0.5 },
            px: { xs: 1, sm: 2 },
            pt: 1,
            pb: 1,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            overflowX: 'auto',
            overflowY: 'hidden',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {activeSubNavItems.map((item, idx) => (
            <Button
              key={idx}
              size="small"
              startIcon={item.icon}
              onClick={() => {
                if (item.path) {
                  navigate(item.path);
                  return;
                }
                if (typeof item.tabIndex === 'number') {
                  onTabChange?.(item.tabIndex);
                }
              }}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                fontSize: { xs: '0.72rem', sm: '0.8rem' },
                borderRadius: '20px',
                px: { xs: 1.1, sm: 1.5 },
                py: 0.4,
                color: 'white',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                '& .MuiButton-startIcon': {
                  display: { xs: 'none', sm: 'inline-flex' },
                  mr: { xs: 0, sm: 0.75 },
                  ml: { xs: 0, sm: -0.5 },
                },
                backgroundColor: (
                  (item.path && location.pathname === item.path) ||
                  (!item.path && typeof item.tabIndex === 'number' && tabValue === item.tabIndex)
                ) ? 'primary.main' : 'rgba(255, 255, 255, 0.08)',
                opacity: 1,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: (
                    (item.path && location.pathname === item.path) ||
                    (!item.path && typeof item.tabIndex === 'number' && tabValue === item.tabIndex)
                  ) ? 'primary.dark' : 'rgba(255, 255, 255, 0.15)',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      )}
    </AppBar>
  );
};

export default TopNav;
