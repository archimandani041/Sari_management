/**
 * Redesigned Login/Signup Page — KP Creation
 * Light-themed premium layout with sliding saree photography,
 * serif luxury typography, and email authentication.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
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
import { Visibility, VisibilityOff, Email, Lock, Check } from '@mui/icons-material';

const SLIDES = [
  {
    title: "KP Creation Portal",
    description: "Premium handloom saree inventory management and real-time stock tracking.",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800"
  },
  {
    title: "Artisanal Silk Textures",
    description: "Explore exquisite details of premium Banarasi, Kanchipuram and designer silks.",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&q=80&w=800"
  },
  {
    title: "Efficient Coordination",
    description: "Instantly coordinate stock requests with weavers and suppliers via WhatsApp integration.",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=800"
  }
];

const Login = () => {
  const { login, signUp } = useAuth();
  const { setThemeMode } = useApp();
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
  const [isForgotPassword, setIsForgotPassword] = useState(false);

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
      setThemeMode('light');
      localStorage.setItem('sari_theme', 'light');
      navigate('/');
    } catch (err) {
      console.error(err);
      // Give a more helpful error message
      if (err.message?.toLowerCase().includes('invalid') || err.message?.toLowerCase().includes('credentials')) {
        setError('Invalid email or password. If you forgot your password, click "Forgot password?" below.');
      } else if (err.message?.toLowerCase().includes('email not confirmed')) {
        setError('Please confirm your email first. Check your inbox for a verification link.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (resetError) throw resetError;
      setSuccess(`Password reset email sent to ${email}. Check your inbox and click the link to set a new password.`);
      setIsForgotPassword(false);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
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

      if (data && !data.session) {
        setSuccess('Verification email sent! Please check your inbox and confirm your email before logging in.');
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setTermsAccepted(false);
        setIsSignUp(false);
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
      background: 'linear-gradient(135deg, #FAFAFA 0%, #F5F1EE 100%)',
      px: { xs: 2, sm: 4 },
      py: 2
    }}>
      {/* Custom Styles for light mode inputs and fade animation */}
      <style>{`
        .custom-input .MuiOutlinedInput-root {
          background-color: #FFFFFF !important;
          border-radius: 12px !important;
          border: 1px solid #ECE7E4 !important;
          transition: all 0.25s ease-in-out !important;
        }
        .custom-input .MuiOutlinedInput-root:hover {
          border-color: #AC9C8D !important;
        }
        .custom-input .MuiOutlinedInput-root.Mui-focused {
          border-color: #72383D !important;
          box-shadow: 0 0 0 3px rgba(114, 56, 61, 0.12) !important;
        }
        .custom-input .MuiOutlinedInput-notchedOutline {
          border: none !important;
        }
        .custom-input input {
          color: #2D2825 !important;
          font-size: 0.92rem !important;
          padding: 12.5px 14px !important;
        }
        .custom-input input::placeholder {
          color: #9A8A7A !important;
          opacity: 1 !important;
        }
        @keyframes slideFadeIn {
          from { opacity: 0.4; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Main card */}
      <Box sx={{
        maxWidth: 960,
        width: '100%',
        height: { xs: 'auto', md: 560 },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 24px 64px -12px rgba(45, 40, 37, 0.06), 0 1px 2px rgba(0,0,0,0.01)',
        border: '1px solid rgba(226, 232, 240, 0.8)'
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
          backgroundImage: `linear-gradient(180deg, rgba(50, 45, 41, 0.2) 0%, rgba(114, 56, 61, 0.75) 100%), url('${SLIDES[activeSlide].image}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 4,
          m: 1.2,
          animation: 'slideFadeIn 0.8s ease-in-out'
        }}>
          {/* Logo row */}
          <Box sx={{ display: 'flex', alignItems: 'center', zIndex: 2 }}>
            <Typography variant="h5" sx={{
              fontWeight: 900,
              color: '#FFF',
              letterSpacing: '0.04em',
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: '1.45rem'
            }}>
              KP<Box component="span" sx={{ color: '#EFE9E1' }}> Creation</Box>
            </Typography>
          </Box>

          {/* Slider Content & Dots */}
          <Box sx={{ zIndex: 2 }}>
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
                    fontFamily: '"Playfair Display", Georgia, serif',
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: '1.65rem',
                    mb: 1.2,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.25
                  }}>
                    {slide.title}
                  </Typography>
                  <Typography variant="body2" sx={{
                    color: '#EFE9E1',
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
              fontFamily: '"Playfair Display", Georgia, serif',
              color: '#322D29',
              fontWeight: 800,
              fontSize: '1.85rem',
              mb: 1,
              letterSpacing: '-0.02em'
            }}>
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" sx={{ color: '#AC9C8D', fontSize: '0.85rem' }}>
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
                  color: '#72383D',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  '&:hover': { color: '#592B2F' }
                }}
              >
                {isSignUp ? 'Log in' : 'Sign up'}
              </Typography>
            </Box>
          </Box>

          {/* Feedback Messages */}
          {sessionReset && (
            <Alert severity="warning" sx={{ mb: 2.5, bgcolor: 'rgba(114, 56, 61, 0.06)', color: '#72383D', border: '1px solid rgba(114, 56, 61, 0.15)', borderRadius: 2 }}>
              Database was reset — please log in again with email.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, bgcolor: 'rgba(114, 56, 61, 0.08)', color: '#72383D', border: '1px solid rgba(114, 56, 61, 0.2)', borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" icon={<Check sx={{ color: '#22C55E' }} />} sx={{ mb: 2.5, bgcolor: 'rgba(34, 197, 94, 0.08)', color: '#16A34A', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: 2 }}>
              {success}
            </Alert>
          )}

          {/* Form */}
          <Box
            component="form"
            onSubmit={isForgotPassword ? handleForgotPassword : (isSignUp ? handleSignUpSubmit : handleLoginSubmit)}
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
                      <Email sx={{ color: '#AC9C8D', fontSize: 18, mr: 0.5 }} />
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
                      <Lock sx={{ color: '#AC9C8D', fontSize: 18, mr: 0.5 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#AC9C8D' }}
                      >
                        {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* Forgot Password link — only show on login view */}
            {!isSignUp && (
              <Typography
                onClick={() => {
                  setIsForgotPassword(true);
                  setError('');
                  setSuccess('');
                }}
                sx={{
                  color: '#AC9C8D',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textAlign: 'right',
                  mt: -0.5,
                  '&:hover': { color: '#72383D', textDecoration: 'underline' }
                }}
              >
                Forgot password?
              </Typography>
            )}

            {/* Terms & Conditions Checkbox (SignUp only) */}
            {isSignUp && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    sx={{
                      color: '#D1C7BD',
                      '&.Mui-checked': { color: '#72383D' }
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: '#AC9C8D', fontSize: '0.78rem' }}>
                    I agree to the{' '}
                    <span style={{ color: '#72383D', fontWeight: 600, cursor: 'pointer' }}>Terms & Conditions</span>
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
                bgcolor: '#72383D',
                color: '#FFF',
                borderRadius: '30px',
                py: 1.5,
                fontSize: '0.92rem',
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(114, 56, 61, 0.15)',
                mt: 1,
                '&:hover': {
                  bgcolor: '#592B2F',
                  boxShadow: '0 6px 20px rgba(114, 56, 61, 0.25)',
                  transform: 'translateY(-1px)'
                },
                '&:active': {
                  transform: 'translateY(1px)'
                },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(114, 56, 61, 0.4)',
                  color: 'rgba(255, 255, 255, 0.5)'
                },
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : (isForgotPassword ? 'Send Reset Email' : isSignUp ? 'Create account' : 'Log in')}
            </Button>

            {/* Back to login in forgot-password mode */}
            {isForgotPassword && (
              <Typography
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); }}
                sx={{ color: '#AC9C8D', fontSize: '0.82rem', textAlign: 'center', cursor: 'pointer', '&:hover': { color: '#72383D' } }}
              >
                ← Back to login
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
