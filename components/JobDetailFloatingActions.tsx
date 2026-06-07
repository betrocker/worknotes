import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import type { ComponentProps } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { triggerFabHaptic } from '@/lib/haptics';

type ActionIconName = ComponentProps<typeof Ionicons>['name'];

export type JobDetailFloatingAction = {
  key: string;
  label: string;
  sublabel: string;
  icon: ActionIconName;
  color: string;
  backgroundColor: string;
  onPress: () => void;
};

type Props = {
  actions: JobDetailFloatingAction[];
};

const CLOSED_SIZE = 48;
const OPEN_HEIGHT = 262;
const CLOSED_BACKGROUND = '#4287f4';

export function JobDetailFloatingActions({ actions }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const menuColors = Colors.dark;
  const { width: windowWidth } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);

  const bottom = useMemo(() => Math.max(insets.bottom + 18, 24), [insets.bottom]);
  const containerWidth = Math.max(windowWidth - 24, 0);
  const openWidth = containerWidth > 0 ? Math.min(containerWidth, Math.round(containerWidth * 0.84)) : 0;
  const openRight = containerWidth > openWidth ? (containerWidth - openWidth) / 2 : 0;
  const glassBorderColor = 'rgba(255,255,255,0.18)';

  const animateOpen = useCallback(() => {
    setOpen(true);
    setPanelMounted(true);
    Animated.parallel([
      Animated.spring(progress, {
        toValue: 1,
        useNativeDriver: false,
        damping: 19,
        stiffness: 220,
        mass: 0.82,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, progress]);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 0,
        duration: 170,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setOpen(false);
        setPanelMounted(false);
      }
    });
  }, [backdropOpacity, progress]);

  useEffect(() => {
    return () => {
      progress.stopAnimation();
      backdropOpacity.stopAnimation();
    };
  }, [backdropOpacity, progress]);

  const toggleOpen = useCallback(() => {
    triggerFabHaptic();
    if (open) {
      animateClose();
      return;
    }
    animateOpen();
  }, [animateClose, animateOpen, open]);

  const runAction = useCallback(
    (action: JobDetailFloatingAction) => {
      animateClose();
      requestAnimationFrame(action.onPress);
    },
    [animateClose]
  );

  if (!containerWidth || !openWidth) return null;

  return (
    <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0" style={{ zIndex: 45, elevation: 45 }}>
      {!panelMounted ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('fab.open')}
          onPress={toggleOpen}
          style={{
            position: 'absolute',
            right: 12,
            bottom,
            height: CLOSED_SIZE,
            width: CLOSED_SIZE,
            borderRadius: CLOSED_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: CLOSED_BACKGROUND,
            borderWidth: 1,
            borderColor: glassBorderColor,
            shadowColor: '#000000',
            shadowOpacity: colorScheme === 'dark' ? 0.24 : 0.16,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 7 },
            elevation: 10,
          }}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      ) : null}

      {panelMounted ? (
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          className="absolute bottom-0 left-0 right-0 top-0"
          style={{ opacity: backdropOpacity }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('fab.close')}
            onPress={animateClose}
            className="absolute bottom-0 left-0 right-0 top-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.28)' }}
          />
        </Animated.View>
      ) : null}

      <View
        pointerEvents={panelMounted ? 'box-none' : 'none'}
        className="absolute left-3 right-3"
        style={{ bottom, height: 280 }}>
        {panelMounted ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: OPEN_HEIGHT,
          }}>
          <Animated.View
            pointerEvents={open ? 'auto' : 'box-none'}
            style={{
              position: 'absolute',
              right: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, openRight],
              }),
              bottom: 0,
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [CLOSED_SIZE, openWidth],
              }),
              height: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [CLOSED_SIZE, OPEN_HEIGHT],
              }),
              borderRadius: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 30],
              }),
              borderWidth: 1,
              borderColor: glassBorderColor,
              overflow: 'hidden',
              shadowColor: '#000000',
              shadowOpacity: colorScheme === 'dark' ? 0.24 : 0.16,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 7 },
              elevation: 10,
            }}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundColor: menuColors.menuSurface,
              }}
            />
            <BlurView
              pointerEvents="none"
              intensity={Platform.OS === 'ios' ? 92 : 54}
              tint="dark"
              {...(Platform.OS === 'android' ? { experimentalBlurMethod: 'dimezisBlurView' as const } : {})}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundColor: menuColors.menuSurface,
                opacity: progress.interpolate({
                  inputRange: [0, 0.55, 1],
                  outputRange: [0, 0, 1],
                }),
              }}
            />

            <Animated.View
              pointerEvents={open ? 'none' : 'box-none'}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: progress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0, 0],
                }),
              }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('fab.open')}
                onPress={toggleOpen}
                style={{
                  height: CLOSED_SIZE,
                  width: CLOSED_SIZE,
                  borderRadius: CLOSED_SIZE / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: CLOSED_BACKGROUND,
                  borderWidth: 1,
                  borderColor: glassBorderColor,
                }}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </Pressable>
            </Animated.View>

            <Animated.View
              pointerEvents={open ? 'auto' : 'none'}
              style={{
                flex: 1,
                paddingHorizontal: 10,
                paddingVertical: 10,
                opacity: progress.interpolate({
                  inputRange: [0, 0.56, 1],
                  outputRange: [0, 0, 1],
                }),
              }}>
              {actions.map((action, index) => (
                <Pressable
                  key={action.key}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={() => runAction(action)}
                  style={{
                    minHeight: 58,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    borderRadius: 20,
                    paddingHorizontal: 8,
                    paddingRight: index === 0 ? 34 : 8,
                    paddingTop: 8,
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: 'rgba(255,255,255,0.07)',
                  }}>
                  <View
                    style={{
                      height: 24,
                      width: 24,
                      marginTop: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name={action.icon} size={18} color={action.color} />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: menuColors.text,
                        fontSize: 17,
                        fontWeight: '400',
                      }}>
                      {action.label}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        marginTop: 2,
                        color: menuColors.secondaryText,
                        fontSize: 14,
                        fontWeight: '500',
                      }}>
                      {action.sublabel}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Animated.View>
          </Animated.View>
        </View>
        ) : null}
      </View>
    </View>
  );
}
