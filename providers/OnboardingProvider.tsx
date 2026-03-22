import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getOnboardingCompleted, setOnboardingCompleted } from '@/lib/onboarding';
import { useAuth } from '@/providers/AuthProvider';

type OnboardingContextValue = {
  ready: boolean;
  completed: boolean;
  complete: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!userId) {
        if (active) {
          setCompleted(false);
          setReady(true);
        }
        return;
      }

      setReady(false);
      try {
        const nextCompleted = await getOnboardingCompleted(userId);
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
  }, [userId]);

  const complete = useCallback(async () => {
    if (!userId) return;
    await setOnboardingCompleted(userId, true);
    setCompleted(true);
  }, [userId]);

  const value = useMemo(
    () => ({
      ready,
      completed,
      complete,
    }),
    [completed, complete, ready]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
