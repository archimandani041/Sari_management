/**
 * Layout Component
 * Unifies Sidebar, Header, Global Search, and Content Area
 */
import { Box, useTheme, useMediaQuery } from '@mui/material';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import Header from './Header';
import GlobalSearchDialog from '../common/GlobalSearchDialog';
import { useApp } from '../../contexts/AppContext';
import { APP_BACKGROUND } from '../../theme/theme';

const Layout = ({ children }) => {
  const { sidebarOpen, themeMode } = useApp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isLight = themeMode === 'light';

  return (
    <Box sx={{
      display: 'flex',
      minHeight: '100vh',
      background: isLight ? APP_BACKGROUND.light : APP_BACKGROUND.dark,
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat',
      backgroundColor: 'background.default',
      transition: 'background 0.3s ease, background-color 0.3s ease',
    }}>
      {/* Sidebar Drawer */}
      <Sidebar />

      {/* Main Container */}
      <Box sx={{
        flexGrow: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        transition: theme.transitions.create(['margin', 'width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        ml: sidebarOpen && !isMobile ? 0 : 0, // Since we use persistent drawer, margin offset is handled automatically
        width: sidebarOpen && !isMobile ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%'
      }}>
        {/* Header bar */}
        <Header />

        {/* Global Search Dialog */}
        <GlobalSearchDialog />

        {/* Dynamic Page Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            overflowY: 'auto',
            bgcolor: 'transparent'
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
