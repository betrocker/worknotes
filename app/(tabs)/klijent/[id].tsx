import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Animated, Easing, Linking, PanResponder, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollapsingMainHeader, MainScreenTitle } from '@/components/CollapsingMainHeader';
import { HeaderOverflowMenu } from '@/components/HeaderOverflowMenu';
import Colors from '@/constants/Colors';
import { JobStatusText } from '@/components/JobStatusText';
import { useQuickFindSwipeDown } from '@/components/useQuickFindSwipeDown';
import { useColorScheme } from '@/components/useColorScheme';
import { useMoneyFormatter } from '@/components/useMoneyFormatter';
import { parseDateInput } from '@/lib/date';
import { deleteClient, getClientDetail, type ClientDetail } from '@/lib/clients';
import { deleteJob, updateJobStatus } from '@/lib/jobs';
import { goBackOrReplace } from '@/lib/navigation';
import { cancelJobReminder, clearJobReminderPreference } from '@/lib/notifications';
import { triggerSelectionHaptic } from '@/lib/haptics';
import { useAuth } from '@/providers/AuthProvider';

type TimelineEvent = {
  id: string;
  jobId: string;
  type: 'created' | 'scheduled' | 'completed' | 'payment';
  date: string | null;
  title: string;
  amount?: number;
  note?: string | null;
};

type ClientJobSwipeSelectRowProps = {
  selected: boolean;
  selectionMode: boolean;
  colorScheme: 'light' | 'dark';
  subdued?: boolean;
  children: React.ReactNode;
  onOpen: () => void;
  onToggleSelected: () => void;
};

const CLIENT_JOB_SELECT_SWIPE_THRESHOLD = 36;
const CLIENT_JOB_SELECT_SWIPE_MAX = 56;
const CLIENT_JOB_SELECT_GESTURE_START = 3;
const CLIENT_JOB_SELECT_HORIZONTAL_BIAS = 0.72;

function JobSelectionCircle({ selected, colorScheme }: { selected: boolean; colorScheme: 'light' | 'dark' }) {
  const accent = colorScheme === 'dark' ? '#72A8FF' : '#1C60C3';
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: selected ? accent : colorScheme === 'dark' ? 'rgba(255,255,255,0.36)' : 'rgba(60,60,67,0.28)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {selected ? (
        <View
          style={{
            width: 11,
            height: 11,
            borderRadius: 5.5,
            backgroundColor: accent,
          }}
        />
      ) : null}
    </View>
  );
}

