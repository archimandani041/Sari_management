/**
 * Material UI Theme Configuration — "SariStock" · Premium Glassmorphism
 * Palette: Earth / Sand / Latte / Olive / Midnight / Linen  (unchanged)
 * Surfaces are frosted glass floating over an ambient earth-toned gradient.
 */
import { createTheme } from '@mui/material/styles';

// ── Brand palette (unchanged) ──────────────────────────────────
export const PALETTE = {
  EARTH: '#72383D',  // deep burgundy / maroon — primary brand color
  SAND: '#D1C7BD',  // light sand grey — surfaces / borders
  LATTE: '#AC9C8D',  // muted warm taupe — accent / hover
  OLIVE: '#322D29',  // dark charcoal brown — secondary accent / dark primary
  MIDNIGHT: '#322D29',  // dark charcoal brown — dark bg / text
  LINEN: '#EFE9E1',  // off-white / cream — light bg
};

// Sidebar background per mode (exported for the Sidebar component)
export const SIDEBAR_BG = { light: '#FFFFFF', dark: '#141210' };

// Categorical chart palette (earth family)
export const CHART_COLORS = [
  PALETTE.EARTH,
  PALETTE.LATTE,
  PALETTE.SAND,
  PALETTE.OLIVE,
  '#8B5E3C',   // deeper earth
  '#D2B896',   // lighter latte
];

// Ambient page gradient (frosted glass needs something to distort behind it)
export const APP_BACKGROUND = {
  light: `
    radial-gradient(900px 520px at 10% -8%, rgba(172,156,141,0.35), transparent 60%),
    radial-gradient(760px 520px at 100% 0%, rgba(114,56,61,0.18), transparent 55%),
    radial-gradient(720px 620px at 50% 118%, rgba(209,199,189,0.40), transparent 60%),
    linear-gradient(135deg, #EFE9E1 0%, #D1C7BD 100%)`,
  dark: `
    radial-gradient(900px 520px at 10% -8%, rgba(114,56,61,0.20), transparent 60%),
    radial-gradient(760px 520px at 100% 0%, rgba(172,156,141,0.12), transparent 55%),
    radial-gradient(720px 620px at 50% 118%, rgba(114,56,61,0.10), transparent 60%),
    linear-gradient(135deg, #1A1816 0%, #322D29 100%)`,
};

