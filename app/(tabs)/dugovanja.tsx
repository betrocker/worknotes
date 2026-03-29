import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Linking, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { AppSearchInput } from '@/components/AppSearchInput';
import { LargeHeader } from '@/components/LargeHeader';
import { MascotEmptyState } from '@/components/MascotEmptyState';
import { PaymentJobPickerModal } from '@/components/PaymentJobPickerModal';
import { useColorScheme } from '@/components/useColorScheme';
import { listClientOpenDebtJobs, listClientsWithDebt, type ClientOpenDebtJob, type ClientWithDebt } from '@/lib/clients';
import { useAuth } from '@/providers/AuthProvider';

function getSerbianPluralForm(count: number) {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'other';
}

export default function DugovanjaScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<ClientWithDebt[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactClient, setContactClient] = useState<ClientWithDebt | null>(null);
  const [paymentPicker, setPaymentPicker] = useState<{ clientName: string | null; jobs: ClientOpenDebtJob[] } | null>(null);
  const [debtJobsPicker, setDebtJobsPicker] = useState<{ clientName: string | null; jobs: ClientOpenDebtJob[] } | null>(null);
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const [listContentHeight, setListContentHeight] = useState(0);
  const [listCanScroll, setListCanScroll] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listClientsWithDebt(userId);
      setItems(data.filter((item) => item.debt > 0));
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) => {
        if (!q) return true;
        const haystack = [item.name ?? '', item.phone ?? '', item.address ?? '', item.note ?? '']
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        if (b.debt !== a.debt) return b.debt - a.debt;
        const aTime = new Date(a.latest_activity_at ?? a.created_at ?? 0).getTime();
        const bTime = new Date(b.latest_activity_at ?? b.created_at ?? 0).getTime();
        return bTime - aTime;
      });
  }, [items, query]);

  const totalDebt = useMemo(() => items.reduce((sum, item) => sum + item.debt, 0), [items]);
  const debtorsCount = items.length;
  const formatDebtorsShortLabel = useCallback(
    (count: number) => {
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return `${count} ${t(`debts.debtorsShortForms.${form}`)}`;
      }
      return `${count} ${count === 1 ? t('debts.debtorsShortForms.one') : t('debts.debtorsShortForms.other')}`;
    },
    [i18n.language, t]
  );
  const subtitle = `${t('debts.totalPrefix')}: ${formatMoney.format(totalDebt)} • ${formatDebtorsShortLabel(debtorsCount)}`;
  const formatDebtJobsLabel = useCallback(
    (count: number) => {
      if (count <= 0) return '';
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return `${count} ${t(`debts.debtJobsForms.${form}`)}`;
      }
      return `${count} ${count === 1 ? t('debts.debtJobsForms.one') : t('debts.debtJobsForms.other')}`;
    },
    [i18n.language, t]
  );

  const openUrl = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) return;
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  }, []);

  const onSms = useCallback(
    (phone: string) => {
      const digits = phone.replace(/[^\d+]/g, '');
      if (!digits) return;
      void openUrl(`sms:${digits}`);
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
      void openUrl(`viber://chat?number=${encodeURIComponent(digits)}`);
    },
    [openUrl]
  );

  const addPayment = useCallback(
    async (item: ClientWithDebt) => {
      if (!userId) return;
      if (item.debt <= 0) {
        return;
      }

      try {
        const jobs = await listClientOpenDebtJobs(userId, item.id);
        if (jobs.length === 0) {
          return;
        }
        if (jobs.length === 1) {
          router.push({
            pathname: '/(tabs)/posao/[id]/payment/new' as any,
            params: { id: jobs[0].id, returnTo: 'debts' },
          });
          return;
        }
        setPaymentPicker({ clientName: item.name, jobs });
        return;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [router, userId]
  );

  const onContact = useCallback((item: ClientWithDebt) => {
    if (!item.phone) return;
    setContactClient(item);
  }, []);

  const onCloseContactModal = useCallback(() => {
    setContactClient(null);
  }, []);

  const onClosePaymentPicker = useCallback(() => {
    setPaymentPicker(null);
  }, []);

  const onCloseDebtJobsPicker = useCallback(() => {
    setDebtJobsPicker(null);
  }, []);

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
      <LargeHeader title={t('tabs.debts')} subtitle={subtitle} />

      <View className="flex-1 px-6 pt-3">
        <AppSearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('debts.searchPlaceholder')}
        />

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
                  title={t('debts.emptyTitle')}
                  body={t('debts.emptyBody')}
                  variant="thumbs"
                  compact
                  imageSize={164}
                />
              )}
              ListHeaderComponent={filtered.length > 0 ? <View className="h-3" /> : null}
              ListFooterComponent={filtered.length > 0 ? <View className="h-3" /> : null}
              renderItem={({ item, index }) => (
                <View
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
                      <View className="mr-3 flex-1">
                        <Text className="text-app-row-lg font-bold text-[#1C2745] dark:text-white" numberOfLines={1}>
                          {item.name || '-'}
                        </Text>
                      </View>

                      <View
                        className="ml-3 rounded-full px-2.5 py-1"
                        style={{
                          backgroundColor: colorScheme === 'dark' ? 'rgba(255,107,107,0.16)' : 'rgba(255,59,48,0.10)',
                        }}>
                        <Text className="text-app-meta-lg font-bold text-red-600 dark:text-red-400">
                          {formatMoney.format(item.debt)}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-0.5 flex-row items-center justify-between">
                      <View className="mr-4 flex-1">
                        {item.debt_jobs_count > 1 ? (
                          <Text className="text-app-meta-lg text-black/60 dark:text-white/70" numberOfLines={1}>
                            {formatDebtJobsLabel(item.debt_jobs_count)}
                          </Text>
                        ) : item.top_debt_job_title ? (
                          <Text className="text-app-meta-lg text-black/60 dark:text-white/70" numberOfLines={1}>
                            {item.top_debt_job_title}
                          </Text>
                        ) : item.latest_active_job_id ? (
                          <Text className="text-app-meta-lg text-black/60 dark:text-white/70" numberOfLines={1}>
                            {t('debts.activeJobAvailable')}
                          </Text>
                        ) : null}
                      </View>

                      <View className="flex-row items-center">
                        {item.phone ? (
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              onContact(item);
                            }}
                            className="mr-2 flex-row items-center px-1 py-1">
                            <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.secondaryText} />
                            <Text className="ml-1.5 text-app-meta-lg font-medium text-black/75 dark:text-white/80">
                              {t('clients.contact')}
                            </Text>
                          </Pressable>
                        ) : null}

                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            addPayment(item);
                          }}
                          className="flex-row items-center rounded-full bg-[#EAF1FF] px-3 py-1.5 dark:bg-[#243149]">
                          <Ionicons
                            name="wallet-outline"
                            size={14}
                            color={colorScheme === 'dark' ? '#8FB2FF' : '#2F68ED'}
                          />
                          <Text
                            className="ml-1.5 text-app-meta-lg font-medium"
                            style={{ color: colorScheme === 'dark' ? '#8FB2FF' : '#2F68ED' }}>
                            {t('jobs.payment')}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              )}
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

      <Modal transparent visible={Boolean(contactClient)} animationType="fade" onRequestClose={onCloseContactModal}>
        <View className="flex-1 items-center justify-center bg-black/35 px-6">
          <Pressable onPress={onCloseContactModal} className="absolute inset-0" />
          <View className="w-full max-w-[360px] overflow-hidden rounded-3xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#1C1C1E]">
            <View className="flex-row items-center justify-between">
              <Text className="text-app-row-lg font-semibold text-black dark:text-white" numberOfLines={1}>
                {contactClient?.name || t('clients.contact')}
              </Text>
              <Pressable
                onPress={onCloseContactModal}
                className="h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            {contactClient?.phone ? (
              <Text className="mt-1 text-app-meta-lg text-black/55 dark:text-white/65">{contactClient.phone}</Text>
            ) : null}

            <View className="mt-4 flex-row">
              <Pressable
                onPress={() => {
                  if (!contactClient?.phone) return;
                  onCloseContactModal();
                  onCall(contactClient.phone);
                }}
                className="mr-2 flex-1 flex-row items-center justify-center rounded-2xl bg-black/[0.045] py-3 dark:bg-white/[0.08]">
                <Ionicons name="call-outline" size={16} color={colors.text} />
                <Text className="ml-2 text-app-meta-lg font-medium text-black/80 dark:text-white/85">{t('jobs.call')}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!contactClient?.phone) return;
                  onCloseContactModal();
                  onSms(contactClient.phone);
                }}
                className="mr-2 flex-1 flex-row items-center justify-center rounded-2xl bg-black/[0.045] py-3 dark:bg-white/[0.08]">
                <Ionicons name="chatbubble-outline" size={16} color={colors.text} />
                <Text className="ml-2 text-app-meta-lg font-medium text-black/80 dark:text-white/85">{t('jobs.sms')}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!contactClient?.phone) return;
                  onCloseContactModal();
                  onViber(contactClient.phone);
                }}
                className="flex-1 flex-row items-center justify-center rounded-2xl bg-black/[0.045] py-3 dark:bg-white/[0.08]">
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.text} />
                <Text className="ml-2 text-app-meta-lg font-medium text-black/80 dark:text-white/85">{t('jobs.viber')}</Text>
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
            params: { id: jobId, returnTo: 'debts' },
          });
        }}
      />

      <PaymentJobPickerModal
        visible={Boolean(debtJobsPicker)}
        clientName={debtJobsPicker?.clientName ?? null}
        jobs={debtJobsPicker?.jobs ?? []}
        onClose={onCloseDebtJobsPicker}
        onSelect={(jobId) => {
          onCloseDebtJobsPicker();
          router.push(`/(tabs)/posao/${jobId}`);
        }}
      />
    </View>
  );
}
