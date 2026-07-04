/**
 * Login Page
 * Sleek card-based user authentication page
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  InputAdornment, IconButton, CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff, Lock, AccountCircle } from '@mui/icons-material';
import StorefrontIcon from '@mui/icons-material/Storefront';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionReset = searchParams.get('reason') === 'session_reset';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Invalid credentials or connection issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(1200px 600px at 20% -10%, rgba(161,109,71,0.22), transparent 60%), linear-gradient(135deg, #18160F 0%, #221E16 100%)',
      px: 2
    }}>
      <Card sx={{
        maxWidth: 420,
        width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        borderRadius: 4,
        overflow: 'hidden',
        border: 'none',
        '&:hover': { transform: 'none', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }
      }}>
        <Box sx={{
          p: 3.5,
          color: '#fff',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #C0AD8D 0%, #A16D47 55%, #776F4F 100%)'
        }}>
          <Box sx={{
            width: 56, height: 56, mx: 'auto', mb: 1.5, borderRadius: '16px',
            bgcolor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}>
            <StorefrontIcon sx={{ fontSize: '1.9rem' }} />
          </Box>
          <Typography variant="h3" sx={{ fontSize: '1.7rem', fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
            Sari<Box component="span" sx={{ opacity: 0.80 }}>Stock</Box>
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.78rem' }}>
            Inventory & Analytics Suite
          </Typography>
        </Box>
        <CardContent sx={{ p: 4 }}>
          {sessionReset && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              Database was reset — please log in again with your credentials.
            </Alert>
          )}
          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Username"
              variant="outlined"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircle color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              disabled={loading}
              sx={{ py: 1.5, fontSize: '1rem', mt: 1 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Login to System'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
