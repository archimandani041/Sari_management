/**
 * Sidebar Navigation Component — "RestroBit" style
 * Grouped sections, orange active pill, brand logo, user profile, light/dark aware.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Avatar, Chip, IconButton, useMediaQuery, useTheme
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SareeIcon from '@mui/icons-material/Checkroom';
import AddIcon from '@mui/icons-material/AddCircle';
import LowStockIcon from '@mui/icons-material/WarningAmber';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

const DRAWER_WIDTH = 264;

// Grouped nav — sections rendered with muted uppercase headers
const navSections = [
  {
    heading: 'Main',
    items: [
      { label: 'Dashboard', path: '/', icon: <DashboardIcon />, roles: ['admin', 'staff'] },
      { label: 'All Sarees', path: '/sarees', icon: <SareeIcon />, roles: ['admin', 'staff'] },
      { label: 'Advanced Search', path: '/search', icon: <SearchIcon />, roles: ['admin', 'staff'] },
    ],
  },
  {
    heading: 'Inventory',
    items: [
      { label: 'Add Saree', path: '/sarees/add', icon: <AddIcon />, roles: ['admin'] },
      { label: 'Low Stock', path: '/low-stock', icon: <LowStockIcon />, roles: ['admin', 'staff'], badge: true },
      { label: 'Stock History', path: '/history', icon: <HistoryIcon />, roles: ['admin', 'staff'] },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Suppliers', path: '/suppliers', icon: <PeopleIcon />, roles: ['admin', 'staff'] },
      { label: 'Stock Requests', path: '/stock-requests', icon: <WhatsAppIcon />, roles: ['admin', 'staff'] },
    ],
  },
  {
    heading: 'Back Office',
    items: [
      { label: 'Settings', path: '/settings', icon: <SettingsIcon />, roles: ['admin'] },
    ],
  },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { sidebarOpen, setSidebarOpen, themeMode, toggleTheme } = useApp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isLight = themeMode === 'light';

  const sidebarBg = theme.palette.sidebar?.bg || (isLight ? '#FFFFFF' : '#141210');
  const mutedText = isLight ? '#9E8E7A' : '#8A7C6A';
  const idleText  = isLight ? '#2E2A24' : '#D8CABA';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isItemActive = (path) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const drawerContent = (
    <Box sx={{
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
      bgcolor: sidebarBg,
      borderRight: `1px solid ${theme.palette.divider}`,
    }}>
      {/* Brand */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 68 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: '11px',
            background: 'linear-gradient(135deg, #C0AD8D 0%, #A16D47 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(161,109,71,0.40)',
          }}>
            <StorefrontIcon sx={{ color: '#fff', fontSize: '1.25rem' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.1, color: 'text.primary', letterSpacing: '-0.02em' }}>
              Sari<Box component="span" sx={{ color: 'primary.main' }}>Stock</Box>
            </Typography>
            <Typography sx={{ fontSize: '0.62rem', color: mutedText, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Management
            </Typography>
          </Box>
        </Box>
        {isMobile && (
          <IconButton onClick={() => setSidebarOpen(false)} sx={{ color: 'text.secondary' }}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      {/* User profile */}
      <Box sx={{
        mx: 2, mb: 1, px: 1.5, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.25,
        borderRadius: '14px',
        bgcolor: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${theme.palette.divider}`,
      }}>
        <Avatar sx={{
          width: 38, height: 38, fontSize: '0.9rem', fontWeight: 700, color: '#fff',
          background: 'linear-gradient(135deg, #C0AD8D 0%, #A16D47 100%)',
        }}>
          {user?.full_name?.charAt(0) || 'U'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.83rem', color: 'text.primary' }} noWrap>
            {user?.full_name || 'User'}
          </Typography>
          <Typography sx={{ fontSize: '0.68rem', color: mutedText, textTransform: 'capitalize' }} noWrap>
            {user?.role || 'staff'} account
          </Typography>
        </Box>
        <Chip
          label={user?.role?.toUpperCase() || 'STAFF'}
          size="small"
          sx={{
            height: 18, fontSize: '0.58rem', fontWeight: 700,
            bgcolor: isAdmin ? 'primary.main' : (isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)'),
            color: isAdmin ? '#fff' : 'text.secondary',
          }}
        />
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 0.5 }}>
        {navSections.map((section) => {
          const items = section.items.filter(item => item.roles.includes(user?.role));
          if (items.length === 0) return null;
          return (
            <Box key={section.heading} sx={{ mb: 1.5 }}>
              <Typography sx={{
                px: 1.5, mb: 0.5, fontSize: '0.62rem', fontWeight: 700,
                letterSpacing: '0.09em', textTransform: 'uppercase', color: mutedText,
              }}>
                {section.heading}
              </Typography>
              <List sx={{ p: 0 }}>
                {items.map((item) => {
                  const active = isItemActive(item.path);
                  return (
                    <ListItemButton
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        if (isMobile) setSidebarOpen(false);
                      }}
                      sx={{
                        position: 'relative',
                        borderRadius: '11px',
                        py: 0.9, px: 1.5, mb: 0.25, minHeight: 42,
                        bgcolor: active ? 'sidebar.active' : 'transparent',
                        color: active ? 'primary.main' : idleText,
                        '&::before': active ? {
                          content: '""', position: 'absolute', left: 0, top: '22%', bottom: '22%',
                          width: 3, borderRadius: 3, bgcolor: 'primary.main',
                        } : {},
                        '&:hover': {
                          bgcolor: active ? 'sidebar.active' : (isLight ? '#F1F5F9' : 'rgba(255,255,255,0.04)'),
                        },
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <ListItemIcon sx={{
                        minWidth: 34, color: active ? 'primary.main' : mutedText,
                        '& .MuiSvgIcon-root': { fontSize: '1.2rem' },
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        slotProps={{ primary: { fontSize: '0.83rem', fontWeight: active ? 700 : 500 } }}
                      />
                      {item.badge && (
                        <Chip label="!" size="small" color="error"
                          sx={{ height: 18, fontSize: '0.6rem', minWidth: 18, px: 0, fontWeight: 800 }} />
                      )}
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>

      {/* Footer actions */}
      <Box sx={{ p: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
        <ListItemButton onClick={toggleTheme} sx={{ borderRadius: '11px', py: 0.8, mb: 0.5, color: idleText }}>
          <ListItemIcon sx={{ minWidth: 34, color: mutedText }}>
            {isLight ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText primary={isLight ? 'Dark Mode' : 'Light Mode'}
            slotProps={{ primary: { fontSize: '0.83rem', fontWeight: 500 } }} />
        </ListItemButton>
        <ListItemButton onClick={handleLogout} sx={{
          borderRadius: '11px', py: 0.8, color: 'error.main',
          '&:hover': { bgcolor: 'error.main', color: '#fff', '& .MuiListItemIcon-root': { color: '#fff' } },
        }}>
          <ListItemIcon sx={{ minWidth: 34, color: 'error.main' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Logout" slotProps={{ primary: { fontSize: '0.83rem', fontWeight: 600 } }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      open={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      sx={{
        width: sidebarOpen ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          border: 'none',
          bgcolor: sidebarBg,
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
export { DRAWER_WIDTH };
