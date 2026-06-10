import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { initializeOfflineStore, runOfflineSync } from '@/lib/offline/sync';
import { subscribeOfflineSyncNeeded } from '@/lib/offline/events';
import { getPendingSyncOperationCount } from '@/lib/offline/queue';
import { useAuth } from '@/providers/AuthProvider';

type OfflineSyncContextValue = {
  ready: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastError: string | null;
  syncNow: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue>({
  ready: false,
  isOnline: true,
  isSyncing: false,
  pendingOperations: 0,
  lastError: null,
  syncNow: async () => {},
});

function hasInternetAccess(state: Awaited<ReturnType<typeof NetInfo.fetch>>) {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [ready, setReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);

  const refreshPendingOperations = useCallback(async () => {
    const count = await getPendingSyncOperationCount();
    setPendingOperations(count);
    return count;
  }, []);

  const syncNow = useCallback(async () => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setIsSyncing(true);
    setLastError(null);
    try {
      const result = await runOfflineSync(userId);
      setPendingOperations(result.pendingOperations);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      await refreshPendingOperations().catch(() => {});
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshPendingOperations, userId]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await initializeOfflineStore();
        const networkState = await NetInfo.fetch();
        if (!active) return;
        setIsOnline(hasInternetAccess(networkState));
        await refreshPendingOperations();
      } catch (error) {
        if (active) {
          setLastError(error instanceof Error ? error.message : String(error));
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
  }, [refreshPendingOperations]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(hasInternetAccess(state));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!ready || !isOnline) return;
    void syncNow();
  }, [isOnline, ready, syncNow]);

  useEffect(() => {
    return subscribeOfflineSyncNeeded(() => {
      void refreshPendingOperations();
      if (ready && isOnline) {
        void syncNow();
      }
    });
  }, [isOnline, ready, refreshPendingOperations, syncNow]);

  const value = useMemo(
    () => ({
      ready,
      isOnline,
      isSyncing,
      pendingOperations,
      lastError,
      syncNow,
    }),
    [isOnline, isSyncing, lastError, pendingOperations, ready, syncNow]
  );

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSync() {
  return useContext(OfflineSyncContext);
}
