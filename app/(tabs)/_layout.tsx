import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/Colors';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: false,
        sceneStyle: {
          backgroundColor: "#1A4FE0",
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
        }}
      />
      <Tabs.Screen name="klijenti" options={{ title: t('tabs.clients') }} />
      <Tabs.Screen name="poslovi" options={{ title: t('tabs.jobs') }} />
      <Tabs.Screen name="dugovanja" options={{ title: t('tabs.debtsShort') }} />
      <Tabs.Screen name="podesavanja" options={{ title: t('tabs.profile') }} />
      <Tabs.Screen name="klijent/new" options={{ href: null }} />
      <Tabs.Screen name="klijent/[id]" options={{ href: null }} />
      <Tabs.Screen name="klijent/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="posao/new" options={{ href: null }} />
      <Tabs.Screen name="posao/[id]" options={{ href: null }} />
      <Tabs.Screen name="posao/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="posao/[id]/payment/new" options={{ href: null }} />
      <Tabs.Screen name="posao/[id]/payment/[paymentId]/edit" options={{ href: null }} />
      <Tabs.Screen name="posao/[id]/expense/new" options={{ href: null }} />
      <Tabs.Screen name="posao/[id]/expense/[expenseId]/edit" options={{ href: null }} />
      <Tabs.Screen name="legal/[slug]" options={{ href: null }} />
    </Tabs>
  );
}
