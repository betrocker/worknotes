import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ExternalLink } from './ExternalLink';

export default function EditScreenInfo({ path }: { path: string }) {
  const { t } = useTranslation();

  return (
    <View className="items-center">
      <View className="items-center px-12">
        <Text className="text-center text-base leading-6 text-black/70 dark:text-white/70">
          {t('editScreenInfo.openCode')}
        </Text>

        <View className="my-2 rounded-3xl bg-black/5 px-3 py-1 dark:bg-white/10">
          <Text className="font-mono text-sm text-black/70 dark:text-white/70">{path}</Text>
        </View>

        <Text className="text-center text-base leading-6 text-black/70 dark:text-white/70">
          {t('editScreenInfo.changeText')}
        </Text>
      </View>

      <View className="mt-4 items-center px-5">
        <ExternalLink
          asChild
          href="https://docs.expo.io/get-started/create-a-new-app/#opening-the-app-on-your-phonetablet">
          <Pressable className="py-4">
            <Text className="text-center text-sm text-[#007AFF] dark:text-[#0A84FF]">
              {t('editScreenInfo.tapHere')}
            </Text>
          </Pressable>
        </ExternalLink>
      </View>
    </View>
  );
}
