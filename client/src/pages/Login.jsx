/**
 * Login & Sign Up Page — Redesigned with shadcn/ui & Tailwind CSS
 * Editorial Luxury Design: Split-screen visual showcase, smooth slider, refined typography.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { cn } from '../lib/utils';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Store,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  Sparkles
} from 'lucide-react';

const SLIDES = [
  {
    title: "KP Creation Portal",
    subtitle: "Artisanal Inventory Architecture",
    description: "Premium handloom saree inventory management, intelligent stock predictions, and real-time ledger tracking.",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=1200"
  },
  {
    title: "Artisanal Silk Textures",
    subtitle: "Heritage & Craftsmanship",
    description: "Multi-tier beam management tailored for Banarasi, Kanchipuram, and bespoke designer silks.",
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&q=80&w=1200"
  },
  {
    title: "Seamless Coordination",
    subtitle: "Weaver & Supplier Network",
    description: "Direct WhatsApp integrations and automated procurement workflows with artisan suppliers.",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=1200"
  }
];

const Login = () => {
  const { login, signUp, isAuthenticated } = useAuth();
  const { setThemeMode } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionReset = searchParams.get('reason') === 'session_reset';
  const rawTarget = location.state?.from?.pathname || location.state?.from || '/dashboard';
  const from = (!rawTarget || rawTarget === '/' || rawTarget === '/landing' || rawTarget === '/login')
    ? '/dashboard'
    : rawTarget;

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Mode toggles
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Slideshow
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      setThemeMode('light');
      localStorage.setItem('sari_theme', 'light');
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      if (err.message?.toLowerCase().includes('invalid') || err.message?.toLowerCase().includes('credentials')) {
        setError('Invalid email or password. You can reset it below if forgotten.');
      } else if (err.message?.toLowerCase().includes('email not confirmed')) {
        setError('Please verify your email address first via the link sent to your inbox.');
      } else {
        setError(err.message || 'Login failed. Please verify credentials.');
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
      setSuccess(`Reset instructions sent to ${email}. Check your inbox to proceed.`);
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
      setError('Please fill in all requested fields.');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the Terms & Conditions.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const data = await signUp(email.trim(), password, fullName);

      if (data && !data.session) {
        setSuccess('Confirmation link sent! Check your inbox to verify your account.');
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setTermsAccepted(false);
        setIsSignUp(false);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-cream-50 via-background to-cream-100 dark:from-background dark:to-card">
      <div className="w-full max-w-5xl h-auto min-h-[640px] md:h-[660px] flex flex-col md:flex-row rounded-3xl bg-card border border-border shadow-luxury-lg overflow-hidden">
        
        {/* LEFT PANEL: Curated Imagery & Slider */}
        <div className="relative w-full md:w-1/2 p-8 sm:p-10 flex flex-col justify-between overflow-hidden bg-burgundy-950 text-white min-h-[320px] md:min-h-full">
          {/* Background Images with Crossfade */}
          {SLIDES.map((slide, idx) => (
            <div
              key={idx}
              className={cn(
                "absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out",
                activeSlide === idx ? "opacity-45 scale-105" : "opacity-0 scale-100"
              )}
              style={{
                backgroundImage: `url('${slide.image}')`,
                transitionProperty: 'opacity, transform',
                transitionDuration: '1200ms'
              }}
            />
          ))}

          {/* Luxury Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-burgundy-950 via-burgundy-950/70 to-burgundy-900/40" />

          {/* Brand Header */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <Store className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold tracking-tight text-white">
                KP Creation
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-amber-200/80 font-semibold">
                Saree Inventory Enterprise
              </p>
            </div>
          </div>

          {/* Slide Captions */}
          <div className="relative z-10 space-y-4 my-auto py-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-amber-200 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{SLIDES[activeSlide].subtitle}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight">
              {SLIDES[activeSlide].title}
            </h1>
            <p className="text-sm text-cream-200/90 max-w-md leading-relaxed font-normal">
              {SLIDES[activeSlide].description}
            </p>
          </div>

          {/* Slider Pagination Indicators */}
          <div className="relative z-10 flex items-center gap-2 pt-4">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  activeSlide === idx
                    ? "w-8 bg-amber-300"
                    : "w-2 bg-white/30 hover:bg-white/50"
                )}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: Auth Forms */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 md:p-12 flex flex-col justify-center bg-card">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* Header Title & Switcher */}
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {isForgotPassword
                  ? 'Reset Password'
                  : isSignUp
                  ? 'Join KP Creation'
                  : 'Welcome Back'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                {isForgotPassword ? (
                  'Provide your registered email to receive recovery instructions.'
                ) : isSignUp ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(false);
                        setError('');
                        setSuccess('');
                      }}
                      className="font-semibold text-burgundy-900 dark:text-burgundy-300 hover:underline"
                    >
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    New to KP Creation?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(true);
                        setError('');
                        setSuccess('');
                      }}
                      className="font-semibold text-burgundy-900 dark:text-burgundy-300 hover:underline"
                    >
                      Create an account
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Notification & Alerts */}
            {sessionReset && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Session reset detected. Please sign in with your email credentials.</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Main Form */}
            <form
              onSubmit={
                isForgotPassword
                  ? handleForgotPassword
                  : isSignUp
                  ? handleSignUpSubmit
                  : handleLoginSubmit
              }
              className="space-y-4"
            >
              {/* First & Last Name (Sign Up only) */}
              {isSignUp && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-semibold">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="e.g. Ramesh"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-semibold">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="e.g. Patel"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@kpcreation.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              {!isForgotPassword && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold">
                      Password
                    </Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError('');
                          setSuccess('');
                        }}
                        className="text-xs font-medium text-muted-foreground hover:text-burgundy-900 dark:hover:text-burgundy-300 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Terms Checkbox (SignUp only) */}
              {isSignUp && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-input text-burgundy-900 focus:ring-burgundy-900"
                    required
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground">
                    I agree to the{' '}
                    <span className="font-semibold text-burgundy-900 dark:text-burgundy-300">
                      Terms of Service
                    </span>{' '}
                    & Privacy Policy
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="luxury"
                className="w-full h-11 text-sm font-bold tracking-wide mt-2 shadow-luxury"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isForgotPassword ? (
                  'Send Reset Email'
                ) : isSignUp ? (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </form>

            {/* Back button for Forgot Password */}
            {isForgotPassword && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
