import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
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
import { createExpense } from '@/lib/job-finance';

export default function NewExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const jobId = typeof params.id === 'string' ? params.id : null;

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseAmount = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d+([.,]\d{1,2})?$/.test(trimmed)) return null;
    const numeric = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
  };

  const onSave = async () => {
    if (!jobId) return;
    const numericAmount = parseAmount(amount);
    if (numericAmount == null) {
      setError(t('jobs.amountInvalid'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createExpense(jobId, {
        amount: numericAmount,
        title: title.trim() || null,
      });
      router.replace({ pathname: '/(tabs)/posao/[id]' as any, params: { id: jobId } });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
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

          <Text className="mt-4 font-semibold text-[34px] leading-[40px] tracking-tight text-black dark:text-white">
            {t('jobs.addExpense')}
          </Text>
        </View>

        <View className="px-6">
          <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
            <Text className="text-sm font-medium text-black/60 dark:text-white/70">
              {t('jobs.expenseAmountLabel')}
            </Text>
            <AppTextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={t('jobs.expenseAmountLabel')}
              className="mt-2"
            />
            <Text className="mt-1 text-xs text-black/50 dark:text-white/60">{t('jobs.amountEurNote')}</Text>

            <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">
              {t('jobs.expenseTitleLabel')}
            </Text>
            <AppTextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('jobs.expenseTitleLabel')}
              className="mt-2"
            />

            {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
