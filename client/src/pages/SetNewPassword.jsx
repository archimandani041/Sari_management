/**
 * SetNewPassword Page
 * Shown after a user clicks a password-reset link from their email.
 * Supabase has already established a recovery session by the time they
 * land here (via /auth/callback). They just need to enter a new password.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import {
  Box, TextField, Button, Typography, Alert,
  InputAdornment, IconButton, CircularProgress
} from '@mui/material';
import { Lock, Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material';

const SetNewPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setDone(true);
      // Redirect to login after 2.5 seconds
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #EFE9E1 0%, #D1C7BD 100%)', px: { xs: 2, sm: 4 }
    }}>
      {/* Input styles */}
      <style>{`
        .sp-input .MuiOutlinedInput-root {
          background-color: #FFFFFF !important;
          border-radius: 10px !important;
          border: 1px solid #D1C7BD !important;
          transition: all 0.25s ease-in-out !important;
        }
        .sp-input .MuiOutlinedInput-root:hover { border-color: #AC9C8D !important; }
        .sp-input .MuiOutlinedInput-root.Mui-focused {
          border-color: #72383D !important;
          box-shadow: 0 0 0 3px rgba(114,56,61,0.18) !important;
        }
        .sp-input .MuiOutlinedInput-notchedOutline { border: none !important; }
        .sp-input input { color: #322D29 !important; font-size: 0.92rem !important; padding: 12.5px 14px !important; }
      `}</style>

      <Box sx={{
        maxWidth: 440, width: '100%',
        bgcolor: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px)',
        borderRadius: 5, p: { xs: 4, sm: 5 },
        boxShadow: '0 24px 64px rgba(50,45,41,0.10)',
        border: '1px solid rgba(209,199,189,0.5)'
      }}>
        {/* Brand */}
        <Typography variant="h5" sx={{
          fontFamily: '"Playfair Display", Georgia, serif',
          color: '#322D29', fontWeight: 800, letterSpacing: '0.02em', mb: 0.5
        }}>
          KP <Box component="span" sx={{ color: '#72383D' }}>Creation</Box>
        </Typography>

        {!done ? (
          <>
            <Typography variant="h2" sx={{
              fontFamily: '"Playfair Display", Georgia, serif',
              color: '#322D29', fontWeight: 800, fontSize: '1.65rem',
              mt: 2.5, mb: 0.5, letterSpacing: '-0.02em'
            }}>
              Set new password
            </Typography>
            <Typography sx={{ color: '#AC9C8D', fontSize: '0.85rem', mb: 3 }}>
              Choose a strong password you'll remember.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, bgcolor: 'rgba(114,56,61,0.08)', color: '#72383D', border: '1px solid rgba(114,56,61,0.2)', borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
              <TextField
                placeholder="New password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                className="sp-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: '#AC9C8D', fontSize: 18, mr: 0.5 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#AC9C8D' }}>
                          {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                placeholder="Confirm new password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                className="sp-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: confirm && confirm === password ? '#22C55E' : '#AC9C8D', fontSize: 18, mr: 0.5 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{
                  bgcolor: '#72383D', color: '#FFF', borderRadius: '8px',
                  py: 1.5, fontSize: '0.92rem', fontWeight: 600,
                  textTransform: 'none', boxShadow: 'none', mt: 0.5,
                  '&:hover': { bgcolor: '#592B2F', boxShadow: 'none' },
                  '&.Mui-disabled': { bgcolor: 'rgba(114,56,61,0.4)', color: 'rgba(255,255,255,0.5)' }
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Update Password'}
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 3 }}>
            <CheckCircle sx={{ fontSize: 64, color: '#22C55E' }} />
            <Typography variant="h6" sx={{ color: '#322D29', fontWeight: 700 }}>
              Password updated!
            </Typography>
            <Alert severity="success" sx={{ bgcolor: 'rgba(34,197,94,0.08)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 2, width: '100%' }}>
              Your password has been changed. Redirecting to login…
            </Alert>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SetNewPassword;
