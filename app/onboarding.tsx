import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { useOnboarding } from '@/providers/OnboardingProvider';

const SLIDE_IMAGES = [
  require('../assets/avatars/slajd1.png'),
  require('../assets/avatars/slajd2.png'),
  require('../assets/avatars/slajd3.png'),
] as const;

export default function OnboardingScreen() {
  const HEADER_PROGRESS_SEGMENTS = 3;
  const INACTIVE_DOT = 2;
  const ACTIVE_LINE = 22;
  const PROGRESS_GAP = 8;

  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { complete } = useOnboarding();
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  const slides = useMemo(
    () => [
      {
        title: t('onboarding.slides.welcome.title'),
        body: t('onboarding.slides.welcome.body'),
        points: [
          t('onboarding.slides.welcome.points.one'),
          t('onboarding.slides.welcome.points.two'),
        ],
      },
      {
        title: t('onboarding.slides.workflow.title'),
        body: t('onboarding.slides.workflow.body'),
        points: [
          t('onboarding.slides.workflow.points.one'),
          t('onboarding.slides.workflow.points.two'),
        ],
      },
      {
        title: t('onboarding.slides.control.title'),
        body: t('onboarding.slides.control.body'),
        points: [
          t('onboarding.slides.control.points.one'),
          t('onboarding.slides.control.points.two'),
        ],
      },
    ],
    [t]
  );

  const current = slides[index];
  const isLast = index === slides.length - 1;
  const sheetText = isDark ? '#FFFFFF' : '#1C2745';
  const mutedText = isDark ? 'rgba(255,255,255,0.72)' : 'rgba(28,39,69,0.72)';
  const heroSubtext = isDark ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.88)';
  const isCompact = height < 760;
  const imageSize = Math.min(isCompact ? 226 : 302, Math.max(204, height * (isCompact ? 0.216 : 0.276)));
  const heroTopPadding = insets.top + 18;
  const heroTitleMarginTop = isCompact ? 18 : 36;
  const heroMinHeight = isCompact ? 270 : 350;
  const titleFontSize = isCompact ? 29 : 35;
  const titleLineHeight = isCompact ? 35 : 41;
  const bodyFontSize = isCompact ? 14 : 16;
  const bodyLineHeight = isCompact ? 20 : 23;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: index,
      duration: 220,
      useNativeDriver: false,
    }).start();

    contentOpacity.setValue(0);
    contentTranslateY.setValue(10);
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslateY, index, progressAnim]);

  const finish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await complete();
      router.replace('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ['#081225', '#12305C', '#10213E', '#0B111C'] : ['#1A4FE0', '#3B73F0', '#7FA8FF', '#EEF3FF']}
      locations={isDark ? [0, 0.28, 0.65, 1] : [0, 0.24, 0.62, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View
          style={{
            minHeight: heroMinHeight,
            paddingTop: heroTopPadding,
            paddingHorizontal: 24,
            paddingBottom: isCompact ? 6 : 16,
          }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {Array.from({ length: HEADER_PROGRESS_SEGMENTS }).map((_, slideIndex) => {
                const width = progressAnim.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: [slideIndex === 0 ? ACTIVE_LINE : INACTIVE_DOT, slideIndex === 1 ? ACTIVE_LINE : INACTIVE_DOT, slideIndex === 2 ? ACTIVE_LINE : INACTIVE_DOT],
                  extrapolate: 'clamp',
                });
                const opacity = progressAnim.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: [slideIndex === 0 ? 1 : 0.4, slideIndex === 1 ? 1 : 0.4, slideIndex === 2 ? 1 : 0.4],
                  extrapolate: 'clamp',
                });
                return (
                  <Animated.View
                    key={slideIndex}
                    style={{
                      width,
                      height: 2,
                      borderRadius: 999,
                      marginRight: slideIndex < HEADER_PROGRESS_SEGMENTS - 1 ? PROGRESS_GAP : 0,
                      opacity,
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                );
              })}
            </View>

            <View className="w-[72px] items-end">
              <Pressable onPress={!isLast ? finish : undefined} hitSlop={10} disabled={isLast}>
                <Text className="text-app-meta-lg font-semibold text-white" style={{ opacity: isLast ? 0 : 1 }}>
                  {t('onboarding.skip')}
                </Text>
              </Pressable>
            </View>
          </View>

          <Animated.View
            style={{
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            }}>
            <Text
              className="text-center font-extrabold text-white"
              style={{ marginTop: heroTitleMarginTop, fontSize: titleFontSize, lineHeight: titleLineHeight }}>
              {current.title}
            </Text>
            <Text
              style={{ color: heroSubtext, fontSize: bodyFontSize, lineHeight: bodyLineHeight }}
              className="mt-2 px-5 text-center"
              numberOfLines={isCompact ? 3 : undefined}>
              {current.body}
            </Text>
          </Animated.View>

          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: isCompact ? 22 : 30,
            }}>
            <Animated.Image
              key={`slide-image-${index}`}
              source={SLIDE_IMAGES[index]}
              resizeMode="contain"
              style={{
                width: imageSize,
                height: imageSize,
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }, { translateY: isCompact ? 6 : 0 }],
              }}
            />
          </View>
        </View>

        <View
          style={{
            borderTopLeftRadius: 34,
            borderTopRightRadius: 34,
            backgroundColor: isDark ? 'rgba(18,21,30,0.98)' : 'rgba(247,249,255,0.97)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.84)',
            paddingHorizontal: isCompact ? 14 : 18,
            paddingTop: isCompact ? 10 : 16,
            paddingBottom: insets.bottom + (isCompact ? 10 : 16),
            shadowColor: '#000000',
            shadowOpacity: isDark ? 0.32 : 0.16,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 18,
          }}>
          <View
            style={{
              borderRadius: 28,
              backgroundColor: isDark ? 'rgba(28,32,44,0.92)' : 'rgba(255,255,255,0.86)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(235,240,255,0.96)',
              padding: isCompact ? 14 : 18,
              shadowColor: '#000000',
              shadowOpacity: isDark ? 0.26 : 0.18,
              shadowRadius: 10,
              shadowOffset: { width: 2, height: 6 },
              elevation: 12,
            }}>
            <View>
              {current.points.map((point, pointIndex) => (
                <View key={pointIndex} className="mb-2.5 flex-row items-start">
                  <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-[#E8F0FF] dark:bg-[#1E2A44]">
                    <Ionicons name={pointIndex === 0 ? 'checkmark' : 'sparkles-outline'} size={14} color={isDark ? '#DCE7FF' : '#1D4ED8'} />
                  </View>
                  <Text
                    style={{ color: mutedText, fontSize: isCompact ? 14 : 16, lineHeight: isCompact ? 19 : 22 }}
                    className="ml-3 flex-1">
                    {point}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <Pressable
                onPress={() => setIndex((currentIndex) => Math.max(0, currentIndex - 1))}
                disabled={index === 0}
                className="h-10 w-10 items-center justify-center rounded-full bg-black/5 disabled:opacity-35 dark:bg-white/10">
                <Ionicons name="arrow-back" size={16} color={sheetText} />
              </Pressable>

              <Pressable
                onPress={() => {
                  if (isLast) {
                    void finish();
                    return;
                  }
                  setIndex((currentIndex) => Math.min(slides.length - 1, currentIndex + 1));
                }}
                disabled={submitting}
                className="ml-3 flex-1 flex-row items-center justify-center rounded-[22px] bg-[#1D4ED8] px-4 py-3.5 disabled:opacity-60">
                <Text className="text-app-meta-lg font-semibold text-white">
                  {isLast ? t('onboarding.start') : t('onboarding.next')}
                </Text>
                <Ionicons
                  name={isLast ? 'checkmark-outline' : 'arrow-forward'}
                  size={16}
                  color="#FFFFFF"
                  style={{ marginLeft: 8 }}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}
