import EditScreenInfo from '@/components/EditScreenInfo';
import { ScrollView, Text, View } from 'react-native';

import { LargeHeader } from '@/components/LargeHeader';

export default function NewScreen() {
  return (
    <ScrollView className="flex-1 bg-[#F2F2F7] dark:bg-black" contentContainerClassName="pb-32">
      <LargeHeader title="Novi" subtitle="Brz unos posla, klijenta ili uplate." />
      <View className="px-6">
        <View className="overflow-hidden rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <Text className="text-base font-semibold text-black dark:text-white">Kratice</Text>
          <Text className="mt-1 text-sm text-black/60 dark:text-white/70">
            Ovde ce biti dugmad za dodavanje.
          </Text>
        </View>

        <View className="my-6 h-px bg-black/10 dark:bg-white/15" />
        <EditScreenInfo path="app/(tabs)/new.tsx" />
      </View>
    </ScrollView>
  );
}
