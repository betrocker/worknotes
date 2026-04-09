import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PaymentJobPickerModal } from '@/components/PaymentJobPickerModal';
import { MascotEmptyState } from '@/components/MascotEmptyState';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { listClientOpenDebtJobs, listClientsWithDebt, type ClientOpenDebtJob, type ClientWithDebt } from '@/lib/clients';
import { parseDateInput } from '@/lib/date';
import { getHomeFeed, type HomeActivityItem, type HomeFeed } from '@/lib/home';
import { listJobs, type JobListItem } from '@/lib/jobs';
import { getUserDisplayName } from '@/lib/user';
import { useAuth } from '@/providers/AuthProvider';

export default function TabOneScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [clientsCount, setClientsCount] = useState<number | null>(null);
  const [jobsCount, setJobsCount] = useState<number | null>(null);
  const [totalDebt, setTotalDebt] = useState<number | null>(null);
  const [todayJobs, setTodayJobs] = useState<JobListItem[]>([]);
  const [clientsWithDebt, setClientsWithDebt] = useState<ClientWithDebt[]>([]);
  const [upcomingJobsCount, setUpcomingJobsCount] = useState<number | null>(null);
  const [activeJobs, setActiveJobs] = useState<HomeFeed['activeJobs']>([]);
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
    date.setHours(0, 0, 0, 0);
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
  const getStatusLabel = useCallback(
    (status: string | null | undefined) => {
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
    },
    [t]
  );
  const renderHomeEmptyState = useCallback(
    (title: string, body?: string, actionLabel?: string, onAction?: () => void) => (
      <MascotEmptyState
        title={title}
        body={body}
        actionLabel={actionLabel}
        onAction={onAction}
        compact
        stacked
        centeredAction
        imageSize={112}
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
  const getStatusColors = useCallback(
    (status: string | null | undefined) => {
      switch ((status ?? '').toLowerCase()) {
        case 'scheduled':
          return { bg: isDark ? '#20345A' : '#E8F0FF', text: '#3D67C7' };
        case 'done':
          return { bg: isDark ? '#1E382B' : '#E7F7EE', text: '#2F8C57' };
        default:
          return { bg: isDark ? '#3C2A1E' : '#FFF0E1', text: '#C26A1A' };
      }
    },
    [isDark]
  );
  const formatJobDate = useCallback(
    (value: string | null | undefined) => {
      const parsed = parseDateInput(value);
      if (!parsed) return '';
      return parsed.toLocaleDateString(i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    },
    [i18n.language]
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
          const [clientDebtList, jobs, homeFeed] = await Promise.all([
            listClientsWithDebt(userId),
            listJobs(userId),
            getHomeFeed(userId),
          ]);
          if (!mounted) return;
          setClientsCount(clientDebtList.length);
          setJobsCount(jobs.length);
          setTotalDebt(clientDebtList.reduce((sum, client) => sum + (client.debt ?? 0), 0));
          setClientsWithDebt(clientDebtList);
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
              scheduled.setHours(0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return scheduled >= today && scheduled <= upcomingCutoff;
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

  const sectionCardStyle = {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(60,60,67,0.12)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  } as const;

  const metricCards = [
    {
      key: 'clients',
      label: t('home.totalClients'),
      value: clientsCount ?? '—',
      icon: 'person-outline' as const,
      bg: isDark ? '#1A2333' : '#F4F8FF',
      iconBadgeBg: isDark ? '#24354F' : '#E3EDFF',
      iconColor: '#4A7BE7',
      valueColor: isDark ? '#A8C0FF' : '#375A9E',
      hint: t('home.totalClientsHint'),
      onPress: () => router.push('/(tabs)/klijenti'),
    },
    {
      key: 'jobs',
      label: t('home.totalJobs'),
      value: jobsCount ?? '—',
      icon: 'clipboard-outline' as const,
      bg: isDark ? '#2D241F' : '#FFF7F1',
      iconBadgeBg: isDark ? '#433028' : '#FFE6D1',
      iconColor: '#E58A48',
      valueColor: isDark ? '#FFC196' : '#B66023',
      hint: t('home.totalJobsHint'),
      onPress: () => router.push('/(tabs)/poslovi'),
    },
    {
      key: 'debts',
      label: t('home.totalDebts'),
      value: totalDebtLabel,
      icon: 'cash-outline' as const,
      bg: isDark ? '#302A1D' : '#FFF9EC',
      iconBadgeBg: isDark ? '#463A22' : '#FFF0C6',
      iconColor: '#C08A16',
      valueColor: isDark ? '#FFD16A' : '#8C6613',
      hint: t('home.totalDebtsHint'),
      onPress: () => router.push('/(tabs)/dugovanja'),
    },
    {
      key: 'upcoming',
      label: t('home.upcomingScheduled'),
      value: upcomingJobsCount ?? '—',
      icon: 'calendar-outline' as const,
      bg: isDark ? '#1C2C2A' : '#F2FBF8',
      iconBadgeBg: isDark ? '#28413A' : '#DBF2EA',
      iconColor: '#2B8F76',
      valueColor: isDark ? '#8EE0C4' : '#236B59',
      hint: t('home.upcomingScheduledHint'),
      onPress: () => router.push({ pathname: '/(tabs)/poslovi', params: { filter: 'scheduled' } }),
    },
  ];

  const quickActions = [
    {
      key: 'job',
      label: t('home.actions.newJob'),
      sublabel: t('home.actions.newJobHint'),
      icon: 'briefcase-outline' as const,
      iconColor: '#3C69D9',
      bg: isDark ? '#1B2942' : '#EAF1FF',
      badgeBg: isDark ? '#2A4168' : '#D7E8FF',
      onPress: () => router.push('/(tabs)/posao/new'),
    },
    {
      key: 'client',
      label: t('home.actions.newClient'),
      sublabel: t('home.actions.newClientHint'),
      icon: 'person-add-outline' as const,
      iconColor: '#2F8C57',
      bg: isDark ? '#1C3027' : '#EAF7EF',
      badgeBg: isDark ? '#254836' : '#D5EFDF',
      onPress: () => router.push('/(tabs)/klijent/new'),
    },
    {
      key: 'debts',
      label: t('home.actions.debts'),
      sublabel: t('home.actions.debtsHint'),
      icon: 'cash-outline' as const,
      iconColor: '#D86A4C',
      bg: isDark ? '#392621' : '#FFF1E8',
      badgeBg: isDark ? '#553229' : '#FFDCCD',
      onPress: () => router.push('/(tabs)/dugovanja'),
    },
    {
      key: 'jobs',
      label: t('home.actions.allJobs'),
      sublabel: t('home.actions.allJobsHint'),
      icon: 'clipboard-outline' as const,
      iconColor: '#7359C8',
      bg: isDark ? '#2B2440' : '#F0EBFF',
      badgeBg: isDark ? '#403561' : '#DED4FF',
      onPress: () => router.push('/(tabs)/poslovi'),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ backgroundColor: colors.background }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 58, paddingBottom: 20 }}>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: '700', lineHeight: 36, letterSpacing: -0.6 }}>
            {`${greetingLabel}, ${username}!`}
          </Text>
          <Text style={{ marginTop: 4, color: colors.secondaryText, fontSize: 16 }}>{greetingSubline}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 168 }}
        showsVerticalScrollIndicator={false}>
        <View style={[sectionCardStyle, { paddingBottom: 6 }]}>
          <View style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('home.summaryTitle')}</Text>
          </View>
          {metricCards.map((card, index) => (
            <Pressable
              key={card.key}
              onPress={card.onPress}
              style={{
                paddingVertical: 12,
              }}>
              <View>
                {index > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: 0,
                      right: 0,
                      height: 1,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,60,67,0.08)',
                    }}
                  />
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ marginRight: 12, flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={card.icon} size={17} color={card.iconColor} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{card.label}</Text>
                      <Text style={{ marginTop: 4, color: colors.secondaryText, fontSize: 13 }} numberOfLines={1}>
                        {card.hint}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ marginLeft: 12, color: card.valueColor, fontSize: 17, fontWeight: '800' }}>
                    {card.value}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={[sectionCardStyle, { marginTop: 12 }]}> 
          <View style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('home.todayJobs')}</Text>
            <Pressable onPress={() => router.push('/(tabs)/poslovi')}>
              <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '700' }}>{t('home.viewAllJobs')}</Text>
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
                    borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,60,67,0.08)',
                  }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ marginRight: 12, flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons style={{ marginRight: 12 }} name="calendar-outline" size={17} color={colors.secondaryText} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{job.title || t('jobs.untitled')}</Text>
                        <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ color: colors.secondaryText, fontSize: 13 }}>
                            {job.client?.name || t('jobs.noClient')}
                          </Text>
                          <Text style={{ marginHorizontal: 6, color: colors.secondaryText, fontSize: 13 }}>•</Text>
                          <Text style={{ color: colors.secondaryText, fontSize: 13 }}>
                            {formatJobDate(job.scheduled_date)}
                          </Text>
                          <Text style={{ marginHorizontal: 6, color: colors.secondaryText, fontSize: 13 }}>•</Text>
                          <Text style={{ color: colors.secondaryText, fontSize: 13, fontWeight: '600' }}>
                            {formatCurrency(job.price)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <View
                        style={{
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: statusColors.text,
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                        }}>
                        <Text style={{ color: statusColors.text, fontSize: 11, fontWeight: '700' }}>
                          {getStatusLabel(job.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            renderHomeEmptyState(t('home.emptyTodayTitle'), t('home.emptyTodayBody'), t('jobs.add'), () =>
              router.push('/(tabs)/posao/new')
            )
          )}
        </View>

        <View style={[sectionCardStyle, { marginTop: 12 }]}> 
          <View style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('home.urgentCollection')}</Text>
            <Pressable onPress={() => router.push('/(tabs)/dugovanja')}>
              <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '700' }}>{t('common.view')}</Text>
            </Pressable>
          </View>

          {urgentDebtClients.length ? (
            urgentDebtClients.map((client, index) => (
              <View
                key={client.id}
                style={{
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,60,67,0.08)',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ marginRight: 12, flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons style={{ marginRight: 12 }} name="cash-outline" size={17} color="#C84D4D" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{client.name || t('common.unnamed')}</Text>
                      <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: colors.secondaryText, fontSize: 13 }} numberOfLines={1}>
                          {getDebtSummaryLine(client)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#C84D4D', fontSize: 16, fontWeight: '800' }}>{formatCurrency(client.debt)}</Text>
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        void onOpenDebtPayment(client);
                      }}
                      style={{
                        marginTop: 10,
                        borderRadius: 999,
                        backgroundColor: isDark ? '#243149' : '#EAF1FF',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                      }}>
                      <Text style={{ color: '#2F68ED', fontSize: 13, fontWeight: '700' }}>{t('jobs.payment')}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          ) : (
            renderHomeEmptyState(t('home.noActiveDebts'))
          )}
        </View>

        <View style={[sectionCardStyle, { marginTop: 12 }]}> 
          <View style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('home.activeJobs')}</Text>
            <Pressable onPress={() => router.push({ pathname: '/(tabs)/poslovi', params: { filter: 'active' } })}>
              <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '700' }}>{t('common.view')}</Text>
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
                  borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,60,67,0.08)',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ marginRight: 12, flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons style={{ marginRight: 12 }} name="briefcase-outline" size={17} color="#C26A1A" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{job.title || t('jobs.untitled')}</Text>
                      <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: colors.secondaryText, fontSize: 13 }}>
                          {job.client?.name || t('jobs.noClient')}
                        </Text>
                        <Text style={{ marginHorizontal: 6, color: colors.secondaryText, fontSize: 13 }}>•</Text>
                        <Text style={{ color: colors.secondaryText, fontSize: 13, fontWeight: '600' }}>
                          {formatJobDate(job.scheduled_date)}
                        </Text>
                        <Text style={{ marginHorizontal: 6, color: colors.secondaryText, fontSize: 13 }}>•</Text>
                        <Text style={{ color: colors.secondaryText, fontSize: 13, fontWeight: '600' }}>
                          {formatCurrency(job.price)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: '#C26A1A',
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                      }}>
                      <Text style={{ color: '#C26A1A', fontSize: 11, fontWeight: '700' }}>{t('jobs.statuses.inProgress')}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            renderHomeEmptyState(t('home.emptyActiveTitle'), t('home.emptyActiveBody'))
          )}
        </View>

        <View style={[sectionCardStyle, { marginTop: 12 }]}> 
          <View style={{ marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('home.recentActivities')}</Text>
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
                    borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,60,67,0.08)',
                  }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ marginRight: 12, flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons style={{ marginRight: 12 }} name={meta.icon} size={17} color={meta.color} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
                        {meta.label}: {activity.title}
                      </Text>
                      <Text style={{ marginTop: 4, color: colors.secondaryText, fontSize: 13 }} numberOfLines={1}>
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
                            fontSize: 16,
                            fontWeight: '700',
                          }}>
                          {formatCurrency(activity.amount)}
                        </Text>
                      ) : null}
                      <Text style={{ marginTop: 4, color: colors.secondaryText, fontSize: 13 }}>{formatJobDate(activity.date)}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            renderHomeEmptyState(t('home.emptyActivityTitle'), t('home.emptyActivityBody'))
          )}
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {quickActions.map((action) => (
              <Pressable
                key={action.key}
                onPress={action.onPress}
                style={{
                  width: '48.5%',
                  marginBottom: 8,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(60,60,67,0.12)',
                  backgroundColor: colors.surface,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      height: 34,
                      width: 34,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: action.badgeBg,
                    }}>
                    <Ionicons name={action.icon} size={16} color={action.iconColor} />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{action.label}</Text>
                    <Text style={{ marginTop: 1, color: colors.secondaryText, fontSize: 13, fontWeight: '500' }}>{action.sublabel}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

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
