import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

type BillingContextValue = {
  ready: boolean;
  enabled: boolean;
  hasAccess: boolean;
  entitlementId: string;
  customerInfo: CustomerInfo | null;
  restorePurchases: () => Promise<CustomerInfo | null>;
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
  const configuredRef = useRef(false);
  const listenerRef = useRef<((info: CustomerInfo) => void) | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      if (!enabled || !apiKey) {
        if (active) {
          setReady(true);
          setHasAccess(true);
          setCustomerInfo(null);
        }
        return;
      }

      setReady(false);

      try {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        if (!configuredRef.current) {
          Purchases.configure({
            apiKey,
            appUserID: userId ?? undefined,
          });
          configuredRef.current = true;
          lastUserIdRef.current = userId;

          const listener = (info: CustomerInfo) => {
            setCustomerInfo(info);
            setHasAccess(hasActiveEntitlement(info, RC_ENTITLEMENT_ID));
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
        setHasAccess(hasActiveEntitlement(info, RC_ENTITLEMENT_ID));
      } catch (error) {
        console.warn('[billing] RevenueCat init failed:', error);
        if (!active) return;
        setCustomerInfo(null);
        setHasAccess(true);
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
  }, [apiKey, enabled, userId]);

  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        Purchases.removeCustomerInfoUpdateListener(listenerRef.current);
      }
    };
  }, []);

  const value = useMemo<BillingContextValue>(
    () => ({
      ready,
      enabled,
      hasAccess,
      entitlementId: RC_ENTITLEMENT_ID,
      customerInfo,
      restorePurchases: async () => {
        if (!enabled) return null;
        const info = await Purchases.restorePurchases();
        setCustomerInfo(info);
        setHasAccess(hasActiveEntitlement(info, RC_ENTITLEMENT_ID));
        return info;
      },
    }),
    [customerInfo, enabled, hasAccess, ready]
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within BillingProvider');
  return ctx;
}
