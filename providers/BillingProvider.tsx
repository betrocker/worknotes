import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Constants from 'expo-constants';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';

import { getRevenueCatApiKey, hasActiveEntitlement, RC_ENTITLEMENT_ID } from '@/lib/billing';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const RC_INIT_TIMEOUT_MS = 6000;
const TRIAL_DURATION_DAYS = 7;
const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

type BillingContextValue = {
  ready: boolean;
  enabled: boolean;
  hasAccess: boolean;
  hasSubscription: boolean;
  hasTrialAccess: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number;
  entitlementId: string;
  customerInfo: CustomerInfo | null;
  restorePurchases: () => Promise<CustomerInfo | null>;
  refreshCustomerInfo: () => Promise<CustomerInfo | null>;
};

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const apiKey = getRevenueCatApiKey();
  const isExpoGo = Constants.appOwnership === 'expo';
  const enabled = Boolean(apiKey) && !isExpoGo;
  const [ready, setReady] = useState(!enabled);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [hasAccess, setHasAccess] = useState(!enabled);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [hasTrialAccess, setHasTrialAccess] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const configuredRef = useRef(false);
  const listenerRef = useRef<((info: CustomerInfo) => void) | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const getOrInitializeTrialState = useCallback(async (currentUserId: string) => {
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const readTrial = async () => {
      const { data: row, error } = await supabase
        .from('users')
        .select('trial_started_at,trial_ends_at')
        .eq('id', currentUserId)
        .maybeSingle();

      if (error) throw error;

      const trialStartedAt = typeof row?.trial_started_at === 'string' ? row.trial_started_at : null;
      const trialEndsAt = typeof row?.trial_ends_at === 'string' ? row.trial_ends_at : null;
      return { trialStartedAt, trialEndsAt };
    };

    let { trialStartedAt, trialEndsAt } = await readTrial();
    const parsedEndsAtMs = trialEndsAt ? new Date(trialEndsAt).getTime() : NaN;
    const hasValidTrialEndsAt = Number.isFinite(parsedEndsAtMs);

    if (!hasValidTrialEndsAt) {
      const startIso = trialStartedAt ?? nowIso;
      const startMs = new Date(startIso).getTime();
      const normalizedStartMs = Number.isFinite(startMs) ? startMs : nowMs;
      const normalizedStartIso = Number.isFinite(startMs) ? startIso : nowIso;
      const endIso = new Date(normalizedStartMs + TRIAL_DURATION_MS).toISOString();

      const { error } = await supabase
        .from('users')
        .update({
          trial_started_at: normalizedStartIso,
          trial_ends_at: endIso,
        })
        .eq('id', currentUserId);

      if (error) throw error;

      ({ trialStartedAt, trialEndsAt } = await readTrial());

      if (!trialStartedAt) {
        trialStartedAt = normalizedStartIso;
      }

      if (!trialEndsAt) {
        trialEndsAt = endIso;
      }
    }

    const trialEndsAtMs = trialEndsAt ? new Date(trialEndsAt).getTime() : NaN;
    const trialAccess = Number.isFinite(trialEndsAtMs) && trialEndsAtMs > Date.now();

    return {
      trialAccess,
      trialEndsAt: Number.isFinite(trialEndsAtMs) ? trialEndsAt : null,
      trialStartedAt,
    };
  }, []);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      if (!userId) {
        if (active) {
          setReady(true);
          setHasAccess(true);
          setHasSubscription(false);
          setHasTrialAccess(true);
          setTrialEndsAt(null);
          setCustomerInfo(null);
        }
        return;
      }

      if (!enabled || !apiKey) {
        try {
          const { trialAccess, trialEndsAt: trialEndsAtValue } = await getOrInitializeTrialState(userId);

          if (active) {
            setReady(true);
            setHasAccess(isExpoGo || trialAccess);
            setHasSubscription(false);
            setHasTrialAccess(trialAccess);
            setTrialEndsAt(trialEndsAtValue);
            setCustomerInfo(null);
          }
        } catch {
          if (active) {
            setReady(true);
            setHasAccess(isExpoGo);
            setHasSubscription(false);
            setHasTrialAccess(false);
            setTrialEndsAt(null);
            setCustomerInfo(null);
          }
        }
        return;
      }

      setReady(false);

      let trialAccess = false;
      try {
        const { trialAccess: nextTrialAccess, trialEndsAt: trialEndsAtValue } = await getOrInitializeTrialState(userId);
        trialAccess = nextTrialAccess;
        if (active) {
          setHasTrialAccess(trialAccess);
          setTrialEndsAt(trialEndsAtValue);
        }
      } catch {
        if (active) {
          setHasTrialAccess(false);
          setTrialEndsAt(null);
        }
      }

      try {
        await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);

        if (!configuredRef.current) {
          Purchases.configure({
            apiKey,
            appUserID: userId ?? undefined,
          });
          configuredRef.current = true;
          lastUserIdRef.current = userId;

          const listener = (info: CustomerInfo) => {
            setCustomerInfo(info);
            const subscribed = hasActiveEntitlement(info, RC_ENTITLEMENT_ID);
            setHasSubscription(subscribed);
            setHasAccess(subscribed || trialAccess);
          };
          listenerRef.current = listener;
          Purchases.addCustomerInfoUpdateListener(listener);
        } else if (userId && lastUserIdRef.current !== userId) {
          await Purchases.logIn(userId);
          lastUserIdRef.current = userId;
        } else if (!userId && lastUserIdRef.current) {
          await Purchases.logOut();
          lastUserIdRef.current = null;
        }

        const info = await withTimeout(
          Purchases.getCustomerInfo(),
          RC_INIT_TIMEOUT_MS,
          'RevenueCat initialization timed out.'
        );
        if (!active) return;
        setCustomerInfo(info);
        const subscribed = hasActiveEntitlement(info, RC_ENTITLEMENT_ID);
        setHasSubscription(subscribed);
        setHasAccess(subscribed || trialAccess);
      } catch (error) {
        console.warn('[billing] RevenueCat init failed:', error);
        if (!active) return;
        setCustomerInfo(null);
        setHasSubscription(false);
        setHasAccess(trialAccess);
      } finally {
        if (active) {
          setReady(true);
        }
      }
    };

    void sync();

    return () => {
      active = false;
    };
  }, [apiKey, enabled, getOrInitializeTrialState, isExpoGo, userId]);

  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        Purchases.removeCustomerInfoUpdateListener(listenerRef.current);
      }
    };
  }, []);

  const refreshCustomerInfo = useCallback(async () => {
    if (!enabled) return null;
    try {
      await Purchases.syncPurchases();
    } catch {
      // ignore sync failures and fall back to cached/store customer info
    }

    let trialAccess = false;
    if (userId) {
      try {
        const { trialAccess: nextTrialAccess, trialEndsAt: trialEndsAtValue } = await getOrInitializeTrialState(userId);
        trialAccess = nextTrialAccess;
        setHasTrialAccess(trialAccess);
        setTrialEndsAt(trialEndsAtValue);
      } catch {
        setHasTrialAccess(false);
        setTrialEndsAt(null);
      }
    }

    const info = await Purchases.getCustomerInfo();
    setCustomerInfo(info);
    const subscribed = hasActiveEntitlement(info, RC_ENTITLEMENT_ID);
    setHasSubscription(subscribed);
    setHasAccess(trialAccess || subscribed);
    return info;
  }, [enabled, getOrInitializeTrialState, userId]);

  const value = useMemo<BillingContextValue>(
    () => ({
      ready,
      enabled,
      hasAccess,
      hasSubscription,
      hasTrialAccess,
      trialEndsAt,
      trialDaysRemaining:
        hasTrialAccess && trialEndsAt
          ? Math.max(1, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0,
      entitlementId: RC_ENTITLEMENT_ID,
      customerInfo,
      restorePurchases: async () => {
        if (!enabled) return null;
        const info = await Purchases.restorePurchases();
        setCustomerInfo(info);
        const subscribed = hasActiveEntitlement(info, RC_ENTITLEMENT_ID);
        setHasSubscription(subscribed);
        setHasAccess(hasTrialAccess || subscribed);
        return info;
      },
      refreshCustomerInfo,
    }),
    [customerInfo, enabled, hasAccess, hasSubscription, hasTrialAccess, ready, refreshCustomerInfo, trialEndsAt]
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within BillingProvider');
  return ctx;
}
