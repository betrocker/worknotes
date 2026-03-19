import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { StickyFormHeader } from '@/components/StickyFormHeader';
import { useColorScheme } from '@/components/useColorScheme';
import { AppTextInput } from '@/components/AppTextInput';
import { parseDateInput } from '@/lib/date';
import { createPayment } from '@/lib/job-finance';

export default function NewPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; returnTo?: string }>();
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const jobId = typeof params.id === 'string' ? params.id : null;
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : 'job';

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
    [locale]
  );

  const formatDate = useCallback((date: Date) => {
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);
  const [paymentDate, setPaymentDate] = useState(() => formatDate(new Date()));

  useFocusEffect(
    useCallback(() => {
      setAmount('');
      setNote('');
      setShowDatePicker(false);
      setSubmitting(false);
      setError(null);
      setPaymentDate(formatDate(new Date()));
    }, [formatDate])
  );

  const parsedDate = useMemo(() => {
    if (!paymentDate) return new Date();
    return parseDateInput(paymentDate) ?? new Date();
  }, [paymentDate]);

  const displayDate = useMemo(() => {
    if (!paymentDate) return null;
    const parsed = parseDateInput(paymentDate);
    if (!parsed) return paymentDate;
    return dateFormatter.format(parsed);
  }, [dateFormatter, paymentDate]);

  const parseAmount = useCallback((value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d+([.,]\d{1,2})?$/.test(trimmed)) return null;
    const numeric = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
  }, []);

  const goBackOrJobDetail = useCallback(() => {
    if (returnTo === 'home') {
      router.replace('/(tabs)' as any);
      return;
    }
    if (returnTo === 'clients') {
      router.replace('/(tabs)/klijenti' as any);
      return;
    }
    if (returnTo === 'debts') {
      router.replace('/(tabs)/dugovanja' as any);
      return;
    }
    router.replace({ pathname: '/(tabs)/posao/[id]' as any, params: { id: jobId } });
  }, [jobId, returnTo, router]);

  const onSave = async () => {
    if (!jobId) return;
    let didNavigate = false;
    const numericAmount = parseAmount(amount);
    if (numericAmount == null) {
      setError(t('jobs.amountInvalid'));
      return;
    }
    if (paymentDate.trim()) {
      const parsed = parseDateInput(paymentDate.trim());
      if (!parsed) {
        setError(t('jobs.paymentDateLabel') + ' *');
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      await createPayment(jobId, {
        amount: numericAmount,
        payment_date: paymentDate.trim() || null,
        note: note.trim() || null,
      });
      didNavigate = true;
      goBackOrJobDetail();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!didNavigate) setSubmitting(false);
    }
  };

  const onBack = () => {
    goBackOrJobDetail();
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F2F2F7] dark:bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
      <ScrollView
        stickyHeaderIndices={[0]}
        className="flex-1"
        contentContainerClassName="pb-32"
        keyboardShouldPersistTaps="handled">
        <StickyFormHeader
          title={t('jobs.addPayment')}
          onBack={onBack}
          onSave={onSave}
          saveLabel={t('common.save')}
          submitting={submitting}
        />

        <View className="px-6">
          <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
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
                  setShowDatePicker(false);
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

            {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
