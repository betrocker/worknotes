import React from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import EditScreenInfo from '@/components/EditScreenInfo';
import { useColorScheme, useSetColorScheme } from '@/components/useColorScheme';
import { LargeHeader } from '@/components/LargeHeader';
import { UserMenuButton } from '@/components/UserMenuButton';
import { setStoredLanguage } from '@/lib/language';

export default function PodesavanjaScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const setColorScheme = useSetColorScheme();
  const { t, i18n } = useTranslation();

  const isDark = colorScheme === 'dark';
  const isEnglish = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('en');

  return (
    <ScrollView
      stickyHeaderIndices={[0]}
      className="flex-1 bg-[#F2F2F7] dark:bg-black"
      contentContainerClassName="pb-32">
      <LargeHeader
        title={t('tabs.settings')}
        subtitle={t('screens.settings.subtitle')}
        right={<UserMenuButton />}
      />

      <View className="px-6 pt-3">
        <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-base font-semibold text-black dark:text-white">
                {t('settings.darkTheme')}
              </Text>
              <Text className="mt-1 text-sm text-black/60 dark:text-white/70">
                {t('settings.darkThemeHelp')}
              </Text>
            </View>
            <Switch value={isDark} onValueChange={(next) => setColorScheme(next ? 'dark' : 'light')} />
          </View>
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-base font-semibold text-black dark:text-white">
                {t('settings.language')}
              </Text>
              <Text className="mt-1 text-sm text-black/60 dark:text-white/70">
                {t('settings.languageHelp')}{' '}
                <Text className="font-medium">
                  {isEnglish ? t('settings.english') : t('settings.serbian')}
                </Text>
                .
              </Text>
            </View>
            <Switch
              value={isEnglish}
              onValueChange={(nextIsEnglish) => {
                const next = nextIsEnglish ? 'en' : 'sr';
                void i18n.changeLanguage(next);
                void setStoredLanguage(next);
              }}
            />
          </View>
        </View>

        <View className="my-6 h-px bg-black/10 dark:bg-white/15" />
        <EditScreenInfo path="app/(tabs)/podesavanja.tsx" />
      </View>
    </ScrollView>
  );
}
