import React from 'react';
import { Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';

type EmptyStateProps = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyState({
  title,
  body,
  compact = false,
}: EmptyStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const engravedColor = colorScheme === 'dark' ? 'rgba(255,255,255,0.24)' : 'rgba(60,60,67,0.32)';

  return (
    <View className={compact ? 'items-center px-0 py-2' : 'items-center px-1 py-4'}>
      <Text
        className="text-center text-app-body italic"
        style={{
          color: engravedColor,
        }}>
        {title}
      </Text>
      {body ? (
        <Text
          className="mt-1 max-w-[290px] text-center text-app-meta-lg italic"
          style={{
            color: colorScheme === 'dark' ? 'rgba(255,255,255,0.20)' : 'rgba(60,60,67,0.28)',
          }}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}
