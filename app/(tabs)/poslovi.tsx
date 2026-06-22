import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Animated, Easing, Modal, PanResponder, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { CollapsingMainHeader, MainScreenTitle } from '@/components/CollapsingMainHeader';
import { EmptyState } from '@/components/EmptyState';
import { useQuickFindSwipeDown } from '@/components/useQuickFindSwipeDown';
import { useColorScheme } from '@/components/useColorScheme';
import { useMoneyFormatter } from '@/components/useMoneyFormatter';
import { parseDateInput } from '@/lib/date';
import { deleteJob, listJobs, updateJobScheduledDate, updateJobStatus, type JobListItem } from '@/lib/jobs';
import { setMainFloatingActionsHidden } from '@/lib/floating-actions-visibility';
import { goBackOrReplace } from '@/lib/navigation';
import { triggerSelectionHaptic } from '@/lib/haptics';
import {
  cancelJobReminder,
  clearJobReminderPreference,
  getJobReminderPreference,
  scheduleJobReminder,
} from '@/lib/notifications';
import { useAuth } from '@/providers/AuthProvider';

type SectionKey = 'active' | 'pending' | 'scheduled' | 'done' | 'archived';

type JobSwipeSelectRowProps = {
  item: JobListItem;
  selected: boolean;
  selectionMode: boolean;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
  pendingReasonColor: string;
  debtLabel: string;
  untitledLabel: string;
  noClientLabel: string;
  formatDate: (value: string | null) => string;
  formatPrice: (value: number | null) => string | null;
  onOpen: (item: JobListItem) => void;
  onToggleSelected: (item: JobListItem) => void;
};

const JOB_SELECT_SWIPE_THRESHOLD = 36;
const JOB_SELECT_SWIPE_MAX = 56;
const JOB_SELECT_GESTURE_START = 3;
const JOB_SELECT_HORIZONTAL_BIAS = 0.72;

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

