import React from 'react';
import { View } from 'react-native';

import { QuickFindHost } from '@/components/QuickFindButton';

export function QuickFindSwipeDown({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      {children}
      <QuickFindHost />
    </View>
  );
}
