import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Constants from 'expo-constants';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';

import { getRevenueCatApiKey, hasActiveEntitlement, RC_ENTITLEMENT_ID } from '@/lib/billing';
import { useAuth } from '@/providers/AuthProvider';

const RC_INIT_TIMEOUT_MS = 6000;

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

function getActiveEntitlement(info: CustomerInfo | null) {
  if (!info) return null;
  return (
    info.entitlements.active[RC_ENTITLEMENT_ID] ??
    Object.values(info.entitlements.active)[0] ??
    null
  );
}

function deriveTrialState(info: CustomerInfo | null) {
  const entitlement = getActiveEntitlement(info);
  if (!entitlement) {
    return { hasTrialAccess: false, trialEndsAt: null as string | null };
  }
  const periodType = (entitlement as unknown as { periodType?: string }).periodType;
  const isTrial = periodType === 'TRIAL' || periodType === 'INTRO';
  return {
    hasTrialAccess: Boolean(isTrial),
    trialEndsAt: isTrial ? entitlement.expirationDate ?? null : null,
  };
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

  const applyCustomerInfo = useCallback((info: CustomerInfo | null) => {
    setCustomerInfo(info);
    const subscribed = hasActiveEntitlement(info, RC_ENTITLEMENT_ID);
    setHasSubscription(subscribed);
    setHasAccess(subscribed);
    const { hasTrialAccess: trialAccess, trialEndsAt: trialEndsAtValue } = deriveTrialState(info);
    setHasTrialAccess(trialAccess);
    setTrialEndsAt(trialEndsAtValue);
  }, []);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      if (!userId) {
        if (active) {
          setReady(true);
          setHasAccess(!enabled);
          setHasSubscription(false);
          setHasTrialAccess(false);
          setTrialEndsAt(null);
          setCustomerInfo(null);
        }
        return;
      }

      if (!enabled || !apiKey) {
        // No billing configured (ExpoGo / missing key) — allow access so devs can test,
        // but nothing is actually purchased.
        if (active) {
          setReady(true);
          setHasAccess(true);
          setHasSubscription(false);
          setHasTrialAccess(false);
          setTrialEndsAt(null);
          setCustomerInfo(null);
        }
        return;
      }

      setReady(false);

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
            applyCustomerInfo(info);
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
        applyCustomerInfo(info);
      } catch (error) {
        console.warn('[billing] RevenueCat init failed:', error);
        if (!active) return;
        applyCustomerInfo(null);
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
  }, [apiKey, applyCustomerInfo, enabled, userId]);

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

    const info = await Purchases.getCustomerInfo();
    applyCustomerInfo(info);
    return info;
  }, [applyCustomerInfo, enabled]);

  const restorePurchases = useCallback(async () => {
    if (!enabled) return null;
    const info = await Purchases.restorePurchases();
    applyCustomerInfo(info);
    return info;
  }, [applyCustomerInfo, enabled]);

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
          ? Math.max(
              1,
              Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            )
          : 0,
      entitlementId: RC_ENTITLEMENT_ID,
      customerInfo,
      restorePurchases,
      refreshCustomerInfo,
    }),
    [
      customerInfo,
      enabled,
      hasAccess,
      hasSubscription,
      hasTrialAccess,
      ready,
      refreshCustomerInfo,
      restorePurchases,
      trialEndsAt,
    ]
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within BillingProvider');
  return ctx;
}
