import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { CollapsingMainHeader, MainScreenTitle } from '@/components/CollapsingMainHeader';
import { JobStatusText } from '@/components/JobStatusText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useOnboarding } from '@/providers/OnboardingProvider';

const JOB_SELECT_SWIPE_THRESHOLD = 36;
const JOB_SELECT_SWIPE_MAX = 56;
const JOB_SELECT_GESTURE_START = 3;
const JOB_SELECT_HORIZONTAL_BIAS = 0.72;
const CLOSED_FAB_SIZE = 48;
const CLOSED_FAB_BACKGROUND = '#4287f4';
const APP_ICON = require('../assets/images/splash-logo.png');

const demoJob = {
  title: 'Montaža kuhinjskog bojlera',
  clientName: 'Marko Jovanović',
  scheduledDate: new Date(2026, 5, 3),
  price: 85,
  status: 'in_progress',
};

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { complete } = useOnboarding();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { width, height } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const mainOpacity = useRef(new Animated.Value(1)).current;
  const finalProgress = useRef(new Animated.Value(0)).current;
  const selectionBarProgress = useRef(new Animated.Value(0)).current;
  const scrollOffsetYRef = useRef(0);
  const swipeDownStartRef = useRef<{ x: number; y: number; scrollY: number } | null>(null);
  const [selected, setSelected] = useState(false);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoSearchOpen, setDemoSearchOpen] = useState(false);
  const isPreview = params.preview === '1';

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const sectionSeparatorColor = isDark ? 'rgba(84,84,88,0.38)' : 'rgba(60,60,67,0.14)';
  const hintColor = isDark ? 'rgba(255,255,255,0.58)' : 'rgba(28,96,195,0.72)';
  const fabOpacity = selectionBarProgress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });
  const fabScale = selectionBarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
    extrapolate: 'clamp',
  });
  const formatDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(demoJob.scheduledDate),
    [locale]
  );

  const formatCurrency = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(demoJob.price),
    [locale]
  );

  const setDemoSelected = useCallback(
    (nextSelected: boolean) => {
      setSelected(nextSelected);
      Animated.spring(selectionBarProgress, {
        toValue: nextSelected ? 1 : 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
        mass: 0.82,
      }).start();
    },
    [selectionBarProgress]
  );

  const toggleDemoSelected = useCallback(() => {
    setDemoSelected(!selected);
  }, [selected, setDemoSelected]);

  const onFinishDemo = useCallback(() => {
    if (finished) return;
    setFinished(true);
    setDemoSelected(false);
    Animated.parallel([
      Animated.timing(mainOpacity, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(finalProgress, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [finalProgress, finished, mainOpacity, setDemoSelected]);

  const finishOnboarding = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (isPreview) {
        router.replace('/(tabs)/podesavanja' as any);
        return;
      }
      await complete();
      router.replace('/(auth)/sign-in');
    } finally {
      setSubmitting(false);
    }
  }, [complete, isPreview, router, submitting]);

  const openDemoSearch = useCallback(() => {
    if (!finished) {
      setDemoSearchOpen(true);
    }
  }, [finished]);

  const onOnboardingScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
          scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
        },
      }),
    [scrollY]
  );

  const onSwipeDownTouchStart = useCallback((event: { nativeEvent: { pageX: number; pageY: number } }) => {
    swipeDownStartRef.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
      scrollY: scrollOffsetYRef.current,
    };
  }, []);

  const onSwipeDownTouchMove = useCallback(
    (event: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (demoSearchOpen || finished) return;
      const start = swipeDownStartRef.current;
      if (!start || start.scrollY > 8) return;

      const dx = event.nativeEvent.pageX - start.x;
      const dy = event.nativeEvent.pageY - start.y;
      if (dy > 42 && Math.abs(dy) > Math.abs(dx) * 1.15) {
        swipeDownStartRef.current = null;
        setDemoSearchOpen(true);
      }
    },
    [demoSearchOpen, finished]
  );

  const resetSwipeDownTouch = useCallback(() => {
    swipeDownStartRef.current = null;
  }, []);

  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <Animated.View
        style={{ flex: 1, opacity: mainOpacity }}
        pointerEvents={finished ? 'none' : 'auto'}>
        <CollapsingMainHeader
          title="eTefter"
          iconName="today"
          imageSource={APP_ICON}
          scrollY={scrollY}
          right={<OnboardingHeaderActions />}
        />
        <HeaderSwipeCue color={isDark ? '#72A8FF' : '#1C60C3'} />

        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ minHeight: height + 96, paddingHorizontal: 24, paddingTop: 0, paddingBottom: 148 }}
          onScroll={onOnboardingScroll}
          onTouchCancel={resetSwipeDownTouch}
          onTouchEnd={resetSwipeDownTouch}
          onTouchMove={onSwipeDownTouchMove}
          onTouchStart={onSwipeDownTouchStart}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={openDemoSearch}
              tintColor={isDark ? '#72A8FF' : '#1C60C3'}
              colors={[isDark ? '#72A8FF' : '#1C60C3']}
              progressBackgroundColor={isDark ? Colors.dark.menuSurface : '#E6E8EC'}
            />
          }
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          <MainScreenTitle title="eTefter" iconName="today" imageSource={APP_ICON} scrollY={scrollY} />
          <View style={{ marginBottom: 18 }} />

          <HomeLikeSection
            title={t('home.todayJobs')}
            expanded
            sectionSeparatorColor={sectionSeparatorColor}
            colors={colors}
            isDark={isDark}>
            <DemoJobRow
              selected={selected}
              colorScheme={colorScheme}
              colors={colors}
              title={demoJob.title}
              clientName={demoJob.clientName}
              date={formatDate}
              price={formatCurrency}
              status={demoJob.status}
              statusLabel={t('jobs.statuses.inProgress')}
              onToggleSelected={toggleDemoSelected}
            />
          </HomeLikeSection>

          <HomeLikeSection
            title={t('home.urgentCollection')}
            expanded={false}
            sectionSeparatorColor={sectionSeparatorColor}
            colors={colors}
            isDark={isDark}
          />
        </Animated.ScrollView>

        <Animated.View
          pointerEvents="none"
          style={{
            opacity: fabOpacity,
            transform: [{ scale: fabScale }],
          }}>
          <StaticFab insetsBottom={insets.bottom} />
        </Animated.View>

        <Animated.View
          pointerEvents={selected ? 'auto' : 'none'}
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: Math.max(insets.bottom + 18, 24),
            zIndex: 60,
            opacity: selectionBarProgress,
            transform: [
              {
                translateY: selectionBarProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          }}>
          <Text
            style={{
              marginBottom: 10,
              color: hintColor,
              fontSize: 15,
              lineHeight: 20,
              fontStyle: 'italic',
              fontWeight: '400',
              textAlign: 'center',
            }}>
            {t('onboarding.finishHint')}
          </Text>
          <View
            style={{
              minHeight: 48,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.24)',
              backgroundColor: 'rgba(56,64,76,0.9)',
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('jobs.finish')}
                onPress={onFinishDemo}
                style={{
                  minHeight: 42,
                  flex: 1,
                  borderRadius: 21,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}>
                <Ionicons name="checkmark-done-outline" size={17} color="#FFFFFF" />
                <Text style={{ marginLeft: 6, color: '#FFFFFF', fontSize: 17, fontWeight: '600' }} numberOfLines={1}>
                  {t('jobs.finish')}
                </Text>
              </Pressable>
              <DisabledAction label={t('jobs.postpone')} iconName="time-outline" />
              <DisabledAction label={t('jobs.deleteShort')} iconName="trash-outline" />
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.View
        pointerEvents={finished ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: colors.background,
          opacity: finalProgress,
          transform: [
            {
              translateX: finalProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [width, 0],
              }),
            },
          ],
          paddingHorizontal: 24,
          paddingTop: Math.max(insets.top + 40, 56),
          paddingBottom: Math.max(insets.bottom + 28, 40),
          justifyContent: 'center',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
          <Image source={APP_ICON} resizeMode="contain" style={{ width: 68, height: 68, borderRadius: 17 }} />
          <Text style={{ marginLeft: 16, color: colors.text, fontSize: 34, lineHeight: 40, fontWeight: '700' }}>
            eTefter
          </Text>
        </View>

        <View style={{ marginTop: 72, width: '100%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              style={{
                flex: 1,
                color: isDark ? '#72A8FF' : '#1C60C3',
                fontSize: 20,
                lineHeight: 27,
                fontWeight: '600',
                textAlign: 'left',
              }}>
              {t('onboarding.feelingQuestion')}
            </Text>
          </View>
          <View style={{ marginTop: 14, height: 1, backgroundColor: sectionSeparatorColor }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.finalCta')}
            disabled={submitting}
            onPress={() => {
              void finishOnboarding();
            }}
            style={{
              marginTop: 8,
              minHeight: 54,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: submitting ? 0.72 : 1,
            }}>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '400' }}>
              {t('onboarding.finalCta')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
          </Pressable>
        </View>
      </Animated.View>
      <DemoQuickFindModal visible={demoSearchOpen} onClose={() => setDemoSearchOpen(false)} />
    </View>
  );
}

