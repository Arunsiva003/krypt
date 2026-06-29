import { alpha, createTheme } from '@mui/material/styles';

const paletteByMode = {
  light: {
    ink: '#07131f',
    muted: '#5f6f83',
    border: '#d9e3ee',
    surface: '#ffffff',
    elevated: '#f8fbff',
    page: '#f3f7fb',
    primary: '#0f766e',
    primaryDark: '#0b4f49',
    primaryLight: '#ccfbf1',
    secondary: '#2563eb',
    secondaryDark: '#1d4ed8',
    secondaryLight: '#dbeafe',
    accent: '#c8a75d',
    warning: '#d97706',
    hero: '#06111e',
  },
  dark: {
    ink: '#e6eef8',
    muted: '#9fb0c5',
    border: '#243244',
    surface: '#0d1624',
    elevated: '#121e2d',
    page: '#060b12',
    primary: '#2dd4bf',
    primaryDark: '#14b8a6',
    primaryLight: '#134e4a',
    secondary: '#60a5fa',
    secondaryDark: '#3b82f6',
    secondaryLight: '#172554',
    accent: '#d6b86a',
    warning: '#f59e0b',
    hero: '#030711',
  },
};

const buildShadows = (ink, mode) => {
  const strength = mode === 'dark' ? 0.36 : 0.08;
  return [
    'none',
    `0 1px 2px ${alpha(ink, strength)}`,
    `0 4px 12px ${alpha(ink, strength + 0.02)}`,
    `0 8px 24px ${alpha(ink, strength + 0.02)}`,
    `0 12px 32px ${alpha(ink, strength + 0.04)}`,
    `0 18px 44px ${alpha(ink, strength + 0.04)}`,
    `0 24px 60px ${alpha(ink, strength + 0.05)}`,
    `0 32px 80px ${alpha(ink, strength + 0.06)}`,
    `0 40px 90px ${alpha(ink, strength + 0.07)}`,
    `0 48px 100px ${alpha(ink, strength + 0.08)}`,
    `0 56px 110px ${alpha(ink, strength + 0.09)}`,
    `0 64px 120px ${alpha(ink, strength + 0.1)}`,
    `0 72px 130px ${alpha(ink, strength + 0.11)}`,
    `0 80px 140px ${alpha(ink, strength + 0.12)}`,
    `0 88px 150px ${alpha(ink, strength + 0.13)}`,
    `0 96px 160px ${alpha(ink, strength + 0.14)}`,
    `0 104px 170px ${alpha(ink, strength + 0.15)}`,
    `0 112px 180px ${alpha(ink, strength + 0.16)}`,
    `0 120px 190px ${alpha(ink, strength + 0.17)}`,
    `0 128px 200px ${alpha(ink, strength + 0.18)}`,
    `0 136px 210px ${alpha(ink, strength + 0.19)}`,
    `0 144px 220px ${alpha(ink, strength + 0.2)}`,
    `0 152px 230px ${alpha(ink, strength + 0.21)}`,
    `0 160px 240px ${alpha(ink, strength + 0.22)}`,
    `0 168px 250px ${alpha(ink, strength + 0.23)}`,
  ];
};

export const createKryptTheme = (mode = 'light') => {
  const colors = paletteByMode[mode] || paletteByMode.light;
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.primary,
        dark: colors.primaryDark,
        light: colors.primaryLight,
        contrastText: isDark ? '#03110f' : '#ffffff',
      },
      secondary: {
        main: colors.secondary,
        dark: colors.secondaryDark,
        light: colors.secondaryLight,
        contrastText: '#ffffff',
      },
      success: {
        main: colors.primary,
      },
      warning: {
        main: colors.warning,
      },
      text: {
        primary: colors.ink,
        secondary: colors.muted,
      },
      background: {
        default: colors.page,
        paper: colors.surface,
      },
      divider: colors.border,
      krypt: colors,
    },
    typography: {
      fontFamily: [
        'Inter',
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'sans-serif',
      ].join(','),
      h1: { fontWeight: 850, letterSpacing: 0, lineHeight: 1.02 },
      h2: { fontWeight: 850, letterSpacing: 0, lineHeight: 1.05 },
      h3: { fontWeight: 800, letterSpacing: 0 },
      h4: { fontWeight: 800, letterSpacing: 0 },
      h5: { fontWeight: 750, letterSpacing: 0 },
      h6: { fontWeight: 750, letterSpacing: 0 },
      button: { fontWeight: 750, letterSpacing: 0, textTransform: 'none' },
    },
    shape: {
      borderRadius: 8,
    },
    shadows: buildShadows(isDark ? '#000000' : colors.ink, mode),
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            minHeight: '100vh',
            background: isDark
              ? `radial-gradient(circle at 16% 0%, ${alpha(colors.primary, 0.16)}, transparent 30%), linear-gradient(180deg, ${colors.page} 0%, #08111d 100%)`
              : `radial-gradient(circle at 18% 0%, ${alpha(colors.secondary, 0.1)}, transparent 28%), linear-gradient(180deg, #f9fbff 0%, ${colors.page} 56%, #edf5f8 100%)`,
          },
          '::selection': {
            backgroundColor: alpha(colors.primary, 0.24),
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: 'none',
            minHeight: 42,
          },
          contained: {
            boxShadow: `0 10px 24px ${alpha(colors.primary, isDark ? 0.22 : 0.18)}`,
            '&:hover': {
              boxShadow: `0 14px 32px ${alpha(colors.primary, isDark ? 0.28 : 0.24)}`,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${alpha(colors.border, isDark ? 0.72 : 0.78)}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${alpha(colors.border, isDark ? 0.76 : 0.86)}`,
            boxShadow: `0 14px 38px ${alpha(isDark ? '#000000' : colors.ink, isDark ? 0.24 : 0.06)}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? colors.elevated : '#ffffff',
            '& fieldset': { borderColor: colors.border },
            '&:hover fieldset': { borderColor: alpha(colors.secondary, 0.58) },
            '&.Mui-focused fieldset': { borderWidth: 1 },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 7,
            fontWeight: 700,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 999,
          },
        },
      },
    },
  });
};

export default createKryptTheme;
