/**
 * Header/Navbar Component
 * Redesigned to match the requested header layout:
 * - Elongated search pill
 * - Outlined notifications with dot badge
 * - Moon (dark mode) toggle icon
 * - Vertical divider line
 * - User name + uppercase role text aligned next to the maroon-bordered avatar.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { dashboardAPI } from '../../services/api';
import {
  AppBar, Toolbar, IconButton, Badge, Box, Menu, MenuItem,
  Typography, Avatar, Divider, ListItemText, ListItemIcon, Tooltip, useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import AccountCircle from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import WarningIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import { useKeyboardShortcut } from '../../hooks/useDebounce';

const Header = () => {
  const { user, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen, setSearchOpen, toggleTheme } = useApp();
  const navigate = useNavigate();
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = useState(null);
  const [notiAnchorEl, setNotiAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Fetch low stock notifications for the dashboard dropdown
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await dashboardAPI.get();
        const alerts = [];

        // Low stock alerts
        if (data.lowStockSarees && data.lowStockSarees.length > 0) {
          data.lowStockSarees.forEach(s => {
            alerts.push({
              id: s.id,
              type: s.current_stock === 0 ? 'out' : 'low',
              title: s.current_stock === 0 ? 'Out of Stock' : 'Low Stock Alert',
              message: `${s.sari_name} (${s.series_code}) has ${s.current_stock} pcs left.`,
              time: 'Just now'
            });
          });
        }
        setNotifications(alerts);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // 30s refresh
      return () => clearInterval(interval);
    }
  }, [user]);

  // Global search shortcut Ctrl + K
  useKeyboardShortcut('k', true, () => {
    setSearchOpen(true);
  });

  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);

  const handleNotiMenuOpen = (event) => setNotiAnchorEl(event.currentTarget);
  const handleNotiMenuClose = () => setNotiAnchorEl(null);

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
    navigate('/login');
  };

  const handleNotificationClick = (sareeId) => {
    handleNotiMenuClose();
    navigate(`/sarees/${sareeId}`);
  };

  const isLight = theme.palette.mode === 'light';

  return (
    <AppBar position="sticky" sx={{
      bgcolor: 'background.paper',
      color: 'text.primary',
      boxShadow: 'none',
      borderBottom: '1px solid',
      borderColor: 'divider',
      zIndex: theme.zIndex.drawer + 1
    }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: 3, minHeight: 64 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Menu Toggle for all screens */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <MenuIcon />
          </IconButton>

          {/* Search Trigger Bar — styled as pill input from the image */}
          <Box
            component="button"
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Open global search"
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: isLight ? '#FAF8F5' : 'rgba(255, 255, 255, 0.04)',
              borderRadius: '99px',
              px: 2.5,
              py: 0.9,
              width: { xs: 180, sm: 380, md: 450 },
              cursor: 'pointer',
              border: '1px solid #EAE6E1',
              transition: 'all 0.15s ease',
              font: 'inherit',
              color: 'text.primary',
              textAlign: 'left',
              appearance: 'none',
              '&:hover': {
                bgcolor: isLight ? '#F5F2EC' : 'rgba(255, 255, 255, 0.06)',
                borderColor: '#DFD9D0'
              }
            }}
          >
            <SearchIcon sx={{ color: 'text.secondary', mr: 1.5, fontSize: 18 }} />
            <Typography
              component="span"
              sx={{
                fontSize: '0.82rem',
                flex: 1,
                color: '#7C726A',
                fontWeight: 500,
                pointerEvents: 'none',
                userSelect: 'none'
              }}
            >
              Search orders, SKU, or fabrics...
            </Typography>
            <Typography component="span" variant="caption" sx={{
              display: { xs: 'none', sm: 'inline-block' },
              bgcolor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)',
              px: 1,
              py: 0.2,
              borderRadius: 1.5,
              fontWeight: 700,
              fontSize: '0.62rem',
              color: 'text.secondary'
            }}>
              Ctrl + K
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Notifications Dropdown */}
          <IconButton onClick={handleNotiMenuOpen} sx={{ color: 'text.primary' }}>
            <Badge
              badgeContent={notifications.length}
              color="error"
              variant="dot"
              sx={{ '& .MuiBadge-badge': { width: 8, height: 8, minWidth: 8 } }}
            >
              <NotificationsNoneOutlinedIcon sx={{ fontSize: 22 }} />
            </Badge>
          </IconButton>

          {/* Dark Mode Icon */}
          <IconButton onClick={toggleTheme} sx={{ color: 'text.primary' }}>
            <DarkModeOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>

          {/* Vertical Divider */}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 28, alignSelf: 'center', borderColor: '#EAE6E1' }} />

          {/* User Info & Avatar Circle */}
          <Box
            onClick={handleProfileMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              '&:hover': { opacity: 0.85 }
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary', lineHeight: 1.2 }}>
                {user?.full_name || 'Admin Portal'}
              </Typography>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '0.05em' }}>
                {user?.role?.toUpperCase() || 'ADMINISTRATOR'}
              </Typography>
            </Box>

            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                fontSize: '0.85rem',
                border: '1.5px solid',
                borderColor: '#3B111A'
              }}
            >
              {user?.full_name?.charAt(0) || 'A'}
            </Avatar>
          </Box>
        </Box>
      </Toolbar>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notiAnchorEl}
        open={Boolean(notiAnchorEl)}
        onClose={handleNotiMenuClose}
        slotProps={{
          paper: { sx: { width: 320, maxHeight: 400, mt: 1, borderRadius: 3, boxShadow: 3 } }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Notifications</Typography>
          {notifications.length > 0 && (
            <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
              {notifications.length} Alerts
            </Typography>
          )}
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <MenuItem disabled sx={{ py: 3, justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">All systems healthy. No alerts.</Typography>
          </MenuItem>
        ) : (
          notifications.map((noti) => (
            <MenuItem
              key={noti.id}
              onClick={() => handleNotificationClick(noti.id)}
              sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}
            >
              <ListItemIcon>
                {noti.type === 'out' ? (
                  <ErrorIcon color="error" />
                ) : (
                  <WarningIcon color="warning" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={noti.title}
                secondary={noti.message}
                slotProps={{
                  primary: { fontSize: '0.82rem', fontWeight: 700, color: noti.type === 'out' ? 'error.main' : 'warning.main' },
                  secondary: { fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'normal' }
                }}
              />
            </MenuItem>
          ))
        )}
      </Menu>

      {/* User Account Menu Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        slotProps={{
          paper: { sx: { width: 220, mt: 1, borderRadius: 3, boxShadow: 3 } }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{user?.full_name}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {user?.email || `@${user?.username}`}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}>
          <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>
          <Typography variant="body2">My Settings</Typography>
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Logout</Typography>
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Header;
