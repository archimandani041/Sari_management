/**
 * KP Creation — MUI Theme Configuration
 * LUXE Design System: Charcoal · Burgundy · Taupe · Beige · Linen
 *
 * Rules (from spec §2):
 * - Burgundy = primary action only (buttons, active nav, critical badges)
 * - Glassmorphism ONLY for modals/dialogs, not every card
 * - Cards use subtle 1px taupe/beige border + soft shadow on linen
 * - Playfair Display for headings, Lora/sans for body, system-ui for dense data
 */
import { createTheme } from '@mui/material/styles';

// ── LUXE palette tokens ────────────────────────────────────────
export const LUXE = {
  charcoal: '#322D29',
  burgundy: '#72383D',
  taupe: '#AC9C8D',
  grey: '#D9D9D9',
  beige: '#D1C7BD',
  linen: '#FFFFFF',
};

// Status colors (separate from primary burgundy)
export const STATUS = {
  healthy: '#22C55E',
  low: '#F59E0B',
  critical: '#EF4444',
  delivery: '#38BDF8',
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

export const SIDEBAR_BG = { light: '#FAFAFA', dark: '#141210' };

export const CHART_COLORS = [
  LUXE.burgundy, LUXE.taupe, LUXE.beige, LUXE.charcoal, '#8B5E3C', '#D2B896',
];

// Ambient page background — pure white in light mode
export const APP_BACKGROUND = {
  light: '#FFFFFF',
  dark: `
    radial-gradient(900px 520px at 10% -8%, rgba(114,56,61,0.15), transparent 60%),
    radial-gradient(760px 520px at 100% 0%, rgba(172,156,141,0.08), transparent 55%),
    linear-gradient(135deg, #24201E 0%, ${LUXE.charcoal} 100%)`,
};

export const getTheme = (mode = 'dark') => {
  const isLight = mode === 'light';

  // Glass tokens — used ONLY for dialogs/modals/popover overlays
  const glass = {
    bg: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(32,27,19,0.82)',
    border: isLight ? 'rgba(255,255,255,0.65)' : 'rgba(216,202,186,0.09)',
    blur: 'blur(16px) saturate(140%)',
    shadow: isLight ? '0 8px 32px rgba(29,29,29,0.10)' : '0 8px 32px rgba(0,0,0,0.45)',
  };

  // Card / Paper surface — clean solid, NOT glassmorphic
  const surface = {
    bg: isLight ? '#FFFFFF' : '#24201E',
    border: isLight ? '#E8E2DC' : 'rgba(216,202,186,0.10)',
    shadow: isLight ? '0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)' : '0 1px 3px rgba(0,0,0,0.20)',
    shadowHover: isLight ? '0 6px 20px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)' : '0 4px 12px rgba(0,0,0,0.30)',
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
        dark: isLight ? '#5A5036' : LUXE.taupe,
        contrastText: isLight ? '#FFFFFF' : LUXE.charcoal,
      },
      success: { main: STATUS.healthy, light: '#4ADE80', dark: '#16A34A' },
      warning: { main: STATUS.low, light: '#FBBF24', dark: '#D97706' },
      error: { main: STATUS.critical, light: '#F87171', dark: '#DC2626' },
      info: { main: STATUS.delivery, light: '#7DD3FC', dark: '#0EA5E9' },
      background: {
        default: '#FFFFFF',
        paper: surface.bg,
      },
      text: {
        primary: isLight ? LUXE.charcoal : LUXE.linen,
        secondary: isLight ? '#6B6360' : LUXE.beige,
      },
      divider: isLight ? '#EDE8E3' : 'rgba(216,202,186,0.10)',
      // Custom tokens accessible via theme.palette.*
      glass,
      surface,
      sidebar: {
        bg: isLight ? '#FAFAFA' : 'rgba(36,32,30,0.90)',
        active: isLight ? `${LUXE.burgundy}12` : `${LUXE.burgundy}22`,
      },
      brand: {
        main: LUXE.burgundy,
        light: LUXE.taupe,
        dark: LUXE.charcoal,
        sand: LUXE.beige,
        linen: '#FFFFFF',
      },
    },
    typography: {
      // Body: clean sans-serif for legibility
      fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif',
      h1: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.025em', lineHeight: 1.15 },
      h2: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.02em', lineHeight: 1.2 },
      h3: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1.35rem', letterSpacing: '-0.015em', lineHeight: 1.25 },
      h4: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.01em', lineHeight: 1.3 },
      h5: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' },
      h6: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '0.9rem' },
      subtitle1: { fontFamily: '"Lora", Georgia, serif', fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.5 },
      subtitle2: { fontWeight: 600, fontSize: '0.85rem' },
      body1: { fontSize: '0.9rem', lineHeight: 1.6 },
      body2: { fontSize: '0.85rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', lineHeight: 1.4 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    },
    shape: { borderRadius: 12 },
    shadows: [
      'none',
      surface.shadow,
      isLight ? '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)' : '0 2px 6px rgba(0,0,0,0.15)',
      isLight ? '0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' : '0 4px 12px rgba(0,0,0,0.20)',
      isLight ? '0 8px 24px rgba(0,0,0,0.09)' : '0 6px 16px rgba(0,0,0,0.25)',
      isLight ? '0 12px 32px rgba(0,0,0,0.10)' : '0 8px 24px rgba(0,0,0,0.30)',
      ...Array(19).fill(isLight ? '0 16px 40px rgba(0,0,0,0.12)' : '0 10px 30px rgba(0,0,0,0.35)'),
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
      // Paper = clean solid surface with subtle border (NOT glassmorphic)
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: surface.bg,
            border: `1px solid ${surface.border}`,
            boxShadow: surface.shadow,
            transition: 'box-shadow 0.2s ease',
          },
          outlined: {
            border: `1px solid ${surface.border}`,
            boxShadow: 'none',
          },
        },
      },
      // Cards = same clean surface, moderate radius, subtle lift on hover
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            boxShadow: surface.shadow,
            border: `1px solid ${surface.border}`,
            backgroundImage: 'none',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            '&:hover': { boxShadow: surface.shadowHover, transform: 'translateY(-1px)' },
          },
        },
      },
      // Header bar — clean white, no frosted effect
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isLight ? '#FFFFFF' : 'rgba(36,32,30,0.95)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            boxShadow: isLight ? '0 1px 0 #EDE8E3' : 'none',
            borderBottom: isLight ? '1px solid #EDE8E3' : `1px solid ${surface.border}`,
          },
        },
      },
      // Sidebar — clean solid, no frosted effect
      MuiDrawer: {
        styleOverrides: {
          paper: {
            border: 'none',
            backgroundImage: 'none',
            backgroundColor: isLight ? '#FAFAFA' : 'rgba(36,32,30,0.97)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            borderRight: isLight ? '1px solid #EDE8E3' : `1px solid ${surface.border}`,
            boxShadow: 'none',
          },
        },
      },
      // Dialogs — glassmorphic overlay (spec: modals get glass)
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: glass.bg,
            backdropFilter: glass.blur,
            WebkitBackdropFilter: glass.blur,
            border: `1px solid ${glass.border}`,
            backgroundImage: 'none',
            borderRadius: 16,
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: surface.bg,
            border: `1px solid ${surface.border}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '8px 20px',
            fontWeight: 600,
            transition: 'all 0.15s ease',
          },
          contained: {
            boxShadow: `0 2px 8px ${LUXE.burgundy}35`,
            '&:hover': { boxShadow: `0 4px 14px ${LUXE.burgundy}48`, transform: 'translateY(-1px)' },
          },
          outlined: {
            borderColor: isLight ? LUXE.beige : 'rgba(216,202,186,0.20)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isLight ? LUXE.taupe : 'rgba(216,202,186,0.35)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: LUXE.burgundy,
                borderWidth: '1.5px',
              },
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isLight ? '#DDD7D2' : 'rgba(216,202,186,0.18)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600, fontSize: '0.75rem' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700, fontSize: '0.78rem',
            textTransform: 'uppercase', letterSpacing: '0.04em',
            backgroundColor: isLight ? '#F7F4F1' : 'rgba(216,202,186,0.05)',
            borderBottomColor: isLight ? '#EDE8E3' : 'rgba(216,202,186,0.08)',
            color: isLight ? LUXE.taupe : LUXE.beige,
          },
          root: {
            borderColor: isLight ? '#F0EBE6' : 'rgba(216,202,186,0.06)',
            fontSize: '0.84rem',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: isLight ? `${LUXE.burgundy}06` : 'rgba(192,173,141,0.04)' },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            textTransform: 'none',
            '&.Mui-selected': { color: LUXE.burgundy },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { backgroundColor: LUXE.burgundy },
        },
      },
    },
  });
};
