import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { MascotEmptyState } from '@/components/MascotEmptyState';
import { useColorScheme } from '@/components/useColorScheme';
import { parseDateInput } from '@/lib/date';
import { listJobs, type JobListItem } from '@/lib/jobs';
import { useAuth } from '@/providers/AuthProvider';

const toDateKey = (date: Date) => {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export default function JobsCalendarScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id ?? null;
  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;

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
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
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
    const days: Array<{ key: string; date: Date | null }> = [];

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

    const result: Array<Array<{ key: string; date: Date | null }>> = [];
    for (let index = 0; index < days.length; index += 7) {
      result.push(days.slice(index, index + 7));
    }

    return result;
  }, [monthCursor]);

  const onBack = () => {
    router.replace({ pathname: '/(tabs)/poslovi' as any });
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
    <ScrollView
      stickyHeaderIndices={[0]}
      className="flex-1 bg-[#F2F2F7] dark:bg-black"
      contentContainerClassName="pb-20">
      <View style={{ position: 'relative', zIndex: 20, backgroundColor: colors.background }}>
        <View className="px-6 pb-6" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={onBack}
              className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white dark:border-white/10 dark:bg-[#1C1C1E]">
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.add')}
              onPress={onScheduleForSelectedDay}
              disabled={!canScheduleSelectedDate}
              className="h-10 items-center justify-center rounded-3xl bg-[#007AFF] px-5 dark:bg-[#0A84FF]">
              <Text className={canScheduleSelectedDate ? 'text-app-body font-semibold text-white' : 'text-app-body font-semibold text-white/60'}>
                {t('jobs.calendarScheduleCta')}
              </Text>
            </Pressable>
          </View>

          <Text className="mt-4 font-bold text-app-display tracking-tight text-black dark:text-white">
            {t('jobs.calendarTitle')}
          </Text>
          <Text className="mt-1 text-app-subtitle text-black/60 dark:text-white/70">
            {t('jobs.calendarSubtitle')}
          </Text>
        </View>
      </View>

      <View className="px-6 pt-4">
        {error ? <Text className="mb-3 text-app-meta text-red-600">{error}</Text> : null}

        <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 px-4 pt-4 pb-2 dark:border-white/10 dark:bg-[#1C1C1E]/90">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => shiftMonth(-1)}
              className="h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
            <Text className="text-app-section font-extrabold capitalize text-[#1C2745] dark:text-white">
              {monthLabel}
            </Text>
            <Pressable
              onPress={() => shiftMonth(1)}
              className="h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
          </View>

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
                            fontWeight: isSelected || isToday ? '700' : '500',
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
        </View>

        <Text className="mt-5 text-app-section font-extrabold text-[#1C2745] dark:text-white">
          {t('jobs.calendarDaySection', { date: selectedDateLabel })}
        </Text>
        <View className="mt-2 overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
          {loading ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : selectedDayJobs.length === 0 ? (
            <View className="py-4">
              <MascotEmptyState title={t('jobs.calendarEmptyDayTitle')} body={t('jobs.calendarEmptyDayBody')} compact imageSize={112} />
            </View>
          ) : (
            selectedDayJobs.map((job, index) => {
              const statusLabel =
                job.status === 'done'
                  ? t('jobs.statuses.done')
                  : job.status === 'in_progress'
                    ? t('jobs.statuses.inProgress')
                    : t('jobs.statuses.scheduled');

              return (
                <Pressable
                  key={job.id}
                  onPress={() => router.push(`/(tabs)/posao/${job.id}`)}
                  className={index > 0 ? 'border-t border-black/10 pt-4 dark:border-white/10' : ''}>
                  <View className={index > 0 ? 'mt-4' : ''}>
                    <View className="flex-row items-start justify-between">
                      <View className="mr-3 flex-1">
                        <Text className="text-app-row font-extrabold text-[#1C2745] dark:text-white" numberOfLines={1}>
                          {job.title || t('jobs.untitled')}
                        </Text>
                        <View className="mt-1 flex-row items-center">
                          <Ionicons name="person-outline" size={14} color={colors.secondaryText} />
                          <Text className="ml-2 text-app-meta-lg text-black/60 dark:text-white/70">
                            {job.client?.name || t('jobs.noClient')}
                          </Text>
                          <Text className="mx-2 text-app-meta-lg text-black/30 dark:text-white/30">•</Text>
                          <Text className="text-app-meta-lg text-black/60 dark:text-white/70">{statusLabel}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}

          <Pressable
            onPress={onScheduleForSelectedDay}
            disabled={!canScheduleSelectedDate}
            className={[
              'mt-4 flex-row items-center justify-center rounded-2xl py-3',
              canScheduleSelectedDate ? 'bg-[#E8F0FF] dark:bg-[#1E2A44]' : 'bg-black/5 dark:bg-white/10',
            ].join(' ')}>
            <Ionicons name="add-circle-outline" size={18} color={canScheduleSelectedDate ? '#3C69D9' : colors.secondaryText} />
            <Text
              className="ml-2 text-app-meta-lg font-semibold"
              style={{ color: canScheduleSelectedDate ? (colorScheme === 'dark' ? '#8FB2FF' : '#3C69D9') : colors.secondaryText }}>
              {t('jobs.calendarScheduleForDate', { date: selectedDateLabel })}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
