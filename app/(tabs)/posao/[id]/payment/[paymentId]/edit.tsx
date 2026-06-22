import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { StickyFormHeader } from '@/components/StickyFormHeader';
import { useColorScheme } from '@/components/useColorScheme';
import { AppTextInput } from '@/components/AppTextInput';
import { parseDateInput } from '@/lib/date';
import { getPaymentById, updatePayment, deletePayment } from '@/lib/job-finance';
import { goBackOrReplace } from '@/lib/navigation';
import { useCurrency } from '@/providers/CurrencyProvider';

export default function EditPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; paymentId?: string; returnTo?: string }>();
  const { t, i18n } = useTranslation();
  const { currency } = useCurrency();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const scrollY = useRef(new Animated.Value(0)).current;

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
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }),
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

  const getReturnHref = () => {
    if (returnTo === 'home') {
      return '/(tabs)' as any;
    }
    if (returnTo === 'clients') {
      return '/(tabs)/klijenti' as any;
    }
    if (returnTo === 'debts') {
      return '/(tabs)/dugovanja' as any;
    }
    return { pathname: '/(tabs)/posao/[id]' as any, params: { id: jobId } };
  };

  const replaceWithReturnTarget = () => {
    router.replace(getReturnHref());
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
      replaceWithReturnTarget();
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
            replaceWithReturnTarget();
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  const onBack = () => {
    goBackOrReplace(router, getReturnHref());
  };

  const sectionSeparatorColor = colorScheme === 'dark' ? 'rgba(84,84,88,0.38)' : 'rgba(60,60,67,0.14)';
  const formSectionContentStyle = { marginLeft: 12, marginTop: 8 };
  const fieldInputClassName = 'mt-2 rounded-xl bg-black/[0.035] px-0 py-0 dark:bg-white/[0.07]';
  const descriptionInputClassName = 'min-h-[76px] rounded-xl bg-black/[0.035] px-0 py-0 dark:bg-white/[0.07]';
  const fieldPressableClassName = 'mt-2 flex-row items-center justify-between rounded-xl bg-black/[0.035] py-1.5 dark:bg-white/[0.07]';
  const fieldInputStyle = { height: 38, paddingHorizontal: 10, paddingVertical: 0 };
  const fieldPressableStyle = { minHeight: 38, paddingHorizontal: 10 };
  const descriptionInputStyle = { minHeight: 76, paddingHorizontal: 10, paddingVertical: 8 };

  const renderFormSection = (title: string) => (
    <View className="mt-5">
      <View className="px-1">
        <Text
          className="text-app-row-title font-semibold"
          style={{ color: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3' }}>
          {title}
        </Text>
      </View>
      <View className="mt-2 h-px" style={{ backgroundColor: sectionSeparatorColor }} />
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F2F2F7] dark:bg-[#1D2229]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
      <Animated.ScrollView
        stickyHeaderIndices={[0]}
        className="flex-1"
        contentContainerClassName="pb-32"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled">
        <StickyFormHeader
          title={t('jobs.editPayment')}
          onBack={onBack}
          onSave={onSave}
          saveLabel={t('common.save')}
          submitting={submitting}
          scrollY={scrollY}
          right={
            <View className="mr-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('jobs.deletePayment')}
                onPress={onDelete}
                className="h-10 w-10 items-center justify-center">
                <Ionicons name="trash" size={18} color="#FF3B30" />
              </Pressable>
            </View>
          }
        />

        <View className="px-6">
          <Text className="mb-1 text-[28px] font-semibold leading-[34px] text-black dark:text-white">
            {t('jobs.editPayment')}
          </Text>
          <View>
            {loading ? (
              <View className="items-center py-6">
                <ActivityIndicator />
              </View>
            ) : (
              <>
            {renderFormSection(t('jobs.financials'))}
            <View style={formSectionContentStyle}>
            <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">
              {t('jobs.paymentAmountLabel')}
            </Text>
            <AppTextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={t('jobs.paymentAmountLabel')}
              className={fieldInputClassName}
              style={fieldInputStyle}
            />
            <Text className="mt-1 text-app-meta text-black/50 dark:text-white/60">{t('jobs.amountEurNote', { currency })}</Text>

            <Text className="mt-4 text-app-meta-lg font-medium text-black/60 dark:text-white/70">
              {t('jobs.paymentDateLabel')}
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className={fieldPressableClassName}
              style={fieldPressableStyle}>
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
            </View>

            {renderFormSection(t('jobs.paymentNoteLabel'))}
            <View style={formSectionContentStyle}>
            <AppTextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('jobs.paymentNoteLabel')}
              className={descriptionInputClassName}
              style={descriptionInputStyle}
            />
            </View>
              </>
            )}

            {error ? <Text className="mt-3 text-app-meta text-red-600">{error}</Text> : null}
          </View>
        </View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}