function ClientJobSwipeSelectRow({
  selected,
  selectionMode,
  colorScheme,
  subdued = false,
  children,
  onOpen,
  onToggleSelected,
}: ClientJobSwipeSelectRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const circleProgress = useRef(new Animated.Value(selectionMode ? 1 : 0)).current;
  const maxSwipeDistanceRef = useRef(0);
  const currentSwipeDistanceRef = useRef(0);
  const suppressOpenRef = useRef(false);
  const [swiping, setSwiping] = useState(false);

  useEffect(() => {
    Animated.spring(circleProgress, {
      toValue: selectionMode ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    }).start();
  }, [circleProgress, selectionMode]);

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
          gesture.dx < -CLIENT_JOB_SELECT_GESTURE_START &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * CLIENT_JOB_SELECT_HORIZONTAL_BIAS,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dx < -CLIENT_JOB_SELECT_GESTURE_START &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * CLIENT_JOB_SELECT_HORIZONTAL_BIAS,
        onPanResponderGrant: () => {
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
            distance > CLIENT_JOB_SELECT_SWIPE_MAX
              ? -(CLIENT_JOB_SELECT_SWIPE_MAX + (distance - CLIENT_JOB_SELECT_SWIPE_MAX) * 0.18)
              : rawNext;
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldSelect = maxSwipeDistanceRef.current > CLIENT_JOB_SELECT_SWIPE_THRESHOLD || gesture.vx < -0.55;
          if (shouldSelect) {
            onToggleSelected();
          }
          resetSwipe();
        },
        onPanResponderTerminate: resetSwipe,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [onToggleSelected, resetSwipe, translateX]
  );

  const circleOpacity = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const circleScale = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1],
  });
  const revealOpacity = translateX.interpolate({
    inputRange: [-24, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const revealTranslateX = translateX.interpolate({
    inputRange: [-CLIENT_JOB_SELECT_SWIPE_MAX, 0],
    outputRange: [0, 16],
    extrapolate: 'clamp',
  });
  const revealScale = translateX.interpolate({
    inputRange: [-CLIENT_JOB_SELECT_SWIPE_MAX, -16, 0],
    outputRange: [1, 0.92, 0.86],
    extrapolate: 'clamp',
  });
  const selectedRowBackground = colorScheme === 'dark' ? 'rgba(47, 105, 190, 0.26)' : '#D5E5FF';
  const activeRowBackground = colorScheme === 'dark' ? '#30333A' : '#E4E6EA';
  const movingRowBackground = swiping ? activeRowBackground : 'transparent';
  const revealBackgroundColor = colorScheme === 'dark' ? '#315FAD' : '#1C60C3';

  return (
    <Animated.View
      {...panResponder.panHandlers}
      className="flex-row items-center"
      style={{
        marginVertical: 1,
        borderRadius: 12,
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
        className="flex-1 flex-row items-center"
        style={{
          marginHorizontal: -8,
          paddingHorizontal: 8,
          paddingVertical: 6,
          borderRadius: 12,
          backgroundColor: movingRowBackground,
          opacity: subdued ? 0.58 : 1,
          transform: [{ translateX }],
        }}>
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            if (suppressOpenRef.current) {
              suppressOpenRef.current = false;
              return;
            }
            onOpen();
          }}
          className="flex-1">
          {children}
        </Pressable>

        <Animated.View
          style={{
            width: selectionMode ? 34 : 0,
            opacity: circleOpacity,
            alignItems: 'flex-end',
            transform: [{ scale: circleScale }],
          }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            disabled={!selectionMode}
            onPress={onToggleSelected}
            hitSlop={8}
            className="items-end justify-center">
            <JobSelectionCircle selected={selected} colorScheme={colorScheme} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

export default function ClientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const quickFindSwipe = useQuickFindSwipeDown();
  const selectionBarProgress = useRef(new Animated.Value(0)).current;

  const userId = session?.user?.id ?? null;
  const id = typeof params.id === 'string' ? params.id : null;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }),
    [locale]
  );
  const moneyFormatter = useMoneyFormatter({ maximumFractionDigits: 0 });
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    [locale]
  );

  const load = useCallback(async () => {
    if (!userId || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getClientDetail(userId, id);
      setClient(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    setShowAllActivities(false);
    setSelectedJobId(null);
  }, [id]);

  const formatDateInput = useCallback((date: Date) => {
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return '—';
      const parsed = parseDateInput(value);
      if (!parsed) return value;
      return dateFormatter.format(parsed);
    },
    [dateFormatter]
  );

  const formatListDate = useCallback((value: string | null) => {
    if (!value) return null;
    const parsed = parseDateInput(value);
    if (!parsed) return value;
    return `${parsed.getDate()}. ${parsed.getMonth() + 1}.`;
  }, []);

  const getStatusLabel = useCallback(
    (status: string | null | undefined) => {
      if (status === 'done') return t('jobs.statuses.done');
      if (status === 'in_progress') return t('jobs.statuses.inProgress');
      if (status === 'pending') return t('jobs.statuses.pending');
      return t('jobs.statuses.scheduled');
    },
    [t]
  );

  const timeline = useMemo<TimelineEvent[]>(() => {
    const events = (client?.jobs ?? []).flatMap((job) => {
      const title = job.title || t('jobs.untitled');
      const rows: TimelineEvent[] = [];

      if (job.created_at) {
        rows.push({
          id: `${job.id}-created`,
          jobId: job.id,
          type: 'created',
          date: job.created_at,
          title,
        });
      }

      if (job.scheduled_date) {
        rows.push({
          id: `${job.id}-scheduled`,
          jobId: job.id,
          type: 'scheduled',
          date: job.scheduled_date,
          title,
        });
      }

      if (job.completed_at) {
        rows.push({
          id: `${job.id}-completed`,
          jobId: job.id,
          type: 'completed',
          date: job.completed_at,
          title,
        });
      }

      (job.payments ?? []).forEach((payment) => {
        rows.push({
          id: payment.id,
          jobId: job.id,
          type: 'payment',
          date: payment.payment_date,
          title,
          amount: payment.amount ?? 0,
          note: payment.note ?? null,
        });
      });

      return rows;
    });

    return events.sort((a, b) => {
      const at = parseDateInput(a.date)?.getTime() ?? 0;
      const bt = parseDateInput(b.date)?.getTime() ?? 0;
      return bt - at;
    });
  }, [client?.jobs, t]);

  const visibleTimeline = useMemo(
    () => (showAllActivities ? timeline : timeline.slice(0, 10)),
    [showAllActivities, timeline]
  );

  const groupedTimeline = useMemo(() => {
    const groups: { key: string; label: string; items: TimelineEvent[] }[] = [];
    const indexByKey = new Map<string, number>();

    visibleTimeline.forEach((event) => {
      const parsed = parseDateInput(event.date);
      let key = 'no-date';
      let label = '—';
      if (parsed) {
        key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
        label = monthFormatter.format(parsed);
      }
      const existingIndex = indexByKey.get(key);
      if (existingIndex == null) {
        indexByKey.set(key, groups.length);
        groups.push({ key, label, items: [event] });
        return;
      }
      groups[existingIndex].items.push(event);
    });

    return groups;
  }, [visibleTimeline, monthFormatter]);

  const sortedJobs = useMemo(
    () =>
      [...(client?.jobs ?? [])].sort((a, b) => {
        const aTime = parseDateInput(a.scheduled_date ?? a.created_at)?.getTime() ?? 0;
        const bTime = parseDateInput(b.scheduled_date ?? b.created_at)?.getTime() ?? 0;
        return bTime - aTime;
      }),
    [client?.jobs]
  );

  const selectedJob = useMemo(
    () => sortedJobs.find((job) => job.id === selectedJobId) ?? null,
    [selectedJobId, sortedJobs]
  );
  const selectionMode = Boolean(selectedJob);

  useEffect(() => {
    Animated.spring(selectionBarProgress, {
      toValue: selectionMode ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 210,
      mass: 0.82,
    }).start();
  }, [selectionBarProgress, selectionMode]);

  useEffect(() => {
    if (selectedJobId && !selectedJob) {
      setSelectedJobId(null);
    }
  }, [selectedJob, selectedJobId]);

  const onBack = () => {
    goBackOrReplace(router, { pathname: '/(tabs)/klijenti' as any });
  };

  const onDelete = () => {
    if (!userId || !id) return;
    Alert.alert(t('clients.deleteConfirmTitle'), t('clients.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('clients.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteClient(userId, id);
            router.replace({ pathname: '/(tabs)/klijenti' as any });
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  const onEdit = () => {
    if (!id) return;
    router.push({ pathname: '/(tabs)/klijent/[id]/edit' as any, params: { id, source: 'client-detail' } });
  };

  const onNewJob = () => {
    if (!id) return;
    router.push({ pathname: '/(tabs)/posao/new' as any, params: { clientId: id } });
  };

  const onOpenMap = () => {
    const address = client?.address?.trim();
    if (!address) {
      Alert.alert(t('clients.noAddressTitle'), t('clients.noAddressBody'));
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    void Linking.openURL(url);
  };

  const openJob = useCallback(
    (jobId: string) => {
      router.push({ pathname: '/(tabs)/posao/[id]' as any, params: { id: jobId } });
    },
    [router]
  );

  const toggleSelectedJob = useCallback((jobId: string) => {
    triggerSelectionHaptic();
    setSelectedJobId((current) => (current === jobId ? null : jobId));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedJobId(null);
  }, []);

  const onChargeSelected = useCallback(() => {
    if (!selectedJob || !id) return;
    const jobId = selectedJob.id;
    clearSelection();
    router.push({
      pathname: '/(tabs)/posao/[id]/payment/new' as any,
      params: { id: jobId, returnTo: 'client', clientId: id },
    });
  }, [clearSelection, id, router, selectedJob]);

  const onFinishSelected = useCallback(() => {
    if (!userId || !selectedJob) return;

    const previousClient = client;
    const today = formatDateInput(new Date());
    const jobId = selectedJob.id;
    setClient((current) =>
      current
        ? {
            ...current,
            jobs: current.jobs.map((job) =>
              job.id === jobId ? { ...job, status: 'done', completed_at: job.completed_at ?? today } : job
            ),
          }
        : current
    );
    clearSelection();

    void (async () => {
      try {
        await cancelJobReminder(jobId);
        await updateJobStatus(userId, jobId, 'done');
        await load();
      } catch (e: unknown) {
        setClient(previousClient);
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [clearSelection, client, formatDateInput, load, selectedJob, userId]);

  const onDeleteSelected = useCallback(() => {
    if (!userId || !selectedJob) return;
    Alert.alert(t('jobs.deleteConfirmTitle'), t('jobs.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('jobs.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const previousClient = client;
            const jobId = selectedJob.id;
            setClient((current) =>
              current ? { ...current, jobs: current.jobs.filter((job) => job.id !== jobId) } : current
            );
            clearSelection();
            try {
              await cancelJobReminder(jobId);
              await clearJobReminderPreference(jobId);
              await deleteJob(userId, jobId);
              await load();
            } catch (e: unknown) {
              setClient(previousClient);
              setError(e instanceof Error ? e.message : String(e));
            }
          })();
        },
      },
    ]);
  }, [clearSelection, client, load, selectedJob, t, userId]);

  const clientMetaText = useMemo(() => {
    if (client?.phone && client?.address) return `${client.phone} • ${client.address}`;
    if (client?.phone) return client.phone;
    if (client?.address) return client.address;
    return t('clients.noContactInfo');
  }, [client?.address, client?.phone, t]);

  const sectionSeparatorColor = colorScheme === 'dark' ? 'rgba(84,84,88,0.38)' : 'rgba(60,60,67,0.14)';
  const primaryActionColor = colorScheme === 'dark' ? '#0A84FF' : '#1C60C3';

  const renderSectionHeader = (title: string) => (
    <View className="mt-5">
      <View className="px-1">
        <Text
          className="text-app-row-title font-semibold"
          style={{ color: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3' }}>
          {title}
        </Text>
      </View>
      <View className="mt-2 h-px" style={{ backgroundColor: sectionSeparatorColor }} />
    </View>
  );

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-[#1D2229]">
      <CollapsingMainHeader
        title={client?.name || t('tabs.clients')}
        iconName="person-outline"
        scrollY={scrollY}
        left={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={onBack}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center">
            <Ionicons name="chevron-back" size={25} color="#717983" />
          </Pressable>
        }
        right={
          <HeaderOverflowMenu
            accessibilityLabel={t('common.more')}
            actions={[
              { label: t('clients.newJob'), iconName: 'briefcase-outline', onPress: onNewJob },
              { label: t('clients.map'), iconName: 'map-outline', onPress: onOpenMap },
              { label: t('clients.edit'), iconName: 'create-outline', onPress: onEdit },
              { label: t('clients.delete'), iconName: 'trash-outline', onPress: onDelete, destructive: true },
            ]}
          />
        }
      />

      <Animated.ScrollView
        className="flex-1 bg-[#F2F2F7] dark:bg-[#1D2229]"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: quickFindSwipe.onScroll,
        })}
        {...quickFindSwipe.touchHandlers}
        refreshControl={quickFindSwipe.refreshControl}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 128 }}>
      <View className="px-6 pt-4">
        <MainScreenTitle
          title={client?.name || t('tabs.clients')}
          iconName="person-outline"
          scrollY={scrollY}
        />
        <Text className="-mt-4 mb-1 px-1 text-app-subtitle text-black/60 dark:text-white/70">
          {clientMetaText}
        </Text>
        {client?.note?.trim() ? (
          <View className="mt-2 px-1">
            <Text className="text-app-body italic text-black/80 dark:text-white/85">{client.note.trim()}</Text>
          </View>
        ) : null}
        {error ? <Text className="mb-3 text-app-meta text-red-600">{error}</Text> : null}

        {loading ? (
          <View className="items-center py-6">
            <ActivityIndicator />
          </View>
        ) : !client ? (
          <Text className="px-4 py-6 text-center text-app-meta-lg italic text-black/55 dark:text-white/60">
            {t('clients.emptyTitle')}
          </Text>
        ) : (
          <>
            {renderSectionHeader(t('clients.jobsCount'))}
            <View style={{ marginLeft: 12, marginTop: 8 }}>
              {sortedJobs.length === 0 ? (
                <Text className="px-4 py-3 text-center text-app-meta-lg italic text-black/55 dark:text-white/60">
                  {t('clients.noActiveJobs')}
                </Text>
              ) : (
                sortedJobs.map((job, index) => {
                  const paid = job.paid ?? 0;
                  const price = job.price ?? 0;
                  const debt = job.debt ?? Math.max(price - paid, 0);
                  const tip = Math.max(paid - price, 0);
                  const isPaidWithTip = paid > price;
                  const isPaidInFull = paid >= price;
                  const isCompleted = job.status === 'done';

                  return (
                    <View
                      key={job.id}
                      className={index > 0 ? 'mt-1' : ''}>
                      <ClientJobSwipeSelectRow
                        selected={selectedJobId === job.id}
                        selectionMode={selectionMode}
                        colorScheme={colorScheme}
                        subdued={isCompleted}
                        onOpen={() => openJob(job.id)}
                        onToggleSelected={() => toggleSelectedJob(job.id)}>
                        <View className="flex-row items-center justify-between">
                          <View className="mr-3 flex-1">
                            <Text className="text-app-row text-[#1C2745] dark:text-white" numberOfLines={1}>
                              {job.title || t('jobs.untitled')}
                            </Text>
                            <View style={{ marginTop: -1, flexDirection: 'row', alignItems: 'center' }}>
                              <Text className="text-app-meta-lg text-black/60 dark:text-white/70">
                                {formatDate(job.scheduled_date)}
                              </Text>
                              <Text className="mx-2 text-app-meta-lg text-black/25 dark:text-white/30">•</Text>
                              {isPaidWithTip ? (
                                <Text
                                  className="text-app-meta-lg text-[#2E9F5A] dark:text-[#5BC980]"
                                  numberOfLines={1}
                                  style={{ flexShrink: 1 }}>
                                  {t('clients.jobPaidWithTip', { tip: moneyFormatter.format(tip) })}
                                </Text>
                              ) : isPaidInFull ? (
                                <Text
                                  className="text-app-meta-lg text-[#2E9F5A] dark:text-[#5BC980]"
                                  numberOfLines={1}
                                  style={{ flexShrink: 1 }}>
                                  {t('clients.jobPaidFull')}
                                </Text>
                              ) : paid === 0 ? (
                                <Text
                                  className="text-app-meta-lg text-red-600 dark:text-red-400"
                                  numberOfLines={1}
                                  style={{ flexShrink: 1 }}>
                                  {t('clients.jobDebtAmount', { debt: moneyFormatter.format(debt) })}
                                </Text>
                              ) : (
                                <Text
                                  className="text-app-meta-lg text-red-600 dark:text-red-400"
                                  numberOfLines={1}
                                  style={{ flexShrink: 1 }}>
                                  {t('clients.jobRemainingAmount', { amount: moneyFormatter.format(debt) })}
                                </Text>
                              )}
                            </View>
                          </View>
                          <JobStatusText label={getStatusLabel(job.status)} status={job.status} />
                        </View>
                      </ClientJobSwipeSelectRow>
                    </View>
                  );
                })
              )}
            </View>

            {renderSectionHeader(t('clients.timelineTitle'))}
            <View style={{ marginLeft: 12, marginTop: 8 }}>
              {groupedTimeline.length === 0 ? (
                <Text className="px-4 py-3 text-center text-app-meta-lg italic text-black/55 dark:text-white/60">
                  {t('clients.timelineEmpty')}
                </Text>
              ) : (
                <View className="mt-3">
                {groupedTimeline.map((group, groupIndex) => (
                  <View
                    key={group.key}
                    className={groupIndex > 0 ? 'mt-5' : ''}>
                    <Text className="text-app-meta-lg font-semibold uppercase tracking-[0.6px] text-black/45 dark:text-white/55">
                      {group.label}
                    </Text>
                    <View className="mt-2">
                      {group.items.map((event, index) => (
                        <View
                          key={event.id}
                          className={[
                            'flex-row items-start justify-between pl-3',
                            index < group.items.length - 1 ? 'mb-3' : '',
                          ].join(' ')}>
                          <Pressable
                            onPress={() =>
                              router.push({ pathname: '/(tabs)/posao/[id]' as any, params: { id: event.jobId } })
                            }
                            className="mr-3 flex-1">
                            <View className="flex-row items-center">
                              {event.date ? (
                                <Text
                                  style={{
                                    marginRight: 5,
                                    color: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3',
                                    fontSize: 12,
                                  }}>
                                  {formatListDate(event.date)}
                                </Text>
                              ) : null}
                              <Text className="flex-1 text-app-meta-lg text-black/80 dark:text-white/85" numberOfLines={1}>
                                {event.type === 'payment'
                                  ? `${t('clients.timelinePayment')}: ${event.title}`
                                  : event.type === 'completed'
                                    ? `${t('clients.timelineJobCompleted')}: ${event.title}`
                                    : event.type === 'scheduled'
                                      ? `${t('clients.timelineJobScheduled')}: ${event.title}`
                                      : `${t('clients.timelineJobCreated')}: ${event.title}`}
                              </Text>
                            </View>
                            {event.note?.trim() ? (
                              <Text className="mt-0.5 text-app-meta-lg text-black/55 dark:text-white/65" numberOfLines={2}>
                                {event.note.trim()}
                              </Text>
                            ) : null}
                          </Pressable>
                          {event.type === 'payment' ? (
                            <Text className="pt-0.5 text-app-meta-lg text-black/70 dark:text-white/80">
                              {moneyFormatter.format(event.amount ?? 0)}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
                {timeline.length > visibleTimeline.length ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowAllActivities(true)}
                    style={{ alignSelf: 'flex-start', marginLeft: -12, marginTop: 12, paddingVertical: 4 }}>
                    <Text className="text-app-subtitle font-semibold" style={{ color: colors.secondaryText }}>
                      {t('clients.viewAllActivities')}
                    </Text>
                  </Pressable>
                ) : null}
                </View>
              )}
            </View>
          </>
        )}
      </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents={selectionMode ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: Math.max(insets.top + 8, 18),
          right: 20,
          zIndex: 70,
          elevation: 0,
          opacity: selectionBarProgress,
          transform: [
            {
              translateY: selectionBarProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            },
          ],
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={clearSelection}
          style={{
            minHeight: 38,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.68)',
            backgroundColor: primaryActionColor,
            shadowOpacity: 0,
            elevation: 0,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <Text className="text-app-subtitle font-semibold" style={{ color: '#FFFFFF' }}>
            {t('common.close')}
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        pointerEvents={selectionMode ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: Math.max(insets.bottom + 18, 24),
          zIndex: 60,
          elevation: 0,
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
        <View
          style={{
            minHeight: 48,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.24)',
            backgroundColor: 'rgba(56,64,76,0.9)',
            shadowOpacity: 0,
            elevation: 0,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <View className="flex-1 flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.charge')}
              onPress={onChargeSelected}
              className="min-h-[42px] flex-1 flex-row items-center justify-center rounded-full px-1">
              <Ionicons name="cash-outline" size={17} color="#FFFFFF" />
              <Text className="ml-1.5 text-app-row-lg font-semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                {t('jobs.charge')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.finish')}
              onPress={onFinishSelected}
              className="min-h-[42px] flex-1 flex-row items-center justify-center rounded-full px-1">
              <Ionicons name="checkmark-done-outline" size={17} color="#FFFFFF" />
              <Text className="ml-1.5 text-app-row-lg font-semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                {t('jobs.finish')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.deleteShort')}
              onPress={onDeleteSelected}
              className="min-h-[42px] flex-1 flex-row items-center justify-center rounded-full px-1">
              <Ionicons name="trash-outline" size={17} color="#FFFFFF" />
              <Text className="ml-1.5 text-app-row-lg font-semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                {t('jobs.deleteShort')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
