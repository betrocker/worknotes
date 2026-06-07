import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getOnboardingCompleted, setOnboardingCompleted } from '@/lib/onboarding';

type OnboardingContextValue = {
  ready: boolean;
  completed: boolean;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const nextCompleted = await getOnboardingCompleted();
        if (active) {
          setCompleted(nextCompleted);
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
  }, []);

  const complete = useCallback(async () => {
    await setOnboardingCompleted(true);
    setCompleted(true);
  }, []);

  const reset = useCallback(async () => {
    await setOnboardingCompleted(false);
    setCompleted(false);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      completed,
      complete,
      reset,
    }),
    [completed, complete, ready, reset]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
