import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, Platform, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';

import Colors from '@/constants/Colors';
import { listClientsWithDebt } from '@/lib/clients';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/providers/AuthProvider';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ROUTE_NAMES = new Set(['index', 'klijenti', 'poslovi', 'dugovanja', 'podesavanja']);

function getIconForRoute(routeName: string, focused: boolean): IoniconName {
  switch (routeName) {
    case 'index':
      return focused ? 'home' : 'home-outline';
    case 'klijenti':
      return focused ? 'people' : 'people-outline';
    case 'poslovi':
      return focused ? 'briefcase' : 'briefcase-outline';
    case 'dugovanja':
      return focused ? 'cash' : 'cash-outline';
    case 'podesavanja':
      return focused ? 'person' : 'person-outline';
    default:
      return focused ? 'ellipse' : 'ellipse-outline';
  }
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const focusedRoute = state.routes[state.index];
  const focusedIsTab = !!focusedRoute && TAB_ROUTE_NAMES.has(focusedRoute.name);

  const visibleRoutes = useMemo(() => {
    return state.routes.filter((route) => TAB_ROUTE_NAMES.has(route.name));
  }, [state.routes]);

  const [barWidth, setBarWidth] = useState(0);
  const tabCount = visibleRoutes.length;

  const padding = 8;
  const itemWidth = useMemo(() => {
    if (!barWidth || tabCount === 0) return 0;
    return (barWidth - padding * 2) / tabCount;
  }, [barWidth, tabCount]);

  const translateX = useRef(new Animated.Value(0)).current;
  const [debtsBadgeCount, setDebtsBadgeCount] = useState(0);

  useEffect(() => {
    if (!itemWidth) return;
    if (!focusedRoute) return;
    if (!visibleRoutes.length) return;
    const visibleIndex = Math.max(
      0,
      visibleRoutes.findIndex((route) => route.key === focusedRoute?.key)
    );
    Animated.timing(translateX, {
      toValue: visibleIndex * itemWidth,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [focusedRoute?.key, itemWidth, translateX, visibleRoutes]);

  useEffect(() => {
    if (!userId) {
      setDebtsBadgeCount(0);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const clients = await listClientsWithDebt(userId);
        if (!mounted) return;
        setDebtsBadgeCount(clients.filter((client) => client.debt > 0).length);
      } catch {
        if (!mounted) return;
        setDebtsBadgeCount(0);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [focusedRoute?.key, userId]);

  const onLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  const bottom = Math.max(insets.bottom, 12) + 8;
  const tabBarRadius = 30;
  if (!focusedIsTab) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-4 right-4"
      style={{ bottom }}
      onLayout={onLayout}>
      <View
        className="rounded-[30px]"
        style={{
          shadowColor: '#000',
          shadowOpacity: colorScheme === 'dark' ? 0.46 : 0.3,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 14 },
          elevation: 26,
        }}>
        <View className="overflow-hidden rounded-[30px]">
        <View
          className="absolute inset-0"
          style={{
            backgroundColor:
              colorScheme === 'dark' ? 'rgba(28,28,30,0.78)' : 'rgba(246,246,248,0.86)',
            borderColor: colors.tabBarBorder,
            borderWidth: 1,
            borderRadius: tabBarRadius,
          }}
        />

        <BlurView
          intensity={Platform.OS === 'ios' ? 72 : 42}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          {...(Platform.OS === 'android' ? { experimentalBlurMethod: 'dimezisBlurView' as const } : {})}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />

        {itemWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: padding,
              top: padding,
              bottom: padding,
              width: itemWidth,
              borderRadius: tabBarRadius - padding,
              backgroundColor: colors.tint,
              opacity: colorScheme === 'dark' ? 0.22 : 0.14,
              transform: [{ translateX }],
            }}
          />
        )}

        <View style={{ padding, flexDirection: 'row', alignItems: 'center' }}>
          {visibleRoutes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.title ?? route.name;

            const isFocused = focusedRoute?.key === route.key;
            const iconName = getIconForRoute(route.name, isFocused);
            const color = isFocused ? colors.text : colors.tabIconDefault;
            const badgeCount = route.name === 'dugovanja' ? debtsBadgeCount : 0;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                className="flex-1 items-center justify-center py-2">
                <View style={{ position: 'relative' }}>
                  <Ionicons name={iconName} size={24} color={color} />
                  {badgeCount > 0 ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -12,
                        minWidth: 18,
                        height: 18,
                        paddingHorizontal: 4,
                        borderRadius: 999,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FF453A',
                        borderWidth: 1.5,
                        borderColor: colorScheme === 'dark' ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.95)',
                      }}>
                      <Text
                        style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}
                        numberOfLines={1}>
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  className={isFocused ? 'mt-1 text-app-meta font-semibold' : 'mt-1 text-app-meta font-medium'}
                  style={{ color }}
                  numberOfLines={1}>
                  {String(label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        </View>
      </View>
    </View>
  );
}