type DemoQuickFindLink = {
  id: 'home' | 'jobs' | 'clients' | 'debts';
  title: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
};

function DemoQuickFindModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const menuColors = Colors.dark;
  const isDark = colorScheme === 'dark';
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panelProgress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  const demoLinks = useMemo<DemoQuickFindLink[]>(
    () => [
      {
        id: 'home',
        title: t('tabs.home'),
        iconName: 'today-outline',
        color: '#fd2d65',
      },
      {
        id: 'jobs',
        title: t('tabs.jobs'),
        iconName: 'clipboard-outline',
        color: '#d1a642',
      },
      {
        id: 'clients',
        title: t('tabs.clients'),
        iconName: 'people-outline',
        color: '#4db1a6',
      },
      {
        id: 'debts',
        title: t('tabs.debts'),
        iconName: 'cash-outline',
        color: '#4cbf60',
      },
    ],
    [t]
  );

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 150,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(panelProgress, {
            toValue: 1,
            damping: 18,
            stiffness: 240,
            mass: 0.8,
            useNativeDriver: true,
          }),
        ]).start();
      });
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(panelProgress, {
        toValue: 0,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [backdropOpacity, panelProgress, visible]);

  if (!mounted) return null;

  const separatorColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.12)';

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Animated.View
          pointerEvents="auto"
          style={{
            position: 'absolute',
            left: -8,
            right: -8,
            top: 0,
            bottom: 0,
            opacity: backdropOpacity,
          }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }}
          />
        </Animated.View>

        <Animated.View
          style={{
            position: 'absolute',
            left: 28,
            right: 28,
            top: insets.top + 12,
            opacity: panelProgress,
            transform: [
              {
                translateY: panelProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-18, 0],
                }),
              },
              {
                scale: panelProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.98, 1],
                }),
              },
            ],
          }}>
          <View
            style={{
              overflow: 'hidden',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.18)',
              maxHeight: 520,
              backgroundColor: menuColors.menuSurface,
              shadowColor: '#000000',
              shadowOpacity: 0.24,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 12 },
              elevation: 22,
            }}>
            <View style={{ minHeight: 260, padding: 16, position: 'relative' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    height: 38,
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: 19,
                    paddingHorizontal: 12,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}>
                  <Ionicons name="search" size={17} color={menuColors.secondaryText} />
                  <TextInput
                    value=""
                    editable={false}
                    pointerEvents="none"
                    placeholder={t('quickFind.placeholder')}
                    placeholderTextColor={menuColors.secondaryText}
                    style={{
                      marginLeft: 8,
                      flex: 1,
                      paddingVertical: 7,
                      color: menuColors.text,
                      fontSize: 16,
                    }}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  onPress={onClose}
                  style={{
                    marginLeft: 8,
                    height: 38,
                    width: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 19,
                    backgroundColor: 'rgba(255,255,255,0.10)',
                  }}>
                  <Ionicons name="close" size={17} color={menuColors.secondaryText} />
                </Pressable>
              </View>

              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 64,
                  left: 22,
                  right: 22,
                  zIndex: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}>
                <Ionicons
                  name="arrow-down-outline"
                  size={31}
                  color="#72A8FF"
                  style={{ marginRight: 8, marginTop: 18 }}
                />
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: 'rgba(114,168,255,0.42)',
                    backgroundColor: 'rgba(28,96,195,0.22)',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}>
                  <Text
                    style={{
                      color: '#AFCBFF',
                      fontSize: 13,
                      lineHeight: 18,
                      fontWeight: '600',
                    }}>
                    {t('onboarding.navigationCallout')}
                  </Text>
                </View>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={{ marginTop: 64, maxHeight: 430 }}>
                <View style={{ marginTop: 14 }}>
                  <Text style={{ color: menuColors.secondaryText, fontSize: 14, fontWeight: '600' }}>
                    {t('quickFind.navigationTitle')}
                  </Text>
                  <View style={{ marginTop: 8, height: 1, backgroundColor: separatorColor }} />
                  <View style={{ marginTop: 4 }}>
                    {demoLinks.map((item) => (
                      <Pressable
                        key={item.id}
                        accessibilityRole="link"
                        onPress={() => {}}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 7,
                          paddingLeft: 12,
                        }}>
                        <Ionicons name={item.iconName} size={17} color={item.color} style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: menuColors.text, fontSize: 17, fontWeight: '400' }} numberOfLines={1}>
                            {item.title}
                          </Text>
                        </View>
                        {item.id === 'home' ? <Ionicons name="checkmark" size={19} color="#1C60C3" style={{ marginLeft: 12 }} /> : null}
                      </Pressable>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <Text
                style={{
                  marginTop: 'auto',
                  paddingTop: 18,
                  paddingHorizontal: 12,
                  color: menuColors.secondaryText,
                  fontSize: 13,
                  lineHeight: 18,
                  textAlign: 'center',
                }}>
                {t('quickFind.hint')}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function HeaderSwipeCue({ color }: { color: string }) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const progress = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1120,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1120,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(260),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: '50%',
        zIndex: 55,
        width: 34,
        height: 34,
        marginLeft: -17,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(50,54,61,0.92)' : '#E6E8EC',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(60,60,67,0.12)',
        opacity: progress.interpolate({
          inputRange: [0, 0.25, 1],
          outputRange: [0.64, 0.96, 0.64],
        }),
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-1, 9],
            }),
          },
        ],
      }}>
      <Ionicons name="chevron-down" size={19} color={color} />
    </Animated.View>
  );
}

