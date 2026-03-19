import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Linking, Modal, Pressable, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { MascotEmptyState } from '@/components/MascotEmptyState';
import { PaymentJobPickerModal } from '@/components/PaymentJobPickerModal';
import { LargeHeader } from '@/components/LargeHeader';
import { useColorScheme } from '@/components/useColorScheme';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { listClientOpenDebtJobs, listClientsWithDebt, type ClientOpenDebtJob, type ClientWithDebt } from '@/lib/clients';
import { useAuth } from '@/providers/AuthProvider';

export default function KlijentiScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const placeholderTextColor = usePlaceholderTextColor();

  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<ClientWithDebt[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'debt' | 'active'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactClient, setContactClient] = useState<ClientWithDebt | null>(null);
  const [paymentPicker, setPaymentPicker] = useState<{ clientName: string | null; jobs: ClientOpenDebtJob[] } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
      setLoading(true);
      setError(null);
    try {
      const data = await listClientsWithDebt(userId);
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
    return items
      .filter((c) => {
      if (filter === 'debt' && c.debt <= 0) return false;
      if (filter === 'active' && c.active_jobs_count <= 0) return false;
      const name = (c.name ?? '').toLowerCase();
      const phone = (c.phone ?? '').toLowerCase();
      const note = (c.note ?? '').toLowerCase();
      if (!q) return true;
      return name.includes(q) || phone.includes(q) || note.includes(q);
      })
      .sort((a, b) => {
        const aDebtRank = a.debt > 0 ? 0 : 1;
        const bDebtRank = b.debt > 0 ? 0 : 1;
        if (aDebtRank !== bDebtRank) return aDebtRank - bDebtRank;
        const aTime = new Date(a.latest_activity_at ?? a.created_at ?? 0).getTime();
        const bTime = new Date(b.latest_activity_at ?? b.created_at ?? 0).getTime();
        return bTime - aTime;
      });
  }, [filter, items, query]);

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const formatMoney = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const openUrl = useCallback(
    async (url: string) => {
      try {
        const supported = await Linking.canOpenURL(url);
        if (!supported) return;
        await Linking.openURL(url);
      } catch {
        // ignore
      }
    },
    []
  );

  const onSms = useCallback(
    (phone: string) => {
      const digits = phone.replace(/[^\d+]/g, '');
      if (!digits) return;
      const url = `sms:${digits}`;
      void openUrl(url);
    },
    [openUrl]
  );

  const onCall = useCallback(
    (phone: string) => {
      const digits = phone.replace(/[^\d+]/g, '');
      if (!digits) return;
      void openUrl(`tel:${digits}`);
    },
    [openUrl]
  );

  const onViber = useCallback(
    (phone: string) => {
      const digits = phone.replace(/[^\d+]/g, '');
      if (!digits) return;
      const url = `viber://chat?number=${encodeURIComponent(digits)}`;
      void openUrl(url);
    },
    [openUrl]
  );

  const onAddPayment = useCallback(
    async (client: ClientWithDebt) => {
      if (!userId) return;
      if (client.debt <= 0) {
        Alert.alert(t('clients.noOpenDebtTitle'), t('clients.noOpenDebtBody'));
        return;
      }
      try {
        const jobs = await listClientOpenDebtJobs(userId, client.id);
        if (jobs.length === 0) {
          Alert.alert(t('clients.noOpenDebtTitle'), t('clients.noOpenDebtBody'));
          return;
        }
        if (jobs.length === 1) {
          router.push({
            pathname: '/(tabs)/posao/[id]/payment/new' as any,
            params: { id: jobs[0].id, returnTo: 'clients' },
          });
          return;
        }
        setPaymentPicker({ clientName: client.name, jobs });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [router, t, userId]
  );

  const onContact = useCallback(
    (client: ClientWithDebt) => {
      if (!client.phone) {
        Alert.alert(t('jobs.noPhone'));
        return;
      }
      setContactClient(client);
    },
    [t]
  );

  const onCloseContactModal = useCallback(() => {
    setContactClient(null);
  }, []);

  const onClosePaymentPicker = useCallback(() => {
    setPaymentPicker(null);
  }, []);

  const onAdd = () => {
    router.push({ pathname: '/(tabs)/klijent/new' as any });
  };

  const clientsWithDebt = useMemo(() => items.filter((c) => c.debt > 0).length, [items]);

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
      <LargeHeader
        title={t('tabs.clients')}
        right={
          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('clients.add')}
              onPress={onAdd}
              className="mr-3 h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
              <Ionicons name="add" size={22} color={colors.text} />
            </Pressable>
          </View>
        }
      />

      <View className="flex-1 px-6 pt-3">
        <View className="mb-4 flex-row">
          <View className="mr-2 flex-1 items-center overflow-hidden rounded-3xl border border-black/10 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-[#1C1C1E]/80">
            <Text className="text-center text-sm text-black/55 dark:text-white/65">{t('clients.totalClients')}</Text>
            <Text className="mt-2 text-center text-[22px] font-extrabold text-[#1C2745] dark:text-white">
              {items.length}
            </Text>
          </View>

          <View className="ml-2 flex-1 items-center overflow-hidden rounded-3xl border border-black/10 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-[#1C1C1E]/80">
            <Text className="text-center text-sm text-black/55 dark:text-white/65">{t('clients.activeDebts')}</Text>
            <Text className="mt-2 text-center text-[22px] font-extrabold text-[#1C2745] dark:text-white">
              {clientsWithDebt}
            </Text>
          </View>
        </View>

        <View className="relative">
          <AppTextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('clients.searchPlaceholder')}
            placeholderTextColor={placeholderTextColor}
            className="pr-12"
          />
          <View style={{ position: 'absolute', right: 16, top: '50%', marginTop: -10 }}>
            <Ionicons name="search" size={20} color={colors.secondaryText} />
          </View>
        </View>

        <View className="mt-3 flex-row">
          {[
            { key: 'all' as const, label: t('clients.filters.all') },
            { key: 'debt' as const, label: t('clients.filters.debt') },
            { key: 'active' as const, label: t('clients.filters.active') },
          ].map((chip) => {
            const selected = filter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setFilter(chip.key)}
                className={[
                  'mr-2 rounded-3xl px-5 py-2',
                  selected
                    ? 'bg-[#2F7BF6]'
                    : 'border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70',
                ].join(' ')}>
                <Text className={selected ? 'text-base font-semibold text-white' : 'text-base text-black/70 dark:text-white/80'}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

        <View className="mt-4 flex-1">
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
              contentContainerStyle={{ paddingBottom: 128 }}
              ItemSeparatorComponent={() => <View className="h-3" />}
              ListEmptyComponent={() => (
                <MascotEmptyState
                  title={t('clients.emptyTitle')}
                  body={t('clients.emptyBody')}
                  actionLabel={t('clients.add')}
                  onAction={onAdd}
                />
              )}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/(tabs)/klijent/[id]' as any, params: { id: item.id } })
                  }
                  className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 px-4 py-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
                  <View>
                    <View className="flex-row items-start justify-between">
                      <View className="mr-2 flex-1">
                        <Text className="text-[18px] font-extrabold text-[#1C2745] dark:text-white" numberOfLines={1}>
                          {item.name || '-'}
                        </Text>

                        <View className="mt-1.5 flex-row items-center">
                          {item.phone ? (
                            <>
                              <Ionicons name="call-outline" size={16} color={colors.secondaryText} />
                              <Text className="ml-2 text-base text-black/60 dark:text-white/70" numberOfLines={1}>
                                {item.phone}
                              </Text>
                            </>
                          ) : null}
                          {item.phone && item.address ? (
                            <Text className="mx-2 text-black/35 dark:text-white/35">|</Text>
                          ) : null}
                          {item.address ? (
                            <>
                              <Ionicons name="location-outline" size={16} color={colors.secondaryText} />
                              <Text className="ml-2 flex-1 text-base text-black/60 dark:text-white/70" numberOfLines={1}>
                                {item.address}
                              </Text>
                            </>
                          ) : null}
                        </View>
                      </View>

                      {item.active_jobs_count > 0 ? (
                        <View className="rounded-full bg-[#E8F0FF] px-2.5 py-1 dark:bg-[#1E2A44]">
                          <Text className="text-xs font-semibold text-[#2F7BF6] dark:text-[#77A9FF]">
                            {t('clients.activeJobsCount')}: {item.active_jobs_count}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View className="my-3 h-px bg-black/10 dark:bg-white/10" />

                    <View className="flex-row items-center justify-between">
                      <Text className="text-base text-black/70 dark:text-white/80">
                        {t('clients.jobsCount')}: <Text className="font-semibold text-black dark:text-white">{item.jobs_count}</Text>
                      </Text>
                      {item.debt > 0 ? (
                        <Text className="text-base text-red-600 dark:text-red-400">
                          {t('clients.debt')}: <Text className="font-semibold">{formatMoney.format(item.debt)}</Text>
                        </Text>
                      ) : (
                        <Text className="text-base font-semibold text-[#2E9F5A] dark:text-[#5BC980]">
                          {t('clients.noDebt')}
                        </Text>
                      )}
                    </View>

                    <View className="mt-3 flex-row">
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onContact(item);
                        }}
                        className="mr-2 flex-1 flex-row items-center justify-center rounded-2xl bg-[#E8F0FF] py-2.5 dark:bg-[#1E2A44]">
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.text} />
                        <Text className="ml-2 text-sm font-semibold text-black/80 dark:text-white/85">{t('clients.contact')}</Text>
                      </Pressable>

                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onAddPayment(item);
                        }}
                        className="mr-2 flex-1 flex-row items-center justify-center rounded-2xl bg-[#FFF4E5] py-2.5 dark:bg-[#3A2D1E]">
                        <Ionicons name="wallet-outline" size={16} color={colors.text} />
                        <Text className="ml-2 text-sm font-semibold text-black/80 dark:text-white/85">{t('jobs.payment')}</Text>
                      </Pressable>

                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push({
                            pathname: '/(tabs)/posao/new' as any,
                            params: { clientId: item.id },
                          });
                        }}
                        className="flex-1 flex-row items-center justify-center rounded-2xl bg-black/5 py-2.5 dark:bg-white/10">
                        <Ionicons name="add-outline" size={16} color={colors.text} />
                        <Text className="ml-2 text-sm font-semibold text-black/80 dark:text-white/85">{t('clients.newJob')}</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>

      <Modal transparent visible={Boolean(contactClient)} animationType="fade" onRequestClose={onCloseContactModal}>
        <View className="flex-1 items-center justify-center bg-black/35 px-6">
          <Pressable onPress={onCloseContactModal} className="absolute inset-0" />
          <View className="w-full max-w-[360px] overflow-hidden rounded-3xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#1C1C1E]">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-black dark:text-white" numberOfLines={1}>
                {contactClient?.name || t('clients.contact')}
              </Text>
              <Pressable
                onPress={onCloseContactModal}
                className="h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            {contactClient?.phone ? (
              <Text className="mt-1 text-sm text-black/55 dark:text-white/65">{contactClient.phone}</Text>
            ) : null}

            <View className="mt-4 flex-row">
              <Pressable
                onPress={() => {
                  if (!contactClient?.phone) return;
                  onCloseContactModal();
                  onCall(contactClient.phone);
                }}
                className="mr-2 flex-1 items-center rounded-2xl bg-[#E8F7EF] py-3 dark:bg-[#203326]">
                <Ionicons name="call-outline" size={18} color={colors.text} />
                <Text className="mt-1 text-sm font-semibold text-black/80 dark:text-white/85">{t('jobs.call')}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!contactClient?.phone) return;
                  onCloseContactModal();
                  onSms(contactClient.phone);
                }}
                className="mr-2 flex-1 items-center rounded-2xl bg-[#E8F0FF] py-3 dark:bg-[#1E2A44]">
                <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
                <Text className="mt-1 text-sm font-semibold text-black/80 dark:text-white/85">{t('jobs.sms')}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!contactClient?.phone) return;
                  onCloseContactModal();
                  onViber(contactClient.phone);
                }}
                className="flex-1 items-center rounded-2xl bg-[#EAF5F5] py-3 dark:bg-[#1D3437]">
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.text} />
                <Text className="mt-1 text-sm font-semibold text-black/80 dark:text-white/85">{t('jobs.viber')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <PaymentJobPickerModal
        visible={Boolean(paymentPicker)}
        clientName={paymentPicker?.clientName ?? null}
        jobs={paymentPicker?.jobs ?? []}
        onClose={onClosePaymentPicker}
        onSelect={(jobId) => {
          onClosePaymentPicker();
          router.push({
            pathname: '/(tabs)/posao/[id]/payment/new' as any,
            params: { id: jobId, returnTo: 'clients' },
          });
        }}
      />
    </View>
  );
}
