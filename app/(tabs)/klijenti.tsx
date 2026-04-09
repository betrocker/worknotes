import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Animated, FlatList, Linking, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { MascotEmptyState } from '@/components/MascotEmptyState';
import { PaymentJobPickerModal } from '@/components/PaymentJobPickerModal';
import { LargeHeader } from '@/components/LargeHeader';
import { AppSearchInput } from '@/components/AppSearchInput';
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

export default function KlijentiScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<ClientWithDebt[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'debt'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactClient, setContactClient] = useState<ClientWithDebt | null>(null);
  const [paymentPicker, setPaymentPicker] = useState<{ clientName: string | null; jobs: ClientOpenDebtJob[] } | null>(null);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const [listContentHeight, setListContentHeight] = useState(0);
  const [listCanScroll, setListCanScroll] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const segmentTranslateX = React.useRef(new Animated.Value(0)).current;

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

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((c) => {
      if (filter === 'debt' && c.debt <= 0) return false;
      const name = (c.name ?? '').toLowerCase();
      const phone = (c.phone ?? '').toLowerCase();
      const note = (c.note ?? '').toLowerCase();
      if (!q) return true;
      return name.includes(q) || phone.includes(q) || note.includes(q);
      })
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', locale, { sensitivity: 'base' }));
  }, [filter, items, locale, query]);

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
  const formatClientsShortLabel = useCallback(
    (count: number) => {
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return `${count} ${t(`clients.totalClientsShortForms.${form}`)}`;
      }
      return `${count} ${count === 1 ? t('clients.totalClientsShortForms.one') : t('clients.totalClientsShortForms.other')}`;
    },
    [i18n.language, t]
  );
  const formatDebtsShortLabel = useCallback(
    (count: number) => {
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return `${count} ${t(`clients.activeDebtsShortForms.${form}`)}`;
      }
      return `${count} ${count === 1 ? t('clients.activeDebtsShortForms.one') : t('clients.activeDebtsShortForms.other')}`;
    },
    [i18n.language, t]
  );
  const headerSubtitle = `${formatClientsShortLabel(items.length)} • ${formatDebtsShortLabel(clientsWithDebt)}`;
  const clientFilters = useMemo(
    () => [
      { key: 'all' as const, label: t('clients.filters.all') },
      { key: 'debt' as const, label: t('clients.filters.debt') },
    ],
    [t]
  );
  const activeFilterIndex = Math.max(
    0,
    clientFilters.findIndex((chip) => chip.key === filter)
  );

  React.useEffect(() => {
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
        title={t('tabs.clients')}
        subtitle={headerSubtitle}
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

      <View className="flex-1 px-6 pt-2">
        <AppSearchInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('clients.searchPlaceholder')}
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
          {clientFilters.map((chip) => {
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
                  title={t('clients.emptyTitle')}
                  body={t('clients.emptyBody')}
                  actionLabel={t('clients.add')}
                  onAction={onAdd}
                  stacked
                  centeredAction
                  imageSize={164}
                />
              )}
              ListHeaderComponent={filtered.length > 0 ? <View className="h-3" /> : null}
              ListFooterComponent={filtered.length > 0 ? <View className="h-3" /> : null}
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/(tabs)/klijent/[id]' as any, params: { id: item.id } })
                  }
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
                          left: 0,
                          right: 0,
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

                      {item.debt > 0 ? (
                        <Text className="ml-3 text-app-meta-lg text-red-600 dark:text-red-400">
                          {t('clients.debt')}: <Text className="font-semibold">{formatMoney.format(item.debt)}</Text>
                        </Text>
                      ) : null}
                    </View>

                    <View className="mt-0.5 flex-row items-center justify-between">
                      <View className="mr-4 flex-1 flex-row items-center">
                        {item.phone ? (
                          <Text className="text-app-meta-lg text-black/60 dark:text-white/70" numberOfLines={1}>
                            {item.phone}
                          </Text>
                        ) : item.address ? (
                          <Text className="text-app-meta-lg text-black/60 dark:text-white/70" numberOfLines={1}>
                            {item.address}
                          </Text>
                        ) : null}
                      </View>

                      <View className="flex-row items-center">
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            onContact(item);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={t('clients.contact')}
                          className="mr-2 flex-row items-center rounded-full bg-black/[0.04] px-3 py-1.5 dark:bg-white/[0.06]">
                          <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.secondaryText} />
                          <Text className="ml-1.5 text-app-meta-lg font-medium text-black/75 dark:text-white/80">
                            {t('clients.contact')}
                          </Text>
                        </Pressable>

                        {item.debt > 0 ? (
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              onAddPayment(item);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={t('jobs.payment')}
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
                        ) : null}
                      </View>
                    </View>
                  </View>
                </Pressable>
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
            params: { id: jobId, returnTo: 'clients' },
          });
        }}
      />
    </View>
  );
}
