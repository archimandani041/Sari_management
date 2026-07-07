/**
 * Redesigned Login/Signup Page
 * Modern, high-end split layout with geometric branding, interactive slider,
 * and email authentication powered by Supabase.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, ArrowForward, Check } from '@mui/icons-material';

// High-fidelity custom SVG icons for Google & Apple
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
    <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.68 14.9 1 12 1 7.35 1 3.39 3.65 1.48 7.5l3.6 2.8C6.01 7.15 8.78 5.04 12 5.04z" />
    <path fill="#4285F4" d="M23.45 12.3c0-.82-.07-1.6-.2-2.3H12v4.4h6.43c-.28 1.44-1.1 2.66-2.33 3.48l3.6 2.8c2.1-1.94 3.32-4.8 3.32-8.38z" />
    <path fill="#FBBC05" d="M5.08 14.7c-.23-.68-.36-1.42-.36-2.2s.13-1.52.36-2.2L1.48 7.5C.54 9.4 0 11.53 0 13.8s.54 4.4 1.48 6.3l3.6-2.8c-.23-.6-.36-1.3-.36-2.2z" />
    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.08 7.96-2.92l-3.6-2.8c-1.1.74-2.5 1.18-4.36 1.18-3.22 0-6-2.11-6.97-5.26l-3.6 2.8C3.39 20.35 7.35 23 12 23z" />
  </svg>
);

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" style={{ marginRight: 8 }}>
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.57 2.95-1.39z" />
  </svg>
);

const SLIDES = [
  {
    title: "SariStock Manager",
    description: "Streamlined inventory tracking and analytics for modern textile enterprises.",
  },
  {
    title: "AI-Powered Predictions",
    description: "Forecast saree demand and optimize inventory using Google Gemini.",
  },
  {
    title: "Supplier Collaboration",
    description: "Coordinate orders and imports directly with suppliers via WhatsApp parsing.",
  }
];

const Login = () => {
  const { login, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionReset = searchParams.get('reason') === 'session_reset';

  // State toggles
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fields state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Status state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Cover Slider State
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-rotate cover slider
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid credentials or connection issue');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (!termsAccepted) {
      setError('You must agree to the Terms & Conditions');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const data = await signUp(email.trim(), password, fullName);

      // If email verification is enabled, Supabase won't return a session
      if (data && !data.session) {
        setSuccess('Verification email sent! Please check your inbox and confirm your email before logging in.');
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setTermsAccepted(false);
        setIsSignUp(false); // Switch to login screen
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Signup failed');
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
      bgcolor: '#13111A', // Dark purple/black page background
      px: { xs: 2, sm: 4 },
      py: 2
    }}>
      {/* Global CSS to style the input fields to match the reference image */}
      <style>{`
        .custom-input .MuiOutlinedInput-root {
          background-color: #2F2D3F !important;
          border-radius: 8px !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          transition: all 0.25s ease-in-out !important;
        }
        .custom-input .MuiOutlinedInput-root:hover {
          border-color: rgba(255, 255, 255, 0.16) !important;
        }
        .custom-input .MuiOutlinedInput-root.Mui-focused {
          border-color: #7F56D9 !important;
          box-shadow: 0 0 0 3px rgba(127, 86, 217, 0.24) !important;
        }
        .custom-input .MuiOutlinedInput-notchedOutline {
          border: none !important;
        }
        .custom-input input {
          color: #FFFFFF !important;
          font-size: 0.92rem !important;
          padding: 12.5px 14px !important;
        }
        .custom-input input::placeholder {
          color: #8C8A9E !important;
          opacity: 1 !important;
        }
      `}</style>

      {/* Main card */}
      <Box sx={{
        maxWidth: 960,
        width: '100%',
        height: { xs: 'auto', md: 560 },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: '#1C1A27', // Dark purple slate card background
        borderRadius: 5,
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>

        {/* LEFT PANEL: Cover image & Slider */}
        <Box sx={{
          width: { xs: '100%', md: '48%' },
          display: { xs: 'none', sm: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 4.5,
          position: 'relative',
          overflow: 'hidden',
          // Purple dune gradient overlay
          background: `
            linear-gradient(180deg, rgba(29, 21, 57, 0.35) 0%, rgba(20, 12, 40, 0.85) 100%),
            url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 4,
          m: 1.2
        }}>
          {/* Logo row */}
          <Box sx={{ display: 'flex', alignItems: 'center', zIndex: 2 }}>
            <Typography variant="h5" sx={{
              fontWeight: 800,
              color: '#FFF',
              letterSpacing: '0.12em',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              fontSize: '1.25rem'
            }}>
              SΛRI<Box component="span" sx={{ color: '#7F56D9' }}>ST0CK</Box>
            </Typography>
          </Box>

          {/* Slider Content & Dots */}
          <Box sx={{ zIndex: 2 }}>
            {/* Sliding text frame */}
            <Box sx={{ minHeight: 90, mb: 3 }}>
              {SLIDES.map((slide, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: activeSlide === idx ? 'block' : 'none',
                    animation: 'fadeIn 0.6s ease-in-out',
                    '@keyframes fadeIn': {
                      from: { opacity: 0, transform: 'translateY(10px)' },
                      to: { opacity: 1, transform: 'translateY(0)' }
                    }
                  }}
                >
                  <Typography variant="h3" sx={{
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    mb: 1.2,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25
                  }}>
                    {slide.title}
                  </Typography>
                  <Typography variant="body2" sx={{
                    color: '#C3C0D6',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    fontWeight: 400
                  }}>
                    {slide.description}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Slider Dots */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {SLIDES.map((_, idx) => (
                <Box
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  sx={{
                    width: activeSlide === idx ? 28 : 8,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: activeSlide === idx ? '#FFF' : 'rgba(255, 255, 255, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out'
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {/* RIGHT PANEL: Authentication Form */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          p: { xs: 4, md: 6 },
          overflowY: 'auto'
        }}>
          {/* Header */}
          <Box sx={{ mb: 3.5 }}>
            <Typography variant="h2" sx={{
              color: '#FFF',
              fontWeight: 700,
              fontSize: '1.75rem',
              mb: 1,
              letterSpacing: '-0.02em'
            }}>
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" sx={{ color: '#8C8A9E', fontSize: '0.85rem' }}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Typography>
              <Typography
                variant="body2"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccess('');
                }}
                sx={{
                  color: '#7F56D9',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  '&:hover': { color: '#9B7BF6' }
                }}
              >
                {isSignUp ? 'Log in' : 'Sign up'}
              </Typography>
            </Box>
          </Box>

          {/* Feedback Messages */}
          {sessionReset && (
            <Alert severity="warning" sx={{ mb: 2.5, bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 2 }}>
              Database was reset — please log in again with email.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" icon={<Check sx={{ color: '#4ADE80' }} />} sx={{ mb: 2.5, bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#4ADE80', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: 2 }}>
              {success}
            </Alert>
          )}

          {/* Form */}
          <Box
            component="form"
            onSubmit={isSignUp ? handleSignUpSubmit : handleLoginSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}
          >
            {/* First Name & Last Name (SignUp only) */}
            {isSignUp && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  placeholder="First name"
                  variant="outlined"
                  fullWidth
                  className="custom-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                />
                <TextField
                  placeholder="Last name"
                  variant="outlined"
                  fullWidth
                  className="custom-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                />
              </Box>
            )}

            {/* Email Field */}
            <TextField
              placeholder="Email"
              variant="outlined"
              fullWidth
              className="custom-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: '#8C8A9E', fontSize: 18, mr: 0.5 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* Password Field */}
            <TextField
              placeholder="Enter your password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              fullWidth
              className="custom-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#8C8A9E', fontSize: 18, mr: 0.5 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#8C8A9E' }}
                      >
                        {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* Terms & Conditions Checkbox (SignUp only) */}
            {isSignUp && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.25)',
                      '&.Mui-checked': { color: '#7F56D9' }
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: '#8C8A9E', fontSize: '0.78rem' }}>
                    I agree to the{' '}
                    <span style={{ color: '#7F56D9', fontWeight: 600, cursor: 'pointer' }}>Terms & Conditions</span>
                  </Typography>
                }
                sx={{ ml: -0.5, mt: -0.5 }}
              />
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              sx={{
                bgcolor: '#7F56D9',
                color: '#FFF',
                borderRadius: '8px',
                py: 1.5,
                fontSize: '0.92rem',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 'none',
                mt: 1,
                '&:hover': {
                  bgcolor: '#6A45C0',
                  boxShadow: 'none'
                },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(127, 86, 217, 0.4)',
                  color: 'rgba(255, 255, 255, 0.5)'
                }
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : (isSignUp ? 'Create account' : 'Log in')}
            </Button>

          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
