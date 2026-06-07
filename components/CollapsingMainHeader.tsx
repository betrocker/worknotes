import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { ComponentProps } from 'react';
import React from 'react';
import { Animated, Image, Platform, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

type HeaderIconName = ComponentProps<typeof Ionicons>['name'];

const SCREEN_ICON_COLORS: Partial<Record<HeaderIconName, string>> = {
  today: '#fd2d65',
  'people-outline': '#4db1a6',
  'briefcase-outline': '#d1c48a',
  'cash-outline': '#4cbf60',
  'person-outline': '#fd2d65',
  'calendar-outline': '#4db1a6',
};

function getDefaultIconColor(iconName: HeaderIconName) {
  return SCREEN_ICON_COLORS[iconName] ?? '#4cbf60';
}

type HeaderProps = {
  title: string;
  iconName: HeaderIconName;
  imageSource?: ImageSourcePropType;
  iconColor?: string;
  scrollY: Animated.Value;
  left?: React.ReactNode;
  right?: React.ReactNode;
};

function HeaderIcon({
  name,
  color,
  size,
  glyphSize,
}: {
  name: HeaderIconName;
  color: string;
  size: number;
  glyphSize: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Ionicons name={name} size={glyphSize} color={color} />
    </View>
  );
}

export function CollapsingMainHeader({
  title,
  iconName,
  imageSource,
  iconColor,
  scrollY,
  left,
  right,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const resolvedIconColor = iconColor ?? getDefaultIconColor(iconName);

  const opacity = scrollY.interpolate({
    inputRange: [18, 58],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const translateY = scrollY.interpolate({
    inputRange: [18, 58],
    outputRange: [-6, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.sticky,
        {
          height: insets.top + 53,
        },
      ]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
        <View style={[styles.glassFallback, { backgroundColor: isDark ? 'rgba(29,34,41,0.58)' : 'rgba(242,242,247,0.62)' }]} />
        <BlurView
          intensity={Platform.OS === 'ios' ? 82 : 48}
          tint={isDark ? 'dark' : 'light'}
          {...(Platform.OS === 'android' ? { experimentalBlurMethod: 'dimezisBlurView' as const } : {})}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickyContent,
          {
            opacity,
            paddingTop: insets.top,
            transform: [{ translateY }],
          },
        ]}>
        {imageSource ? (
          <Image source={imageSource} resizeMode="contain" style={styles.stickyImage} />
        ) : (
          <HeaderIcon
            name={iconName}
            color={resolvedIconColor}
            size={24}
            glyphSize={18}
          />
        )}
        <Text style={[styles.stickyTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </Animated.View>
      {left ? (
        <View pointerEvents="box-none" style={[styles.leftSlot, { top: insets.top + 4 }]}>
          {left}
        </View>
      ) : null}
      {right ? (
        <View pointerEvents="box-none" style={[styles.rightSlot, { top: insets.top + 4 }]}>
          {right}
        </View>
      ) : null}
    </View>
  );
}

export function MainScreenTitle({
  title,
  iconName,
  imageSource,
  iconColor,
  scrollY,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const resolvedIconColor = iconColor ?? getDefaultIconColor(iconName);

  const opacity = scrollY.interpolate({
    inputRange: [18, 58],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const translateY = scrollY.interpolate({
    inputRange: [18, 68],
    outputRange: [0, -18],
    extrapolate: 'clamp',
  });
  const scale = scrollY.interpolate({
    inputRange: [18, 68],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.large,
        {
          paddingTop: insets.top + 58,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}>
      {imageSource ? (
        <Image source={imageSource} resizeMode="contain" style={styles.largeImage} />
      ) : (
        <HeaderIcon
          name={iconName}
          color={resolvedIconColor}
          size={30}
          glyphSize={24}
        />
      )}
      <Text style={[styles.largeTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sticky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
  stickyContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 72,
  },
  stickyTitle: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  stickyImage: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  glassFallback: {
    ...StyleSheet.absoluteFillObject,
  },
  separator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    opacity: 0.7,
  },
  leftSlot: {
    position: 'absolute',
    left: 18,
  },
  rightSlot: {
    position: 'absolute',
    right: 18,
  },
  large: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 20,
  },
  largeTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 34,
  },
  largeImage: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
});
