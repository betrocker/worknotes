import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, Platform, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function getIconForRoute(routeName: string, focused: boolean): IoniconName {
  switch (routeName) {
    case 'index':
      return focused ? 'briefcase' : 'briefcase-outline';
    case 'clients':
      return focused ? 'people' : 'people-outline';
    case 'new':
      return focused ? 'add-circle' : 'add-circle-outline';
    case 'payments':
      return focused ? 'card' : 'card-outline';
    case 'more':
      return focused ? 'menu' : 'menu-outline';
    default:
      return focused ? 'ellipse' : 'ellipse-outline';
  }
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [barWidth, setBarWidth] = useState(0);
  const tabCount = state.routes.length;

  const padding = 8;
  const itemWidth = useMemo(() => {
    if (!barWidth || tabCount === 0) return 0;
    return (barWidth - padding * 2) / tabCount;
  }, [barWidth, tabCount]);

  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!itemWidth) return;
    Animated.timing(translateX, {
      toValue: state.index * itemWidth,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [itemWidth, state.index, translateX]);

  const onLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  const bottom = Math.max(insets.bottom, 12) + 8;
  const backgroundFallback = colors.tabBarBackground;

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-4 right-4"
      style={{ bottom }}
      onLayout={onLayout}>
      <View
        className="overflow-hidden rounded-full"
        style={{
          shadowColor: '#000',
          shadowOpacity: colorScheme === 'dark' ? 0.35 : 0.18,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 18,
        }}>
        <View
          className="absolute inset-0"
          style={{
            backgroundColor: backgroundFallback,
            borderColor: colors.tabBarBorder,
            borderWidth: 1,
            borderRadius: 9999,
          }}
        />

        {Platform.OS === 'ios' && (
          <BlurView
            intensity={60}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
        )}

        {itemWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: padding,
              top: padding,
              bottom: padding,
              width: itemWidth,
              borderRadius: 9999,
              backgroundColor: colors.tint,
              opacity: colorScheme === 'dark' ? 0.22 : 0.14,
              transform: [{ translateX }],
            }}
          />
        )}

        <View className="flex-row items-center" style={{ padding }}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.title ?? route.name;

            const isFocused = state.index === index;
            const iconName = getIconForRoute(route.name, isFocused);
            const color = isFocused ? colors.text : colors.tabIconDefault;

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
                <Ionicons name={iconName} size={24} color={color} />
                <Text
                  className={isFocused ? 'mt-1 text-[12px] font-semibold' : 'mt-1 text-[12px] font-medium'}
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
  );
}
