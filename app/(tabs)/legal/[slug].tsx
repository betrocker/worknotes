import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
  const [headerHeight, setHeaderHeight] = useState(0);
  const primaryText = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)';
  const secondaryText = isDark ? 'rgba(255,255,255,0.68)' : 'rgba(0,0,0,0.55)';
  const bodyText = isDark ? 'rgba(255,255,255,0.84)' : 'rgba(0,0,0,0.78)';

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
        <Text className="text-app-body" style={{ color: secondaryText }}>
          {t('notFound.message')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
      <View
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
          paddingBottom: 24,
          backgroundColor: isDark ? '#000000' : '#F2F2F7',
        }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.replace('/(tabs)/podesavanja')}
            className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white dark:border-white/10 dark:bg-[#1C1C1E]">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
        </View>

        <Text className="mt-4 font-bold text-app-display tracking-tight" style={{ color: primaryText }}>
          {document.title}
        </Text>
        <Text className="mt-2 text-app-subtitle" style={{ color: secondaryText }}>
          {document.subtitle}
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-[#F2F2F7] dark:bg-black"
        contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: 40 }}>
        <View className="px-6">
          <View
            className="overflow-hidden rounded-3xl border p-5"
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
              backgroundColor: isDark ? '#111317' : '#FFFFFF',
            }}>
            <Text className="text-app-meta font-semibold" style={{ color: secondaryText }}>
              {document.updated}
            </Text>

            {document.intro.map((paragraph) => (
              <Text key={paragraph} className="mt-4 text-app-body" style={{ color: bodyText }}>
                {paragraph}
              </Text>
            ))}

            {document.sections.map((section, index) => (
              <View key={`${section.title}-${index}`} className="mt-7">
                <Text
                  className="text-app-section font-extrabold"
                  style={{ color: isDark ? '#FFFFFF' : '#1C2745' }}>
                  {section.title}
                </Text>

                {section.paragraphs?.map((paragraph) => (
                  <Text key={paragraph} className="mt-3 text-app-body" style={{ color: bodyText }}>
                    {paragraph}
                  </Text>
                ))}

                {section.bullets?.length ? (
                  <View className="mt-3">
                    {section.bullets.map((bullet) => (
                      <View key={bullet} className="mb-2 flex-row items-start">
                        <Text className="mr-3 mt-[1px] text-app-body" style={{ color: bodyText }}>
                          •
                        </Text>
                        <Text className="flex-1 text-app-body" style={{ color: bodyText }}>
                          {bullet}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {section.boxTitle || section.boxLines?.length ? (
                  <View
                    className="mt-4 rounded-[18px] border px-4 py-4"
                    style={{
                      borderColor: isDark ? 'rgba(143,178,255,0.16)' : 'rgba(0,0,0,0.06)',
                      backgroundColor: isDark ? '#171C26' : '#F7FAFF',
                    }}>
                    {section.boxTitle ? (
                      <Text
                        className="text-app-row font-bold"
                        style={{ color: isDark ? '#FFFFFF' : '#1C2745' }}>
                        {section.boxTitle}
                      </Text>
                    ) : null}
                    {section.boxLines?.map((line) => (
                      <Text key={line} className="mt-1 text-app-body" style={{ color: bodyText }}>
                        {line}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {section.warn ? (
                  <View
                    className="mt-4 rounded-[18px] border px-4 py-4"
                    style={{
                      borderColor: isDark ? '#5E4A24' : '#F3D6A6',
                      backgroundColor: isDark ? '#2A2215' : '#FFF8EF',
                    }}>
                    <Text className="text-app-body" style={{ color: bodyText }}>
                      {section.warn}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}

            <Text className="mt-7 text-app-meta" style={{ color: secondaryText }}>
              {document.footer}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
