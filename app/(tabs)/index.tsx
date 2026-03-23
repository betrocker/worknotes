import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaymentJobPickerModal } from '@/components/PaymentJobPickerModal';
import { useSplashVisible } from '@/components/SplashVisibilityContext';
import { useColorScheme } from '@/components/useColorScheme';
import { listClientOpenDebtJobs, listClientsWithDebt, type ClientOpenDebtJob, type ClientWithDebt } from '@/lib/clients';
import { parseDateInput } from '@/lib/date';
import { getHomeFeed, type HomeActivityItem } from '@/lib/home';
import { listJobs, type JobListItem } from '@/lib/jobs';
import { getUserDisplayName } from '@/lib/user';
import { useAuth } from '@/providers/AuthProvider';

export default function TabOneScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const splashVisible = useSplashVisible();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const sheetTranslateY = useRef(new Animated.Value(88)).current;
  const heroTitleOpacity = useRef(new Animated.Value(0)).current;
  const heroTitleTranslateY = useRef(new Animated.Value(8)).current;
  const heroTitleScale = useRef(new Animated.Value(0.985)).current;
  const heroGreetingOpacity = useRef(new Animated.Value(0)).current;
  const heroGreetingTranslateY = useRef(new Animated.Value(10)).current;
  const heroSublineOpacity = useRef(new Animated.Value(0)).current;
  const heroSublineTranslateY = useRef(new Animated.Value(12)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const mascotTranslateY = useRef(new Animated.Value(10)).current;
  const mascotScale = useRef(new Animated.Value(0.985)).current;
  const clientsCardEnter = useRef(new Animated.Value(12)).current;
  const clientsCardOpacity = useRef(new Animated.Value(0)).current;
  const clientsCardScale = useRef(new Animated.Value(0.985)).current;
  const jobsCardEnter = useRef(new Animated.Value(12)).current;
  const jobsCardOpacity = useRef(new Animated.Value(0)).current;
  const jobsCardScale = useRef(new Animated.Value(0.985)).current;
  const debtCardEnter = useRef(new Animated.Value(14)).current;
  const debtCardOpacity = useRef(new Animated.Value(0)).current;
  const debtCardScale = useRef(new Animated.Value(0.985)).current;
  const servicesCardEnter = useRef(new Animated.Value(14)).current;
  const servicesCardOpacity = useRef(new Animated.Value(0)).current;
  const servicesCardScale = useRef(new Animated.Value(0.985)).current;
  const didRunFirstVisibleSlide = useRef(false);
  const [clientsCount, setClientsCount] = useState<number | null>(null);
  const [jobsCount, setJobsCount] = useState<number | null>(null);
  const [totalDebt, setTotalDebt] = useState<number | null>(null);
  const [todayJobs, setTodayJobs] = useState<JobListItem[]>([]);
  const [clientsWithDebt, setClientsWithDebt] = useState<ClientWithDebt[]>([]);
  const [upcomingJobsCount, setUpcomingJobsCount] = useState<number | null>(null);
  const [activeJobs, setActiveJobs] = useState<JobListItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<HomeActivityItem[]>([]);
  const [paymentPicker, setPaymentPicker] = useState<{ clientName: string | null; jobs: ClientOpenDebtJob[] } | null>(null);

  const username = getUserDisplayName(session?.user, t('home.fallbackName'));
  const greetingLabel = useMemo(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 11) return t('home.timeGreeting.morning');
    if (hour >= 11 && hour < 18) return t('home.timeGreeting.day');
    return t('home.timeGreeting.evening');
  }, [t]);
  const greetingSubline = useMemo(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 11) return t('home.timeSubline.morning');
    if (hour >= 11 && hour < 18) return t('home.timeSubline.day');
    return t('home.timeSubline.evening');
  }, [t]);
  const totalDebtLabel = useMemo(() => {
    if (totalDebt == null) return '—';
    return new Intl.NumberFormat(i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(totalDebt);
  }, [i18n.language, totalDebt]);
  const todayKey = useMemo(() => {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);
  const upcomingCutoff = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }, []);
  const urgentDebtClients = useMemo(
    () => [...clientsWithDebt].filter((client) => client.debt > 0).sort((a, b) => b.debt - a.debt).slice(0, 3),
    [clientsWithDebt]
  );
  const formatCurrency = useCallback(
    (value: number | null | undefined) =>
      new Intl.NumberFormat(i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(value ?? 0),
    [i18n.language]
  );
  const getStatusLabel = useCallback((status: string | null | undefined) => {
    switch ((status ?? '').toLowerCase()) {
      case 'scheduled':
        return t('jobs.statuses.scheduled');
      case 'in_progress':
        return t('jobs.statuses.inProgress');
      case 'done':
        return t('jobs.statuses.done');
      default:
        return t('jobs.filters.active');
    }
  }, [t]);

  const renderHomeEmptyState = useCallback(
    (title: string, body?: string, actionLabel?: string, onAction?: () => void) => (
      <View
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(233,238,255,0.95)',
          backgroundColor: isDark ? '#202637' : '#FFFFFF',
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}>
        <Text
          style={{
            color: isDark ? '#FFFFFF' : '#1C2745',
            fontSize: 15,
            fontWeight: '800',
            textAlign: 'center',
          }}>
          {title}
        </Text>
        {body ? (
          <Text
            style={{
              color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(28,39,69,0.62)',
              marginTop: 6,
              fontSize: 13,
              lineHeight: 18,
              textAlign: 'center',
            }}>
            {body}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <View className="items-center">
            <Pressable
              onPress={onAction}
              className="mt-4 rounded-full bg-[#E8F0FF] px-4 py-2.5 dark:bg-[#1E2A44]">
              <Text className="text-[13px] font-bold text-[#3C69D9] dark:text-[#8FB2FF]">{actionLabel}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    ),
    [isDark]
  );

  const onClosePaymentPicker = useCallback(() => {
    setPaymentPicker(null);
  }, []);

  const onOpenDebtPayment = useCallback(
    async (client: ClientWithDebt) => {
      if (!userId || client.debt <= 0) return;
      try {
        const jobs = await listClientOpenDebtJobs(userId, client.id);
        if (jobs.length === 0) return;
        if (jobs.length === 1) {
          router.push({
            pathname: '/(tabs)/posao/[id]/payment/new' as any,
            params: { id: jobs[0].id, returnTo: 'home' },
          });
          return;
        }
        setPaymentPicker({ clientName: client.name, jobs });
      } catch {
        // ignore on home
      }
    },
    [router, userId]
  );
  const getStatusColors = useCallback((status: string | null | undefined) => {
    switch ((status ?? '').toLowerCase()) {
      case 'scheduled':
        return { bg: '#E8F0FF', text: '#3D67C7' };
      case 'done':
        return { bg: '#E7F7EE', text: '#2F8C57' };
      default:
        return { bg: '#FFF0E1', text: '#C26A1A' };
    }
  }, []);
  const formatJobDate = useCallback((value: string | null | undefined) => {
    const parsed = parseDateInput(value);
    if (!parsed) return '';
    return parsed.toLocaleDateString(i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language, {
      day: '2-digit',
      month: 'short',
    });
  }, [i18n.language]);
  const getActivityMeta = useCallback((type: HomeActivityItem['type']) => {
    if (type === 'payment') {
      return { icon: 'wallet-outline' as const, color: '#2F8C57', bg: isDark ? '#1E382B' : '#EAF7EF', label: t('jobs.payment') };
    }
    if (type === 'expense') {
      return { icon: 'receipt-outline' as const, color: '#D86A4C', bg: isDark ? '#3C2720' : '#FFF1E8', label: t('jobs.expense') };
    }
    return {
      icon: 'checkmark-done-outline' as const,
      color: '#3C69D9',
      bg: isDark ? '#223252' : '#EAF1FF',
      label: t('home.activity.completed'),
    };
  }, [isDark, t]);
  const theme = useMemo(
    () => ({
      rootGradient: isDark
        ? (['#06111F', '#0D1F3B', '#132A4F', '#0B1220'] as const)
        : (['#1A4FE0', '#3A70EE', '#7EA6FF', '#E9EEFF'] as const),
      rootLocations: isDark ? ([0, 0.28, 0.62, 1] as const) : ([0, 0.22, 0.55, 1] as const),
      heroOverlay: isDark
        ? (['rgba(56,106,255,0.28)', 'rgba(12,58,180,0)'] as const)
        : (['rgba(12,58,180,0.52)', 'rgba(12,58,180,0)'] as const),
      sheetBackplate: isDark ? 'rgba(12,22,42,0.55)' : 'rgba(38,84,198,0.18)',
      sheetBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.82)',
      sheetBackground: isDark ? 'rgba(16,20,30,0.98)' : 'rgba(244,247,255,0.96)',
      sheetGradient: isDark
        ? (['rgba(24,29,42,0.98)', 'rgba(19,24,36,0.97)', 'rgba(15,19,30,0.98)'] as const)
        : (['rgba(250,252,255,0.96)', 'rgba(241,246,255,0.94)', 'rgba(233,239,255,0.92)'] as const),
      sheetHighlight: isDark
        ? (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)'] as const)
        : (['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0)'] as const),
      sheetHighlightLocations: isDark ? ([0, 0.28, 1] as const) : ([0, 0.12, 0.4, 1] as const),
      sheetTopLine: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.96)',
      title: isDark ? '#F4F7FF' : '#1C2745',
      secondary: isDark ? '#98A3C7' : '#6C789A',
      muted: isDark ? '#7E89A8' : '#5E6B8C',
      sectionBg: isDark ? 'rgba(255,255,255,0.035)' : '#FFFFFF',
      sectionBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(233,238,255,0.95)',
      sectionShadowOpacity: isDark ? 0.1 : 0.05,
      lightChipBg: isDark ? 'rgba(255,255,255,0.08)' : '#F1F4FB',
      metricLabel: isDark ? '#E8EEFF' : '#1C2745',
      metricCardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
      metricCards: {
        clients: isDark
          ? { colors: ['#1D2A44', '#162236'] as const, iconBg: '#243A66', icon: '#8FB2FF', valueColor: '#9CB9FF' }
          : { colors: ['#D9EEFF', '#CCE4FF'] as const, iconBg: '', icon: '#4A90E2', valueColor: '#4A70AA' },
        jobs: isDark
          ? { colors: ['#3A261E', '#2A1C17'] as const, iconBg: '#4A2F23', icon: '#FFB067', valueColor: '#FFAF84' }
          : { colors: ['#FFE8D6', '#FBE2CF'] as const, iconBg: '', icon: '#F08C45', valueColor: '#E26D45' },
        debts: isDark
          ? { colors: ['#3A3020', '#2B2418'] as const, iconBg: '#4D3B1B', icon: '#FFD27A', valueColor: '#FFD27A' }
          : { colors: ['#FFF2D9', '#FCEBCB'] as const, iconBg: '#FFBE55', icon: '#8A5100', valueColor: '#A36B11' },
        upcoming: isDark
          ? { colors: ['#1E322E', '#172723'] as const, iconBg: '#21443C', icon: '#7FD4B8', valueColor: '#7FD4B8' }
          : { colors: ['#E6F6F3', '#DFF0EA'] as const, iconBg: '#9CD8C8', icon: '#2B6A5A', valueColor: '#2B6A5A' },
      },
      actionCards: isDark
        ? {
            job: ['#1B2942', '#162033'] as const,
            client: ['#1C3027', '#16251E'] as const,
            debts: ['#392621', '#2C1D19'] as const,
            jobs: ['#2B2440', '#211B31'] as const,
            badgeBg: 'rgba(255,255,255,0.08)',
          }
        : null,
    }),
    [isDark]
  );

  const runSheetSlideIn = useCallback(() => {
    sheetTranslateY.setValue(88);
    return Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
  }, [sheetTranslateY]);

  const runHeroTextIn = useCallback(() => {
    heroTitleOpacity.setValue(0);
    heroTitleTranslateY.setValue(8);
    heroTitleScale.setValue(0.985);
    heroGreetingOpacity.setValue(0);
    heroGreetingTranslateY.setValue(10);
    heroSublineOpacity.setValue(0);
    heroSublineTranslateY.setValue(12);
    mascotOpacity.setValue(0);
    mascotTranslateY.setValue(10);
    mascotScale.setValue(0.985);

    const animateFadeSlide = (opacity: Animated.Value, translateY: Animated.Value, duration: number) =>
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

    return Animated.parallel([
      animateFadeSlide(heroTitleOpacity, heroTitleTranslateY, 260),
      Animated.timing(heroTitleScale, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      animateFadeSlide(heroGreetingOpacity, heroGreetingTranslateY, 300),
      animateFadeSlide(heroSublineOpacity, heroSublineTranslateY, 340),
      animateFadeSlide(mascotOpacity, mascotTranslateY, 320),
      Animated.timing(mascotScale, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
  }, [
    heroGreetingOpacity,
    heroGreetingTranslateY,
    mascotOpacity,
    mascotScale,
    mascotTranslateY,
    heroSublineOpacity,
    heroSublineTranslateY,
    heroTitleOpacity,
    heroTitleScale,
    heroTitleTranslateY,
  ]);

  const runCardsFloatIn = useCallback(() => {
    const resetCard = (enter: Animated.Value, opacity: Animated.Value, scale: Animated.Value, offset: number) => {
      enter.setValue(offset);
      opacity.setValue(0);
      scale.setValue(0.985);
    };

    resetCard(clientsCardEnter, clientsCardOpacity, clientsCardScale, 12);
    resetCard(jobsCardEnter, jobsCardOpacity, jobsCardScale, 12);
    resetCard(debtCardEnter, debtCardOpacity, debtCardScale, 14);
    resetCard(servicesCardEnter, servicesCardOpacity, servicesCardScale, 14);

    const animateCard = (
      enter: Animated.Value,
      opacity: Animated.Value,
      scale: Animated.Value,
      moveDuration: number,
      fadeDuration: number,
      scaleDuration: number
    ) =>
      Animated.parallel([
        Animated.timing(enter, {
          toValue: 0,
          duration: moveDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: fadeDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: scaleDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

    return Animated.sequence([
      Animated.delay(24),
      Animated.parallel([
        animateCard(clientsCardEnter, clientsCardOpacity, clientsCardScale, 220, 180, 220),
        animateCard(jobsCardEnter, jobsCardOpacity, jobsCardScale, 240, 190, 240),
        animateCard(debtCardEnter, debtCardOpacity, debtCardScale, 260, 200, 260),
        animateCard(servicesCardEnter, servicesCardOpacity, servicesCardScale, 280, 210, 280),
      ]),
    ]);
  }, [
    clientsCardEnter,
    clientsCardOpacity,
    clientsCardScale,
    debtCardEnter,
    debtCardOpacity,
    debtCardScale,
    jobsCardEnter,
    jobsCardOpacity,
    jobsCardScale,
    servicesCardEnter,
    servicesCardOpacity,
    servicesCardScale,
  ]);

  const runHomeIntro = useCallback(() => {
    Animated.parallel([runHeroTextIn(), Animated.sequence([runSheetSlideIn(), runCardsFloatIn()])]).start();
  }, [runCardsFloatIn, runHeroTextIn, runSheetSlideIn]);

  useEffect(() => {
    if (splashVisible) return;
    if (didRunFirstVisibleSlide.current) return;
    runHomeIntro();
    didRunFirstVisibleSlide.current = true;
  }, [runHomeIntro, splashVisible]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setClientsCount(0);
        setJobsCount(0);
        setTotalDebt(0);
        setClientsWithDebt([]);
        setTodayJobs([]);
        setUpcomingJobsCount(0);
        setActiveJobs([]);
        setRecentActivities([]);
        return;
      }

      let mounted = true;
      (async () => {
        try {
          const [clientsWithDebt, jobs, homeFeed] = await Promise.all([
            listClientsWithDebt(userId),
            listJobs(userId),
            getHomeFeed(userId),
          ]);
          if (!mounted) return;
          setClientsCount(clientsWithDebt.length);
          setJobsCount(jobs.length);
          setTotalDebt(clientsWithDebt.reduce((sum, client) => sum + (client.debt ?? 0), 0));
          setClientsWithDebt(clientsWithDebt);
          setActiveJobs(homeFeed.activeJobs);
          setRecentActivities(homeFeed.recentActivities);
          setTodayJobs(
            jobs.filter((job) => {
              const scheduled = job.scheduled_date?.slice(0, 10) ?? null;
              return scheduled === todayKey && (job.status ?? '').toLowerCase() !== 'done';
            })
          );
          setUpcomingJobsCount(
            jobs.filter((job) => {
              if ((job.status ?? '').toLowerCase() !== 'scheduled') return false;
              const scheduled = parseDateInput(job.scheduled_date);
              if (!scheduled) return false;
              return scheduled > new Date() && scheduled <= upcomingCutoff;
            }).length
          );
        } catch {
          if (!mounted) return;
          setClientsCount(null);
          setJobsCount(null);
          setTotalDebt(null);
          setClientsWithDebt([]);
          setTodayJobs([]);
          setUpcomingJobsCount(null);
          setActiveJobs([]);
          setRecentActivities([]);
        }
      })();

      return () => {
        mounted = false;
      };
    }, [todayKey, upcomingCutoff, userId])
  );

  return (
    <LinearGradient
      colors={theme.rootGradient}
      locations={theme.rootLocations}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}>
      <View
        style={{
          position: 'relative',
          minHeight: 240,
          paddingHorizontal: 24,
          paddingTop: insets.top + 16,
          paddingBottom: 24,
        }}>
        <LinearGradient
          pointerEvents="none"
          colors={theme.heroOverlay}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 220 }}
        />

        <View className="max-w-[220px]">
          <Animated.Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              lineHeight: 31,
              color: '#FFFFFF',
              opacity: heroTitleOpacity,
              transform: [{ translateY: heroTitleTranslateY }, { scale: heroTitleScale }],
            }}>
            {t('home.welcome')}
          </Animated.Text>
          <Animated.Text
            style={{
              marginTop: 8,
              fontSize: 17,
              fontWeight: '600',
              color: 'rgba(255,255,255,0.95)',
              opacity: heroGreetingOpacity,
              transform: [{ translateY: heroGreetingTranslateY }],
            }}>
            {`${greetingLabel}, ${username}!`}
          </Animated.Text>
          <Animated.Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            style={{
              marginTop: 4,
              fontSize: 13,
              color: 'rgba(255,255,255,0.95)',
              opacity: heroSublineOpacity,
              transform: [{ translateY: heroSublineTranslateY }],
            }}>
            {greetingSubline}
          </Animated.Text>
        </View>
      </View>

      <View
        style={{
          flex: 1,
          minHeight: 0,
          marginHorizontal: 0,
          marginTop: -72,
          borderTopLeftRadius: 38,
          borderTopRightRadius: 38,
          zIndex: 5,
        }}>
        <Animated.View
          style={{
            flex: 1,
            minHeight: 0,
            borderTopLeftRadius: 38,
            borderTopRightRadius: 38,
            transform: [{ translateY: sheetTranslateY }],
          }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 10,
            left: 8,
            right: 8,
            bottom: -8,
            borderTopLeftRadius: 34,
            borderTopRightRadius: 34,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            backgroundColor: theme.sheetBackplate,
            shadowColor: '#0E235F',
            shadowOpacity: isDark ? 0.32 : 0.22,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          }}
        />
        <View
          style={{
            flex: 1,
            minHeight: 0,
            borderTopLeftRadius: 38,
            borderTopRightRadius: 38,
            borderWidth: 1,
            borderColor: theme.sheetBorder,
            overflow: 'hidden',
            backgroundColor: theme.sheetBackground,
          }}>
          <LinearGradient
            colors={theme.sheetGradient}
            locations={[0, 0.42, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}>
        {/** Shadow ide na wrapper View, gradient ostaje unutra zbog konzistentnog rendera na Android/iOS. */}
        <Animated.View
          style={{ marginTop: 12, flexDirection: 'row' }}>
          <Animated.View
            style={{
              flex: 1,
              height: 98,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.metricCardBorder,
              shadowColor: '#000000',
              shadowOpacity: 0.3,
              shadowRadius: 5,
              shadowOffset: { width: 3, height: 6 },
              elevation: 18,
              opacity: clientsCardOpacity,
              transform: [{ translateY: clientsCardEnter }, { scale: clientsCardScale }],
            }}>
            <LinearGradient
              colors={theme.metricCards.clients.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, borderRadius: 20, padding: 11 }}>
              <Ionicons name="person-outline" size={20} color={theme.metricCards.clients.icon} />
            <Text style={{ color: theme.metricLabel, marginTop: 6, fontSize: 14, fontWeight: '800' }}>{t('tabs.clients')}</Text>
              <Text style={{ color: theme.metricCards.clients.valueColor, marginTop: 4, fontSize: 22, fontWeight: '800', lineHeight: 24 }}>
                {clientsCount ?? '—'}
              </Text>
            </LinearGradient>
          </Animated.View>

          <View style={{ width: 10 }} />

          <Animated.View
            style={{
              flex: 1,
              height: 98,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.metricCardBorder,
              shadowColor: '#000000',
              shadowOpacity: 0.3,
              shadowRadius: 5,
              shadowOffset: { width: 3, height: 6 },
              elevation: 18,
              opacity: jobsCardOpacity,
              transform: [{ translateY: jobsCardEnter }, { scale: jobsCardScale }],
            }}>
            <LinearGradient
              colors={theme.metricCards.jobs.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, borderRadius: 20, padding: 11 }}>
              <Ionicons name="clipboard-outline" size={20} color={theme.metricCards.jobs.icon} />
              <Text style={{ color: theme.metricLabel, marginTop: 6, fontSize: 14, fontWeight: '800' }}>{t('tabs.jobs')}</Text>
              <Text style={{ color: theme.metricCards.jobs.valueColor, marginTop: 4, fontSize: 22, fontWeight: '800', lineHeight: 24 }}>
                {jobsCount ?? '—'}
              </Text>
            </LinearGradient>
          </Animated.View>

          <View style={{ width: 10 }} />

          <View style={{ flex: 1.9 }} />
        </Animated.View>

        <Animated.View
          style={{ marginTop: 16, flexDirection: 'row' }}>
          <Animated.View
            style={{
              flex: 1,
              borderRadius: 20,
              height: 106,
              borderWidth: 1,
              borderColor: theme.metricCardBorder,
              shadowColor: '#000000',
              shadowOpacity: 0.3,
              shadowRadius: 5,
              shadowOffset: { width: 3, height: 6 },
              elevation: 17,
              opacity: debtCardOpacity,
              transform: [{ translateY: debtCardEnter }, { scale: debtCardScale }],
            }}>
            <LinearGradient
              colors={theme.metricCards.debts.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, borderRadius: 20, paddingHorizontal: 11, paddingTop: 11, paddingBottom: 13 }}>
              <View style={{ backgroundColor: theme.metricCards.debts.iconBg, height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 999 }}>
                <Ionicons name="cash-outline" size={16} color={theme.metricCards.debts.icon} />
              </View>
              <Text style={{ color: theme.metricLabel, marginTop: 6, fontSize: 14, fontWeight: '800' }}>{t('tabs.debts')}</Text>
              <Text style={{ color: theme.metricCards.debts.valueColor, marginTop: 4, fontSize: 21, fontWeight: '800', lineHeight: 23 }}>
                {totalDebtLabel}
              </Text>
            </LinearGradient>
          </Animated.View>

          <View style={{ width: 10 }} />

          <Pressable
            onPress={() => router.push({ pathname: '/(tabs)/poslovi', params: { filter: 'scheduled' } })}
            style={{ flex: 1 }}>
          <Animated.View
            style={{
              flex: 1,
              borderRadius: 20,
              height: 106,
              borderWidth: 1,
              borderColor: theme.metricCardBorder,
              shadowColor: '#000000',
              shadowOpacity: 0.3,
              shadowRadius: 5,
              shadowOffset: { width: 3, height: 6 },
              elevation: 17,
              opacity: servicesCardOpacity,
              transform: [{ translateY: servicesCardEnter }, { scale: servicesCardScale }],
            }}>
            <LinearGradient
              colors={theme.metricCards.upcoming.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, borderRadius: 20, paddingHorizontal: 11, paddingTop: 11, paddingBottom: 13 }}>
              <View style={{ backgroundColor: theme.metricCards.upcoming.iconBg, height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 999 }}>
                <Ionicons name="calendar-outline" size={16} color={theme.metricCards.upcoming.icon} />
              </View>
              <Text style={{ color: theme.metricLabel, marginTop: 6, fontSize: 14, fontWeight: '800' }}>{t('home.upcomingScheduled')}</Text>
              <Text style={{ color: theme.metricCards.upcoming.valueColor, marginTop: 4, fontSize: 21, fontWeight: '800', lineHeight: 23 }}>
                {upcomingJobsCount ?? '—'}
              </Text>
            </LinearGradient>
          </Animated.View>
          </Pressable>
        </Animated.View>

        <View
          className="mt-6 rounded-[24px]"
          style={{
            backgroundColor: theme.sectionBg,
            borderColor: theme.sectionBorder,
            borderWidth: 1,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            shadowColor: '#000000',
            shadowOpacity: theme.sectionShadowOpacity,
            shadowRadius: 8,
            shadowOffset: { width: 2, height: 5 },
            elevation: 8,
          }}>
          <View className="mb-2 flex-row items-center justify-between">
            <Text style={{ color: theme.title, fontSize: 18, fontWeight: '800' }}>{t('home.todayJobs')}</Text>
            <Pressable onPress={() => router.push('/(tabs)/poslovi')}>
              <Text className="text-[13px] font-semibold text-[#3C69D9]">{t('home.viewAllJobs')}</Text>
            </Pressable>
          </View>

          {todayJobs.length ? (
            todayJobs.slice(0, 3).map((job, index) => {
              const statusColors = getStatusColors(job.status);

              return (
                <Pressable
                  key={job.id}
                  onPress={() => router.push(`/(tabs)/posao/${job.id}`)}
                  style={{
                    paddingVertical: 12,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(100,118,164,0.12)',
                  }}>
                  <View className="flex-row items-start justify-between">
                    <View className="mr-3 flex-1 flex-row">
                      <View style={{ backgroundColor: isDark ? '#253453' : '#EAF1FF', marginRight: 12, height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                        <Ionicons name="briefcase-outline" size={18} color="#3C69D9" />
                      </View>

                      <View className="flex-1">
                        <Text style={{ color: theme.title, fontSize: 15, fontWeight: '700' }}>{job.title || t('jobs.untitled')}</Text>
                        <View className="mt-1 flex-row items-center">
                          <Ionicons name="person-outline" size={14} color={theme.secondary} />
                          <Text style={{ color: theme.secondary, marginLeft: 6, fontSize: 13 }}>
                            {job.client?.name || t('jobs.noClient')}
                          </Text>
                        </View>
                        <View className="mt-1.5 flex-row items-center">
                          <View style={{ backgroundColor: theme.lightChipBg, marginRight: 8, flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Ionicons name="calendar-outline" size={12} color={theme.secondary} />
                            <Text style={{ color: theme.secondary, marginLeft: 4, fontSize: 11, fontWeight: '600' }}>
                              {formatJobDate(job.scheduled_date)}
                            </Text>
                          </View>
                          <Text style={{ color: theme.title, fontSize: 15, fontWeight: '800' }}>
                            {formatCurrency(job.price)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="items-end">
                      <View
                        style={{ backgroundColor: statusColors.bg }}
                        className="rounded-full px-3 py-1">
                        <Text style={{ color: statusColors.text, fontSize: 11, fontWeight: '700' }}>
                          {getStatusLabel(job.status)}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: theme.lightChipBg, marginTop: 20, height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 999 }}>
                        <Ionicons name="chevron-forward" size={16} color="#7A86A8" />
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            renderHomeEmptyState(
              t('home.emptyTodayTitle'),
              t('home.emptyTodayBody'),
              t('jobs.add'),
              () => router.push('/(tabs)/posao/new')
            )
          )}
        </View>

        <View
          className="mt-4 rounded-[24px]"
          style={{
            backgroundColor: theme.sectionBg,
            borderColor: theme.sectionBorder,
            borderWidth: 1,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            shadowColor: '#000000',
            shadowOpacity: theme.sectionShadowOpacity,
            shadowRadius: 8,
            shadowOffset: { width: 2, height: 5 },
            elevation: 8,
          }}>
          <View className="mb-2 flex-row items-center justify-between">
            <Text style={{ color: theme.title, fontSize: 18, fontWeight: '800' }}>{t('home.urgentCollection')}</Text>
            <Pressable onPress={() => router.push('/(tabs)/dugovanja')}>
              <Text className="text-[13px] font-semibold text-[#5C6AC4]">{t('common.view')}</Text>
            </Pressable>
          </View>

          {urgentDebtClients.length ? (
            urgentDebtClients.map((client, index) => (
              <Pressable
                key={client.id}
                onPress={() =>
                  router.push(
                    client.latest_active_job_id ? `/(tabs)/posao/${client.latest_active_job_id}` : `/(tabs)/klijent/${client.id}`
                  )
                }
                style={{
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(100,118,164,0.12)',
                }}>
                <View className="flex-row items-center justify-between">
                  <View className="mr-3 flex-1 flex-row">
                    <View style={{ backgroundColor: isDark ? '#253453' : '#F3F6FF', marginRight: 12, height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                      <Ionicons name="cash-outline" size={18} color="#5C6AC4" />
                    </View>

                    <View className="flex-1">
                      <Text style={{ color: theme.title, fontSize: 15, fontWeight: '700' }}>{client.name || t('common.unnamed')}</Text>
                      <View className="mt-1.5 flex-row items-center">
                        <View style={{ backgroundColor: theme.lightChipBg, marginRight: 8, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text className="text-[11px] font-semibold text-[#5C6AC4]">
                            {client.active_jobs_count > 0
                              ? t('home.activeJobsCountShort', { count: client.active_jobs_count })
                              : t('home.jobsCountShort', { count: client.jobs_count })}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-[16px] font-extrabold text-[#C84D4D]">{formatCurrency(client.debt)}</Text>
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        void onOpenDebtPayment(client);
                      }}
                      className="mt-3 rounded-full bg-[#FDEEEE] px-3.5 py-2">
                      <Text className="text-[13px] font-bold text-[#C84D4D]">{t('jobs.payment')}</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            renderHomeEmptyState(t('home.noActiveDebts'))
          )}
        </View>

        <View
          className="mt-4 rounded-[24px]"
          style={{
            backgroundColor: theme.sectionBg,
            borderColor: theme.sectionBorder,
            borderWidth: 1,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            shadowColor: '#000000',
            shadowOpacity: theme.sectionShadowOpacity,
            shadowRadius: 8,
            shadowOffset: { width: 2, height: 5 },
            elevation: 8,
          }}>
          <View className="mb-2 flex-row items-center justify-between">
            <Text style={{ color: theme.title, fontSize: 18, fontWeight: '800' }}>{t('home.activeJobs')}</Text>
            <Pressable onPress={() => router.push({ pathname: '/(tabs)/poslovi', params: { filter: 'active' } })}>
              <Text className="text-[13px] font-semibold text-[#3C69D9]">{t('common.view')}</Text>
            </Pressable>
          </View>

          {activeJobs.length ? (
            activeJobs.map((job, index) => (
              <Pressable
                key={job.id}
                onPress={() => router.push(`/(tabs)/posao/${job.id}`)}
                style={{
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(100,118,164,0.12)',
                }}>
                <View className="flex-row items-start justify-between">
                  <View className="mr-3 flex-1 flex-row">
                    <View
                      className="mr-3 h-11 w-11 items-center justify-center rounded-[14px]"
                      style={{ backgroundColor: isDark ? '#3A2A1F' : '#FFF0E1' }}>
                      <Ionicons name="hammer-outline" size={18} color="#C26A1A" />
                    </View>

                    <View className="flex-1">
                      <Text style={{ color: theme.title, fontSize: 15, fontWeight: '700' }}>
                        {job.title || t('jobs.untitled')}
                      </Text>
                      <View className="mt-1 flex-row items-center">
                        <Ionicons name="person-outline" size={14} color={theme.secondary} />
                        <Text style={{ color: theme.secondary, marginLeft: 6, fontSize: 13 }}>
                          {job.client?.name || t('jobs.noClient')}
                        </Text>
                      </View>
                      <View className="mt-1.5 flex-row items-center">
                        <View style={{ backgroundColor: theme.lightChipBg, marginRight: 8, flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Ionicons name="calendar-outline" size={12} color={theme.secondary} />
                          <Text style={{ color: theme.secondary, marginLeft: 4, fontSize: 11, fontWeight: '600' }}>
                            {formatJobDate(job.scheduled_date)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="items-end">
                    <View className="rounded-full bg-[#FFF0E1] px-3 py-1">
                      <Text className="text-[11px] font-bold text-[#C26A1A]">{t('jobs.statuses.inProgress')}</Text>
                    </View>
                    <Text style={{ color: theme.title, marginTop: 12, fontSize: 15, fontWeight: '800' }}>
                      {formatCurrency(job.price)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            renderHomeEmptyState(t('home.emptyActiveTitle'), t('home.emptyActiveBody'))
          )}
        </View>

        <View
          className="mt-4 rounded-[24px]"
          style={{
            backgroundColor: theme.sectionBg,
            borderColor: theme.sectionBorder,
            borderWidth: 1,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            shadowColor: '#000000',
            shadowOpacity: theme.sectionShadowOpacity,
            shadowRadius: 8,
            shadowOffset: { width: 2, height: 5 },
            elevation: 8,
          }}>
          <View className="mb-2 flex-row items-center justify-between">
            <Text style={{ color: theme.title, fontSize: 18, fontWeight: '800' }}>{t('home.recentActivities')}</Text>
          </View>

          {recentActivities.length ? (
            recentActivities.map((activity, index) => {
              const meta = getActivityMeta(activity.type);
              return (
                <Pressable
                  key={activity.id}
                  onPress={() => router.push(`/(tabs)/posao/${activity.jobId}`)}
                  style={{
                    paddingVertical: 12,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(100,118,164,0.12)',
                  }}>
                  <View className="flex-row items-center justify-between">
                    <View className="mr-3 flex-1 flex-row items-center">
                      <View
                        className="mr-3 h-10 w-10 items-center justify-center rounded-[14px]"
                        style={{ backgroundColor: meta.bg }}>
                        <Ionicons name={meta.icon} size={17} color={meta.color} />
                      </View>
                      <View className="flex-1">
                        <Text style={{ color: theme.title, fontSize: 14, fontWeight: '800' }}>
                          {meta.label}: {activity.title}
                        </Text>
                        <Text style={{ color: theme.secondary, marginTop: 2, fontSize: 12 }} numberOfLines={1}>
                          {activity.subtitle || formatJobDate(activity.date)}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      {activity.amount != null ? (
                        <Text
                          className="text-[14px] font-bold"
                          style={{ color: activity.type === 'expense' ? '#D86A4C' : activity.type === 'payment' ? '#2F8C57' : theme.title }}>
                          {formatCurrency(activity.amount)}
                        </Text>
                      ) : null}
                      <Text style={{ color: theme.secondary, marginTop: 2, fontSize: 12 }}>
                        {formatJobDate(activity.date)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            renderHomeEmptyState(t('home.emptyActivityTitle'), t('home.emptyActivityBody'))
          )}
        </View>

        <View className="mt-4">
          <Text style={{ color: theme.title, marginBottom: 10, fontSize: 18, fontWeight: '800' }}>{t('home.quickActions')}</Text>
          <View className="flex-row flex-wrap justify-between">
            {[
              {
                key: 'job',
                label: t('home.actions.newJob'),
                sublabel: t('home.actions.newJobHint'),
                icon: 'briefcase-outline' as const,
                colors: ['#E3F0FF', '#D7E9FF'],
                iconColor: '#3C69D9',
                onPress: () => router.push('/(tabs)/posao/new'),
              },
              {
                key: 'client',
                label: t('home.actions.newClient'),
                sublabel: t('home.actions.newClientHint'),
                icon: 'person-add-outline' as const,
                colors: ['#E7F7EE', '#DDF2E8'],
                iconColor: '#2F8C57',
                onPress: () => router.push('/(tabs)/klijent/new'),
              },
              {
                key: 'debts',
                label: t('home.actions.debts'),
                sublabel: t('home.actions.debtsHint'),
                icon: 'cash-outline' as const,
                colors: ['#FFF1E6', '#FFE6D6'],
                iconColor: '#D86A4C',
                onPress: () => router.push('/(tabs)/dugovanja'),
              },
              {
                key: 'jobs',
                label: t('home.actions.allJobs'),
                sublabel: t('home.actions.allJobsHint'),
                icon: 'clipboard-outline' as const,
                colors: ['#EEEAFE', '#E4DDFD'],
                iconColor: '#7359C8',
                onPress: () => router.push('/(tabs)/poslovi'),
              },
            ].map((action) => (
              <Pressable
                key={action.key}
                onPress={action.onPress}
                style={{
                  width: '48.5%',
                  marginBottom: 8,
                  shadowColor: '#000000',
                  shadowOpacity: 0.2,
                  shadowRadius: 7,
                  shadowOffset: { width: 2, height: 5 },
                  elevation: 10,
                }}>
                <LinearGradient
                  colors={
                    isDark
                      ? action.key === 'job'
                        ? theme.actionCards!.job
                        : action.key === 'client'
                          ? theme.actionCards!.client
                          : action.key === 'debts'
                            ? theme.actionCards!.debts
                            : theme.actionCards!.jobs
                      : action.colors
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    minHeight: 112,
                    borderRadius: 24,
                    paddingHorizontal: 15,
                    paddingVertical: 15,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                  }}>
                  <View className="flex-row items-start justify-between">
                    <View
                      style={{ backgroundColor: isDark ? theme.actionCards!.badgeBg : 'rgba(255,255,255,0.76)' }}
                      className="h-11 w-11 items-center justify-center rounded-[14px]">
                      <Ionicons name={action.icon} size={19} color={action.iconColor} />
                    </View>
                    <View
                      style={{ backgroundColor: isDark ? theme.actionCards!.badgeBg : 'rgba(255,255,255,0.58)' }}
                      className="h-7 w-7 items-center justify-center rounded-full">
                      <Ionicons name="arrow-forward" size={14} color={action.iconColor} />
                    </View>
                  </View>
                  <View className="mt-5">
                    <Text style={{ color: theme.title, fontSize: 16, fontWeight: '800' }}>{action.label}</Text>
                    <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12, fontWeight: '500' }}>{action.sublabel}</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>
        </ScrollView>
          </LinearGradient>
        </View>
      </Animated.View>
      </View>

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -16,
          top: insets.top - 6,
          width: 245,
          height: 245,
          zIndex: 60,
          elevation: 60,
          opacity: splashVisible ? 0 : mascotOpacity,
          transform: [{ translateY: mascotTranslateY }, { scale: mascotScale }],
        }}>
        <Image
          source={require('../../assets/images/maskotavawe.png')}
          resizeMode="contain"
          style={{ width: 245, height: 245 }}
        />
      </Animated.View>

      <PaymentJobPickerModal
        visible={Boolean(paymentPicker)}
        clientName={paymentPicker?.clientName ?? null}
        jobs={paymentPicker?.jobs ?? []}
        onClose={onClosePaymentPicker}
        onSelect={(jobId) => {
          onClosePaymentPicker();
          router.push({
            pathname: '/(tabs)/posao/[id]/payment/new' as any,
            params: { id: jobId, returnTo: 'home' },
          });
        }}
      />
    </LinearGradient>
  );
}
