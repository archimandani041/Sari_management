/**
 * KP Creation — MUI Theme Configuration
 * LUXE Design System: Charcoal · Burgundy · Taupe · Beige · Linen
 * Inspired by modern Google Material Design 3 (pill-shaped components),
 * Dribbble (premium layered shadows & thin high-contrast borders),
 * and Pinterest (clean white grids & intuitive cards).
 */
import { createTheme } from '@mui/material/styles';

// ── LUXE palette tokens ────────────────────────────────────────
export const LUXE = {
  charcoal: '#2D2825', // slightly softer charcoal
  burgundy: '#72383D', // rich wine red primary
  taupe: '#9A8A7A',    // refined taupe
  grey: '#E2E8F0',     // modern clean border grey
  beige: '#E3DCDE',    // soft beige border
  linen: '#FAFAFA',    // Dribbble/Pinterest canvas background
};

// Status colors - soft pastel style for premium look
export const STATUS = {
  healthy: '#E2F6EA',    // Soft pastel green
  low: '#FFF3E0',        // Soft pastel amber
  critical: '#FEEBEE',   // Soft pastel red
  delivery: '#E0F2FE',   // Soft pastel blue
};

// Backwards-compatible alias
export const PALETTE = {
  EARTH: LUXE.burgundy,
  SAND: LUXE.beige,
  LATTE: LUXE.taupe,
  OLIVE: LUXE.charcoal,
  MIDNIGHT: LUXE.charcoal,
  LINEN: LUXE.linen,
};

export const SIDEBAR_BG = { light: '#FDFDFD', dark: '#141210' };

export const CHART_COLORS = [
  LUXE.burgundy, LUXE.taupe, '#8B5E3C', LUXE.charcoal, '#B25E64', '#D2B896',
];

export const APP_BACKGROUND = {
  light: '#FAFAFA',
  dark: `
    radial-gradient(900px 520px at 10% -8%, rgba(114,56,61,0.15), transparent 60%),
    radial-gradient(760px 520px at 100% 0%, rgba(172,156,141,0.08), transparent 55%),
    linear-gradient(135deg, #1C1A19 0%, ${LUXE.charcoal} 100%)`,
};

