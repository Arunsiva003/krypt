import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, useMediaQuery } from '@mui/material';
import { createKryptTheme } from '../theme';

const STORAGE_KEY = 'krypt_theme_mode';
const ThemeModeContext = createContext(null);

export const ThemeModeProvider = ({ children }) => {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system');
  const resolvedMode = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
  const theme = useMemo(() => createKryptTheme(resolvedMode), [resolvedMode]);

  useEffect(() => {
    if (mode === 'system') {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo(() => ({ mode, resolvedMode, setMode }), [mode, resolvedMode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => {
  const value = useContext(ThemeModeContext);
  if (!value) {
    return { mode: 'system', resolvedMode: 'light', setMode: () => {} };
  }
  return value;
};
