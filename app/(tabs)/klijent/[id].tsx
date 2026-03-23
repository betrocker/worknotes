import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { MascotEmptyState } from '@/components/MascotEmptyState';
import { useColorScheme } from '@/components/useColorScheme';
import { parseDateInput } from '@/lib/date';
import { deleteClient, getClientDetail, type ClientDetail } from '@/lib/clients';
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

export default function ClientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const userId = session?.user?.id ?? null;
  const id = typeof params.id === 'string' ? params.id : null;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineRange, setTimelineRange] = useState<'30' | '90' | 'all'>('30');

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
    [locale]
  );
  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }),
    [locale]
  );
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

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return '—';
      const parsed = parseDateInput(value);
      if (!parsed) return value;
      return dateFormatter.format(parsed);
    },
    [dateFormatter]
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

  const filteredTimeline = useMemo(() => {
    if (timelineRange === 'all') return timeline;
    const days = timelineRange === '30' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffTs = cutoff.getTime();
    return timeline.filter((event) => {
      if (!event.date) return false;
      const ts = parseDateInput(event.date)?.getTime() ?? Number.NaN;
      return !Number.isNaN(ts) && ts >= cutoffTs;
    });
  }, [timeline, timelineRange]);

  const groupedTimeline = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: TimelineEvent[] }> = [];
    const indexByKey = new Map<string, number>();

    filteredTimeline.forEach((event) => {
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
  }, [filteredTimeline, monthFormatter]);

  const onBack = () => {
    router.replace({ pathname: '/(tabs)/klijenti' as any });
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
    router.push({ pathname: '/(tabs)/klijent/[id]/edit' as any, params: { id } });
  };

  const clientMeta = useMemo(() => {
    if (client?.phone && client?.address) {
      return {
        icon: 'call-outline' as const,
        text: `${client.phone} • ${client.address}`,
      };
    }
    if (client?.phone) {
      return {
        icon: 'call-outline' as const,
        text: client.phone,
      };
    }
    if (client?.address) {
      return {
        icon: 'location-outline' as const,
        text: client.address,
      };
    }
    return {
      icon: 'person-outline' as const,
      text: t('clients.contact'),
    };
  }, [client?.address, client?.phone, t]);

  return (
    <ScrollView
      stickyHeaderIndices={[0]}
      className="flex-1 bg-[#F2F2F7] dark:bg-black"
      contentContainerClassName="pb-32">
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

            <View className="flex-row items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('clients.edit')}
                onPress={onEdit}
                className="mr-3 h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white dark:border-white/10 dark:bg-[#1C1C1E]">
                <Ionicons name="create-outline" size={18} color={colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('clients.delete')}
                onPress={onDelete}
                className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white dark:border-white/10 dark:bg-[#1C1C1E]">
                <Ionicons name="trash" size={18} color="#FF3B30" />
              </Pressable>
            </View>
          </View>

          <Text className="mt-4 font-bold text-[34px] leading-[40px] tracking-tight text-black dark:text-white">
            {client?.name || '-'}
          </Text>
          <View className="mt-1 flex-row items-center">
            <Ionicons
              name={clientMeta.icon}
              size={16}
              color={colors.secondaryText}
            />
            <Text className="ml-2 text-base text-black/60 dark:text-white/70">
              {clientMeta.text}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-6 pt-4">
        {error ? <Text className="mb-3 text-sm text-red-600">{error}</Text> : null}

        {loading ? (
          <View className="items-center py-6">
            <ActivityIndicator />
          </View>
        ) : !client ? (
          <MascotEmptyState title={t('clients.emptyTitle')} body={t('clients.emptyBody')} compact />
        ) : (
          <>
            <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
              <View className="flex-row items-center justify-between">
                <Text className="text-base text-black/70 dark:text-white/80">
                  {t('clients.jobsCount')}: <Text className="font-semibold text-black dark:text-white">{client.jobs.length}</Text>
                </Text>
                {client.total_debt > 0 ? (
                  <Text className="text-base text-red-600 dark:text-red-400">
                    {t('clients.debt')}: <Text className="font-semibold">{moneyFormatter.format(client.total_debt)}</Text>
                  </Text>
                ) : (
                  <Text className="text-base font-semibold text-[#2E9F5A] dark:text-[#5BC980]">{t('clients.noDebt')}</Text>
                )}
              </View>

              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-base text-black/70 dark:text-white/80">{t('jobs.totalPaid')}</Text>
                <Text className="text-base font-semibold text-black dark:text-white">{moneyFormatter.format(client.total_paid)}</Text>
              </View>

              {client.address ? (
                <View className="mt-2 flex-row items-center">
                  <Ionicons name="location-outline" size={16} color={colors.secondaryText} />
                  <Text className="ml-2 text-base text-black/65 dark:text-white/75">{client.address}</Text>
                </View>
              ) : null}
            </View>

            {client.note?.trim() ? (
              <View className="mt-3 overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
                <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('clients.noteLabel')}</Text>
                <Text className="mt-2 text-base text-black/80 dark:text-white/85">{client.note.trim()}</Text>
              </View>
            ) : null}

            <Text className="mt-5 text-[18px] font-extrabold text-[#1C2745] dark:text-white">{t('clients.timelineTitle')}</Text>
            <View className="mt-2 flex-row">
              {[
                { key: '30' as const, label: t('clients.timelineFilters.last30') },
                { key: '90' as const, label: t('clients.timelineFilters.last90') },
                { key: 'all' as const, label: t('clients.timelineFilters.all') },
              ].map((chip) => {
                const selected = timelineRange === chip.key;
                return (
                  <Pressable
                    key={chip.key}
                    onPress={() => setTimelineRange(chip.key)}
                    className={[
                      'mr-2 rounded-3xl px-4 py-2',
                      selected
                        ? 'bg-[#2F7BF6]'
                        : 'border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70',
                    ].join(' ')}>
                    <Text className={selected ? 'text-sm font-semibold text-white' : 'text-sm text-black/70 dark:text-white/80'}>
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View className="mt-2 overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
              {groupedTimeline.length === 0 ? (
                <MascotEmptyState title={t('clients.timelineEmpty')} compact />
              ) : (
                groupedTimeline.map((group, groupIndex) => (
                  <View
                    key={group.key}
                    className={groupIndex > 0 ? 'mt-4 border-t border-black/10 pt-4 dark:border-white/10' : ''}>
                    <Text className="text-xs font-semibold uppercase tracking-[0.6px] text-black/45 dark:text-white/55">
                      {group.label}
                    </Text>
                    <View className="mt-2">
                      {group.items.map((event, index) => (
                        <View
                          key={event.id}
                          className={[
                            'flex-row items-start justify-between',
                            index < group.items.length - 1 ? 'mb-3 border-b border-black/10 pb-3 dark:border-white/10' : '',
                          ].join(' ')}>
                          <Pressable
                            onPress={() =>
                              router.push({ pathname: '/(tabs)/posao/[id]' as any, params: { id: event.jobId } })
                            }
                            className="mr-3 flex-1">
                            <View className="flex-row items-center">
                              <Ionicons
                                name={
                                  event.type === 'payment'
                                    ? 'wallet-outline'
                                    : event.type === 'completed'
                                      ? 'checkmark-circle-outline'
                                      : event.type === 'scheduled'
                                        ? 'calendar-outline'
                                        : 'briefcase-outline'
                                }
                                size={16}
                                color={colors.secondaryText}
                              />
                              <Text className="ml-2 text-sm text-black/60 dark:text-white/70">{formatDate(event.date)}</Text>
                            </View>
                            <Text className="text-base text-black/80 dark:text-white/85" numberOfLines={1}>
                              {event.type === 'payment'
                                ? `${t('clients.timelinePayment')}: ${event.title}`
                                : event.type === 'completed'
                                  ? `${t('clients.timelineJobCompleted')}: ${event.title}`
                                  : event.type === 'scheduled'
                                    ? `${t('clients.timelineJobScheduled')}: ${event.title}`
                                    : `${t('clients.timelineJobCreated')}: ${event.title}`}
                            </Text>
                            {event.note?.trim() ? (
                              <Text className="mt-0.5 text-sm text-black/55 dark:text-white/65" numberOfLines={2}>
                                {event.note.trim()}
                              </Text>
                            ) : null}
                          </Pressable>
                          {event.type === 'payment' ? (
                            <Text className="pt-0.5 text-base font-semibold text-black dark:text-white">
                              {moneyFormatter.format(event.amount ?? 0)}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
