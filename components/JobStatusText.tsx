import React from 'react';
import { Text, type TextStyle } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';

type Props = {
  label: string;
  status: string | null | undefined;
  style?: TextStyle;
};

function getStatusTextColor(isDark: boolean) {
  return isDark ? 'rgba(255,255,255,0.58)' : 'rgba(60,60,67,0.58)';
}

export function JobStatusText({ label, style }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  return (
    <Text
      numberOfLines={1}
      style={[
        {
          color: getStatusTextColor(isDark),
          fontSize: 12,
          fontWeight: '500',
        },
        style,
      ]}>
      {label}
    </Text>
  );
}
