import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSegments } from 'expo-router';

import { MainFloatingActions } from '@/components/MainFloatingActions';
import { getMainFloatingActionsHidden, subscribeMainFloatingActionsHidden } from '@/lib/floating-actions-visibility';

const MAIN_ACTION_ROUTE_NAMES = new Set(['index', 'klijenti', 'poslovi', 'dugovanja']);

export function FloatingActionOverlay() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const segments = useSegments();
  const focusedRouteName = segments[1] ?? 'index';
  const showsActions = MAIN_ACTION_ROUTE_NAMES.has(focusedRouteName);
  const [containerWidth, setContainerWidth] = useState(0);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [backdropMounted, setBackdropMounted] = useState(false);
  const [closeSignal, setCloseSignal] = useState(0);
  const [actionsHidden, setActionsHidden] = useState(() => getMainFloatingActionsHidden());
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const bottom = useMemo(() => Math.max(insets.bottom + 18, 24), [insets.bottom]);

  const onOuterLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  useEffect(() => {
    if (!showsActions) {
      setActionsOpen(false);
      setBackdropMounted(false);
      backdropOpacity.setValue(0);
    }
  }, [backdropOpacity, showsActions]);

  useEffect(() => subscribeMainFloatingActionsHidden(setActionsHidden), []);

  useEffect(() => {
    if (actionsOpen) {
      setBackdropMounted(true);
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(backdropOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setBackdropMounted(false);
      }
    });
  }, [actionsOpen, backdropOpacity]);

  if (!showsActions) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-0 left-0 right-0 top-0">
      {backdropMounted ? (
        <Animated.View
          className="absolute bottom-0 left-0 right-0 top-0"
          pointerEvents={actionsOpen ? 'auto' : 'none'}
          style={{ opacity: backdropOpacity, zIndex: 1, elevation: 1 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('fab.close')}
            onPress={() => setCloseSignal((value) => value + 1)}
            className="absolute bottom-0 left-0 right-0 top-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.28)' }}
          />
        </Animated.View>
      ) : null}
      <View
        pointerEvents="box-none"
        className="absolute left-3 right-3"
        style={{ bottom, height: 280, zIndex: 2, elevation: 2 }}
        onLayout={onOuterLayout}>
        <MainFloatingActions
          focusedRouteName={focusedRouteName}
          containerWidth={containerWidth}
          onOpenChange={setActionsOpen}
          closeSignal={closeSignal}
          hidden={actionsHidden}
        />
      </View>
    </View>
  );
}
