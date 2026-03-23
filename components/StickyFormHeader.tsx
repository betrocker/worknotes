import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type StickyFormHeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  onSave: () => void;
  saveLabel: string;
  submitting?: boolean;
  right?: React.ReactNode;
};

export function StickyFormHeader({
  title,
  subtitle,
  onBack,
  onSave,
  saveLabel,
  submitting = false,
  right,
}: StickyFormHeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={{ position: 'relative', zIndex: 20, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 16 }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white dark:border-white/10 dark:bg-[#1C1C1E]">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          <View className="flex-row items-center">
            {right}
            <Pressable
              disabled={submitting}
              onPress={onSave}
              className="h-10 items-center justify-center rounded-3xl bg-[#007AFF] px-5 disabled:opacity-60 dark:bg-[#0A84FF]">
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-base font-semibold text-white">{saveLabel}</Text>}
            </Pressable>
          </View>
        </View>

        <Text className="mt-4 font-bold text-[34px] leading-[40px] tracking-tight text-black dark:text-white">{title}</Text>
        {subtitle ? <Text className="mt-1 text-base text-black/60 dark:text-white/70">{subtitle}</Text> : null}
      </View>
    </View>
  );
}
