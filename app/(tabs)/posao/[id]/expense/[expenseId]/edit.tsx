import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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

import { StickyFormHeader } from '@/components/StickyFormHeader';
import { useColorScheme } from '@/components/useColorScheme';
import { AppTextInput } from '@/components/AppTextInput';
import { getExpenseById, updateExpense, deleteExpense } from '@/lib/job-finance';
import { goBackOrReplace } from '@/lib/navigation';

export default function EditExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; expenseId?: string }>();
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const scrollY = useRef(new Animated.Value(0)).current;

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
    goBackOrReplace(router, { pathname: '/(tabs)/posao/[id]' as any, params: { id: jobId } });
  };

  const sectionSeparatorColor = colorScheme === 'dark' ? 'rgba(84,84,88,0.38)' : 'rgba(60,60,67,0.14)';
  const formSectionContentStyle = { marginLeft: 12, marginTop: 8 };
  const fieldInputClassName = 'mt-2 rounded-xl bg-black/[0.035] px-0 py-0 dark:bg-white/[0.07]';
  const fieldInputStyle = { height: 38, paddingHorizontal: 10, paddingVertical: 0 };

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
          title={t('jobs.editExpense')}
          onBack={onBack}
          onSave={onSave}
          saveLabel={t('common.save')}
          submitting={submitting}
          scrollY={scrollY}
          right={
            <View className="mr-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('jobs.deleteExpense')}
                onPress={onDelete}
                className="h-10 w-10 items-center justify-center">
                <Ionicons name="trash" size={18} color="#FF3B30" />
              </Pressable>
            </View>
          }
        />

        <View className="px-6">
          <Text className="mb-1 text-[28px] font-semibold leading-[34px] text-black dark:text-white">
            {t('jobs.editExpense')}
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
                  {t('jobs.expenseAmountLabel')}
                </Text>
                <AppTextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder={t('jobs.expenseAmountLabel')}
                  className={fieldInputClassName}
                  style={fieldInputStyle}
                />
                <Text className="mt-1 text-app-meta text-black/50 dark:text-white/60">{t('jobs.amountEurNote')}</Text>
                </View>

                {renderFormSection(t('jobs.descriptionLabel'))}
                <View style={formSectionContentStyle}>
                <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">
                  {t('jobs.expenseTitleLabel')}
                </Text>
                <AppTextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('jobs.expenseTitleLabel')}
                  className={fieldInputClassName}
                  style={fieldInputStyle}
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
