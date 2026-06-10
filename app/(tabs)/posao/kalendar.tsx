import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Pressable, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { CollapsingMainHeader, MainScreenTitle } from '@/components/CollapsingMainHeader';
import { JobStatusText } from '@/components/JobStatusText';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { useColorScheme } from '@/components/useColorScheme';
import { parseDateInput } from '@/lib/date';
import { listJobs, type JobListItem } from '@/lib/jobs';
import { goBackOrReplace } from '@/lib/navigation';
import { useAuth } from '@/providers/AuthProvider';

const toDateKey = (date: Date) => {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
type CalendarDayCell = { key: string; date: Date | null };

export default function JobsCalendarScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const scrollY = useRef(new Animated.Value(0)).current;
  const userId = session?.user?.id ?? null;
  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const sectionSeparatorColor = colorScheme === 'dark' ? 'rgba(84,84,88,0.38)' : 'rgba(60,60,67,0.14)';

  const today = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(today));
  const [items, setItems] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    [locale]
  );
  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }),
    [locale]
  );
  const weekdayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    [locale]
  );

  const weekdayLabels = useMemo(() => {
    const monday = new Date(Date.UTC(2026, 2, 2));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + index);
      const label = weekdayFormatter.format(date);
      return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '');
    });
  }, [weekdayFormatter]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listJobs(userId);
      setItems(data.filter((job) => Boolean(job.scheduled_date)));
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

  const jobsByDate = useMemo(() => {
    const map = new Map<string, JobListItem[]>();
    items.forEach((job) => {
      const key = job.scheduled_date?.slice(0, 10);
      if (!key) return;
      const existing = map.get(key) ?? [];
      existing.push(job);
      map.set(key, existing);
    });
    map.forEach((value) => {
      value.sort((a, b) => {
        const aTime = parseDateInput(a.scheduled_date)?.getTime() ?? 0;
        const bTime = parseDateInput(b.scheduled_date)?.getTime() ?? 0;
        return aTime - bTime;
      });
    });
    return map;
  }, [items]);

  const selectedDayJobs = useMemo(() => jobsByDate.get(selectedDate) ?? [], [jobsByDate, selectedDate]);

  const monthLabel = useMemo(() => {
    const label = monthFormatter.format(monthCursor);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [monthCursor, monthFormatter]);

  const selectedDateLabel = useMemo(() => {
    const parsed = parseDateInput(selectedDate);
    if (!parsed) return selectedDate;
    return dayFormatter.format(parsed);
  }, [dayFormatter, selectedDate]);

  const canScheduleSelectedDate = useMemo(() => {
    const parsed = parseDateInput(selectedDate);
    if (!parsed) return false;
    const selected = new Date(parsed);
    selected.setHours(0, 0, 0, 0);
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    return selected.getTime() >= current.getTime();
  }, [selectedDate]);

  const weeks = useMemo(() => {
    const first = startOfMonth(monthCursor);
    const firstWeekday = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
    const days: CalendarDayCell[] = [];

    for (let index = 0; index < firstWeekday; index += 1) {
      days.push({ key: `empty-${index}`, date: null });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
      days.push({ key: toDateKey(date), date });
    }

    while (days.length % 7 !== 0) {
      days.push({ key: `tail-${days.length}`, date: null });
    }

    const result: CalendarDayCell[][] = [];
    for (let index = 0; index < days.length; index += 7) {
      result.push(days.slice(index, index + 7));
    }

    return result;
  }, [monthCursor]);

  const onBack = () => {
    goBackOrReplace(router, { pathname: '/(tabs)/poslovi' as any });
  };

  const shiftMonth = (offset: number) => {
    const next = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1);
    setMonthCursor(next);
    const sameMonthSelected =
      parseDateInput(selectedDate)?.getFullYear() === next.getFullYear() &&
      parseDateInput(selectedDate)?.getMonth() === next.getMonth();
    if (!sameMonthSelected) {
      setSelectedDate(toDateKey(next));
    }
  };

  const onScheduleForSelectedDay = () => {
    router.push({ pathname: '/(tabs)/posao/new' as any, params: { scheduledDate: selectedDate } });
  };

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-[#1D2229]">
      <CollapsingMainHeader
        title={t('jobs.calendarTitle')}
        iconName="calendar-outline"
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('jobs.add')}
            onPress={onScheduleForSelectedDay}
            disabled={!canScheduleSelectedDate}
            className="h-10 items-center justify-center rounded-3xl bg-[#007AFF] px-4 disabled:opacity-50 dark:bg-[#0A84FF]">
            <Text className="text-app-meta-lg font-semibold text-white">
              {t('jobs.calendarScheduleCta')}
            </Text>
          </Pressable>
        }
      />

      <Animated.ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 112 }}>
        <MainScreenTitle title={t('jobs.calendarTitle')} iconName="calendar-outline" scrollY={scrollY} />
        <Text className="-mt-4 mb-4 text-app-subtitle text-black/60 dark:text-white/70">
          {t('jobs.calendarSubtitle')}
        </Text>
        <SyncStatusIndicator />
        {error ? <Text className="mb-3 text-app-meta text-red-600">{error}</Text> : null}

        <View className="mt-5 flex-row items-center justify-between">
            <Pressable
              onPress={() => shiftMonth(-1)}
              className="h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
            <Text
              className="text-app-row-title font-semibold capitalize"
              style={{ color: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3' }}>
              {monthLabel}
            </Text>
            <Pressable
              onPress={() => shiftMonth(1)}
              className="h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
        </View>
        <View className="mt-2 h-px" style={{ backgroundColor: sectionSeparatorColor }} />

          <View className="mt-4 flex-row justify-between">
            {weekdayLabels.map((label) => (
              <View key={label} className="w-[13.5%] items-center">
                <Text className="text-app-meta font-semibold uppercase text-black/45 dark:text-white/50">{label}</Text>
              </View>
            ))}
          </View>

          <View className="mt-3">
            {weeks.map((week, weekIndex) => {
              const isLastWeek = weekIndex === weeks.length - 1;

              return (
                <View key={`week-${weekIndex}`} className="flex-row justify-between" style={{ marginBottom: isLastWeek ? 0 : 8 }}>
                  {week.map((entry) => {
                    if (!entry.date) {
                      return <View key={entry.key} style={{ width: '13.5%', aspectRatio: 1 }} />;
                    }

                    const key = toDateKey(entry.date);
                    const jobsForDay = jobsByDate.get(key) ?? [];
                    const isSelected = selectedDate === key;
                    const isToday = toDateKey(today) === key;

                    return (
                      <Pressable
                        key={entry.key}
                        onPress={() => setSelectedDate(key)}
                        style={{
                          width: '13.5%',
                          aspectRatio: 1,
                          borderRadius: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected ? '#007AFF' : isToday ? (colorScheme === 'dark' ? '#1E2A44' : '#EAF1FF') : 'transparent',
                          borderWidth: isSelected || isToday || jobsForDay.length ? 1 : 0,
                          borderColor: isSelected
                            ? '#007AFF'
                            : isToday
                              ? colorScheme === 'dark'
                                ? 'rgba(255,255,255,0.1)'
                                : 'rgba(0,122,255,0.15)'
                              : '#4A7BE7',
                        }}>
                        <Text
                          style={{
                            color: isSelected ? '#FFFFFF' : colors.text,
                            fontSize: 14,
                            fontWeight: isSelected || isToday ? '600' : '500',
                          }}>
                          {entry.date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </View>

        <Text
          className="mt-8 text-app-row-title font-semibold"
          style={{ color: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3' }}>
          {t('jobs.calendarDaySection', { date: selectedDateLabel })}
        </Text>
        <View className="mt-2 h-px" style={{ backgroundColor: sectionSeparatorColor }} />
        <View style={{ marginLeft: 12, marginTop: 8 }}>
          {loading ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : selectedDayJobs.length === 0 ? (
            <Text className="px-4 py-3 text-center text-app-meta-lg italic text-black/55 dark:text-white/60">
              {t('jobs.calendarEmptyDayTitle')}
            </Text>
          ) : (
            selectedDayJobs.map((job, index) => {
              const statusLabel =
                job.status === 'done'
                  ? t('jobs.statuses.done')
                  : job.status === 'in_progress'
                    ? t('jobs.statuses.inProgress')
                    : job.status === 'pending'
                      ? t('jobs.statuses.pending')
                      : t('jobs.statuses.scheduled');

              return (
                <Pressable
                  key={job.id}
                  onPress={() => router.push(`/(tabs)/posao/${job.id}`)}
                  className={index > 0 ? 'mt-4' : ''}>
                  <View className="flex-row items-center justify-between py-1">
                    <View className="mr-3 flex-1">
                      <View className="flex-row items-center">
                        <Text className="flex-1 text-app-row text-[#1C2745] dark:text-white" numberOfLines={1}>
                          {job.title || t('jobs.untitled')}
                        </Text>
                      </View>
                      <View className="mt-1 flex-row items-center">
                        <Ionicons name="person-outline" size={14} color={colors.secondaryText} />
                        <Text className="ml-2 text-app-meta-lg text-black/60 dark:text-white/70">
                          {job.client?.name || t('jobs.noClient')}
                        </Text>
                      </View>
                    </View>
                    <JobStatusText label={statusLabel} status={job.status} style={{ marginRight: 10 }} />
                    <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
                  </View>
                </Pressable>
              );
            })
          )}

          <Pressable
            onPress={onScheduleForSelectedDay}
            disabled={!canScheduleSelectedDate}
            className="mt-4 items-center py-2 disabled:opacity-50">
            <Text
              className="text-app-meta-lg font-semibold"
              style={{ color: canScheduleSelectedDate ? (colorScheme === 'dark' ? '#8FB2FF' : '#3C69D9') : colors.secondaryText }}>
              {t('jobs.calendarScheduleForDate', { date: selectedDateLabel })}
            </Text>
          </Pressable>
        </View>
      </Animated.ScrollView>
    </View>
  );
}