export const getTheme = (mode = 'dark') => {
  const isLight = mode === 'light';

  // Glass tokens — used ONLY for dialogs/modals/popover overlays
  const glass = {
    bg: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(28,26,25,0.85)',
    border: isLight ? 'rgba(226,232,240,0.8)' : 'rgba(216,202,186,0.08)',
    blur: 'blur(20px) saturate(160%)',
    shadow: isLight 
      ? '0 12px 40px -10px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.02)' 
      : '0 12px 40px -10px rgba(0,0,0,0.5)',
  };

  // Card / Paper surface — clean solid
  const surface = {
    bg: isLight ? '#FFFFFF' : '#23201F',
    border: isLight ? '#E9E4E2' : 'rgba(216,202,186,0.08)',
    // Elegant layered shadows inspired by Dribbble & Google
    shadow: isLight 
      ? '0px 1px 2px rgba(0,0,0,0.02), 0px 4px 16px rgba(45,40,37,0.04)' 
      : '0px 1px 2px rgba(0,0,0,0.2), 0px 4px 16px rgba(0,0,0,0.3)',
    shadowHover: isLight 
      ? '0px 12px 28px rgba(114,56,61,0.08), 0px 2px 4px rgba(45,40,37,0.02)' 
      : '0px 12px 28px rgba(0,0,0,0.4), 0px 2px 4px rgba(0,0,0,0.2)',
  };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: LUXE.burgundy,
        light: LUXE.taupe,
        dark: LUXE.charcoal,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isLight ? LUXE.charcoal : LUXE.beige,
        light: isLight ? LUXE.taupe : LUXE.linen,
        dark: isLight ? '#473F3A' : LUXE.taupe,
        contrastText: isLight ? '#FFFFFF' : LUXE.charcoal,
      },
      success: { 
        main: '#16A34A', 
        light: STATUS.healthy, 
        dark: '#14532D',
        contrastText: '#14532D'
      },
      warning: { 
        main: '#D97706', 
        light: STATUS.low, 
        dark: '#78350F',
        contrastText: '#78350F'
      },
      error: { 
        main: '#DC2626', 
        light: STATUS.critical, 
        dark: '#7F1D1D',
        contrastText: '#7F1D1D'
      },
      info: { 
        main: '#0EA5E9', 
        light: STATUS.delivery, 
        dark: '#0369A1',
        contrastText: '#0369A1'
      },
      background: {
        default: isLight ? LUXE.linen : '#1A1817',
        paper: surface.bg,
      },
      text: {
        primary: isLight ? LUXE.charcoal : '#ECE7E4',
        secondary: isLight ? '#7C726A' : '#AC9C94',
      },
      divider: isLight ? '#ECE7E4' : 'rgba(216,202,186,0.08)',
      glass,
      surface,
      sidebar: {
        bg: isLight ? '#FAFAFA' : 'rgba(28,26,25,0.95)',
        active: isLight ? `${LUXE.burgundy}0D` : `${LUXE.burgundy}1A`,
      },
      brand: {
        main: LUXE.burgundy,
        light: LUXE.taupe,
        dark: LUXE.charcoal,
        sand: LUXE.beige,
        linen: LUXE.linen,
      },
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif',
      h1: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 800, fontSize: '2.2rem', letterSpacing: '-0.02em', lineHeight: 1.2 },
      h2: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.015em', lineHeight: 1.25 },
      h3: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.01em', lineHeight: 1.3 },
      h4: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.01em', lineHeight: 1.3 },
      h5: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' },
      h6: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '0.95rem' },
      subtitle1: { fontFamily: '"Lora", Georgia, serif', fontWeight: 500, fontSize: '0.98rem', lineHeight: 1.5 },
      subtitle2: { fontWeight: 600, fontSize: '0.85rem' },
      body1: { fontSize: '0.92rem', lineHeight: 1.6 },
      body2: { fontSize: '0.86rem', lineHeight: 1.5 },
      caption: { fontSize: '0.76rem', lineHeight: 1.4, letterSpacing: '0.01em' },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.02em' },
    },
    shape: { borderRadius: 16 }, // Pinterest / Google soft corners
    shadows: [
      'none',
      surface.shadow,
      isLight ? '0 4px 20px -2px rgba(45,40,37,0.06)' : '0 4px 20px -2px rgba(0,0,0,0.3)',
      isLight ? '0 8px 30px -4px rgba(45,40,37,0.08)' : '0 8px 30px -4px rgba(0,0,0,0.4)',
      isLight ? '0 12px 40px -6px rgba(45,40,37,0.1)' : '0 12px 40px -6px rgba(0,0,0,0.5)',
      isLight ? '0 16px 48px -8px rgba(45,40,37,0.12)' : '0 16px 48px -8px rgba(0,0,0,0.6)',
      ...Array(19).fill(isLight ? '0 20px 50px -10px rgba(45,40,37,0.15)' : '0 20px 50px -10px rgba(0,0,0,0.7)'),
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            minHeight: '100vh',
            background: (isLight ? APP_BACKGROUND.light : APP_BACKGROUND.dark).trim(),
            backgroundAttachment: 'fixed',
            backgroundRepeat: 'no-repeat',
          },
          '@media (prefers-reduced-motion: reduce)': {
            '*': { transition: 'none !important', animationDuration: '0.001ms !important' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: surface.bg,
            border: `1px solid ${surface.border}`,
            boxShadow: surface.shadow,
            borderRadius: 16,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: surface.shadow,
            border: `1px solid ${surface.border}`,
            backgroundImage: 'none',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
            '&:hover': { 
              boxShadow: surface.shadowHover, 
              transform: 'translateY(-3px)' 
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(26,24,23,0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: 'none',
            borderBottom: `1px solid ${surface.border}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            border: 'none',
            backgroundImage: 'none',
            backgroundColor: isLight ? '#FFFFFF' : '#1C1A19',
            borderRight: `1px solid ${surface.border}`,
            boxShadow: 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: glass.bg,
            backdropFilter: glass.blur,
            WebkitBackdropFilter: glass.blur,
            border: `1px solid ${glass.border}`,
            backgroundImage: 'none',
            borderRadius: 24, // extra rounded like Google/Pinterest
            boxShadow: glass.shadow,
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: surface.bg,
            border: `1px solid ${surface.border}`,
            borderRadius: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 30, // Pill shaped - Google Material 3 / Pinterest
            padding: '8px 24px',
            fontWeight: 700,
            fontSize: '0.85rem',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(1px)',
            },
          },
          contained: {
            boxShadow: '0 4px 12px rgba(114, 56, 61, 0.12)',
            '&:hover': { 
              boxShadow: '0 6px 18px rgba(114, 56, 61, 0.2)', 
            },
          },
          outlined: {
            borderColor: isLight ? '#DCD7D4' : 'rgba(216,202,186,0.15)',
            borderWidth: '1.5px',
            '&:hover': {
              borderWidth: '1.5px',
              backgroundColor: isLight ? 'rgba(114,56,61,0.04)' : 'rgba(216,202,186,0.04)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s ease',
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isLight ? LUXE.taupe : 'rgba(216,202,186,0.3)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: LUXE.burgundy,
                borderWidth: '2px',
              },
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isLight ? '#E5DFDB' : 'rgba(216,202,186,0.12)',
              transition: 'border-color 0.2s ease',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { 
            borderRadius: 50, // Perfect pills
            fontWeight: 700, 
            fontSize: '0.72rem',
            height: 24,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700, 
            fontSize: '0.76rem',
            textTransform: 'uppercase', 
            letterSpacing: '0.05em',
            backgroundColor: isLight ? '#F8F6F4' : '#22201F',
            borderBottom: `2px solid ${isLight ? '#ECE7E4' : 'rgba(216,202,186,0.08)'}`,
            color: isLight ? '#7C726A' : '#AC9C94',
          },
          root: {
            borderColor: isLight ? '#F3F0EE' : 'rgba(216,202,186,0.04)',
            fontSize: '0.84rem',
            padding: '12px 16px',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.15s ease',
            '&:hover': { 
              backgroundColor: isLight ? 'rgba(114,56,61,0.03)' : 'rgba(216,202,186,0.02)' 
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '0.85rem',
            '&.Mui-selected': { color: LUXE.burgundy },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { 
            backgroundColor: LUXE.burgundy,
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        },
      },
    },
  });
};
