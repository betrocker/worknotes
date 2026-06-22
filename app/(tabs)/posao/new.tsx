import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
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
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { listClients } from '@/lib/clients';
import { isFreeJobLimitReached } from '@/lib/free-limits';
import { parseDateInput } from '@/lib/date';
import { countJobs, createJob } from '@/lib/jobs';
import { goBackOrReplace } from '@/lib/navigation';
import {
  getDefaultJobReminderPreference,
  scheduleJobReminder,
  setJobReminderPreference,
  type JobReminderOption,
} from '@/lib/notifications';
import { useAuth } from '@/providers/AuthProvider';
import { useBilling } from '@/providers/BillingProvider';
import { useCurrency } from '@/providers/CurrencyProvider';

type ClientOption = { id: string; name: string | null };

function getInitialScheduledDateValue(prefilledScheduledDate: string | null): string {
  if (prefilledScheduledDate) {
    const parsed = parseDateInput(prefilledScheduledDate);
    if (parsed) return prefilledScheduledDate;
  }
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewJobScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string; scheduledDate?: string }>();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { hasAccess } = useBilling();
  const { currency } = useCurrency();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const userId = session?.user?.id ?? null;
  const preselectedClientId = typeof params.clientId === 'string' ? params.clientId : null;
  const prefilledScheduledDate = typeof params.scheduledDate === 'string' ? params.scheduledDate : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [pendingReason, setPendingReason] = useState('');
  const [reminderType, setReminderType] = useState<JobReminderOption>('same_day');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState(() =>
    getInitialScheduledDateValue(prefilledScheduledDate)
  );
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientOpen, setClientOpen] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const placeholderTextColor = usePlaceholderTextColor(submitting);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToFormEnd = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === 'android' ? 260 : 120);
  }, []);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? null,
    [clientId, clients]
  );

  const statusOptions = useMemo(
    () => [
      { value: 'scheduled', label: t('jobs.statuses.scheduled') },
      { value: 'in_progress', label: t('jobs.statuses.inProgress') },
      { value: 'pending', label: t('jobs.statuses.pending') },
      { value: 'done', label: t('jobs.statuses.done') },
    ],
    [t]
  );

  const reminderOptions = useMemo(
    () => [
      { value: 'none' as const, label: t('jobs.reminders.none') },
      { value: 'same_day' as const, label: t('jobs.reminders.sameDay') },
      { value: 'day_before' as const, label: t('jobs.reminders.dayBefore') },
    ],
    [t]
  );

  const loadClients = useCallback(async () => {
    if (!userId) return;
    setLoadingClients(true);
    try {
      const data = await listClients(userId);
      const mapped = data.map((client) => ({ id: client.id, name: client.name }));
      setClients(mapped);
      setClientId((previous) => {
        if (preselectedClientId && mapped.some((client) => client.id === preselectedClientId)) {
          return preselectedClientId;
        }
        if (previous && mapped.some((client) => client.id === previous)) {
          return previous;
        }
        return null;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingClients(false);
    }
  }, [preselectedClientId, userId]);

  const resetJobForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setPrice('');
    setStatusValue('');
    setPendingReason('');
    setClientId(null);
    setClientOpen(false);
    setScheduledDate(getInitialScheduledDateValue(prefilledScheduledDate));
    setShowDatePicker(false);
    setSubmitting(false);
    setError(null);
  }, [prefilledScheduledDate]);

  useFocusEffect(
    useCallback(() => {
      resetJobForm();
      void loadClients();
      let isActive = true;
      (async () => {
        const nextReminder = await getDefaultJobReminderPreference();
        if (isActive) setReminderType(nextReminder);
      })();
      return () => {
        isActive = false;
        setClientOpen(false);
        setShowDatePicker(false);
      };
    }, [loadClients, resetJobForm])
  );

  const parseAmount = useCallback((value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d+([.,]\d{1,2})?$/.test(trimmed)) return null;
    const numeric = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
  }, []);

  const onSave = async () => {
    if (!userId) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('jobs.titleLabel') + ' *');
      return;
    }
    if (scheduledDate.trim()) {
      const parsed = parseDateInput(scheduledDate.trim());
      if (!parsed) {
        setError(t('jobs.dateLabel') + ' *');
        return;
      }
    }
    const numericPrice = parseAmount(price);
    if (numericPrice == null && price.trim()) {
      setError(t('jobs.amountInvalid'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (!hasAccess) {
        const existingJobs = await countJobs(userId);
        if (isFreeJobLimitReached(existingJobs)) {
          router.push({ pathname: '/paywall', params: { preview: '1' } });
          return;
        }
      }

      const job = await createJob(userId, {
        title: trimmedTitle,
        description: description.trim() || null,
        pending_reason: pendingReason.trim() || null,
        price: numericPrice,
        status: statusValue.trim() || null,
        scheduled_date: scheduledDate.trim() || null,
        client_id: clientId,
      });
      await setJobReminderPreference(job.id, reminderType);
      if (statusValue.trim() === 'scheduled' && scheduledDate.trim()) {
        await scheduleJobReminder({
          jobId: job.id,
          title: trimmedTitle,
          scheduledDate: scheduledDate.trim(),
          reminderType,
          clientName: selectedClient?.name ?? null,
        });
      }
      resetJobForm();
      router.replace({ pathname: '/(tabs)/poslovi' as any });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => {
    goBackOrReplace(router, { pathname: '/(tabs)/poslovi' as any });
  };

  const toggleClients = () => {
    setClientOpen((prev) => !prev);
  };

  const onClearClient = () => {
    setClientId(null);
  };

  const formatDate = useCallback((date: Date) => {
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }),
    [locale]
  );

  const parsedDate = useMemo(() => {
    if (!scheduledDate) return new Date();
    return parseDateInput(scheduledDate) ?? new Date();
  }, [scheduledDate]);

  const displayDate = useMemo(() => {
    if (!scheduledDate) return null;
    const parsed = parseDateInput(scheduledDate);
    if (!parsed) return scheduledDate;
    return dateFormatter.format(parsed);
  }, [dateFormatter, scheduledDate]);

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
      <StickyFormHeader
        title={t('jobs.add')}
        onBack={onBack}
        onSave={onSave}
        saveLabel={t('common.save')}
        submitting={submitting}
        scrollY={scrollY}
      />
      <Animated.ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 128 + keyboardHeight }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="always">
        <View className="px-6">
          <Text className="mb-1 text-[28px] font-semibold leading-[34px] text-black dark:text-white">
            {t('jobs.add')}
          </Text>
          {renderFormSection(t('jobs.basicSection'))}
          <View style={formSectionContentStyle}>
            <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('jobs.titleLabel')}</Text>
            <AppTextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('jobs.titleLabel')}
              placeholderTextColor={placeholderTextColor}
              className={fieldInputClassName}
              style={fieldInputStyle}
            />

            <Text className="mt-4 text-app-meta-lg font-medium text-black/60 dark:text-white/70">
              {t('jobs.clientLabel')}
            </Text>
            <View className="mt-2">
              <Pressable
                onPress={toggleClients}
                className={fieldPressableClassName}
                style={fieldPressableStyle}>
                <Text className="text-app-row text-black dark:text-white">
                  {selectedClient?.name || t('jobs.selectClient')}
                </Text>
                <Ionicons name={clientOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} />
              </Pressable>
              {selectedClient ? (
                <Pressable onPress={onClearClient} className="mt-2 flex-row items-center">
                  <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
                  <Text className="ml-2 text-app-meta text-black/60 dark:text-white/70">{t('jobs.clearClient')}</Text>
                </Pressable>
              ) : null}
            </View>

            {clientOpen ? (
              <View className="mt-3">
                {loadingClients ? (
                  <View className="items-center py-6">
                    <ActivityIndicator />
                  </View>
                ) : (
                  <>
                    {clients.length === 0 ? (
                      <View className="p-4">
                        <Text className="text-app-row text-black/60 dark:text-white/70">
                          {t('jobs.noClients')}
                        </Text>
                      </View>
                    ) : (
                      clients.map((item, index) => (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            setClientId(item.id);
                            setClientOpen(false);
                          }}
                          className={
                            index === 0
                              ? 'px-4 py-3'
                              : 'px-4 py-3 border-t border-black/10 dark:border-white/10'
                          }>
                          <Text className="text-app-row text-black dark:text-white">{item.name || '-'}</Text>
                        </Pressable>
                      ))
                    )}
                  </>
                )}
              </View>
            ) : null}
          </View>

          {renderFormSection(t('jobs.scheduleSection'))}
          <View style={formSectionContentStyle}>
            <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">
              {t('jobs.statusLabel')}
            </Text>
            <View className="mt-2 flex-row flex-wrap">
              {statusOptions.map((option) => {
                const selected = statusValue === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setStatusValue(option.value);
                    }}
                    className={[
                      'mr-2 mt-2 rounded-3xl px-4 py-2',
                      selected ? 'bg-[#007AFF] dark:bg-[#0A84FF]' : 'bg-black/5 dark:bg-white/10',
                    ].join(' ')}>
                    <Text className={selected ? 'text-app-meta font-semibold text-white' : 'text-app-meta text-black dark:text-white'}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {statusValue === 'pending' ? (
              <>
                <Text className="mt-4 text-app-meta-lg font-medium text-black/60 dark:text-white/70">
                  {t('jobs.pendingReasonLabel')}
                </Text>
                <AppTextInput
                  value={pendingReason}
                  onChangeText={setPendingReason}
                  placeholder={t('jobs.pendingReasonPlaceholder')}
                  placeholderTextColor={placeholderTextColor}
                  className={fieldInputClassName}
                  style={fieldInputStyle}
                />
              </>
            ) : null}

            <Text className="mt-4 text-app-meta-lg font-medium text-black/60 dark:text-white/70">
              {t('jobs.dateLabel')}
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className={fieldPressableClassName}
              style={fieldPressableStyle}>
              <Text className="text-app-row text-black dark:text-white">
                {displayDate || t('jobs.datePlaceholder')}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
            </Pressable>
            {scheduledDate ? (
              <Pressable onPress={() => setScheduledDate('')} className="mt-2 flex-row items-center">
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
                  if (selectedDate) setScheduledDate(formatDate(selectedDate));
                }}
              />
            ) : null}

            <Text className="mt-4 text-app-meta-lg font-medium text-black/60 dark:text-white/70">
              {t('jobs.reminderLabel')}
            </Text>
            <View className="mt-2 flex-row flex-wrap">
              {reminderOptions.map((option) => {
                const selected = reminderType === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setReminderType(option.value)}
                    className={[
                      'mr-2 mt-2 rounded-3xl px-4 py-2',
                      selected ? 'bg-[#007AFF] dark:bg-[#0A84FF]' : 'bg-black/5 dark:bg-white/10',
                    ].join(' ')}>
                    <Text
                      className={selected ? 'text-app-meta font-semibold text-white' : 'text-app-meta text-black dark:text-white'}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {renderFormSection(t('jobs.financials'))}
          <View style={formSectionContentStyle}>
            <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('jobs.priceLabel')}</Text>
            <AppTextInput
              value={price}
              onChangeText={setPrice}
              onFocus={scrollToFormEnd}
              keyboardType="decimal-pad"
              placeholder={t('jobs.priceLabel')}
              placeholderTextColor={placeholderTextColor}
              className={fieldInputClassName}
              style={fieldInputStyle}
            />
            <Text className="mt-1 text-app-meta text-black/50 dark:text-white/60">{t('jobs.amountEurNote', { currency })}</Text>
          </View>

          {renderFormSection(t('jobs.descriptionLabel'))}
          <View style={formSectionContentStyle}>
            <AppTextInput
              value={description}
              onChangeText={setDescription}
              onFocus={scrollToFormEnd}
              multiline
              textAlignVertical="top"
              placeholder={t('jobs.descriptionLabel')}
              placeholderTextColor={placeholderTextColor}
              className={descriptionInputClassName}
              style={descriptionInputStyle}
            />

            {error ? <Text className="mt-3 text-app-meta text-red-600">{error}</Text> : null}
          </View>
        </View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}
