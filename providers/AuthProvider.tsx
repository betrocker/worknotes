import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  initialized: boolean;
  session: Session | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [lastUpsertedUserId, setLastUpsertedUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        setInitialized(true);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setInitialized(true);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setInitialized(true);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const user = session?.user ?? null;
    if (!user) {
      setLastUpsertedUserId(null);
      return;
    }

    if (lastUpsertedUserId === user.id) return;

    void (async () => {
      try {
        const meta = user.user_metadata as Record<string, unknown> | undefined;
        const fullName =
          typeof meta?.full_name === 'string'
            ? meta.full_name
            : typeof meta?.name === 'string'
              ? meta.name
              : null;

        // Ensure `public.users` row exists and uses the same UUID as the Supabase Auth user.
        const { error } = await supabase.from('users').upsert(
          {
            id: user.id,
            email: user.email ?? null,
            name: fullName?.trim() || null,
            phone: (user.phone as string | undefined) ?? null,
          },
          { onConflict: 'id' }
        );

        if (error) {
          console.warn('[auth] Failed to upsert users row:', error.message);
          return;
        }

        setLastUpsertedUserId(user.id);
      } catch (err: unknown) {
        console.warn('[auth] Failed to upsert users row:', err);
      }
    })();
  }, [lastUpsertedUserId, session?.user]);

  const value = useMemo(() => ({ initialized, session }), [initialized, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
