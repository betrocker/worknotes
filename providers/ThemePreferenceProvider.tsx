import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Appearance } from 'react-native';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';

import { getStoredThemePreference, setStoredThemePreference, type AppThemePreference } from '@/lib/theme';

type ThemePreferenceContextValue = {
  ready: boolean;
  colorScheme: AppThemePreference;
  setColorScheme: (theme: AppThemePreference) => void;
  reapplyColorScheme: () => void;
  toggleColorScheme: () => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useNativewindColorScheme();
  const [ready, setReady] = useState(false);
  const [preferredTheme, setPreferredTheme] = useState<AppThemePreference>('light');
  const preferredRef = useRef<AppThemePreference>('light');
  const reapplyTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearReapplyTimers = useCallback(() => {
    for (const timer of reapplyTimersRef.current) {
      clearTimeout(timer);
    }
    reapplyTimersRef.current = [];
  }, []);

  const reapplyPreferredTheme = useCallback(() => {
    setColorScheme(preferredRef.current);
  }, [setColorScheme]);

  const scheduleReapplyBurst = useCallback(() => {
    clearReapplyTimers();
    reapplyPreferredTheme();
    reapplyTimersRef.current.push(setTimeout(reapplyPreferredTheme, 60));
    reapplyTimersRef.current.push(setTimeout(reapplyPreferredTheme, 180));
    reapplyTimersRef.current.push(setTimeout(reapplyPreferredTheme, 420));
    reapplyTimersRef.current.push(setTimeout(reapplyPreferredTheme, 900));
    reapplyTimersRef.current.push(setTimeout(reapplyPreferredTheme, 1800));
    reapplyTimersRef.current.push(setTimeout(reapplyPreferredTheme, 3000));
  }, [clearReapplyTimers, reapplyPreferredTheme]);

  useEffect(() => {
    preferredRef.current = preferredTheme;
  }, [preferredTheme]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const stored = await getStoredThemePreference();
        const nextTheme = stored ?? 'light';
        preferredRef.current = nextTheme;
        setPreferredTheme(nextTheme);
        setColorScheme(nextTheme);
        reapplyTimersRef.current.push(setTimeout(() => setColorScheme(nextTheme), 120));
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

  useEffect(() => {
    return () => {
      clearReapplyTimers();
    };
  }, [clearReapplyTimers]);

  useEffect(() => {
    if (!ready) return;
    scheduleReapplyBurst();
  }, [ready, scheduleReapplyBurst]);

  useEffect(() => {
    if (!ready) return;
    if (colorScheme !== preferredTheme) {
      scheduleReapplyBurst();
    }
  }, [colorScheme, preferredTheme, ready, scheduleReapplyBurst]);

  useEffect(() => {
    if (!ready) return;
    const subscription = AppState.addEventListener('change', (state) => {
      // Reapply on every transition — Play Billing / OAuth sheets can flip
      // NativeWind's colorScheme while the app is inactive or when it
      // returns to the foreground.
      if (state === 'active' || state === 'inactive' || state === 'background') {
        scheduleReapplyBurst();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [ready, scheduleReapplyBurst]);

  useEffect(() => {
    if (!ready) return;
    const subscription = Appearance.addChangeListener(() => {
      scheduleReapplyBurst();
    });
    return () => {
      subscription.remove();
    };
  }, [ready, scheduleReapplyBurst]);

  const currentScheme: AppThemePreference = preferredTheme;

  const persistAndSet = useCallback(
    (theme: AppThemePreference) => {
      clearReapplyTimers();
      preferredRef.current = theme;
      setPreferredTheme(theme);
      setColorScheme(theme);
      reapplyTimersRef.current.push(setTimeout(() => setColorScheme(theme), 80));
      void setStoredThemePreference(theme);
    },
    [clearReapplyTimers, setColorScheme]
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
      reapplyColorScheme: scheduleReapplyBurst,
      toggleColorScheme,
    }),
    [currentScheme, persistAndSet, ready, scheduleReapplyBurst, toggleColorScheme]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  return ctx;
}
