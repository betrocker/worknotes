import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Platform, Pressable, Text, UIManager, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PaymentJobPickerModal } from '@/components/PaymentJobPickerModal';
import { CollapsingMainHeader, MainScreenTitle } from '@/components/CollapsingMainHeader';
import { EmptyState } from '@/components/EmptyState';
import { JobStatusText } from '@/components/JobStatusText';
import { useQuickFindSwipeDown } from '@/components/useQuickFindSwipeDown';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { listClientOpenDebtJobs, listClientsWithDebt, type ClientOpenDebtJob, type ClientWithDebt } from '@/lib/clients';
import { parseDateInput } from '@/lib/date';
import { getHomeFeed, type HomeActivityItem, type HomeFeed } from '@/lib/home';
import { listJobs, type JobListItem } from '@/lib/jobs';
import { useAuth } from '@/providers/AuthProvider';

type HomeSectionKey = 'today' | 'debts' | 'upcoming' | 'activity';

export default function TabOneScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { height: windowHeight } = useWindowDimensions();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const scrollY = useRef(new Animated.Value(0)).current;
  const quickFindSwipe = useQuickFindSwipeDown();
  const [todayJobs, setTodayJobs] = useState<JobListItem[]>([]);
  const [clientsWithDebt, setClientsWithDebt] = useState<ClientWithDebt[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<HomeFeed['upcomingJobs']>([]);
  const [recentActivities, setRecentActivities] = useState<HomeActivityItem[]>([]);
  const [paymentPicker, setPaymentPicker] = useState<{ clientName: string | null; jobs: ClientOpenDebtJob[] } | null>(null);
  const [openSections, setOpenSections] = useState<Record<HomeSectionKey, boolean>>({
    today: true,
    debts: false,
    upcoming: false,
    activity: false,
  });

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const todayKey = useMemo(() => {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);
  const urgentDebtClients = useMemo(
    () => [...clientsWithDebt].filter((client) => client.debt > 0).sort((a, b) => b.debt - a.debt),
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
  const getStatusLabel = useCallback(
    (status: string | null | undefined) => {
      switch ((status ?? '').toLowerCase()) {
        case 'scheduled':
          return t('jobs.statuses.scheduled');
        case 'in_progress':
          return t('jobs.statuses.inProgress');
        case 'pending':
          return t('jobs.statuses.pending');
        case 'done':
          return t('jobs.statuses.done');
        default:
          return t('jobs.filters.active');
      }
    },
    [t]
  );
  const renderHomeEmptyState = useCallback(
    (
      title: string,
      body?: string,
      actionLabel?: string,
      onAction?: () => void
    ) => (
      <EmptyState
        title={title}
        body={body}
        actionLabel={actionLabel}
        onAction={onAction}
        compact
      />
    ),
    []
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
  const formatJobDate = useCallback(
    (value: string | null | undefined) => {
      const parsed = parseDateInput(value);
      if (!parsed) return '';
      return parsed.toLocaleDateString(i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    },
    [i18n.language]
  );
  const formatShortDayMonth = useCallback(
    (value: string | null | undefined) => {
      const parsed = parseDateInput(value);
      if (!parsed) return '';
      return `${parsed.getDate()}. ${parsed.getMonth() + 1}.`;
    },
    []
  );
  const getDebtSummaryLine = useCallback(
    (client: ClientWithDebt) => {
      if (client.debt_jobs_count > 1) {
        const count = client.debt_jobs_count;
        if (i18n.language === 'sr') {
          const mod10 = count % 10;
          const mod100 = count % 100;
          const form = mod10 === 1 && mod100 !== 11 ? 'one' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'few' : 'other';
          return `${count} ${t(`debts.debtJobsForms.${form}`)}`;
        }
        return `${count} ${count === 1 ? t('debts.debtJobsForms.one') : t('debts.debtJobsForms.other')}`;
      }
      if (client.top_debt_job_title) return client.top_debt_job_title;
      if (client.active_jobs_count > 0) return t('debts.activeJobAvailable');
      return t('home.jobsCountShort', { count: client.jobs_count });
    },
    [i18n.language, t]
  );
  const getActivityMeta = useCallback(
    (type: HomeActivityItem['type']) => {
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
    },
    [isDark, t]
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setClientsWithDebt([]);
        setTodayJobs([]);
        setUpcomingJobs([]);
        setRecentActivities([]);
        return;
      }

      let mounted = true;
      (async () => {
        try {
          const [clientDebtList, jobs, homeFeed] = await Promise.all([
            listClientsWithDebt(userId),
            listJobs(userId),
            getHomeFeed(userId),
          ]);
          if (!mounted) return;
          setClientsWithDebt(clientDebtList);
          setUpcomingJobs(homeFeed.upcomingJobs);
          setRecentActivities(homeFeed.recentActivities);
          setTodayJobs(
            jobs.filter((job) => {
              const scheduled = job.scheduled_date?.slice(0, 10) ?? null;
              const status = (job.status ?? '').toLowerCase();
              return status !== 'done' && status !== 'pending' && (status === 'in_progress' || Boolean(scheduled && scheduled <= todayKey));
            })
          );
        } catch {
          if (!mounted) return;
          setClientsWithDebt([]);
          setTodayJobs([]);
          setUpcomingJobs([]);
          setRecentActivities([]);
        }
      })();

      return () => {
        mounted = false;
      };
    }, [todayKey, userId])
  );

  const sectionSeparatorColor = colorScheme === 'dark' ? 'rgba(84,84,88,0.38)' : 'rgba(60,60,67,0.14)';
  const toggleSection = useCallback((key: HomeSectionKey) => {
    LayoutAnimation.configureNext({
      duration: 220,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  }, []);
  const renderHomeSection = (
    key: HomeSectionKey,
    title: string,
    children: React.ReactNode,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    const expanded = openSections[key];
    return (
      <View
        key={key}
        style={{
          marginBottom: 22,
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => toggleSection(key)}
          hitSlop={8}
          className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text
              className="text-app-row-title font-semibold"
              style={{
                color: isDark ? '#72A8FF' : '#1C60C3',
              }}>
              {title}
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.secondaryText}
          />
        </Pressable>
        <View
          className="mt-2 h-px"
          style={{ backgroundColor: sectionSeparatorColor }}
        />
        {expanded ? (
          <View style={{ marginLeft: 12, marginTop: 8 }}>
            {children}
            {actionLabel && onAction ? (
              <Pressable onPress={onAction} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 10, paddingVertical: 4 }}>
                <Text className="text-app-subtitle font-semibold" style={{ color: colors.secondaryText }}>
                  {actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CollapsingMainHeader
        title={t('home.dayOverviewTitle')}
        iconName="today"
        scrollY={scrollY}
        right={
          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('tabs.profile')}
              onPress={() => router.push('/(tabs)/podesavanja' as any)}
              hitSlop={8}
              style={{
                width: 38,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="person-outline" size={20} color="#717983" />
            </Pressable>
          </View>
        }
      />

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ minHeight: windowHeight + 96, paddingHorizontal: 24, paddingTop: 0, paddingBottom: 148 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: quickFindSwipe.onScroll }
        )}
        {...quickFindSwipe.touchHandlers}
        refreshControl={quickFindSwipe.refreshControl}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}>
        <MainScreenTitle title={t('home.dayOverviewTitle')} iconName="today" scrollY={scrollY} />

        {renderHomeSection('today', t('home.todayJobs'), (
          <>
          {todayJobs.length ? (
            todayJobs.slice(0, 5).map((job) => (
              <Pressable
                key={job.id}
                onPress={() => router.push(`/(tabs)/posao/${job.id}`)}
                style={{
                  paddingVertical: 6,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.text, flex: 1, fontSize: 16, fontWeight: '400' }} numberOfLines={1}>
                    {job.title || t('jobs.untitled')}
                  </Text>
                  <JobStatusText label={getStatusLabel(job.status)} status={job.status} style={{ marginLeft: 10 }} />
                </View>
                <View style={{ marginTop: -1, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                    {job.client?.name || t('jobs.noClient')}
                  </Text>
                  <Text style={{ marginHorizontal: 5, color: colors.secondaryText, fontSize: 12 }}>•</Text>
                  <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                    {formatJobDate(job.scheduled_date)}
                  </Text>
                  <Text style={{ marginHorizontal: 5, color: colors.secondaryText, fontSize: 12 }}>•</Text>
                  <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                    {formatCurrency(job.price)}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            renderHomeEmptyState(
              t('home.emptyTodayTitle'),
              t('home.emptyTodayBody'),
              t('jobs.add'),
              () => router.push('/(tabs)/posao/new')
            )
          )}
          </>
        ), todayJobs.length > 5 ? t('home.viewAllJobs') : undefined, todayJobs.length > 5 ? () => router.push('/(tabs)/poslovi') : undefined)}

        {renderHomeSection(
          'debts',
          t('home.urgentCollection'),
          (
          <>
          {urgentDebtClients.length ? (
            urgentDebtClients.slice(0, 3).map((client) => (
              <Pressable
                key={client.id}
                onPress={() => {
                  void onOpenDebtPayment(client);
                }}
                style={{
                  paddingVertical: 6,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ marginRight: 12, flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '400' }}>{client.name || t('common.unnamed')}</Text>
                    <View style={{ marginTop: -1, flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: colors.secondaryText, fontSize: 12 }} numberOfLines={1}>
                        {getDebtSummaryLine(client)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: isDark ? '#FF8A8A' : '#C84D4D', fontSize: 16, fontWeight: '700' }}>{formatCurrency(client.debt)}</Text>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            renderHomeEmptyState(t('home.noActiveDebts'))
          )}
          </>
          ),
          urgentDebtClients.length > 3 ? t('home.viewAllDebts') : undefined,
          urgentDebtClients.length > 3 ? () => router.push('/(tabs)/dugovanja') : undefined
        )}

        {renderHomeSection(
          'upcoming',
          t('home.upcomingJobs'),
          (
          <>
          {upcomingJobs.length ? (
            upcomingJobs.slice(0, 3).map((job) => (
              <Pressable
                key={job.id}
                onPress={() => router.push(`/(tabs)/posao/${job.id}`)}
                style={{
                  paddingVertical: 6,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.text, flex: 1, fontSize: 16, fontWeight: '400' }} numberOfLines={1}>
                    {job.title || t('jobs.untitled')}
                  </Text>
                  <JobStatusText label={getStatusLabel(job.status)} status={job.status} style={{ marginLeft: 10 }} />
                </View>
                <View style={{ marginTop: -1, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                    {job.client?.name || t('jobs.noClient')}
                  </Text>
                  <Text style={{ marginHorizontal: 5, color: colors.secondaryText, fontSize: 12 }}>•</Text>
                  <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                    {formatJobDate(job.scheduled_date)}
                  </Text>
                  <Text style={{ marginHorizontal: 5, color: colors.secondaryText, fontSize: 12 }}>•</Text>
                  <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                    {formatCurrency(job.price)}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            renderHomeEmptyState(t('home.emptyUpcomingTitle'), t('home.emptyUpcomingBody'))
          )}
          </>
          ),
          upcomingJobs.length > 3 ? t('home.viewUpcomingJobs') : undefined,
          upcomingJobs.length > 3 ? () => router.push({ pathname: '/(tabs)/poslovi', params: { filter: 'scheduled' } }) : undefined
        )}

        {renderHomeSection('activity', t('home.recentActivities'), (
          <>
          {recentActivities.length ? (
            recentActivities.map((activity) => {
              const meta = getActivityMeta(activity.type);
              return (
                <Pressable
                  key={activity.id}
                  onPress={() => router.push(`/(tabs)/posao/${activity.jobId}`)}
                  style={{
                    paddingVertical: 6,
                  }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text
                    style={{
                      marginRight: 5,
                      minWidth: 28,
                      color: isDark ? '#72A8FF' : '#1C60C3',
                      fontSize: 12,
                    }}>
                    {formatShortDayMonth(activity.date)}
                  </Text>
                  <View style={{ marginRight: 12, flex: 1 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '400' }}>
                        {meta.label}: {activity.title}
                      </Text>
                      <Text style={{ marginTop: -1, color: colors.secondaryText, fontSize: 12 }} numberOfLines={1}>
                        {activity.subtitle || formatJobDate(activity.date)}
                      </Text>
                    </View>
                  </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {activity.amount != null ? (
                        <Text
                          style={{
                            color:
                              activity.type === 'expense' ? '#D86A4C' : activity.type === 'payment' ? '#2F8C57' : colors.text,
                            fontSize: 13,
                            fontWeight: '400',
                          }}>
                          {formatCurrency(activity.amount)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            renderHomeEmptyState(t('home.emptyActivityTitle'), t('home.emptyActivityBody'))
          )}
          </>
        ))}
      </Animated.ScrollView>

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
    </View>
  );
}