function JobSwipeSelectRow({
  item,
  selected,
  selectionMode,
  colors,
  colorScheme,
  pendingReasonColor,
  debtLabel,
  untitledLabel,
  noClientLabel,
  formatDate,
  formatPrice,
  onOpen,
  onToggleSelected,
}: JobSwipeSelectRowProps) {
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
          gesture.dx < -JOB_SELECT_GESTURE_START &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * JOB_SELECT_HORIZONTAL_BIAS,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dx < -JOB_SELECT_GESTURE_START &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * JOB_SELECT_HORIZONTAL_BIAS,
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
            distance > JOB_SELECT_SWIPE_MAX
              ? -(JOB_SELECT_SWIPE_MAX + (distance - JOB_SELECT_SWIPE_MAX) * 0.18)
              : rawNext;
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldSelect = maxSwipeDistanceRef.current > JOB_SELECT_SWIPE_THRESHOLD || gesture.vx < -0.55;
          if (shouldSelect) {
            onToggleSelected(item);
          }
          resetSwipe();
        },
        onPanResponderTerminate: resetSwipe,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [item, onToggleSelected, resetSwipe, translateX]
  );

  const debt = item.debt > 0 ? formatPrice(item.debt) : null;
  const pendingReason = item.status === 'pending' ? item.pending_reason?.trim() : null;

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
    inputRange: [-JOB_SELECT_SWIPE_MAX, 0],
    outputRange: [0, 16],
    extrapolate: 'clamp',
  });
  const revealScale = translateX.interpolate({
    inputRange: [-JOB_SELECT_SWIPE_MAX, -16, 0],
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
          paddingVertical: 5,
          borderRadius: 12,
          backgroundColor: movingRowBackground,
          transform: [{ translateX }],
        }}>
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            if (suppressOpenRef.current) {
              suppressOpenRef.current = false;
              return;
            }
            onOpen(item);
          }}
          className="flex-1">
        <View className="flex-1 flex-row items-center">
        <View className="flex-1 pr-3">
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '400' }} numberOfLines={1}>
            {item.title || untitledLabel}
          </Text>
          <View style={{ marginTop: -1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
            <Text style={{ color: colors.secondaryText, fontSize: 12 }} numberOfLines={1}>
              {item.client?.name || noClientLabel}
            </Text>
            <Text style={{ marginHorizontal: 5, color: colors.secondaryText, fontSize: 12 }}>•</Text>
            <Text style={{ color: colors.secondaryText, fontSize: 12 }} numberOfLines={1}>
              {formatDate(item.scheduled_date)}
            </Text>
            {pendingReason ? (
              <>
                <Text style={{ marginHorizontal: 5, color: colors.secondaryText, fontSize: 12 }}>•</Text>
                <Text style={{ color: pendingReasonColor, fontSize: 12 }} numberOfLines={1}>
                  {pendingReason}
                </Text>
              </>
            ) : null}
          </View>
        </View>
        {debt ? (
          <View className="items-end">
            <Text style={{ color: colorScheme === 'dark' ? '#FF8A8A' : '#C84D4D', fontSize: 12 }} numberOfLines={1}>
              {debtLabel}
            </Text>
            <Text style={{ color: colorScheme === 'dark' ? '#FF8A8A' : '#C84D4D', fontSize: 13 }} numberOfLines={1}>
              {debt}
            </Text>
          </View>
        ) : null}
        </View>
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
            onPress={() => onToggleSelected(item)}
            hitSlop={8}
            className="items-end justify-center">
            <JobSelectionCircle selected={selected} colorScheme={colorScheme} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

function getSerbianPluralForm(count: number) {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'other';
}

function getJobSortTime(job: JobListItem) {
  const value = job.completed_at ?? job.scheduled_date ?? job.created_at;
  return parseDateInput(value)?.getTime() ?? new Date(value ?? 0).getTime();
}

export default function PosloviScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const quickFindSwipe = useQuickFindSwipeDown();
  const pendingReasonColor = colorScheme === 'dark' ? '#FFBF7A' : '#C26A1A';
  const secondaryLinkColor = colors.secondaryText;
  const primaryActionColor = colorScheme === 'dark' ? '#72A8FF' : '#1C60C3';
  const sectionSeparatorColor = colorScheme === 'dark' ? 'rgba(84,84,88,0.38)' : 'rgba(60,60,67,0.14)';
  const isDark = colorScheme === 'dark';
  const modalWidth = Math.max(280, Math.round(windowWidth * 0.8));
  const modalMaxHeight = Math.max(340, Math.min(500, Math.round(windowHeight * 0.72)));
  const modalBackgroundColor = isDark ? Colors.dark.menuSurface : '#FFFFFF';
  const modalBorderColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(60,60,67,0.12)';
  const modalBackdropColor = isDark ? 'rgba(0,0,0,0.42)' : 'rgba(16,24,40,0.22)';

  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<JobListItem[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [postponeJob, setPostponeJob] = useState<JobListItem | null>(null);
  const [postponeDraftDate, setPostponeDraftDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    active: false,
    pending: false,
    scheduled: false,
    done: false,
    archived: false,
  });

  const selectionMode = selectedJobIds.length > 0;
  const selectedJobIdSet = useMemo(() => new Set(selectedJobIds), [selectedJobIds]);
  const selectedJobs = useMemo(
    () => items.filter((item) => selectedJobIdSet.has(item.id)),
    [items, selectedJobIdSet]
  );
  const singleSelectedJob = selectedJobs.length === 1 ? selectedJobs[0] : null;
  const canUseSingleJobActions = Boolean(singleSelectedJob);
  const selectionBarProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setSelectedJobIds((current) => current.filter((jobId) => items.some((item) => item.id === jobId)));
  }, [items]);

  useEffect(() => {
    Animated.spring(selectionBarProgress, {
      toValue: selectionMode ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.82,
    }).start();
  }, [selectionBarProgress, selectionMode]);

  useEffect(() => {
    setMainFloatingActionsHidden(selectionMode);
    return () => setMainFloatingActionsHidden(false);
  }, [selectionMode]);

  useEffect(() => {
    if (
      params.filter === 'active' ||
      params.filter === 'pending' ||
      params.filter === 'scheduled' ||
      params.filter === 'done' ||
      params.filter === 'archived'
    ) {
      setExpandedSections((prev) => ({ ...prev, [params.filter as SectionKey]: true }));
    }
  }, [params.filter]);

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }),
    [locale]
  );

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listJobs(userId, { includeArchived: true });
      setItems(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => getJobSortTime(b) - getJobSortTime(a)),
    [items]
  );

  const sections = useMemo(
    () => [
      {
        key: 'active' as const,
        title: t('jobs.filters.active'),
        jobs: sortedItems.filter((job) => !job.archived_at && job.status === 'in_progress'),
      },
      {
        key: 'pending' as const,
        title: t('jobs.filters.pending'),
        jobs: sortedItems.filter((job) => !job.archived_at && job.status === 'pending'),
      },
      {
        key: 'scheduled' as const,
        title: t('jobs.filters.scheduled'),
        jobs: sortedItems.filter((job) => !job.archived_at && job.status === 'scheduled'),
      },
      {
        key: 'done' as const,
        title: t('jobs.filters.done'),
        jobs: sortedItems.filter((job) => !job.archived_at && job.status === 'done'),
      },
      {
        key: 'archived' as const,
        title: t('jobs.filters.archived'),
        jobs: sortedItems.filter((job) => Boolean(job.archived_at)),
      },
    ],
    [sortedItems, t]
  );

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return t('jobs.unscheduled');
      const parsed = parseDateInput(value);
      if (!parsed) return value;
      return dateFormatter.format(parsed);
    },
    [dateFormatter, t]
  );

  const formatDateInput = useCallback((date: Date) => {
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const shiftPostponeDraftDate = useCallback((days: number) => {
    setPostponeDraftDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + days);
      return next;
    });
  }, []);

  const moneyFormatter = useMoneyFormatter({ maximumFractionDigits: 0 });
  const formatPrice = useCallback(
    (value: number | null) => {
      if (value == null) return null;
      return moneyFormatter.format(value);
    },
    [moneyFormatter]
  );

  const formatJobsShortLabel = useCallback(
    (count: number) => {
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return `${count} ${t(`jobs.listShortForms.${form}`)}`;
      }
      return `${count} ${count === 1 ? t('jobs.listShortForms.one') : t('jobs.listShortForms.other')}`;
    },
    [i18n.language, t]
  );

  const formatActiveShortLabel = useCallback(
    (count: number) => {
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return `${count} ${t(`jobs.activeShortForms.${form}`)}`;
      }
      return `${count} ${count === 1 ? t('jobs.activeShortForms.one') : t('jobs.activeShortForms.other')}`;
    },
    [i18n.language, t]
  );

  const formatSeeMoreLabel = useCallback(
    (count: number) => {
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return t(`jobs.seeMoreForms.${form}`, { count });
      }
      return t(count === 1 ? 'jobs.seeMoreForms.one' : 'jobs.seeMoreForms.other', { count });
    },
    [i18n.language, t]
  );

  const formatShowAllLabel = useCallback(
    (count: number) => {
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return t(`jobs.showAllForms.${form}`, { count });
      }
      return t(count === 1 ? 'jobs.showAllForms.one' : 'jobs.showAllForms.other', { count });
    },
    [i18n.language, t]
  );

  const activeJobsCount = useMemo(
    () => items.filter((job) => !job.archived_at && job.status === 'in_progress').length,
    [items]
  );
  const jobsSubtitle = `${formatJobsShortLabel(items.filter((job) => !job.archived_at).length)} • ${formatActiveShortLabel(activeJobsCount)}`;
  const hasAnyJobs = sortedItems.length > 0;

  const openJob = useCallback(
    (item: JobListItem) => {
      router.push({ pathname: '/(tabs)/posao/[id]' as any, params: { id: item.id } });
    },
    [router]
  );

  const toggleSelectedJob = useCallback((item: JobListItem) => {
    triggerSelectionHaptic();
    setSelectedJobIds((current) =>
      current.includes(item.id) ? current.filter((jobId) => jobId !== item.id) : [...current, item.id]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedJobIds([]);
  }, []);

  const onFinishSelected = useCallback(() => {
    if (!userId || selectedJobs.length === 0) return;
    const previousItems = items;
    const selectedIds = new Set(selectedJobs.map((item) => item.id));
    const today = formatDateInput(new Date());
    setItems((current) =>
      current.map((item) =>
        selectedIds.has(item.id)
          ? { ...item, status: 'done', completed_at: item.completed_at ?? today }
          : item
      )
    );
    clearSelection();

    void (async () => {
      try {
        await Promise.all(
          selectedJobs.map(async (item) => {
            await cancelJobReminder(item.id);
            await updateJobStatus(userId, item.id, 'done');
          })
        );
        await load();
      } catch (e: unknown) {
        setItems(previousItems);
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [clearSelection, formatDateInput, items, load, selectedJobs, userId]);

  const closePostponePicker = useCallback(() => {
    setPostponeJob(null);
  }, []);

  const applyPostponeDate = useCallback(
    (job: JobListItem, date: Date) => {
      if (!userId) return;
      const nextDate = formatDateInput(date);
      const previousItems = items;
      setPostponeJob(null);
      setItems((current) =>
        current.map((item) => (item.id === job.id ? { ...item, scheduled_date: nextDate } : item))
      );
      clearSelection();

      void (async () => {
        try {
          await updateJobScheduledDate(userId, job.id, nextDate);
          if (job.status === 'scheduled') {
            const reminderType = await getJobReminderPreference(job.id);
            await scheduleJobReminder({
              jobId: job.id,
              title: job.title || t('jobs.untitled'),
              scheduledDate: nextDate,
              reminderType,
              clientName: job.client?.name ?? null,
            });
          }
          await load();
        } catch (e: unknown) {
          setItems(previousItems);
          setError(e instanceof Error ? e.message : String(e));
        }
      })();
    },
    [clearSelection, formatDateInput, items, load, t, userId]
  );

  const onPostponeSelected = useCallback(() => {
    if (!singleSelectedJob) return;
    const initialDate = parseDateInput(singleSelectedJob.scheduled_date) ?? new Date();
    setPostponeDraftDate(initialDate);
    setPostponeJob(singleSelectedJob);
  }, [singleSelectedJob]);

  const confirmPostponeDate = useCallback(() => {
      const job = postponeJob;
      if (!job) return;
      applyPostponeDate(job, postponeDraftDate);
    },
    [applyPostponeDate, postponeDraftDate, postponeJob]
  );

  const onDeleteSelected = useCallback(() => {
    if (!userId || selectedJobs.length === 0) return;
    Alert.alert(t('jobs.deleteConfirmTitle'), t('jobs.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('jobs.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const previousItems = items;
            const selectedIds = new Set(selectedJobs.map((item) => item.id));
            setItems((current) => current.filter((item) => !selectedIds.has(item.id)));
            clearSelection();
            try {
              await Promise.all(
                selectedJobs.map(async (item) => {
                  await cancelJobReminder(item.id);
                  await clearJobReminderPreference(item.id);
                  await deleteJob(userId, item.id);
                })
              );
              await load();
            } catch (e: unknown) {
              setItems(previousItems);
              setError(e instanceof Error ? e.message : String(e));
            }
          })();
        },
      },
    ]);
  }, [clearSelection, items, load, selectedJobs, t, userId]);

  const renderJobRow = (item: JobListItem) => (
    <JobSwipeSelectRow
      key={item.id}
      item={item}
      selected={selectedJobIdSet.has(item.id)}
      selectionMode={selectionMode}
      colors={colors}
      colorScheme={colorScheme}
      pendingReasonColor={pendingReasonColor}
      debtLabel={t('jobs.debtLabel')}
      untitledLabel={t('jobs.untitled')}
      noClientLabel={t('jobs.noClient')}
      formatDate={formatDate}
      formatPrice={formatPrice}
      onOpen={openJob}
      onToggleSelected={toggleSelectedJob}
    />
  );

  const renderSection = (section: (typeof sections)[number]) => {
    const expanded = expandedSections[section.key];
    const summaryOnly = section.key === 'done' || section.key === 'archived';
    const visibleJobs = expanded ? section.jobs : summaryOnly ? [] : section.jobs.slice(0, 3);
    const remainingCount = Math.max(section.jobs.length - visibleJobs.length, 0);

    return (
      <View key={section.key} style={{ marginBottom: 22 }}>
        <Text
          className="text-app-row-title font-semibold"
          style={{ color: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3' }}>
          {section.title}
        </Text>
        <View
          className="mt-2 h-px"
          style={{ backgroundColor: sectionSeparatorColor }}
        />
        <View style={{ marginLeft: 12, marginTop: 8 }}>
          {visibleJobs.length > 0 ? (
            visibleJobs.map((item) => renderJobRow(item))
          ) : (
            <View className="h-0" />
          )}
          {remainingCount > 0 || (summaryOnly && expanded && section.jobs.length > 0) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setExpandedSections((prev) => ({
                  ...prev,
                  [section.key]: summaryOnly ? !prev[section.key] : true,
                }))
              }
              className="self-start py-2">
              <Text className="text-app-subtitle font-semibold" style={{ color: secondaryLinkColor }}>
                {summaryOnly && expanded
                  ? t('jobs.hideList')
                  : summaryOnly
                    ? formatShowAllLabel(remainingCount)
                    : formatSeeMoreLabel(remainingCount)}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <CollapsingMainHeader
        title={t('tabs.jobs')}
        iconName="briefcase-outline"
        scrollY={scrollY}
        left={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => goBackOrReplace(router, '/(tabs)' as any)}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center">
            <Ionicons name="chevron-back" size={25} color="#717983" />
          </Pressable>
        }
        right={
          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.calendarTitle')}
              onPress={() => router.push('/(tabs)/posao/kalendar')}
              className="mr-3 h-10 w-10 items-center justify-center">
              <Ionicons name="calendar-outline" size={18} color="#717983" />
            </Pressable>
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
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: quickFindSwipe.onScroll }
        )}
        {...quickFindSwipe.touchHandlers}
        refreshControl={quickFindSwipe.refreshControl}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 112 }}>
        <MainScreenTitle title={t('tabs.jobs')} iconName="briefcase-outline" scrollY={scrollY} />
        <Text className="-mt-4 mb-4 text-app-subtitle text-black/60 dark:text-white/70">
          {jobsSubtitle}
        </Text>

        {error ? <Text className="mt-3 text-app-meta text-red-600">{error}</Text> : null}

        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator />
          </View>
        ) : (
          <View className="mt-6">
            {sections.map(renderSection)}
            {!hasAnyJobs ? (
              <View className="mt-3">
                <EmptyState title={t('jobs.emptyTitle')} body={t('jobs.emptyBody')} />
              </View>
            ) : null}
          </View>
        )}
      </Animated.ScrollView>

      <Modal
        visible={Boolean(postponeJob)}
        transparent
        animationType="fade"
        onRequestClose={closePostponePicker}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: modalBackdropColor,
          }}>
          <Pressable onPress={closePostponePicker} className="absolute inset-0" />
          <View
            style={{
              width: modalWidth,
              maxHeight: modalMaxHeight,
              borderRadius: 30,
              borderWidth: 1,
              borderColor: modalBorderColor,
              overflow: 'hidden',
              backgroundColor: modalBackgroundColor,
            }}>
            <View style={{ height: 64, backgroundColor: modalBackgroundColor }}>
              <View className="h-full flex-row items-center justify-between px-4">
                <View className="h-9 w-9" />
                <Text className="flex-1 text-center text-app-row-title font-semibold" style={{ color: colors.text }} numberOfLines={1}>
                  {t('jobs.postpone')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  onPress={closePostponePicker}
                  hitSlop={8}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)' }}>
                  <Ionicons name="close" size={19} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <View className="px-4 pb-5">
              <Text className="mb-4 text-center text-app-row" style={{ color: colors.secondaryText }} numberOfLines={1}>
                {postponeJob?.title || t('jobs.untitled')}
              </Text>
              <View className="overflow-hidden rounded-[16px]" style={{ backgroundColor: isDark ? colors.elevatedSurface : '#F2F4F7' }}>
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={postponeDraftDate}
                    mode="date"
                    display="inline"
                    onChange={(event, selectedDate) => {
                      if (event.type === 'dismissed') {
                        closePostponePicker();
                        return;
                      }
                      if (selectedDate) {
                        setPostponeDraftDate(selectedDate);
                      }
                    }}
                  />
                ) : (
                  <View className="px-3 py-4">
                    <View className="flex-row items-center justify-between">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('jobs.previousWeek')}
                        onPress={() => shiftPostponeDraftDate(-7)}
                        className="h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: modalBackgroundColor }}>
                        <Text className="text-app-meta font-semibold" style={{ color: colors.text }}>
                          -7
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('jobs.previousDay')}
                        onPress={() => shiftPostponeDraftDate(-1)}
                        className="h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: modalBackgroundColor }}>
                        <Ionicons name="chevron-back" size={18} color={colors.text} />
                      </Pressable>
                      <View className="mx-2 flex-1 items-center">
                        <Text className="text-center text-app-row-title font-semibold" style={{ color: colors.text }}>
                          {dateFormatter.format(postponeDraftDate)}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('jobs.nextDay')}
                        onPress={() => shiftPostponeDraftDate(1)}
                        className="h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: modalBackgroundColor }}>
                        <Ionicons name="chevron-forward" size={18} color={colors.text} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('jobs.nextWeek')}
                        onPress={() => shiftPostponeDraftDate(7)}
                        className="h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: modalBackgroundColor }}>
                        <Text className="text-app-meta font-semibold" style={{ color: colors.text }}>
                          +7
                        </Text>
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('jobs.today')}
                      onPress={() => setPostponeDraftDate(new Date())}
                      className="mt-4 min-h-[38px] items-center justify-center rounded-[16px]"
                      style={{ backgroundColor: modalBackgroundColor }}>
                      <Text className="text-app-row font-medium" style={{ color: colors.text }}>
                        {t('jobs.today')}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            <View className="mt-4 flex-row items-center justify-end">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                onPress={closePostponePicker}
                className="min-h-[38px] justify-center rounded-[16px] px-4"
                style={{ backgroundColor: isDark ? colors.elevatedSurface : '#F2F4F7' }}>
                <Text className="text-app-row font-medium" style={{ color: colors.text }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.save')}
                onPress={confirmPostponeDate}
                className="ml-2 min-h-[38px] justify-center rounded-[16px] px-5"
                style={{ backgroundColor: primaryActionColor }}>
                <Text className="text-app-row font-medium" style={{ color: '#FFFFFF' }}>
                  {t('common.save')}
                </Text>
              </Pressable>
            </View>
            </View>
          </View>
        </View>
      </Modal>

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
              accessibilityLabel={t('jobs.postpone')}
              disabled={!canUseSingleJobActions}
              onPress={onPostponeSelected}
              className="min-h-[42px] flex-1 flex-row items-center justify-center rounded-full px-1 disabled:opacity-35">
              <Ionicons name="time-outline" size={17} color="#FFFFFF" />
              <Text className="ml-1.5 text-app-row-lg font-semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                {t('jobs.postpone')}
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
