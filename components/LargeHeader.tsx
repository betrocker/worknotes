import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function LargeHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View className="px-6 pb-4" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-end justify-between">
        <View className="flex-1 pr-4">
          <Text className="font-display text-[34px] leading-[40px] tracking-tight text-black dark:text-white">
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-base text-black/60 dark:text-white/70">{subtitle}</Text>
          ) : null}
        </View>
        {right ? <View className="pb-1">{right}</View> : null}
      </View>
    </View>
  );
}
