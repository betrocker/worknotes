import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';

import { getStoredThemePreference, setStoredThemePreference, type AppThemePreference } from '@/lib/theme';

type ThemePreferenceContextValue = {
  ready: boolean;
  colorScheme: AppThemePreference;
  setColorScheme: (theme: AppThemePreference) => void;
  toggleColorScheme: () => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useNativewindColorScheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const stored = await getStoredThemePreference();
        if (stored) {
          setColorScheme(stored);
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [setColorScheme]);

  const currentScheme: AppThemePreference = colorScheme === 'dark' ? 'dark' : 'light';

  const persistAndSet = useCallback(
    (theme: AppThemePreference) => {
      setColorScheme(theme);
      void setStoredThemePreference(theme);
    },
    [setColorScheme]
  );

  const toggleColorScheme = useCallback(() => {
    const next = currentScheme === 'dark' ? 'light' : 'dark';
    persistAndSet(next);
  }, [currentScheme, persistAndSet]);

  const value = useMemo(
    () => ({
      ready,
      colorScheme: currentScheme,
      setColorScheme: persistAndSet,
      toggleColorScheme,
    }),
    [currentScheme, persistAndSet, ready, toggleColorScheme]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  return ctx;
}
