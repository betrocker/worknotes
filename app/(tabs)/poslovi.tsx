import EditScreenInfo from '@/components/EditScreenInfo';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LargeHeader } from '@/components/LargeHeader';
import { UserMenuButton } from '@/components/UserMenuButton';

export default function PosloviScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView
      stickyHeaderIndices={[0]}
      className="flex-1 bg-[#F2F2F7] dark:bg-black"
      contentContainerClassName="pb-32">
      <LargeHeader
        title={t('tabs.jobs')}
        subtitle={t('screens.jobs.subtitle')}
        right={<UserMenuButton />}
      />
      <View className="px-6 pt-3">
        <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <Text className="text-base font-semibold text-black dark:text-white">
            {t('screens.jobs.cardTitle')}
          </Text>
          <Text className="mt-1 text-sm text-black/60 dark:text-white/70">
            {t('screens.jobs.cardBody')}
          </Text>
        </View>

        <View className="my-6 h-px bg-black/10 dark:bg-white/15" />
        <EditScreenInfo path="app/(tabs)/poslovi.tsx" />
      </View>
    </ScrollView>
  );
}
