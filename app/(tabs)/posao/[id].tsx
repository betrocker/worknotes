import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { deleteJob, getJobById, type JobDetail } from '@/lib/jobs';
import { listExpenses, listPayments, type ExpenseRow, type PaymentRow } from '@/lib/job-finance';
import { useAuth } from '@/providers/AuthProvider';

export default function JobDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const userId = session?.user?.id ?? null;
  const id = typeof params.id === 'string' ? params.id : null;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
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
    if (!userId || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getJobById(userId, id);
      setJob(data);
      const [paymentRows, expenseRows] = await Promise.all([listPayments(id), listExpenses(id)]);
      setPayments(paymentRows);
      setExpenses(expenseRows);
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

  const onBack = () => {
    router.replace({ pathname: '/(tabs)/poslovi' as any });
  };

  const onEdit = () => {
    if (!id) return;
    router.push({ pathname: '/(tabs)/posao/[id]/edit' as any, params: { id } });
  };

  const onDelete = () => {
    if (!userId || !id) return;
    Alert.alert(t('jobs.deleteConfirmTitle'), t('jobs.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('jobs.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteJob(userId, id);
            router.replace({ pathname: '/(tabs)/poslovi' as any });
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return t('jobs.unscheduled');
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return dateFormatter.format(parsed);
    },
    [dateFormatter, t]
  );

  const formatCompletedDate = useCallback(
    (value: string | null) => {
      if (!value) return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return dateFormatter.format(parsed);
    },
    [dateFormatter]
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

  const formatPrice = useCallback(
    (value: number | null) => {
      if (value == null) return t('jobs.priceUnknown');
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(value);
    },
    [locale, t]
  );

  const formatListDate = useCallback(
    (value: string | null) => {
      if (!value) return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return dateFormatter.format(parsed);
    },
    [dateFormatter]
  );

  const totalPaid = useMemo(
    () => payments.reduce((sum, item) => sum + (item.amount ?? 0), 0),
    [payments]
  );
  const totalExpense = useMemo(
    () => expenses.reduce((sum, item) => sum + (item.amount ?? 0), 0),
    [expenses]
  );
  const profit = totalPaid - totalExpense;
  const outstanding = useMemo(() => {
    if (!job?.price) return null;
    return job.price - totalPaid;
  }, [job?.price, totalPaid]);

  const fallbackCurrency: 'EUR' | 'RSD' = 'EUR';

  const phone = job?.client?.phone ?? null;
  const phoneDigits = phone ? phone.replace(/[^\d+]/g, '') : null;

  const [customMessage, setCustomMessage] = useState('');

  const openUrl = useCallback(
    async (url: string) => {
      try {
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
          setError(t('jobs.actionNotSupported'));
          return;
        }
        await Linking.openURL(url);
      } catch {
        setError(t('jobs.actionFailed'));
      }
    },
    [t]
  );

  const onCall = useCallback(() => {
    if (!phoneDigits) return;
    void openUrl(`tel:${phoneDigits}`);
  }, [openUrl, phoneDigits]);

  const onSms = useCallback(() => {
      if (!phoneDigits) return;
      const message = customMessage.trim();
      if (!message) return;
      const separator = Platform.OS === 'ios' ? '&' : '?';
      const url = `sms:${phoneDigits}${separator}body=${encodeURIComponent(message)}`;
      void openUrl(url);
    }, [customMessage, openUrl, phoneDigits]);

  const onViber = useCallback(() => {
      if (!phoneDigits) return;
      const message = customMessage.trim();
      if (!message) return;
      const url = `viber://chat?number=${encodeURIComponent(phoneDigits)}&text=${encodeURIComponent(message)}`;
      void openUrl(url);
    }, [customMessage, openUrl, phoneDigits]);

  return (
    <ScrollView
      stickyHeaderIndices={[0]}
      className="flex-1 bg-[#F2F2F7] dark:bg-black"
      contentContainerClassName="pb-32">
      <View style={{ position: 'relative', zIndex: 20 }}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={35}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colorScheme === 'dark' ? 'rgba(28,28,30,0.28)' : 'rgba(255,255,255,0.28)' },
            ]}
          />
        )}

        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colorScheme === 'dark' ? 'rgba(28,28,30,0.28)' : 'rgba(255,255,255,0.28)' },
          ]}
        />

        <View className="px-6 pb-6" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.delete')}
              onPress={onDelete}
              className="mr-3 h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
              <Ionicons name="trash" size={18} color="#FF3B30" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.edit')}
              onPress={onEdit}
              className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
              <Ionicons name="create-outline" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>

          <Text className="mt-4 font-semibold text-[30px] leading-[36px] tracking-tight text-black dark:text-white">
            {job?.title || t('jobs.untitled')}
          </Text>
          <View className="mt-1 flex-row items-center">
            <Ionicons name="person-outline" size={16} color={colors.secondaryText} />
            <Text className="ml-2 text-base text-black/60 dark:text-white/70">
              {job?.client?.name || t('jobs.noClient')}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-6 pt-4">
        <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
          {loading ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : job ? (
            <>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.dateLabel')}</Text>
                <Text className="text-base text-black dark:text-white">{formatDate(job.scheduled_date)}</Text>
              </View>
              <View className="my-4 h-px bg-black/10 dark:bg-white/10" />

              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.statusLabel')}</Text>
                <View className="flex-row items-center">
                  <Text className="text-base text-black dark:text-white">{formatStatus(job.status)}</Text>
                  {job.completed_at ? (
                    <>
                      <Text className="mx-2 text-sm text-black/30 dark:text-white/30">•</Text>
                      <Text className="text-base text-black dark:text-white">
                        {formatCompletedDate(job.completed_at)}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
              <View className="my-4 h-px bg-black/10 dark:bg-white/10" />

              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.priceLabel')}</Text>
                <Text className="text-base text-black dark:text-white">
                {formatPrice(job.price)}
                </Text>
              </View>

              {job.description ? (
                <>
                  <View className="my-4 h-px bg-black/10 dark:bg-white/10" />
                  <Text className="text-sm font-medium text-black/60 dark:text-white/70">
                    {t('jobs.descriptionLabel')}
                  </Text>
                  <Text className="mt-2 text-base text-black/80 dark:text-white/80">{job.description}</Text>
                </>
              ) : null}

            </>
          ) : (
            <Text className="text-base text-black/60 dark:text-white/70">{t('jobs.notFound')}</Text>
          )}

          {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-black/70 dark:text-white/80">
              {t('jobs.financials')}
            </Text>
            <View className="flex-row items-center">
              <Pressable
                onPress={() => router.push({ pathname: '/(tabs)/posao/[id]/payment/new' as any, params: { id } })}
                className="mr-2 rounded-3xl bg-[#E8F0FF] px-3 py-2 dark:bg-[#1E2A44]">
                <Text className="text-sm font-semibold text-black dark:text-white">{t('jobs.addPayment')}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: '/(tabs)/posao/[id]/expense/new' as any, params: { id } })}
                className="rounded-3xl bg-[#FDEBEE] px-3 py-2 dark:bg-[#3A1F24]">
                <Text className="text-sm font-semibold text-black dark:text-white">{t('jobs.addExpense')}</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.totalPaid')}</Text>
              <Text className="text-base text-black dark:text-white">
                {formatPrice(totalPaid)}
              </Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.totalExpenses')}</Text>
              <Text className="text-base text-black dark:text-white">
                {formatPrice(totalExpense)}
              </Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.profit')}</Text>
              <Text className="text-base font-semibold text-black dark:text-white">
                {formatPrice(profit)}
              </Text>
            </View>
            {outstanding != null ? (
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.outstanding')}</Text>
                <Text className="text-base text-black dark:text-white">
                  {formatPrice(outstanding)}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="my-4 h-px bg-black/10 dark:bg-white/10" />
          <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.payments')}</Text>
          {payments.length === 0 ? (
            <Text className="mt-2 text-sm text-black/60 dark:text-white/70">{t('jobs.noPayments')}</Text>
          ) : (
            payments.map((p) => (
              <Pressable
                key={p.id}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/posao/[id]/payment/[paymentId]/edit' as any,
                    params: { id, paymentId: p.id },
                  })
                }
                className="mt-2 flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-sm text-black/80 dark:text-white/80" numberOfLines={1}>
                    {p.note || t('jobs.payment')}
                  </Text>
                  {p.payment_date ? (
                    <Text className="text-xs text-black/50 dark:text-white/60">{formatListDate(p.payment_date)}</Text>
                  ) : null}
                </View>
                <Text className="text-sm text-black/70 dark:text-white/80">
                  {formatPrice(p.amount ?? 0)}
                </Text>
              </Pressable>
            ))
          )}

          <View className="my-4 h-px bg-black/10 dark:bg-white/10" />
          <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.expenses')}</Text>
          {expenses.length === 0 ? (
            <Text className="mt-2 text-sm text-black/60 dark:text-white/70">{t('jobs.noExpenses')}</Text>
          ) : (
            expenses.map((e) => (
              <Pressable
                key={e.id}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/posao/[id]/expense/[expenseId]/edit' as any,
                    params: { id, expenseId: e.id },
                  })
                }
                className="mt-2 flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-sm text-black/80 dark:text-white/80" numberOfLines={1}>
                    {e.title || t('jobs.expense')}
                  </Text>
                  {e.created_at ? (
                    <Text className="text-xs text-black/50 dark:text-white/60">{formatListDate(e.created_at)}</Text>
                  ) : null}
                </View>
                <Text className="text-sm text-black/70 dark:text-white/80">
                  {formatPrice(e.amount ?? 0)}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
          <Text className="text-base font-semibold text-black/70 dark:text-white/80">{t('jobs.quickActions')}</Text>
          {phoneDigits ? (
            <View className="mt-3">
              <Text className="text-sm font-medium text-black/60 dark:text-white/70">
                {t('jobs.customMessage')}
              </Text>
              <View className="mt-2">
                <TextInput
                  value={customMessage}
                  onChangeText={setCustomMessage}
                  placeholder={t('jobs.customMessagePlaceholder')}
                  placeholderTextColor={colors.secondaryText}
                  multiline
                  className="min-h-[80px] rounded-3xl bg-black/5 px-4 py-3 text-base text-black dark:bg-white/10 dark:text-white"
                />
              </View>

              <View className="mt-3 flex-row flex-wrap justify-center">
                <Pressable
                  onPress={onCall}
                  className="mr-2 mt-2 flex-row items-center rounded-3xl bg-black/5 px-4 py-2 dark:bg-white/10">
                  <Ionicons name="call-outline" size={16} color={colors.text} />
                  <Text className="ml-2 text-sm text-black dark:text-white">{t('jobs.call')}</Text>
                </Pressable>

                <Pressable
                  onPress={onSms}
                  className="mr-2 mt-2 flex-row items-center rounded-3xl bg-[#E8F0FF] px-4 py-2 dark:bg-[#1E2A44]">
                  <Ionicons name="chatbubble-outline" size={16} color={colors.text} />
                  <Text className="ml-2 text-sm text-black dark:text-white">{t('jobs.sms')}</Text>
                </Pressable>

                <Pressable
                  onPress={onViber}
                  className="mr-2 mt-2 flex-row items-center rounded-3xl bg-[#E8F7EF] px-4 py-2 dark:bg-[#203326]">
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.text} />
                  <Text className="ml-2 text-sm text-black dark:text-white">{t('jobs.viber')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text className="mt-2 text-sm text-black/60 dark:text-white/70">{t('jobs.noPhone')}</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
