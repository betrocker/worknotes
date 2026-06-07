import React from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { FloatingActionOverlay } from '@/components/FloatingTabBar';
import { QuickFindSwipeDown } from '@/components/QuickFindSwipeDown';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = colorScheme === 'dark' ? '#1D2229' : '#F2F2F7';

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <QuickFindSwipeDown>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor },
        }}>
        <Stack.Screen name="index" options={{ title: t('tabs.home') }} />
        <Stack.Screen name="klijenti" options={{ title: t('tabs.clients') }} />
        <Stack.Screen name="poslovi" options={{ title: t('tabs.jobs') }} />
        <Stack.Screen name="dugovanja" options={{ title: t('tabs.debtsShort') }} />
        <Stack.Screen
          name="podesavanja"
          options={{
            title: t('tabs.profile'),
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen name="klijent/new" />
        <Stack.Screen name="klijent/[id]" />
        <Stack.Screen name="klijent/[id]/edit" />
        <Stack.Screen name="posao/new" />
        <Stack.Screen name="posao/kalendar" />
        <Stack.Screen name="posao/[id]" />
        <Stack.Screen name="posao/[id]/edit" />
        <Stack.Screen name="posao/[id]/payment/new" />
        <Stack.Screen name="posao/[id]/payment/[paymentId]/edit" />
        <Stack.Screen name="posao/[id]/expense/new" />
        <Stack.Screen name="posao/[id]/expense/[expenseId]/edit" />
        <Stack.Screen name="legal/[slug]" />
      </Stack>
      <FloatingActionOverlay />
      </QuickFindSwipeDown>
    </View>
  );
}
