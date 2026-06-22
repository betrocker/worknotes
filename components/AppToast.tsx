import Ionicons from '@expo/vector-icons/Ionicons';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { useOfflineSync } from '@/providers/OfflineSyncProvider';

type ToastIntent = 'info' | 'success' | 'warning' | 'error';
type IoniconName = ComponentProps<typeof Ionicons>['name'];

type ToastInput = {
  message: string;
  intent?: ToastIntent;
  duration?: number;
};

type ToastRecord = Required<ToastInput> & {
  id: number;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  hideToast: () => {},
});

const TOAST_DURATION_MS = 2200;
const SYNC_DONE_DURATION_MS = 1600;

const intentColor: Record<ToastIntent, string> = {
  info: '#72A8FF',
  success: '#7AD69C',
  warning: '#F5A524',
  error: '#E5484D',
};

const intentIcon: Record<ToastIntent, IoniconName> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'alert-circle',
  error: 'close-circle',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastRecord | null>(null);
  const nextIdRef = useRef(1);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    ({ message, intent = 'info', duration = TOAST_DURATION_MS }: ToastInput) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const id = nextIdRef.current;
      nextIdRef.current += 1;
      setToast({ id, message, intent, duration });
      timeoutRef.current = setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
        timeoutRef.current = null;
      }, duration);
    },
    []
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  const value = useMemo(() => ({ showToast, hideToast }), [hideToast, showToast]);

  const internalValue = useMemo(() => ({ toast, hideToast }), [hideToast, toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastInternalContext.Provider value={internalValue}>{children}</ToastInternalContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function AppToastViewport() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const { toast, hideToast } = useToastState();
  const { isOnline, isSyncing, pendingOperations, lastError } = useOfflineSync();
  const translateY = useRef(new Animated.Value(-18)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const offlineSyncSessionRef = useRef(false);
  const syncToastWasVisibleRef = useRef(false);
  const syncDoneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSyncDone, setShowSyncDone] = useState(false);
  const [renderedToast, setRenderedToast] = useState<{
    id: string;
    message: string;
    intent: ToastIntent;
    persistent?: boolean;
  } | null>(null);

  if (!isOnline && pendingOperations > 0) {
    offlineSyncSessionRef.current = true;
  }

  const syncToast = useMemo(() => {
    if (!offlineSyncSessionRef.current) return null;

    if (lastError) {
      return {
        id: 'sync-error',
        intent: 'error' as const,
        message: t('sync.failed'),
        persistent: true,
      };
    }

    if (!isOnline && pendingOperations > 0) {
      return {
        id: `sync-waiting-${pendingOperations}`,
        intent: 'warning' as const,
        message: t('sync.waiting'),
        persistent: true,
      };
    }

    if (isSyncing) {
      return {
        id: `syncing-${pendingOperations}`,
        intent: 'info' as const,
        message: t('sync.syncing'),
        persistent: true,
      };
    }

    if (pendingOperations > 0) {
      return {
        id: `sync-pending-${pendingOperations}`,
        intent: 'warning' as const,
        message: t('sync.pending'),
        persistent: true,
      };
    }

    return null;
  }, [isOnline, isSyncing, lastError, pendingOperations, t]);

  useEffect(() => {
    const active = Boolean(syncToast);
    if (active) {
      syncToastWasVisibleRef.current = true;
      setShowSyncDone(false);
      if (syncDoneTimeoutRef.current) {
        clearTimeout(syncDoneTimeoutRef.current);
        syncDoneTimeoutRef.current = null;
      }
      return;
    }

    if (syncToastWasVisibleRef.current && offlineSyncSessionRef.current && !lastError) {
      syncToastWasVisibleRef.current = false;
      offlineSyncSessionRef.current = false;
      setShowSyncDone(true);
      syncDoneTimeoutRef.current = setTimeout(() => {
        setShowSyncDone(false);
        syncDoneTimeoutRef.current = null;
      }, SYNC_DONE_DURATION_MS);
      return;
    }

    if (!isSyncing && pendingOperations === 0 && !lastError) {
      syncToastWasVisibleRef.current = false;
      offlineSyncSessionRef.current = false;
    }
  }, [isSyncing, lastError, pendingOperations, syncToast]);

  useEffect(
    () => () => {
      if (syncDoneTimeoutRef.current) clearTimeout(syncDoneTimeoutRef.current);
    },
    []
  );

  const visibleToast = useMemo(() => {
    if (toast) {
      return {
        id: `manual-${toast.id}`,
        message: toast.message,
        intent: toast.intent,
      };
    }

    if (syncToast) return syncToast;

    if (showSyncDone) {
      return {
        id: 'sync-done',
        message: t('sync.synced'),
        intent: 'success' as const,
      };
    }

    return null;
  }, [showSyncDone, syncToast, t, toast]);

  useEffect(() => {
    if (visibleToast) {
      setRenderedToast(visibleToast);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 190,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          damping: 17,
          stiffness: 220,
          mass: 0.7,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -18,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setRenderedToast(null);
    });
  }, [opacity, scale, translateY, visibleToast]);

  if (!renderedToast) return null;

  const accent = intentColor[renderedToast.intent];
  const surface = colorScheme === 'dark' ? 'rgba(14,16,20,0.96)' : 'rgba(16,18,22,0.94)';

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.wrapper,
          {
            top: insets.top + 8,
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}>
        <Pressable
          disabled={Boolean(renderedToast.persistent)}
          onPress={hideToast}
          style={[
            styles.toast,
            {
              backgroundColor: surface,
              borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.22)',
            },
          ]}>
          <View style={[styles.statusDot, { backgroundColor: accent }]} />
          <Text style={styles.message} numberOfLines={1}>
            {renderedToast.message}
          </Text>
          {renderedToast.intent === 'success' ? (
            <Ionicons name={intentIcon.success} size={15} color={accent} />
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function useToastState() {
  const context = useContext(ToastInternalContext);
  if (!context) {
    throw new Error('AppToastViewport must be rendered inside ToastProvider.');
  }
  return context;
}

const ToastInternalContext = createContext<{
  toast: ToastRecord | null;
  hideToast: () => void;
} | null>(null);

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    alignItems: 'center',
  },
  toast: {
    minHeight: 38,
    maxWidth: 360,
    minWidth: 176,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  message: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    textAlign: 'center',
  },
});
