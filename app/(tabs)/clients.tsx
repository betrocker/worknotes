import EditScreenInfo from '@/components/EditScreenInfo';
import { ScrollView, Text, View } from 'react-native';

import { LargeHeader } from '@/components/LargeHeader';

export default function ClientsScreen() {
  return (
    <ScrollView className="flex-1 bg-[#F2F2F7] dark:bg-black" contentContainerClassName="pb-32">
      <LargeHeader title="Klijenti" subtitle="Kontakti, adrese i istorija poslova." />
      <View className="px-6">
        <View className="overflow-hidden rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <Text className="text-base font-semibold text-black dark:text-white">Pretraga</Text>
          <Text className="mt-1 text-sm text-black/60 dark:text-white/70">
            Ovde ce doci pretraga i lista klijenata.
          </Text>
        </View>

        <View className="my-6 h-px bg-black/10 dark:bg-white/15" />
        <EditScreenInfo path="app/(tabs)/clients.tsx" />
      </View>
    </ScrollView>
  );
}
