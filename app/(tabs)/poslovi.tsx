import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { MascotEmptyState } from '@/components/MascotEmptyState';
import { LargeHeader } from '@/components/LargeHeader';
import { AppSearchInput } from '@/components/AppSearchInput';
import { useColorScheme } from '@/components/useColorScheme';
import { parseDateInput } from '@/lib/date';
import { listJobs, updateJobStatus, type JobListItem } from '@/lib/jobs';
import { cancelJobReminder, getJobReminderPreference, scheduleJobReminder } from '@/lib/notifications';
import { useAuth } from '@/providers/AuthProvider';

function getSerbianPluralForm(count: number) {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'other';
}

export default function PosloviScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<JobListItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'scheduled' | 'archived'>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const [listContentHeight, setListContentHeight] = useState(0);
  const [listCanScroll, setListCanScroll] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const segmentTranslateX = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const nextFilter = params.filter;
    if (
      nextFilter === 'all' ||
      nextFilter === 'active' ||
      nextFilter === 'done' ||
      nextFilter === 'scheduled' ||
      nextFilter === 'archived'
    ) {
      setFilter(nextFilter);
    }
  }, [params.filter]);

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = items.filter((job) => {
      if (filter === 'archived') {
        if (!job.archived_at) return false;
      } else if (job.archived_at) {
        return false;
      }
      if (filter === 'active' && job.status !== 'in_progress') return false;
      if (filter === 'done' && job.status !== 'done') return false;
      if (filter === 'scheduled' && job.status !== 'scheduled') return false;
      if (!q) return true;
      const title = (job.title ?? '').toLowerCase();
      const description = (job.description ?? '').toLowerCase();
      const status = (job.status ?? '').toLowerCase();
      const clientName = (job.client?.name ?? '').toLowerCase();
      return title.includes(q) || description.includes(q) || status.includes(q) || clientName.includes(q);
    });
    return result.sort((a, b) => {
      const aTime = new Date(a.created_at ?? 0).getTime();
      const bTime = new Date(b.created_at ?? 0).getTime();
      return bTime - aTime;
    });
  }, [items, query, filter]);

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return t('jobs.unscheduled');
      const parsed = parseDateInput(value);
      if (!parsed) return value;
      return dateFormatter.format(parsed);
    },
    [dateFormatter, t]
  );

  const formatStatus = useCallback(
    (value: string | null) => {
      if (!value) return t('jobs.statusUnknown');
      if (value === 'scheduled') return t('jobs.statuses.scheduled');
      if (value === 'in_progress') return t('jobs.statuses.inProgress');
      if (value === 'done') return t('jobs.statuses.done');
      return value.replace(/_/g, ' ');
    },
    [t]
  );

  const getStatusChipStyle = useCallback((value: string | null) => {
    if (value === 'scheduled') {
      return {
        bg: 'border border-[#1C4FD7]/25 bg-transparent dark:border-[#8FB2FF]/35',
        text: 'text-[#1C4FD7] dark:text-[#8FB2FF]',
      };
    }
    if (value === 'in_progress') {
      return {
        bg: 'border border-[#B65B00]/25 bg-transparent dark:border-[#FFB067]/35',
        text: 'text-[#B65B00] dark:text-[#FFB067]',
      };
    }
    if (value === 'done') {
      return {
        bg: 'border border-[#1F7A4D]/25 bg-transparent dark:border-[#79D39A]/35',
        text: 'text-[#1F7A4D] dark:text-[#79D39A]',
      };
    }
    return {
      bg: 'border border-black/10 bg-transparent dark:border-white/12',
      text: 'text-black/60 dark:text-white/70',
    };
  }, []);

  const nextStatus = useCallback((value: string | null) => {
    if (value === 'scheduled') return 'in_progress';
    if (value === 'in_progress') return 'done';
    return 'scheduled';
  }, []);

  const onToggleStatus = useCallback(
    async (job: JobListItem) => {
      if (!userId) return;
      const next = nextStatus(job.status);
      setItems((prev) =>
        prev.map((item) => (item.id === job.id ? { ...item, status: next } : item))
      );
      try {
        await updateJobStatus(userId, job.id, next);
        if (next === 'scheduled' && job.scheduled_date) {
          const reminderType = await getJobReminderPreference(job.id);
          await scheduleJobReminder({
            jobId: job.id,
            title: job.title || t('jobs.untitled'),
            scheduledDate: job.scheduled_date,
            reminderType,
            clientName: job.client?.name ?? null,
          });
        } else {
          await cancelJobReminder(job.id);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        setItems((prev) =>
          prev.map((item) => (item.id === job.id ? { ...item, status: job.status } : item))
        );
      }
    },
    [nextStatus, t, userId]
  );

  const formatPrice = useCallback(
    (value: number | null) => {
      if (value == null) return null;
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(value);
    },
    [locale]
  );

  const onAdd = () => {
    router.push({ pathname: '/(tabs)/posao/new' as any });
  };

  const activeJobsCount = useMemo(
    () => items.filter((job) => !job.archived_at && job.status === 'in_progress').length,
    [items]
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
  const jobsSubtitle = `${formatJobsShortLabel(items.filter((job) => !job.archived_at).length)} • ${formatActiveShortLabel(activeJobsCount)}`;

  const jobFilters = useMemo(
    () => [
      { key: 'all' as const, label: t('jobs.filters.all') },
      { key: 'active' as const, label: t('jobs.filters.active') },
      { key: 'done' as const, label: t('jobs.filters.done') },
      { key: 'scheduled' as const, label: t('jobs.filters.scheduled') },
    ],
    [t]
  );

  const activeFilterIndex = Math.max(
    0,
    jobFilters.findIndex((chip) => chip.key === filter)
  );

  useEffect(() => {
    if (!segmentWidth) return;
    Animated.timing(segmentTranslateX, {
      toValue: activeFilterIndex * segmentWidth,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [activeFilterIndex, segmentTranslateX, segmentWidth]);

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
      <LargeHeader
        title={t('tabs.jobs')}
        subtitle={jobsSubtitle}
        right={
          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.filters.archived')}
              onPress={() => setFilter('archived')}
              className={[
                'mr-3 h-10 w-10 items-center justify-center rounded-3xl border',
                filter === 'archived'
                  ? 'border-[#007AFF] bg-[#E8F0FF] dark:border-[#0A84FF] dark:bg-[#1E2A44]'
                  : 'border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70',
              ].join(' ')}>
              <Ionicons name="archive-outline" size={18} color={filter === 'archived' ? '#007AFF' : colors.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.calendarTitle')}
              onPress={() => router.push('/(tabs)/posao/kalendar')}
              className="mr-3 h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.add')}
              onPress={onAdd}
              className="mr-3 h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
              <Ionicons name="add" size={22} color={colors.text} />
            </Pressable>
          </View>
        }
      />

      <View className="flex-1 px-6 pt-3">
        <AppSearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('jobs.searchPlaceholder')}
        />

        <View
          className="mt-3 flex-row rounded-[18px] p-0.5"
          style={{ backgroundColor: colorScheme === 'dark' ? '#141416' : '#ECECF0' }}>
          {segmentWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 2,
                bottom: 2,
                left: 2,
                width: segmentWidth,
                borderRadius: 14,
                backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
                shadowColor: '#000000',
                shadowOpacity: colorScheme === 'dark' ? 0.18 : 0.08,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
                transform: [{ translateX: segmentTranslateX }],
              }}
            />
          ) : null}
          {jobFilters.map((chip) => {
            const selected = filter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setFilter(chip.key)}
                className="flex-1 rounded-[14px] px-3 py-2"
                onLayout={(event) => {
                  const width = event.nativeEvent.layout.width;
                  if (!segmentWidth && width > 0) {
                    setSegmentWidth(width);
                  }
                }}>
                <Text
                  className={selected ? 'text-app-meta-lg font-semibold' : 'text-app-meta-lg'}
                  style={{
                    textAlign: 'center',
                    color: selected
                      ? colors.text
                      : colorScheme === 'dark'
                        ? 'rgba(255,255,255,0.68)'
                        : 'rgba(0,0,0,0.58)',
                  }}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text className="mt-3 text-app-meta text-red-600">{error}</Text> : null}

        <View
          className="mt-4 flex-1 overflow-hidden rounded-[24px]"
          style={{
            backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
            marginBottom: Math.max(insets.bottom, 12) + 96,
          }}>
          {loading ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              className="flex-1"
              data={filtered}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 80 }}
              onLayout={(event) => {
                const visibleHeight = event.nativeEvent.layout.height;
                setListViewportHeight(visibleHeight);
                const canScroll = listContentHeight > visibleHeight + 92;
                setListCanScroll(canScroll);
                setShowScrollHint(canScroll);
              }}
              onContentSizeChange={(_, contentHeight) => {
                setListContentHeight(contentHeight);
                const canScroll = contentHeight > listViewportHeight + 92;
                setListCanScroll(canScroll);
                setShowScrollHint(canScroll);
              }}
              onScroll={(event) => {
                const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                const remaining = contentSize.height - (contentOffset.y + layoutMeasurement.height);
                const canScroll = contentSize.height > layoutMeasurement.height + 92;
                setListCanScroll(canScroll);
                setShowScrollHint(canScroll && remaining > 92);
              }}
              scrollEventThrottle={16}
              ListEmptyComponent={() => (
                <MascotEmptyState
                  title={filter === 'archived' ? t('jobs.emptyArchivedTitle') : t('jobs.emptyTitle')}
                  body={filter === 'archived' ? t('jobs.emptyArchivedBody') : t('jobs.emptyBody')}
                  actionLabel={filter === 'archived' ? undefined : t('jobs.add')}
                  onAction={filter === 'archived' ? undefined : onAdd}
                  imageSize={164}
                  compact
                  centeredAction={filter !== 'archived'}
                />
              )}
              ListHeaderComponent={filtered.length > 0 ? <View className="h-3" /> : null}
              ListFooterComponent={filtered.length > 0 ? <View className="h-3" /> : null}
              renderItem={({ item, index }) => {
                const price = formatPrice(item.price);
                const isArchived = Boolean(item.archived_at);
                return (
                  <Pressable
                    onPress={() => router.push({ pathname: '/(tabs)/posao/[id]' as any, params: { id: item.id } })}
                    className="bg-white px-4 py-4 dark:bg-[#1C1C1E]"
                    style={{
                      borderTopWidth: index > 0 ? 1 : 0,
                      borderTopColor: 'transparent',
                    }}>
                    <View>
                      {index > 0 ? (
                        <View
                          style={{
                            position: 'absolute',
                            top: -16,
                            left: 4,
                            right: 4,
                            height: 1,
                            backgroundColor:
                              colorScheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(60,60,67,0.08)',
                          }}
                        />
                      ) : null}

                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <View className="flex-row items-center">
                        {isArchived ? (
                          <View className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-[#F1F4FB] dark:bg-white/10">
                            <Ionicons name="archive-outline" size={14} color={colors.secondaryText} />
                          </View>
                        ) : null}
                        <Text className="flex-1 text-app-row-lg font-bold text-[#1C2745] dark:text-white" numberOfLines={1}>
                          {item.title || t('jobs.untitled')}
                        </Text>
                        </View>

                        <View className="mt-0.5 flex-row items-center">
                          <Text className="text-app-meta-lg text-black/60 dark:text-white/70" numberOfLines={1}>
                            {formatDate(item.scheduled_date)}
                          </Text>
                          <Text className="mx-2 text-black/35 dark:text-white/35">•</Text>
                          <Text className="flex-1 text-app-meta-lg text-black/60 dark:text-white/70" numberOfLines={1}>
                            {item.client?.name || t('jobs.noClient')}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Pressable
                          onPress={(event) => {
                            event.stopPropagation();
                            if (isArchived) return;
                            void onToggleStatus(item);
                          }}
                          disabled={isArchived}
                          className={[
                            'rounded-full px-3 py-1',
                            isArchived ? 'border border-black/10 bg-transparent dark:border-white/12' : getStatusChipStyle(item.status).bg,
                          ].join(' ')}>
                          <Text
                            className={[
                              'text-app-meta font-semibold',
                              isArchived ? 'text-[#6C789A] dark:text-white/70' : getStatusChipStyle(item.status).text,
                            ].join(' ')}>
                            {isArchived ? t('jobs.archived') : formatStatus(item.status)}
                          </Text>
                        </Pressable>
                        {price ? (
                          <Text className="mt-1 text-app-meta-lg font-semibold text-black dark:text-white" numberOfLines={1}>
                            {price}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {item.description ? (
                      <View className="mt-1">
                        <Text
                          className="text-app-meta-lg text-black/55 dark:text-white/65"
                          numberOfLines={2}>
                          {item.description}
                        </Text>
                      </View>
                    ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
          {!loading && listCanScroll && showScrollHint ? (
            <>
              <LinearGradient
                pointerEvents="none"
                colors={
                  colorScheme === 'dark'
                    ? (['rgba(28,28,30,0)', 'rgba(28,28,30,0.78)', 'rgba(28,28,30,0.98)'] as const)
                    : (['rgba(255,255,255,0)', 'rgba(255,255,255,0.78)', 'rgba(255,255,255,0.98)'] as const)
                }
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 46,
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 8,
                  alignItems: 'center',
                }}>
                <View
                  className="h-6 w-6 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(60,60,67,0.08)',
                  }}>
                  <Ionicons name="chevron-down" size={14} color={colors.secondaryText} />
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}
