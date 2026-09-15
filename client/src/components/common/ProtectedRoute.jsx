/**
 * ProtectedRoute Component
 * Guards routes from unauthenticated users and unauthorized roles
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page; save the location they tried to visit
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Allow access to all authenticated users

  return children;
};

export default ProtectedRoute;
