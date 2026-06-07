import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type StickyFormHeaderProps = {
  title: string;
  onBack: () => void;
  onSave: () => void;
  saveLabel: string;
  submitting?: boolean;
  scrollY?: Animated.Value;
  right?: React.ReactNode;
};

export function StickyFormHeader({
  title,
  onBack,
  onSave,
  saveLabel,
  submitting = false,
  scrollY,
  right,
}: StickyFormHeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const isDark = colorScheme === 'dark';
  const titleOpacity = scrollY
    ? scrollY.interpolate({
        inputRange: [18, 58],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : 0;
  const titleTranslateY = scrollY
    ? scrollY.interpolate({
        inputRange: [18, 58],
        outputRange: [-6, 0],
        extrapolate: 'clamp',
      })
    : 0;

  return (
    <View accessibilityLabel={title} style={{ position: 'relative', zIndex: 20, elevation: 20 }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDark ? 'rgba(29,34,41,0.58)' : 'rgba(242,242,247,0.62)',
        }}
      />
      <BlurView
        intensity={Platform.OS === 'ios' ? 82 : 48}
        tint={isDark ? 'dark' : 'light'}
        {...(Platform.OS === 'android' ? { experimentalBlurMethod: 'dimezisBlurView' as const } : {})}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 14 }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            className="h-11 w-11 items-center justify-center">
            <Ionicons name="chevron-back" size={25} color="#717983" />
          </Pressable>

          <Animated.Text
            pointerEvents="none"
            numberOfLines={1}
            style={{
              position: 'absolute',
              left: 82,
              right: 82,
              textAlign: 'center',
              color: colors.text,
              fontSize: 17,
              fontWeight: '600',
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}>
            {title}
          </Animated.Text>

          <View className="flex-row items-center">
            {right}
            <Pressable
              disabled={submitting}
              onPress={onSave}
              className="h-10 items-center justify-center px-1 disabled:opacity-60">
              {submitting ? (
                <ActivityIndicator color={colors.tint} />
              ) : (
                <Text style={{ color: colors.tint, fontSize: 17, fontWeight: '600' }}>
                  {saveLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

      </View>
    </View>
  );
}
