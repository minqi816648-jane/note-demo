import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ThemeColors, ThemeMode } from '../constants/colors';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 与 settingsStore 共用同一存储键，保证两套读取一致
const THEME_KEY = 'settings_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(systemColorScheme === 'dark' ? 'dark' : 'light');

  // 首启读取持久化主题；无持久化则回退系统色
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_KEY)
      .then((stored) => {
        if (!mounted) return;
        if (stored === 'light' || stored === 'dark') {
          setModeState(stored);
        } else {
          setModeState(systemColorScheme === 'dark' ? 'dark' : 'light');
        }
      })
      .catch(() => {
        if (mounted) setModeState(systemColorScheme === 'dark' ? 'dark' : 'light');
      });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDark = mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const commitTheme = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => { /* 持久化失败不阻断交互 */ });
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    commitTheme(newMode);
  }, [commitTheme]);

  const value = useMemo(
    () => ({
      mode,
      colors,
      isDark,
      toggleTheme,
      setMode,
    }),
    [mode, colors, isDark, toggleTheme, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
