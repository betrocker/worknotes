import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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

import { StickyFormHeader } from '@/components/StickyFormHeader';
import { AppTextInput } from '@/components/AppTextInput';
import { getExpenseById, updateExpense, deleteExpense } from '@/lib/job-finance';

export default function EditExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; expenseId?: string }>();
  const { t } = useTranslation();

  const jobId = typeof params.id === 'string' ? params.id : null;
  const expenseId = typeof params.expenseId === 'string' ? params.expenseId : null;

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parseAmount = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d+([.,]\d{1,2})?$/.test(trimmed)) return null;
    const numeric = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
  };

  useEffect(() => {
    if (!expenseId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getExpenseById(expenseId);
        if (!mounted) return;
        if (data) {
          setAmount(data.amount == null ? '' : String(data.amount));
          setTitle(data.title ?? '');
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
  }, [expenseId]);

  const onSave = async () => {
    if (!expenseId || !jobId) return;
    const numericAmount = parseAmount(amount);
    if (numericAmount == null) {
      setError(t('jobs.amountInvalid'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateExpense(expenseId, {
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

  const onDelete = () => {
    if (!expenseId || !jobId) return;
    Alert.alert(t('jobs.deleteExpenseTitle'), t('jobs.deleteExpenseMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('jobs.deleteExpense'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpense(expenseId);
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
      <ScrollView
        stickyHeaderIndices={[0]}
        className="flex-1"
        contentContainerClassName="pb-32"
        keyboardShouldPersistTaps="handled">
        <StickyFormHeader
          title={t('jobs.editExpense')}
          onBack={onBack}
          onSave={onSave}
          saveLabel={t('common.save')}
          submitting={submitting}
          right={
            <View className="mr-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('jobs.deleteExpense')}
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
              </>
            )}

            {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
