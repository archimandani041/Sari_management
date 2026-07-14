/**
 * KP Creation — MUI Theme Configuration
 * "Editorial Luxury" Design System
 * Inspired by high-end fashion catalogs, Vogue editorial, and premium B2B SaaS.
 * Palette: Cream · Deep Burgundy · Warm Charcoal · Taupe
 */
import { createTheme } from '@mui/material/styles';

// ── Design Tokens ──────────────────────────────────────────────
export const LUXE = {
  charcoal: '#1A1512', // near-black ink
  burgundy: '#3B111A', // deep burgundy primary CTA
  wine: '#72383D', // medium wine accent
  taupe: '#9E8E7A', // warm taupe label text
  grey: '#E5E1DC', // warm catalog border
  beige: '#F0EBE6', // section divider
  cream: '#FAF9F7', // page canvas
  white: '#FFFFFF', // card surface
};

export const STATUS = {
  healthy: '#ECFDF3',
  low: '#FFFBEB',
  critical: '#FFF1F2',
  delivery: '#EFF6FF',
};

// Backwards-compatible aliases
export const PALETTE = {
  EARTH: LUXE.burgundy,
  SAND: LUXE.beige,
  LATTE: LUXE.taupe,
  OLIVE: LUXE.charcoal,
  MIDNIGHT: LUXE.charcoal,
  LINEN: LUXE.cream,
};

export const SIDEBAR_BG = { light: '#FFFFFF', dark: '#141210' };

export const CHART_COLORS = [
  LUXE.burgundy, LUXE.wine, LUXE.taupe, '#8B5E3C', LUXE.charcoal, '#D2B896',
];

export const APP_BACKGROUND = {
  light: LUXE.cream,
  dark: `linear-gradient(135deg, #1C1A19 0%, ${LUXE.charcoal} 100%)`,
};

