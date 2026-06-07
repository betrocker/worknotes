import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { goBackOrReplace } from '@/lib/navigation';

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
  const [headerHeight, setHeaderHeight] = useState(0);
  const primaryText = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)';
  const secondaryText = isDark ? 'rgba(255,255,255,0.68)' : 'rgba(0,0,0,0.55)';
  const bodyText = isDark ? 'rgba(255,255,255,0.84)' : 'rgba(0,0,0,0.78)';
  const sectionTitleColor = isDark ? '#72A8FF' : '#1C60C3';
  const sectionSeparatorColor = isDark ? 'rgba(84,84,88,0.38)' : 'rgba(60,60,67,0.14)';

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
      <View className="flex-1 items-center justify-center bg-[#F2F2F7] px-6 dark:bg-[#1D2229]">
        <Text className="text-app-body" style={{ color: secondaryText }}>
          {t('notFound.message')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-[#1D2229]">
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
          backgroundColor: isDark ? '#1D2229' : '#F2F2F7',
        }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => goBackOrReplace(router, '/(tabs)/podesavanja' as any)}
            className="h-11 w-11 items-center justify-center">
            <Ionicons name="chevron-back" size={25} color="#717983" />
          </Pressable>
        </View>

        <Text className="mt-4 font-semibold text-app-display tracking-tight" style={{ color: primaryText }}>
          {document.title}
        </Text>
        <Text className="mt-2 text-app-subtitle" style={{ color: secondaryText }}>
          {document.subtitle}
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-[#F2F2F7] dark:bg-[#1D2229]"
        contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: 40 }}>
        <View className="px-6">
          <Text className="px-1 text-app-meta" style={{ color: secondaryText }}>
            {document.updated}
          </Text>

          <View style={{ marginLeft: 12, marginTop: 12 }}>
            {document.intro.map((paragraph, index) => (
              <Text key={paragraph} className={index > 0 ? 'mt-3 text-app-body' : 'text-app-body'} style={{ color: bodyText }}>
                {paragraph}
              </Text>
            ))}
          </View>

          {document.sections.map((section, index) => (
            <View key={`${section.title}-${index}`} className="mt-6">
              <View className="px-1">
                <Text
                  className="text-app-row-title font-semibold"
                  style={{ color: sectionTitleColor }}>
                  {section.title}
                </Text>
              </View>
              <View className="mt-2 h-px" style={{ backgroundColor: sectionSeparatorColor }} />

              <View style={{ marginLeft: 12, marginTop: 8 }}>
                {section.paragraphs?.map((paragraph) => (
                  <Text key={paragraph} className="mb-3 text-app-body" style={{ color: bodyText }}>
                    {paragraph}
                  </Text>
                ))}

                {section.bullets?.length ? (
                  <View>
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
                  <View className="mt-2">
                    {section.boxTitle ? (
                      <Text
                        className="text-app-row-title font-semibold"
                        style={{ color: primaryText }}>
                        {section.boxTitle}
                      </Text>
                    ) : null}
                    {section.boxLines?.map((line) => (
                      <Text key={line} className="mt-2 text-app-body" style={{ color: bodyText }}>
                        {line}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {section.warn ? (
                  <Text className="mt-2 text-app-body italic" style={{ color: secondaryText }}>
                    {section.warn}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}

          <Text className="mt-7 px-1 text-app-meta" style={{ color: secondaryText }}>
            {document.footer}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
