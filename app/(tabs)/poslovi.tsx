import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { LargeHeader } from '@/components/LargeHeader';
import { UserMenuButton } from '@/components/UserMenuButton';
import { useColorScheme } from '@/components/useColorScheme';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { listJobs, updateJobStatus, type JobListItem } from '@/lib/jobs';
import { scheduleJobReminder } from '@/lib/notifications';
import { useAuth } from '@/providers/AuthProvider';

export default function PosloviScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const placeholderTextColor = usePlaceholderTextColor();

  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<JobListItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'scheduled'>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
    [locale]
  );

  const priceFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale]
  );

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listJobs(userId);
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
    return result;
  }, [items, query, filter]);

  const counts = useMemo(() => {
    const all = items.length;
    const active = items.filter((job) => job.status === 'in_progress').length;
    const done = items.filter((job) => job.status === 'done').length;
    const scheduled = items.filter((job) => job.status === 'scheduled').length;
    return { all, active, done, scheduled };
  }, [items]);

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return t('jobs.unscheduled');
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
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
        bg: 'bg-[#E8F0FF] dark:bg-[#1E2A44]',
        text: 'text-[#1C4FD7] dark:text-[#8FB2FF]',
      };
    }
    if (value === 'in_progress') {
      return {
        bg: 'bg-[#FFF3E6] dark:bg-[#3A2B1D]',
        text: 'text-[#B65B00] dark:text-[#FFB067]',
      };
    }
    if (value === 'done') {
      return {
        bg: 'bg-[#E8F7EF] dark:bg-[#203326]',
        text: 'text-[#1F7A4D] dark:text-[#79D39A]',
      };
    }
    return {
      bg: 'bg-black/5 dark:bg-white/10',
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
          await scheduleJobReminder({
            title: job.title || t('jobs.untitled'),
            scheduledDate: job.scheduled_date,
            clientName: job.client?.name ?? null,
          });
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

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
      <LargeHeader
        title={t('tabs.jobs')}
        subtitle={t('screens.jobs.subtitle')}
        right={
          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.add')}
              onPress={onAdd}
              className="mr-3 h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
              <Ionicons name="add" size={22} color={colors.text} />
            </Pressable>
            <UserMenuButton />
          </View>
        }
      />

      <View className="px-6 pb-32 pt-3">
        <View className="relative">
          <AppTextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('jobs.searchPlaceholder')}
            placeholderTextColor={placeholderTextColor}
            className="pr-12"
          />
          <View style={{ position: 'absolute', right: 16, top: '50%', marginTop: -10 }}>
            <Ionicons name="search" size={20} color={colors.secondaryText} />
          </View>
        </View>

        <View className="mt-4 flex-row flex-wrap">
          <Pressable
            onPress={() => setFilter('all')}
            className={[
              'mr-2 mt-2 rounded-3xl px-4 py-2',
              filter === 'all' ? 'bg-[#007AFF] dark:bg-[#0A84FF]' : 'bg-black/5 dark:bg-white/10',
            ].join(' ')}>
            <Text className={filter === 'all' ? 'text-sm font-semibold text-white' : 'text-sm text-black dark:text-white'}>
              {t('jobs.filters.all')} {counts.all}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('active')}
            className={[
              'mr-2 mt-2 rounded-3xl px-4 py-2',
              filter === 'active' ? 'bg-[#007AFF] dark:bg-[#0A84FF]' : 'bg-black/5 dark:bg-white/10',
            ].join(' ')}>
            <Text
              className={filter === 'active' ? 'text-sm font-semibold text-white' : 'text-sm text-black dark:text-white'}>
              {t('jobs.filters.active')} {counts.active}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('done')}
            className={[
              'mr-2 mt-2 rounded-3xl px-4 py-2',
              filter === 'done' ? 'bg-[#007AFF] dark:bg-[#0A84FF]' : 'bg-black/5 dark:bg-white/10',
            ].join(' ')}>
            <Text className={filter === 'done' ? 'text-sm font-semibold text-white' : 'text-sm text-black dark:text-white'}>
              {t('jobs.filters.done')} {counts.done}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter('scheduled')}
            className={[
              'mr-2 mt-2 rounded-3xl px-4 py-2',
              filter === 'scheduled' ? 'bg-[#007AFF] dark:bg-[#0A84FF]' : 'bg-black/5 dark:bg-white/10',
            ].join(' ')}>
            <Text
              className={
                filter === 'scheduled' ? 'text-sm font-semibold text-white' : 'text-sm text-black dark:text-white'
              }>
              {t('jobs.filters.scheduled')} {counts.scheduled}
            </Text>
          </Pressable>
        </View>

        {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

        <View className="mt-4">
          {loading ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View className="h-3" />}
              ListEmptyComponent={() => (
                <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
                  <Text className="text-lg font-semibold text-black dark:text-white">
                    {t('jobs.emptyTitle')}
                  </Text>
                  <Text className="mt-1 text-base text-black/60 dark:text-white/70">
                    {t('jobs.emptyBody')}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => {
                const price = formatPrice(item.price);
                return (
                  <Pressable
                    onPress={() => router.push({ pathname: '/(tabs)/posao/[id]' as any, params: { id: item.id } })}
                    className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 px-4 py-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
                    <View className="flex-row items-center justify-between">
                      <Text className="flex-1 pr-3 text-xl font-semibold text-black dark:text-white" numberOfLines={1}>
                        {item.title || t('jobs.untitled')}
                      </Text>
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          void onToggleStatus(item);
                        }}
                        className={[
                          'rounded-full px-3 py-1',
                          getStatusChipStyle(item.status).bg,
                        ].join(' ')}>
                        <Text
                          className={[
                            'text-xs font-semibold',
                            getStatusChipStyle(item.status).text,
                          ].join(' ')}>
                          {formatStatus(item.status)}
                        </Text>
                      </Pressable>
                    </View>
                    <View className="mt-2 h-px bg-black/10 dark:bg-white/10" />

                    <View className="mt-2 flex-row items-center">
                      <Ionicons name="information-circle-outline" size={16} color={colors.secondaryText} />
                      <View className="w-2" />
                      <Text className="text-sm text-black/60 dark:text-white/70" numberOfLines={1}>
                        {formatDate(item.scheduled_date)}
                      </Text>
                      <View className="mx-2 flex-row items-center">
                        <Ionicons name="person-outline" size={14} color={colors.secondaryText} />
                      </View>
                      <Text className="flex-1 text-sm text-black/60 dark:text-white/70" numberOfLines={1}>
                        {item.client?.name || t('jobs.noClient')}
                      </Text>
                      {price ? (
                        <>
                          <Text className="mx-2 text-sm text-black/30 dark:text-white/30">•</Text>
                          <Text className="text-sm font-semibold text-black/80 dark:text-white/80" numberOfLines={1}>
                            {price}
                          </Text>
                        </>
                      ) : null}
                    </View>

                    {item.description ? (
                      <View className="mt-2 flex-row items-start">
                        <Ionicons name="document-text-outline" size={16} color={colors.secondaryText} />
                        <Text
                          className="ml-2 flex-1 text-base text-black/60 dark:text-white/70"
                          numberOfLines={2}>
                          {item.description}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </View>
  );
}
