import { createElement, useCallback, useMemo, useRef } from 'react';
import { Platform, RefreshControl } from 'react-native';
import type { GestureResponderEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { triggerPullDownHaptic } from '@/lib/haptics';
import { openQuickFind } from '@/lib/quick-find';

const SWIPE_DOWN_THRESHOLD = 42;
const SWIPE_DOWN_BIAS = 1.15;
const TOP_OFFSET_THRESHOLD = 8;

type SwipeStart = {
  x: number;
  y: number;
  scrollY: number;
};

export function useQuickFindSwipeDown() {
  const colorScheme = useColorScheme() ?? 'light';
  const scrollOffsetYRef = useRef(0);
  const swipeDownStartRef = useRef<SwipeStart | null>(null);
  const isDark = colorScheme === 'dark';
  const indicatorColor = isDark ? '#72A8FF' : '#1C60C3';

  const triggerQuickFind = useCallback(() => {
    triggerPullDownHaptic();
    openQuickFind();
  }, []);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const onTouchStart = useCallback((event: GestureResponderEvent) => {
    swipeDownStartRef.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
      scrollY: scrollOffsetYRef.current,
    };
  }, []);

  const onTouchMove = useCallback((event: GestureResponderEvent) => {
    const start = swipeDownStartRef.current;
    if (!start || start.scrollY > TOP_OFFSET_THRESHOLD) return;

    const dx = event.nativeEvent.pageX - start.x;
    const dy = event.nativeEvent.pageY - start.y;

    if (dy > SWIPE_DOWN_THRESHOLD && Math.abs(dy) > Math.abs(dx) * SWIPE_DOWN_BIAS) {
      swipeDownStartRef.current = null;
      triggerQuickFind();
    }
  }, [triggerQuickFind]);

  const resetTouch = useCallback(() => {
    swipeDownStartRef.current = null;
  }, []);

  const refreshControl = useMemo(
    () =>
      Platform.OS === 'android'
        ? createElement(RefreshControl, {
            refreshing: false,
            onRefresh: triggerQuickFind,
            colors: [indicatorColor],
            progressBackgroundColor: isDark ? Colors.dark.menuSurface : '#FFFFFF',
          })
        : undefined,
    [indicatorColor, isDark, triggerQuickFind]
  );

  return {
    onScroll,
    refreshControl,
    touchHandlers: {
      onTouchCancel: resetTouch,
      onTouchEnd: resetTouch,
      onTouchMove,
      onTouchStart,
    },
  };
}
