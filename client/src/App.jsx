/**
 * Main App Router Component
 * Connects Contexts, Custom MUI Theme, React Router, Layout, and Pages
 */
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { getTheme } from './theme/theme';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import AllSarees from './pages/AllSarees';
import SareeForm from './pages/SareeForm';
import SareeEdit from './pages/SareeEdit';
import SareeDetail from './pages/SareeDetail';
import LowStock from './pages/LowStock';
import StockHistory from './pages/StockHistory';
import Settings from './pages/Settings';
import Suppliers from './pages/Suppliers';
import StockRequests from './pages/StockRequests';

const AppContent = () => {
  const { themeMode } = useApp();
  const theme = getTheme(themeMode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        {/* Email verification callback — must be public and match the Supabase redirect URL */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Guarded App Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute allowedRoles={['admin', 'staff']}>
              <Layout>
                <Routes>
                  {/* Shared Dashboard */}
                  <Route path="/" element={<Dashboard />} />

                  {/* Saree Inventory Grid */}
                  <Route path="/sarees" element={<AllSarees />} />
                  <Route path="/sarees/:id" element={<SareeDetail />} />
                  <Route path="/search" element={<Navigate to="/sarees" replace />} />
                  <Route path="/low-stock" element={<LowStock />} />
                  <Route path="/history" element={<StockHistory />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/stock-requests" element={<StockRequests />} />

                  {/* Admin & Staff Saree Mutations */}
                  <Route
                    path="/sarees/add"
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'staff']}>
                        <SareeForm />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/sarees/edit/:id"
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'staff']}>
                        <SareeEdit />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ThemeProvider>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