export const getTheme = (mode = 'light') => {
  const isLight = mode === 'light';

  const surface = {
    bg: isLight ? LUXE.white : '#211E1C',
    border: isLight ? LUXE.grey : 'rgba(216,202,186,0.08)',
    shadow: isLight ? '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' : '0 4px 16px rgba(0,0,0,0.3)',
    shadowHover: isLight ? '0 4px 12px rgba(0,0,0,0.06)' : '0 8px 24px rgba(0,0,0,0.4)',
  };

  const glass = {
    bg: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(28,26,25,0.90)',
    border: isLight ? 'rgba(229,225,220,0.9)' : 'rgba(216,202,186,0.08)',
    blur: 'blur(20px) saturate(160%)',
    shadow: isLight
      ? '0 12px 40px -10px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.04)'
      : '0 12px 40px -10px rgba(0,0,0,0.5)',
  };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: LUXE.burgundy,
        light: LUXE.wine,
        dark: LUXE.charcoal,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isLight ? LUXE.charcoal : LUXE.beige,
        light: isLight ? LUXE.taupe : LUXE.cream,
        dark: isLight ? '#3D3530' : LUXE.taupe,
        contrastText: isLight ? '#FFFFFF' : LUXE.charcoal,
      },
      success: {
        main: '#16A34A',
        light: STATUS.healthy,
        dark: '#14532D',
        contrastText: '#14532D',
      },
      warning: {
        main: '#D97706',
        light: STATUS.low,
        dark: '#78350F',
        contrastText: '#78350F',
      },
      error: {
        main: '#DC2626',
        light: STATUS.critical,
        dark: '#7F1D1D',
        contrastText: '#7F1D1D',
      },
      info: {
        main: '#2563EB',
        light: STATUS.delivery,
        dark: '#1E3A8A',
        contrastText: '#1E3A8A',
      },
      background: {
        default: isLight ? LUXE.cream : '#181513',
        paper: surface.bg,
      },
      text: {
        primary: isLight ? LUXE.charcoal : '#EDE9E4',
        secondary: isLight ? LUXE.taupe : '#A09080',
        disabled: isLight ? '#C4BAB2' : '#5A524A',
      },
      divider: isLight ? LUXE.grey : 'rgba(216,202,186,0.08)',
      glass,
      surface,
      sidebar: {
        bg: isLight ? LUXE.white : '#1C1A19',
        active: isLight ? `${LUXE.burgundy}0D` : `${LUXE.burgundy}1A`,
      },
      brand: {
        main: LUXE.burgundy,
        light: LUXE.wine,
        dark: LUXE.charcoal,
        sand: LUXE.beige,
        linen: LUXE.cream,
      },
    },

    typography: {
      // Sans-serif UI font — Plus Jakarta Sans
      fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif',

      // Display headings — Playfair Display (editorial, luxury feel)
      h1: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '3rem', letterSpacing: '-0.02em', lineHeight: 1.1 },
      h2: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '2.25rem', letterSpacing: '-0.015em', lineHeight: 1.15 },
      h3: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.01em', lineHeight: 1.2 },
      h4: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.01em', lineHeight: 1.25 },
      h5: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600, fontSize: '1.2rem', letterSpacing: '-0.005em' },
      h6: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600, fontSize: '1rem' },

      subtitle1: { fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.5 },
      subtitle2: { fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase' },
      body1: { fontSize: '0.9rem', lineHeight: 1.6 },
      body2: { fontSize: '0.83rem', lineHeight: 1.5 },
      caption: { fontSize: '0.73rem', lineHeight: 1.4, letterSpacing: '0.01em' },
      overline: { fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1.6 },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.01em' },
    },

    shape: { borderRadius: 6 },

    shadows: [
      'none',
      surface.shadow,
      isLight ? '0 2px 8px rgba(0,0,0,0.04)' : '0 4px 16px rgba(0,0,0,0.3)',
      isLight ? '0 4px 12px rgba(0,0,0,0.05)' : '0 8px 24px rgba(0,0,0,0.4)',
      isLight ? '0 8px 20px rgba(0,0,0,0.06)' : '0 12px 36px rgba(0,0,0,0.5)',
      isLight ? '0 12px 28px rgba(0,0,0,0.07)' : '0 16px 44px rgba(0,0,0,0.6)',
      ...Array(19).fill(isLight ? '0 20px 40px rgba(0,0,0,0.08)' : '0 20px 50px rgba(0,0,0,0.7)'),
    ],

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            minHeight: '100vh',
            background: isLight ? LUXE.cream : '#181513',
            backgroundColor: isLight ? LUXE.cream : '#181513',
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
            borderRadius: 8,
            boxShadow: 'none',
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 8,
            border: `1px solid ${surface.border}`,
            boxShadow: 'none',
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            '&:hover': {
              boxShadow: surface.shadowHover,
            },
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isLight ? LUXE.white : '#1A1815',
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
            backgroundColor: isLight ? LUXE.white : '#1A1815',
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
            borderRadius: 10,
            boxShadow: glass.shadow,
          },
        },
      },

      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: surface.bg,
            border: `1px solid ${surface.border}`,
            borderRadius: 8,
            boxShadow: '0 8px 30px rgba(0,0,0,0.10)',
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 8,
            border: `1px solid ${surface.border}`,
            boxShadow: '0 8px 30px rgba(0,0,0,0.10)',
          },
        },
      },

      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '7px 20px',
            fontWeight: 700,
            fontSize: '0.83rem',
            lineHeight: 1.4,
            boxShadow: 'none',
            transition: 'all 0.18s ease',
            '&:hover': { boxShadow: 'none' },
            '&:active': { boxShadow: 'none' },
          },
          contained: {
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none', filter: 'brightness(1.08)' },
          },
          outlined: {
            borderColor: isLight ? LUXE.grey : 'rgba(216,202,186,0.15)',
            borderWidth: '1.5px',
            '&:hover': {
              borderWidth: '1.5px',
              backgroundColor: isLight ? 'rgba(59,17,26,0.04)' : 'rgba(216,202,186,0.04)',
            },
          },
          text: {
            '&:hover': {
              backgroundColor: isLight ? 'rgba(59,17,26,0.04)' : 'rgba(216,202,186,0.04)',
            },
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            '&:hover': {
              backgroundColor: isLight ? 'rgba(59,17,26,0.05)' : 'rgba(216,202,186,0.06)',
            },
          },
        },
      },

      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 6,
              backgroundColor: isLight ? LUXE.white : 'rgba(255,255,255,0.03)',
              transition: 'all 0.18s ease',
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isLight ? LUXE.taupe : 'rgba(216,202,186,0.3)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: LUXE.burgundy,
                borderWidth: '2px',
              },
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isLight ? LUXE.grey : 'rgba(216,202,186,0.12)',
              transition: 'border-color 0.18s ease',
            },
          },
        },
      },

      MuiSelect: {
        styleOverrides: {
          outlined: {
            borderRadius: 6,
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 5,
            fontWeight: 700,
            fontSize: '0.71rem',
            height: 24,
            letterSpacing: '0.01em',
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 800,
            fontSize: '0.68rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            backgroundColor: isLight ? '#F7F4F2' : '#1E1B19',
            borderBottom: `1.5px solid ${isLight ? LUXE.grey : 'rgba(216,202,186,0.08)'}`,
            color: isLight ? LUXE.taupe : '#A09080',
            padding: '12px 16px',
          },
          root: {
            borderColor: isLight ? '#F0EBE6' : 'rgba(216,202,186,0.04)',
            fontSize: '0.84rem',
            padding: '14px 16px',
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.15s ease',
            '&:hover': {
              backgroundColor: isLight ? 'rgba(59,17,26,0.025)' : 'rgba(216,202,186,0.02)',
            },
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '0.88rem',
            letterSpacing: '0.01em',
            minHeight: 44,
            '&.Mui-selected': { color: LUXE.burgundy },
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: LUXE.burgundy,
            height: 2,
            borderRadius: '2px 2px 0 0',
          },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            '&.Mui-selected': {
              backgroundColor: isLight ? `${LUXE.burgundy}0E` : `${LUXE.burgundy}22`,
              color: LUXE.burgundy,
              '&:hover': {
                backgroundColor: isLight ? `${LUXE.burgundy}14` : `${LUXE.burgundy}2A`,
              },
            },
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isLight ? LUXE.charcoal : '#ECE7E4',
            color: isLight ? '#FFFFFF' : LUXE.charcoal,
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: 5,
            padding: '5px 10px',
          },
          arrow: {
            color: isLight ? LUXE.charcoal : '#ECE7E4',
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 4 },
          bar: { borderRadius: 4 },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 7,
            fontSize: '0.84rem',
          },
        },
      },
    },
  });
};
