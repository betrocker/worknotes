import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  boxTitle?: string;
  boxLines?: string[];
  warn?: string;
};

type LegalDocument = {
  title: string;
  subtitle: string;
  updated: string;
  intro: string[];
  sections: LegalSection[];
  footer: string;
};

export default function LegalDocumentScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];

  const documentKey = slug === 'terms' || slug === 'privacy' ? slug : null;

  const document = useMemo<LegalDocument | null>(() => {
    if (!documentKey) return null;
    return {
      title: t(`legal.${documentKey}.title`),
      subtitle: t(`legal.${documentKey}.subtitle`),
      updated: t(`legal.${documentKey}.updated`),
      intro: t(`legal.${documentKey}.intro`, { returnObjects: true }) as string[],
      sections: t(`legal.${documentKey}.sections`, { returnObjects: true }) as LegalSection[],
      footer: t(`legal.${documentKey}.footer`),
    };
  }, [documentKey, t]);

  if (!documentKey || !document) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F2F2F7] px-6 dark:bg-black">
        <Text className="text-base text-black/70 dark:text-white/70">{t('notFound.message')}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F2F2F7] dark:bg-black" contentContainerStyle={{ paddingBottom: 40 }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
          paddingBottom: 24,
        }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
        </View>

        <Text className="mt-4 font-bold text-[34px] leading-[40px] tracking-tight text-black dark:text-white">
          {document.title}
        </Text>
        <Text className="mt-2 text-base leading-6 text-black/60 dark:text-white/70">
          {document.subtitle}
        </Text>
      </View>

      <View className="px-6">
        <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/85 p-5 dark:border-white/10 dark:bg-[#1C1C1E]/85">
          <Text className="text-sm font-semibold text-black/55 dark:text-white/58">
            {document.updated}
          </Text>

          {document.intro.map((paragraph) => (
            <Text
              key={paragraph}
              className="mt-4 text-[15px] leading-7 text-black/78 dark:text-white/78">
              {paragraph}
            </Text>
          ))}

          {document.sections.map((section, index) => (
            <View key={`${section.title}-${index}`} className="mt-7">
              <Text className="text-[20px] font-extrabold text-[#1C2745] dark:text-white">
                {section.title}
              </Text>

              {section.paragraphs?.map((paragraph) => (
                <Text
                  key={paragraph}
                  className="mt-3 text-[15px] leading-7 text-black/78 dark:text-white/78">
                  {paragraph}
                </Text>
              ))}

              {section.bullets?.length ? (
                <View className="mt-3">
                  {section.bullets.map((bullet) => (
                    <View key={bullet} className="mb-2 flex-row items-start">
                      <Text className="mr-3 mt-[1px] text-[15px] text-black/78 dark:text-white/78">•</Text>
                      <Text className="flex-1 text-[15px] leading-7 text-black/78 dark:text-white/78">
                        {bullet}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {section.boxTitle || section.boxLines?.length ? (
                <View className="mt-4 rounded-[18px] border border-black/8 bg-[#F7FAFF] px-4 py-4 dark:border-white/10 dark:bg-[#232836]">
                  {section.boxTitle ? (
                    <Text className="text-[15px] font-bold text-[#1C2745] dark:text-white">
                      {section.boxTitle}
                    </Text>
                  ) : null}
                  {section.boxLines?.map((line) => (
                    <Text
                      key={line}
                      className="mt-1 text-[15px] leading-7 text-black/78 dark:text-white/78">
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}

              {section.warn ? (
                <View className="mt-4 rounded-[18px] border border-[#F3D6A6] bg-[#FFF8EF] px-4 py-4 dark:border-[#5E4A24] dark:bg-[#2F2717]">
                  <Text className="text-[15px] leading-7 text-black/82 dark:text-white/82">
                    {section.warn}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}

          <Text className="mt-7 text-sm leading-6 text-black/52 dark:text-white/58">
            {document.footer}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