function OnboardingHeaderActions() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} pointerEvents="none">
      <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', opacity: 0.42 }}>
        <Ionicons name="person-outline" size={20} color="#717983" />
      </View>
    </View>
  );
}

function HomeLikeSection({
  title,
  expanded,
  sectionSeparatorColor,
  colors,
  isDark,
  children,
}: {
  title: string;
  expanded: boolean;
  sectionSeparatorColor: string;
  colors: typeof Colors.light;
  isDark: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            flex: 1,
            color: isDark ? '#72A8FF' : '#1C60C3',
            fontSize: 17,
            fontWeight: '600',
          }}>
          {title}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.secondaryText} />
      </View>
      <View style={{ marginTop: 8, height: 1, backgroundColor: sectionSeparatorColor }} />
      {expanded ? <View style={{ marginLeft: 12, marginTop: 8 }}>{children}</View> : null}
    </View>
  );
}

function DemoJobRow({
  selected,
  colorScheme,
  colors,
  title,
  clientName,
  date,
  price,
  status,
  statusLabel,
  onToggleSelected,
}: {
  selected: boolean;
  colorScheme: 'light' | 'dark';
  colors: typeof Colors.light;
  title: string;
  clientName: string;
  date: string;
  price: string;
  status: string;
  statusLabel: string;
  onToggleSelected: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const cueTranslateX = useRef(new Animated.Value(0)).current;
  const circleProgress = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const maxSwipeDistanceRef = useRef(0);
  const currentSwipeDistanceRef = useRef(0);
  const suppressOpenRef = useRef(false);
  const [swiping, setSwiping] = useState(false);
  const [cueActive, setCueActive] = useState(false);

  React.useEffect(() => {
    if (selected || swiping) {
      cueTranslateX.stopAnimation();
      cueTranslateX.setValue(0);
      setCueActive(false);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(cueTranslateX, {
          toValue: -34,
          duration: 620,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(520),
        Animated.timing(cueTranslateX, {
          toValue: 0,
          duration: 620,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(950),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      cueTranslateX.stopAnimation();
    };
  }, [cueTranslateX, selected, swiping]);

  React.useEffect(() => {
    const listenerId = cueTranslateX.addListener(({ value }) => {
      const nextActive = value < -1;
      setCueActive((current) => (current === nextActive ? current : nextActive));
    });
    return () => {
      cueTranslateX.removeListener(listenerId);
    };
  }, [cueTranslateX]);

  React.useEffect(() => {
    Animated.spring(circleProgress, {
      toValue: selected ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    }).start();
  }, [circleProgress, selected]);

  const resetSwipe = useCallback(() => {
    const duration = Math.min(190, Math.max(90, currentSwipeDistanceRef.current * 2.8));
    Animated.timing(translateX, {
      toValue: 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setSwiping(false);
        maxSwipeDistanceRef.current = 0;
        currentSwipeDistanceRef.current = 0;
      }
    });
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          gesture.dx < -JOB_SELECT_GESTURE_START &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * JOB_SELECT_HORIZONTAL_BIAS,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dx < -JOB_SELECT_GESTURE_START &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * JOB_SELECT_HORIZONTAL_BIAS,
        onPanResponderGrant: () => {
          cueTranslateX.stopAnimation();
          cueTranslateX.setValue(0);
          setCueActive(false);
          maxSwipeDistanceRef.current = 0;
          currentSwipeDistanceRef.current = 0;
          suppressOpenRef.current = false;
          setSwiping(true);
        },
        onPanResponderMove: (_, gesture) => {
          const rawNext = Math.min(0, gesture.dx);
          const distance = Math.abs(rawNext);
          if (distance > 6) {
            suppressOpenRef.current = true;
          }
          maxSwipeDistanceRef.current = Math.max(maxSwipeDistanceRef.current, distance);
          currentSwipeDistanceRef.current = distance;
          const next =
            distance > JOB_SELECT_SWIPE_MAX
              ? -(JOB_SELECT_SWIPE_MAX + (distance - JOB_SELECT_SWIPE_MAX) * 0.18)
              : rawNext;
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldSelect = maxSwipeDistanceRef.current > JOB_SELECT_SWIPE_THRESHOLD || gesture.vx < -0.55;
          if (shouldSelect) {
            onToggleSelected();
          }
          resetSwipe();
        },
        onPanResponderTerminate: resetSwipe,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [cueTranslateX, onToggleSelected, resetSwipe, translateX]
  );

  const circleOpacity = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const circleScale = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1],
  });
  const rowTranslateX = Animated.add(translateX, cueTranslateX);
  const revealOpacity = rowTranslateX.interpolate({
    inputRange: [-24, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const revealTranslateX = rowTranslateX.interpolate({
    inputRange: [-JOB_SELECT_SWIPE_MAX, 0],
    outputRange: [0, 16],
    extrapolate: 'clamp',
  });
  const revealScale = rowTranslateX.interpolate({
    inputRange: [-JOB_SELECT_SWIPE_MAX, -16, 0],
    outputRange: [1, 0.92, 0.86],
    extrapolate: 'clamp',
  });
  const selectedRowBackground = colorScheme === 'dark' ? 'rgba(47, 105, 190, 0.26)' : '#D5E5FF';
  const activeRowBackground = colorScheme === 'dark' ? '#30333A' : '#E4E6EA';
  const movingRowBackground = swiping || cueActive ? activeRowBackground : 'transparent';
  const revealBackgroundColor = colorScheme === 'dark' ? '#315FAD' : '#1C60C3';

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        marginVertical: 1,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      {selected ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: -12,
            right: -12,
            bottom: 0,
            borderRadius: 12,
            backgroundColor: selectedRowBackground,
          }}
        />
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 78,
          paddingRight: 10,
          borderRadius: 12,
          backgroundColor: revealBackgroundColor,
          opacity: revealOpacity,
          alignItems: 'flex-end',
          justifyContent: 'center',
          transform: [{ translateX: revealTranslateX }, { scale: revealScale }],
        }}>
        <Ionicons name="checkbox-outline" size={22} color="#FFFFFF" />
      </Animated.View>
      <Animated.View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: -8,
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: 12,
          backgroundColor: movingRowBackground,
          transform: [{ translateX: rowTranslateX }],
        }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (selected) {
              suppressOpenRef.current = false;
              onToggleSelected();
              return;
            }
            if (suppressOpenRef.current) {
              suppressOpenRef.current = false;
              return;
            }
          }}
          style={{ flex: 1 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '400' }} numberOfLines={1}>
                {title}
              </Text>
              <View style={{ marginTop: -1, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: colors.secondaryText, fontSize: 12 }} numberOfLines={1}>
                  {clientName}
                </Text>
                <Text style={{ marginHorizontal: 5, color: colors.secondaryText, fontSize: 12 }}>•</Text>
                <Text style={{ color: colors.secondaryText, fontSize: 12 }} numberOfLines={1}>
                  {date}
                </Text>
                <Text style={{ marginHorizontal: 5, color: colors.secondaryText, fontSize: 12 }}>•</Text>
                <Text style={{ color: colors.secondaryText, fontSize: 12 }} numberOfLines={1}>
                  {price}
                </Text>
              </View>
            </View>
            <JobStatusText label={statusLabel} status={status} style={{ marginLeft: 10 }} />
          </View>
        </Pressable>
        <Animated.View
          style={{
            width: selected ? 34 : 0,
            opacity: circleOpacity,
            alignItems: 'flex-end',
            transform: [{ scale: circleScale }],
          }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            disabled={!selected}
            onPress={onToggleSelected}
            hitSlop={8}
            style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 1.5,
                borderColor: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 5.5,
                  backgroundColor: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3',
                }}
              />
            </View>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

function DisabledAction({ label, iconName }: { label: string; iconName: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View
      style={{
        minHeight: 42,
        flex: 1,
        borderRadius: 21,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        opacity: 0.34,
      }}>
      <Ionicons name={iconName} size={17} color="#FFFFFF" />
      <Text style={{ marginLeft: 6, color: '#FFFFFF', fontSize: 17, fontWeight: '600' }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function StaticFab({ insetsBottom }: { insetsBottom: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 12,
        bottom: Math.max(insetsBottom + 18, 24),
        height: CLOSED_FAB_SIZE,
        width: CLOSED_FAB_SIZE,
        borderRadius: CLOSED_FAB_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: CLOSED_FAB_BACKGROUND,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        opacity: 0.82,
        shadowColor: '#000000',
        shadowOpacity: 0.16,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 7 },
        elevation: 10,
      }}>
      <Ionicons name="add" size={24} color="#FFFFFF" />
    </View>
  );
}
