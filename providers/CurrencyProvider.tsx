import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getStoredCurrency, setStoredCurrency, type AppCurrency } from '@/lib/currency';

type CurrencyContextValue = {
  ready: boolean;
  currency: AppCurrency;
  setCurrency: (currency: AppCurrency) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [currency, setCurrencyState] = useState<AppCurrency>('EUR');

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const stored = await getStoredCurrency();
      if (!mounted) return;
      setCurrencyState(stored);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setCurrency = useCallback((nextCurrency: AppCurrency) => {
    setCurrencyState(nextCurrency);
    void setStoredCurrency(nextCurrency);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      currency,
      setCurrency,
    }),
    [currency, ready, setCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
