import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PaymentJobPickerModal } from '@/components/PaymentJobPickerModal';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { listClientOpenDebtJobs, listClientsWithDebt, type ClientOpenDebtJob, type ClientWithDebt } from '@/lib/clients';
import { parseDateInput } from '@/lib/date';
import { getHomeFeed, type HomeActivityItem } from '@/lib/home';
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
      <View
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.separator,
          backgroundColor: colors.background,
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 15,
            fontWeight: '800',
            textAlign: 'center',
          }}>
          {title}
        </Text>
        {body ? (
          <Text
            style={{
              color: colors.secondaryText,
              marginTop: 6,
              fontSize: 13,
              lineHeight: 18,
              textAlign: 'center',
            }}>
            {body}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <View style={{ alignItems: 'center' }}>
            <Pressable
              onPress={onAction}
              style={{
                marginTop: 14,
                borderRadius: 999,
                backgroundColor: isDark ? '#1E2A44' : '#E8F0FF',
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}>
              <Text style={{ color: '#3C69D9', fontSize: 13, fontWeight: '700' }}>{actionLabel}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    ),
    [colors.background, colors.secondaryText, colors.separator, colors.text, isDark]
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
        month: 'short',
      });
    },
    [i18n.language]
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

  const sectionCardStyle = {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.separator,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  } as const;

  const metricCards = [
    {
      key: 'clients',
      label: t('tabs.clients'),
      value: clientsCount ?? '—',
      icon: 'person-outline' as const,
      bg: isDark ? '#1C2A43' : '#EAF1FF',
      iconBadgeBg: isDark ? '#2A4168' : '#D7E8FF',
      iconColor: '#4A7BE7',
      valueColor: isDark ? '#A8C0FF' : '#375A9E',
      onPress: () => router.push('/(tabs)/klijenti'),
    },
    {
      key: 'jobs',
      label: t('tabs.jobs'),
      value: jobsCount ?? '—',
      icon: 'clipboard-outline' as const,
      bg: isDark ? '#35251D' : '#FFF0E3',
      iconBadgeBg: isDark ? '#4A3127' : '#FFDABD',
      iconColor: '#E58A48',
      valueColor: isDark ? '#FFC196' : '#B66023',
      onPress: () => router.push('/(tabs)/poslovi'),
    },
    {
      key: 'debts',
      label: t('tabs.debts'),
      value: totalDebtLabel,
      icon: 'cash-outline' as const,
      bg: isDark ? '#382E1B' : '#FFF4DB',
      iconBadgeBg: isDark ? '#4D3E1F' : '#FFE7A9',
      iconColor: '#C08A16',
      valueColor: isDark ? '#FFD16A' : '#8C6613',
      onPress: () => router.push('/(tabs)/dugovanja'),
    },
    {
      key: 'upcoming',
      label: t('home.upcomingScheduled'),
      value: upcomingJobsCount ?? '—',
      icon: 'calendar-outline' as const,
      bg: isDark ? '#1E322E' : '#E8F6F2',
      iconBadgeBg: isDark ? '#29473F' : '#CDECE2',
      iconColor: '#2B8F76',
      valueColor: isDark ? '#8EE0C4' : '#236B59',
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {metricCards.map((card) => (
            <Pressable
              key={card.key}
              onPress={card.onPress}
              style={{
                width: '48.5%',
                marginBottom: 10,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: colors.separator,
                backgroundColor: card.bg,
                padding: 14,
                shadowColor: '#000000',
                shadowOpacity: isDark ? 0.24 : 0.12,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 5 },
                elevation: isDark ? 8 : 5,
              }}>
              <View
                style={{
                  height: 38,
                  width: 38,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: card.iconBadgeBg,
                }}>
                <Ionicons name={card.icon} size={18} color={card.iconColor} />
              </View>
              <Text style={{ marginTop: 12, color: colors.text, fontSize: 14, fontWeight: '800' }}>{card.label}</Text>
              <Text style={{ marginTop: 4, color: card.valueColor, fontSize: 21, fontWeight: '800', lineHeight: 24 }}>
                {card.value}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[sectionCardStyle, { marginTop: 6 }]}> 
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
                    borderTopColor: colors.separator,
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ marginRight: 12, flex: 1, flexDirection: 'row' }}>
                      <View
                        style={{
                          marginRight: 12,
                          height: 44,
                          width: 44,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isDark ? '#223252' : '#EAF1FF',
                        }}>
                        <Ionicons name="briefcase-outline" size={18} color="#3C69D9" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{job.title || t('jobs.untitled')}</Text>
                        <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="person-outline" size={14} color={colors.secondaryText} />
                          <Text style={{ marginLeft: 6, color: colors.secondaryText, fontSize: 13 }}>
                            {job.client?.name || t('jobs.noClient')}
                          </Text>
                        </View>
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                          <View
                            style={{
                              marginRight: 8,
                              flexDirection: 'row',
                              alignItems: 'center',
                              borderRadius: 999,
                              backgroundColor: isDark ? '#2C2C2E' : '#F1F4FB',
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                            }}>
                            <Ionicons name="calendar-outline" size={12} color={colors.secondaryText} />
                            <Text style={{ marginLeft: 4, color: colors.secondaryText, fontSize: 11, fontWeight: '600' }}>
                              {formatJobDate(job.scheduled_date)}
                            </Text>
                          </View>
                          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{formatCurrency(job.price)}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ borderRadius: 999, backgroundColor: statusColors.bg, paddingHorizontal: 12, paddingVertical: 5 }}>
                        <Text style={{ color: statusColors.text, fontSize: 11, fontWeight: '700' }}>{getStatusLabel(job.status)}</Text>
                      </View>
                      <View
                        style={{
                          marginTop: 20,
                          height: 32,
                          width: 32,
                          borderRadius: 999,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isDark ? '#2C2C2E' : '#F1F4FB',
                        }}>
                        <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
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
                  borderTopColor: colors.separator,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ marginRight: 12, flex: 1, flexDirection: 'row' }}>
                    <View
                      style={{
                        marginRight: 12,
                        height: 44,
                        width: 44,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark ? '#223252' : '#F3F6FF',
                      }}>
                      <Ionicons name="cash-outline" size={18} color="#5C6AC4" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{client.name || t('common.unnamed')}</Text>
                      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={{
                            borderRadius: 999,
                            backgroundColor: isDark ? '#2C2C2E' : '#F1F4FB',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                          }}>
                          <Text style={{ color: '#5C6AC4', fontSize: 11, fontWeight: '700' }}>
                            {client.active_jobs_count > 0
                              ? t('home.activeJobsCountShort', { count: client.active_jobs_count })
                              : t('home.jobsCountShort', { count: client.jobs_count })}
                          </Text>
                        </View>
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
                        backgroundColor: isDark ? '#452525' : '#FDEEEE',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                      }}>
                      <Text style={{ color: '#C84D4D', fontSize: 13, fontWeight: '700' }}>{t('jobs.payment')}</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
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
                  borderTopColor: colors.separator,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ marginRight: 12, flex: 1, flexDirection: 'row' }}>
                    <View
                      style={{
                        marginRight: 12,
                        height: 44,
                        width: 44,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark ? '#3A2A1F' : '#FFF0E1',
                      }}>
                      <Ionicons name="hammer-outline" size={18} color="#C26A1A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{job.title || t('jobs.untitled')}</Text>
                      <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="person-outline" size={14} color={colors.secondaryText} />
                        <Text style={{ marginLeft: 6, color: colors.secondaryText, fontSize: 13 }}>
                          {job.client?.name || t('jobs.noClient')}
                        </Text>
                      </View>
                      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderRadius: 999,
                            backgroundColor: isDark ? '#2C2C2E' : '#F1F4FB',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                          }}>
                          <Ionicons name="calendar-outline" size={12} color={colors.secondaryText} />
                          <Text style={{ marginLeft: 4, color: colors.secondaryText, fontSize: 11, fontWeight: '600' }}>
                            {formatJobDate(job.scheduled_date)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View
                      style={{
                        borderRadius: 999,
                        backgroundColor: isDark ? '#3A2A1F' : '#FFF0E1',
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                      }}>
                      <Text style={{ color: '#C26A1A', fontSize: 11, fontWeight: '700' }}>{t('jobs.statuses.inProgress')}</Text>
                    </View>
                    <Text style={{ marginTop: 12, color: colors.text, fontSize: 15, fontWeight: '800' }}>
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
                    borderTopColor: colors.separator,
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ marginRight: 12, flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={{
                          marginRight: 12,
                          height: 40,
                          width: 40,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: meta.bg,
                        }}>
                        <Ionicons name={meta.icon} size={17} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>
                          {meta.label}: {activity.title}
                        </Text>
                        <Text style={{ marginTop: 2, color: colors.secondaryText, fontSize: 12 }} numberOfLines={1}>
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
                            fontSize: 14,
                            fontWeight: '700',
                          }}>
                          {formatCurrency(activity.amount)}
                        </Text>
                      ) : null}
                      <Text style={{ marginTop: 2, color: colors.secondaryText, fontSize: 12 }}>{formatJobDate(activity.date)}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            renderHomeEmptyState(t('home.emptyActivityTitle'), t('home.emptyActivityBody'))
          )}
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ marginBottom: 10, color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('home.quickActions')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {quickActions.map((action) => (
              <Pressable
                key={action.key}
                onPress={action.onPress}
                style={{
                  width: '48.5%',
                  marginBottom: 10,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: colors.separator,
                  backgroundColor: action.bg,
                  paddingHorizontal: 15,
                  paddingVertical: 15,
                  shadowColor: '#000000',
                  shadowOpacity: isDark ? 0.24 : 0.12,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: isDark ? 8 : 5,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View
                    style={{
                      height: 44,
                      width: 44,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: action.badgeBg,
                    }}>
                    <Ionicons name={action.icon} size={19} color={action.iconColor} />
                  </View>
                  <View
                    style={{
                      height: 28,
                      width: 28,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                    }}>
                    <Ionicons name="arrow-forward" size={14} color={action.iconColor} />
                  </View>
                </View>
                <View style={{ marginTop: 18 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{action.label}</Text>
                  <Text style={{ marginTop: 4, color: colors.secondaryText, fontSize: 12, fontWeight: '500' }}>{action.sublabel}</Text>
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
