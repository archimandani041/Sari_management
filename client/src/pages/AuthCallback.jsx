/**
 * AuthCallback Page
 * Handles the redirect from Supabase email confirmation / magic link.
 * Supabase appends a token_hash or access_token to the URL after the user
 * clicks the verification link in their inbox. This page exchanges it for
 * a valid session, then redirects to the dashboard.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { CheckCircleOutline, ErrorOutline } from '@mui/icons-material';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      if (!supabase) {
        setStatus('error');
        setMessage('Supabase client not initialised. Check your environment variables.');
        return;
      }

      try {
        // Supabase automatically detects the token_hash / access_token in the URL
        // and exchanges it for a session via onAuthStateChange.
        // We just need to wait for the session to be available.
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (data?.session) {
          // Session established — redirect to the dashboard
          setStatus('success');
          setMessage('Email verified! Redirecting…');
          setTimeout(() => navigate('/', { replace: true }), 1500);
        } else {
          // No session yet — this can happen if the link is already expired
          // or if Supabase hasn't processed the token yet. Give it one more try.
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              subscription.unsubscribe();
              setStatus('success');
              setMessage('Email verified! Redirecting…');
              setTimeout(() => navigate('/', { replace: true }), 1500);
            }
          });

          // If still no session after 5 seconds, show error
          setTimeout(() => {
            subscription.unsubscribe();
            setStatus('error');
            setMessage('Verification link may have expired. Please sign up again or request a new link.');
          }, 5000);
        }
      } catch (err) {
        console.error('AuthCallback error:', err);
        setStatus('error');
        setMessage(err.message || 'Verification failed. Please try again.');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <Box sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #EFE9E1 0%, #D1C7BD 100%)',
      gap: 3,
      px: 3,
      textAlign: 'center'
    }}>
      {/* Card */}
      <Box sx={{
        bgcolor: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(20px)',
        borderRadius: 4,
        p: { xs: 4, sm: 6 },
        maxWidth: 420,
        width: '100%',
        boxShadow: '0 24px 64px rgba(50,45,41,0.10)',
        border: '1px solid rgba(209,199,189,0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2.5
      }}>
        {/* Brand */}
        <Typography variant="h5" sx={{
          fontFamily: '"Playfair Display", Georgia, serif',
          color: '#322D29',
          fontWeight: 800,
          letterSpacing: '0.02em',
          mb: 0.5
        }}>
          KP <Box component="span" sx={{ color: '#72383D' }}>Creation</Box>
        </Typography>

        {status === 'verifying' && (
          <>
            <CircularProgress size={48} sx={{ color: '#72383D' }} />
            <Typography sx={{ color: '#6B6360', fontSize: '0.95rem' }}>
              Verifying your email address…
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircleOutline sx={{ fontSize: 56, color: '#22C55E' }} />
            <Alert
              severity="success"
              sx={{ bgcolor: 'rgba(34,197,94,0.08)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 2, width: '100%' }}
            >
              {message}
            </Alert>
          </>
        )}

        {status === 'error' && (
          <>
            <ErrorOutline sx={{ fontSize: 56, color: '#72383D' }} />
            <Alert
              severity="error"
              sx={{ bgcolor: 'rgba(114,56,61,0.08)', color: '#72383D', border: '1px solid rgba(114,56,61,0.2)', borderRadius: 2, width: '100%' }}
            >
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
