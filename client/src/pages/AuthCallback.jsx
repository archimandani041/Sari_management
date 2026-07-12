/**
 * AuthCallback Page
 * Handles ALL Supabase email redirects:
 *  - Email confirmation  (type=signup)   → redirect to dashboard
 *  - Magic link          (type=magiclink) → redirect to dashboard
 *  - Password reset      (type=recovery)  → redirect to /set-password
 *
 * Supabase fires onAuthStateChange with the appropriate event so we can
 * branch on PASSWORD_RECOVERY vs SIGNED_IN.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { CheckCircle, LockReset, Error as ErrorIcon } from '@mui/icons-material';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'recovery' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) {
      setStatus('error');
      setMessage('Supabase client not initialised.');
      return;
    }

    // onAuthStateChange fires automatically when Supabase processes the URL token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked a password-reset link → send them to set a new password
        setStatus('recovery');
        setMessage('Identity confirmed. Redirecting to set your new password…');
        setTimeout(() => {
          subscription.unsubscribe();
          navigate('/set-password', { replace: true });
        }, 1500);

      } else if (event === 'SIGNED_IN' && session) {
        // Email confirmation or magic link → go to dashboard
        setStatus('success');
        setMessage('Email verified! Redirecting to your dashboard…');
        setTimeout(() => {
          subscription.unsubscribe();
          navigate('/', { replace: true });
        }, 1500);
      }
    });

    // Fallback: if Supabase already exchanged the token before we subscribed,
    // check the current session directly.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        subscription.unsubscribe();
        setStatus('error');
        setMessage(error.message || 'Verification failed.');
        return;
      }
      // If there's already a session and onAuthStateChange hasn't fired yet
      // (can happen with PKCE on fast networks), handle it here.
      if (data?.session && status === 'verifying') {
        // We don't know the event type here, so leave it to onAuthStateChange.
        // Just ensure we don't hang indefinitely.
      }
    });

    // Timeout: if nothing happens in 8s, show a helpful error
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      if (status === 'verifying') {
        setStatus('error');
        setMessage('The link may have expired or already been used. Please request a new one.');
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const brandHeader = (
    <Typography variant="h5" sx={{
      fontFamily: '"Playfair Display", Georgia, serif',
      color: '#322D29', fontWeight: 800, letterSpacing: '0.02em', mb: 0.5
    }}>
      KP <Box component="span" sx={{ color: '#72383D' }}>Creation</Box>
    </Typography>
  );

  return (
    <Box sx={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #EFE9E1 0%, #D1C7BD 100%)',
      gap: 3, px: 3, textAlign: 'center'
    }}>
      <Box sx={{
        bgcolor: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px)',
        borderRadius: 4, p: { xs: 4, sm: 6 }, maxWidth: 420, width: '100%',
        boxShadow: '0 24px 64px rgba(50,45,41,0.10)',
        border: '1px solid rgba(209,199,189,0.5)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5
      }}>
        {brandHeader}

        {status === 'verifying' && (
          <>
            <CircularProgress size={48} sx={{ color: '#72383D' }} />
            <Typography sx={{ color: '#6B6360', fontSize: '0.95rem' }}>
              Verifying your link…
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle sx={{ fontSize: 56, color: '#22C55E' }} />
            <Alert severity="success" sx={{ bgcolor: 'rgba(34,197,94,0.08)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 2, width: '100%' }}>
              {message}
            </Alert>
          </>
        )}

        {status === 'recovery' && (
          <>
            <LockReset sx={{ fontSize: 56, color: '#72383D' }} />
            <Alert severity="info" sx={{ bgcolor: 'rgba(114,56,61,0.06)', color: '#72383D', border: '1px solid rgba(114,56,61,0.2)', borderRadius: 2, width: '100%' }}>
              {message}
            </Alert>
          </>
        )}

        {status === 'error' && (
          <>
            <ErrorIcon sx={{ fontSize: 56, color: '#72383D' }} />
            <Alert severity="error" sx={{ bgcolor: 'rgba(114,56,61,0.08)', color: '#72383D', border: '1px solid rgba(114,56,61,0.2)', borderRadius: 2, width: '100%' }}>
              {message}
            </Alert>
            <Typography
              onClick={() => navigate('/login')}
              sx={{ color: '#72383D', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
            >
              Back to Login
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

export default AuthCallback;
