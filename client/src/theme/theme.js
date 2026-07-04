/**
 * Material UI Theme Configuration — "SariStock" design system
 * Palette: Earth / Sand / Latte / Olive / Midnight / Linen
 * All app styling flows through these tokens.
 */
import { createTheme } from '@mui/material/styles';

// ── Brand palette ──────────────────────────────────────────────
export const PALETTE = {
  EARTH:    '#A16D47',  // warm brown  — primary brand color
  SAND:     '#D8CABA',  // light beige — surfaces / borders
  LATTE:    '#C0AD8D',  // medium tan  — accent / hover
  OLIVE:    '#776F4F',  // dark olive  — secondary accent / dark primary
  MIDNIGHT: '#1D1D1D',  // near black  — dark bg / text
  LINEN:    '#F7F3EB',  // off-white   — light bg
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

export const getTheme = (mode = 'dark') => {
  const isLight = mode === 'light';

  return createTheme({
    palette: {
      mode,
      primary: {
        main:          PALETTE.EARTH,
        light:         PALETTE.LATTE,
        dark:          PALETTE.OLIVE,
        contrastText:  '#FFFFFF',
      },
      secondary: {
        main:          isLight ? PALETTE.OLIVE  : PALETTE.SAND,
        light:         isLight ? PALETTE.LATTE  : PALETTE.LINEN,
        dark:          isLight ? '#5A5036'       : PALETTE.LATTE,
        contrastText:  isLight ? '#FFFFFF'       : PALETTE.MIDNIGHT,
      },
      success: { main: '#22C55E', light: '#4ADE80', dark: '#16A34A' },
      warning: { main: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
      error:   { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
      info:    { main: '#38BDF8', light: '#7DD3FC', dark: '#0EA5E9' },
      background: {
        default: isLight ? PALETTE.LINEN    : '#18160F',
        paper:   isLight ? '#FFFFFF'         : '#221E16',
      },
      text: {
        primary:   isLight ? PALETTE.MIDNIGHT : PALETTE.LINEN,
        secondary: isLight ? PALETTE.OLIVE    : PALETTE.SAND,
      },
      divider: isLight ? PALETTE.SAND : '#3A3428',
      // Custom tokens consumed by Sidebar and other components
      sidebar: {
        bg:     SIDEBAR_BG[mode] || SIDEBAR_BG.dark,
        active: isLight
          ? 'rgba(161,109,71,0.10)'
          : 'rgba(161,109,71,0.14)',
      },
      brand: {
        main:  PALETTE.EARTH,
        light: PALETTE.LATTE,
        dark:  PALETTE.OLIVE,
        sand:  PALETTE.SAND,
        linen: PALETTE.LINEN,
        soft:  'rgba(161,109,71,0.12)',
      },
    },
    typography: {
      fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 800, fontSize: '2.5rem',  letterSpacing: '-0.02em' },
      h2: { fontWeight: 800, fontSize: '2rem',    letterSpacing: '-0.01em' },
      h3: { fontWeight: 700, fontSize: '1.5rem',  letterSpacing: '-0.01em' },
      h4: { fontWeight: 700, fontSize: '1.25rem' },
      h5: { fontWeight: 700, fontSize: '1.1rem'  },
      h6: { fontWeight: 700, fontSize: '1rem'    },
      subtitle1: { fontWeight: 500, fontSize: '0.95rem' },
      body1:  { fontSize: '0.9rem',  lineHeight: 1.6 },
      body2:  { fontSize: '0.85rem', lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    shadows: [
      'none',
      '0 1px 3px rgba(0,0,0,0.10)',
      '0 2px 6px rgba(0,0,0,0.10)',
      '0 4px 12px rgba(0,0,0,0.12)',
      '0 6px 16px rgba(0,0,0,0.14)',
      '0 8px 24px rgba(0,0,0,0.16)',
      '0 12px 32px rgba(0,0,0,0.18)',
      ...Array(18).fill('0 12px 32px rgba(0,0,0,0.18)'),
    ],
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundImage: 'none',
            boxShadow: isLight
              ? '0 2px 12px rgba(29,29,29,0.06)'
              : '0 2px 12px rgba(0,0,0,0.40)',
            border: `1px solid ${isLight ? PALETTE.SAND : '#3A3428'}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: isLight
                ? '0 10px 30px rgba(29,29,29,0.10)'
                : '0 12px 32px rgba(0,0,0,0.55)',
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
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
            boxShadow: `0 2px 10px rgba(161,109,71,0.30)`,
            '&:hover': {
              boxShadow: `0 4px 18px rgba(161,109,71,0.45)`,
              transform: 'translateY(-1px)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } },
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
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: 'none',
            boxShadow: isLight
              ? '2px 0 16px rgba(29,29,29,0.06)'
              : '2px 0 16px rgba(0,0,0,0.45)',
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
