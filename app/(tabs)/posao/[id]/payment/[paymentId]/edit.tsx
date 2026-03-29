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
import { StickyFormHeader } from '@/components/StickyFormHeader';
import { useColorScheme } from '@/components/useColorScheme';
import { AppTextInput } from '@/components/AppTextInput';
import { parseDateInput } from '@/lib/date';
import { getPaymentById, updatePayment, deletePayment } from '@/lib/job-finance';

export default function EditPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; paymentId?: string; returnTo?: string }>();
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const jobId = typeof params.id === 'string' ? params.id : null;
  const paymentId = typeof params.paymentId === 'string' ? params.paymentId : null;
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : 'job';

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
    return parseDateInput(paymentDate) ?? new Date();
  }, [paymentDate]);

  const displayDate = useMemo(() => {
    if (!paymentDate) return null;
    const parsed = parseDateInput(paymentDate);
    if (!parsed) return paymentDate;
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

  const goBackOrJobDetail = () => {
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
      await updatePayment(paymentId, {
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
            goBackOrJobDetail();
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
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
          title={t('jobs.editPayment')}
          onBack={onBack}
          onSave={onSave}
          saveLabel={t('common.save')}
          submitting={submitting}
          right={
            <View className="mr-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('jobs.deletePayment')}
                onPress={onDelete}
                className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white dark:border-white/10 dark:bg-[#1C1C1E]">
                <Ionicons name="trash" size={18} color="#FF3B30" />
              </Pressable>
            </View>
          }
        />

        <View className="px-6">
          <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
            {loading ? (
              <View className="items-center py-6">
                <ActivityIndicator />
              </View>
            ) : (
              <>
            <Text className="text-app-meta font-medium text-black/60 dark:text-white/70">
              {t('jobs.paymentAmountLabel')}
            </Text>
            <AppTextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={t('jobs.paymentAmountLabel')}
              className="mt-2"
            />
            <Text className="mt-1 text-app-meta text-black/50 dark:text-white/60">{t('jobs.amountEurNote')}</Text>

            <Text className="mt-4 text-app-meta font-medium text-black/60 dark:text-white/70">
              {t('jobs.paymentDateLabel')}
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="mt-2 flex-row items-center justify-between rounded-3xl bg-black/5 px-4 py-3 dark:bg-white/10">
              <Text className="text-app-row text-black dark:text-white">
                {displayDate || t('jobs.paymentDatePlaceholder')}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
            </Pressable>
            {paymentDate ? (
              <Pressable onPress={() => setPaymentDate('')} className="mt-2 flex-row items-center">
                <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
                <Text className="ml-2 text-app-meta text-black/60 dark:text-white/70">{t('jobs.clearDate')}</Text>
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

            <Text className="mt-4 text-app-meta font-medium text-black/60 dark:text-white/70">
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

            {error ? <Text className="mt-3 text-app-meta text-red-600">{error}</Text> : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