export const getTheme = (mode = 'dark') => {
  const isLight = mode === 'light';

  // ── Glass surface tokens ─────────────────────────────────────
  const glass = {
    // decorative cards — more translucent for depth
    bg: isLight ? 'rgba(255,255,255,0.58)' : 'rgba(38,32,23,0.52)',
    // readable surfaces (tables, menus, dialogs, drawer, header) — higher opacity
    bgStrong: isLight ? 'rgba(255,255,255,0.74)' : 'rgba(32,27,19,0.74)',
    border: isLight ? 'rgba(255,255,255,0.65)' : 'rgba(216,202,186,0.09)',
    borderStrong: isLight ? 'rgba(255,255,255,0.75)' : 'rgba(216,202,186,0.12)',
    blur: 'blur(16px) saturate(140%)',
    blurStrong: 'blur(20px) saturate(150%)',
    shadow: isLight ? '0 8px 32px rgba(29,29,29,0.10)' : '0 8px 32px rgba(0,0,0,0.45)',
    shadowHover: isLight ? '0 16px 44px rgba(29,29,29,0.16)' : '0 18px 48px rgba(0,0,0,0.60)',
  };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: PALETTE.EARTH,
        light: PALETTE.LATTE,
        dark: PALETTE.OLIVE,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isLight ? PALETTE.OLIVE : PALETTE.SAND,
        light: isLight ? PALETTE.LATTE : PALETTE.LINEN,
        dark: isLight ? '#5A5036' : PALETTE.LATTE,
        contrastText: isLight ? '#FFFFFF' : PALETTE.MIDNIGHT,
      },
      success: { main: '#22C55E', light: '#4ADE80', dark: '#16A34A' },
      warning: { main: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
      error: { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
      info: { main: '#38BDF8', light: '#7DD3FC', dark: '#0EA5E9' },
      background: {
        // kept for any explicit reference, but the real canvas is the gradient on <body>
        default: isLight ? PALETTE.LINEN : '#161209',
        paper: isLight ? '#FFFFFF' : '#221E16',
      },
      text: {
        primary: isLight ? PALETTE.MIDNIGHT : PALETTE.LINEN,
        secondary: isLight ? PALETTE.OLIVE : PALETTE.SAND,
      },
      divider: isLight ? 'rgba(119,111,79,0.18)' : 'rgba(216,202,186,0.12)',
      // Custom tokens
      glass,
      sidebar: {
        bg: glass.bgStrong,
        active: isLight ? 'rgba(161,109,71,0.14)' : 'rgba(192,173,141,0.16)',
      },
      brand: {
        main: PALETTE.EARTH,
        light: PALETTE.LATTE,
        dark: PALETTE.OLIVE,
        sand: PALETTE.SAND,
        linen: PALETTE.LINEN,
        soft: 'rgba(161,109,71,0.12)',
      },
    },
    typography: {
      // Clean modern sans body, elegant serif headings
      fontFamily: '"Plus Jakarta Sans", "Outfit", "Inter", system-ui, -apple-system, sans-serif',
      h1: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 800, fontSize: '2.4rem', letterSpacing: '-0.025em', lineHeight: 1.12 },
      h2: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 800, fontSize: '1.95rem', letterSpacing: '-0.02em', lineHeight: 1.15 },
      h3: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 800, fontSize: '1.55rem', letterSpacing: '-0.02em', lineHeight: 1.2 },
      h4: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.015em' },
      h5: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' },
      h6: { fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 500, fontSize: '0.95rem' },
      subtitle2: { fontWeight: 600, fontSize: '0.85rem' },
      body1: { fontSize: '0.9rem', lineHeight: 1.6 },
      body2: { fontSize: '0.85rem', lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    },
    shape: { borderRadius: 14 },
    shadows: [
      'none',
      '0 1px 3px rgba(0,0,0,0.08)',
      '0 2px 8px rgba(0,0,0,0.10)',
      '0 6px 18px rgba(0,0,0,0.12)',
      '0 8px 24px rgba(0,0,0,0.14)',
      '0 10px 30px rgba(0,0,0,0.16)',
      '0 14px 38px rgba(0,0,0,0.18)',
      ...Array(18).fill('0 16px 44px rgba(0,0,0,0.20)'),
    ],
    components: {
      // Ambient gradient canvas behind all the glass
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
      // Base surface = readable frosted glass (menus, dialogs, table containers, panels)
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: glass.bgStrong,
            backdropFilter: glass.blur,
            WebkitBackdropFilter: glass.blur,
            border: `1px solid ${glass.border}`,
          },
        },
      },
      // Cards inherit the frosted Paper surface; add depth via radius + lift
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            boxShadow: glass.shadow,
            transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s cubic-bezier(0.4,0,0.2,1)',
            '&:hover': { boxShadow: glass.shadowHover, transform: 'translateY(-3px)' },
          },
        },
      },
      // Header — frosted top bar
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: glass.bgStrong,
            backdropFilter: glass.blurStrong,
            WebkitBackdropFilter: glass.blurStrong,
            boxShadow: 'none',
            borderBottom: `1px solid ${glass.border}`,
          },
        },
      },
      // Sidebar — frosted floating panel
      MuiDrawer: {
        styleOverrides: {
          paper: {
            border: 'none',
            backgroundImage: 'none',
            backgroundColor: glass.bgStrong,
            backdropFilter: glass.blurStrong,
            WebkitBackdropFilter: glass.blurStrong,
            borderRight: `1px solid ${glass.border}`,
            boxShadow: glass.shadow,
          },
        },
      },
      // Dialogs & popovers/menus — keep dense text crisp
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: glass.bgStrong,
            backdropFilter: glass.blurStrong,
            WebkitBackdropFilter: glass.blurStrong,
            border: `1px solid ${glass.borderStrong}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: glass.bgStrong,
            backdropFilter: glass.blurStrong,
            WebkitBackdropFilter: glass.blurStrong,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '8px 20px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          },
          contained: {
            boxShadow: '0 4px 14px rgba(161,109,71,0.35)',
            '&:hover': { boxShadow: '0 6px 20px rgba(161,109,71,0.48)', transform: 'translateY(-1px)' },
          },
          outlined: {
            borderColor: isLight ? 'rgba(119,111,79,0.35)' : 'rgba(216,202,186,0.22)',
            backdropFilter: 'blur(6px)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              backgroundColor: isLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.04)',
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
            fontWeight: 700, fontSize: '0.8rem',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            backgroundColor: isLight ? 'rgba(216,202,186,0.22)' : 'rgba(216,202,186,0.06)',
          },
          root: {
            borderColor: isLight ? 'rgba(119,111,79,0.14)' : 'rgba(216,202,186,0.08)',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: isLight ? 'rgba(161,109,71,0.06)' : 'rgba(192,173,141,0.06)' },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            textTransform: 'none',
            '&.Mui-selected': { color: PALETTE.EARTH },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { backgroundColor: PALETTE.EARTH },
        },
      },
    },
  });
};
