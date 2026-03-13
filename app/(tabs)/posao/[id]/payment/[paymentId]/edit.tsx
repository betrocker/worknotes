import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { AppTextInput } from '@/components/AppTextInput';
import { getPaymentById, updatePayment, deletePayment } from '@/lib/job-finance';

export default function EditPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; paymentId?: string }>();
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const jobId = typeof params.id === 'string' ? params.id : null;
  const paymentId = typeof params.paymentId === 'string' ? params.paymentId : null;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
    [locale]
  );

  const formatDate = (date: Date) => {
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const parsedDate = useMemo(() => {
    if (!paymentDate) return new Date();
    const parsed = new Date(paymentDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [paymentDate]);

  const displayDate = useMemo(() => {
    if (!paymentDate) return null;
    const parsed = new Date(paymentDate);
    if (Number.isNaN(parsed.getTime())) return paymentDate;
    return dateFormatter.format(parsed);
  }, [dateFormatter, paymentDate]);

  const parseAmount = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d+([.,]\d{1,2})?$/.test(trimmed)) return null;
    const numeric = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
  };


  useEffect(() => {
    if (!paymentId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getPaymentById(paymentId);
        if (!mounted) return;
        if (data) {
          setAmount(data.amount == null ? '' : String(data.amount));
          setNote(data.note ?? '');
          setPaymentDate(data.payment_date ?? '');
        }
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [paymentId]);

  const onSave = async () => {
    if (!paymentId || !jobId) return;
    const numericAmount = parseAmount(amount);
    if (numericAmount == null) {
      setError(t('jobs.amountInvalid'));
      return;
    }
    if (paymentDate.trim()) {
      const parsed = new Date(paymentDate.trim());
      if (Number.isNaN(parsed.getTime())) {
        setError(t('jobs.paymentDateLabel') + ' *');
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      await updatePayment(paymentId, {
        amount: numericAmount,
        payment_date: paymentDate.trim() || null,
        note: note.trim() || null,
      });
      router.replace({ pathname: '/(tabs)/posao/[id]' as any, params: { id: jobId } });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = () => {
    if (!paymentId || !jobId) return;
    Alert.alert(t('jobs.deletePaymentTitle'), t('jobs.deletePaymentMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('jobs.deletePayment'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePayment(paymentId);
            router.replace({ pathname: '/(tabs)/posao/[id]' as any, params: { id: jobId } });
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  const onBack = () => {
    router.replace({ pathname: '/(tabs)/posao/[id]' as any, params: { id: jobId } });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F2F2F7] dark:bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
      <ScrollView className="flex-1" contentContainerClassName="pb-32" keyboardShouldPersistTaps="handled">
        <View className="px-6 pb-4 pt-14">
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
                accessibilityLabel={t('jobs.deletePayment')}
                onPress={onDelete}
                className="mr-3 h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
                <Ionicons name="trash" size={18} color="#FF3B30" />
              </Pressable>
              <Pressable
                disabled={submitting}
                onPress={onSave}
                className="h-10 items-center justify-center rounded-3xl bg-[#007AFF] px-5 disabled:opacity-60 dark:bg-[#0A84FF]">
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-base font-semibold text-white">{t('common.save')}</Text>
                )}
              </Pressable>
            </View>
          </View>

          <Text className="mt-4 font-semibold text-[34px] leading-[40px] tracking-tight text-black dark:text-white">
            {t('jobs.editPayment')}
          </Text>
        </View>

        <View className="px-6">
          <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
            {loading ? (
              <View className="items-center py-6">
                <ActivityIndicator />
              </View>
            ) : (
              <>
            <Text className="text-sm font-medium text-black/60 dark:text-white/70">
              {t('jobs.paymentAmountLabel')}
            </Text>
            <AppTextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={t('jobs.paymentAmountLabel')}
              className="mt-2"
            />
            <Text className="mt-1 text-xs text-black/50 dark:text-white/60">{t('jobs.amountEurNote')}</Text>

            <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">
              {t('jobs.paymentDateLabel')}
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="mt-2 flex-row items-center justify-between rounded-3xl bg-black/5 px-4 py-3 dark:bg-white/10">
              <Text className="text-base text-black dark:text-white">
                {displayDate || t('jobs.paymentDatePlaceholder')}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
            </Pressable>
            {paymentDate ? (
              <Pressable onPress={() => setPaymentDate('')} className="mt-2 flex-row items-center">
                <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
                <Text className="ml-2 text-sm text-black/60 dark:text-white/70">{t('jobs.clearDate')}</Text>
              </Pressable>
            ) : null}
            {showDatePicker ? (
              <DateTimePicker
                value={parsedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(event, selectedDate) => {
                  if (Platform.OS !== 'ios') setShowDatePicker(false);
                  if (event.type === 'dismissed') return;
                  if (selectedDate) setPaymentDate(formatDate(selectedDate));
                }}
              />
            ) : null}

            <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">
              {t('jobs.paymentNoteLabel')}
            </Text>
            <AppTextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('jobs.paymentNoteLabel')}
              className="mt-2"
            />
              </>
            )}

            {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
