import React from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { Pressable } from 'react-native';

import { useColorScheme, useSetColorScheme } from '@/components/useColorScheme';
import { LargeHeader } from '@/components/LargeHeader';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export default function MoreScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const setColorScheme = useSetColorScheme();
  const { session } = useAuth();

  const isDark = colorScheme === 'dark';

  return (
    <ScrollView className="flex-1 bg-[#F2F2F7] dark:bg-black" contentContainerClassName="pb-32">
      <LargeHeader title="Vise" subtitle="Podesavanja aplikacije." />

      <View className="px-6">
        <View className="mb-4 overflow-hidden rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <Text className="text-sm font-medium text-black/60 dark:text-white/70">Nalog</Text>
          <Text className="mt-1 text-base text-black dark:text-white" numberOfLines={1}>
            {session?.user?.email ?? 'Nije ulogovan'}
          </Text>
        </View>

        <View className="overflow-hidden rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-base font-semibold text-black dark:text-white">
                Dark tema
              </Text>
              <Text className="mt-1 text-sm text-black/60 dark:text-white/70">
                Ukljuci/iskljuci tamni izgled.
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(next) => setColorScheme(next ? 'dark' : 'light')}
            />
          </View>
        </View>

        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="mt-4 items-center justify-center rounded-2xl border border-black/10 bg-white/80 py-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <Text className="text-base font-semibold text-[#FF3B30]">Odjavi se</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
