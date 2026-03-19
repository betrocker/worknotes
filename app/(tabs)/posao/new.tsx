import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { StickyFormHeader } from '@/components/StickyFormHeader';
import { useColorScheme } from '@/components/useColorScheme';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { listClients } from '@/lib/clients';
import { parseDateInput } from '@/lib/date';
import { createJob } from '@/lib/jobs';
import {
  getDefaultJobReminderPreference,
  scheduleJobReminder,
  setJobReminderPreference,
  type JobReminderOption,
} from '@/lib/notifications';
import { useAuth } from '@/providers/AuthProvider';

type ClientOption = { id: string; name: string | null };

export default function NewJobScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string }>();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const userId = session?.user?.id ?? null;
  const preselectedClientId = typeof params.clientId === 'string' ? params.clientId : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [statusText, setStatusText] = useState('');
  const [reminderType, setReminderType] = useState<JobReminderOption>('same_day');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientOpen, setClientOpen] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const placeholderTextColor = usePlaceholderTextColor(submitting);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? null,
    [clientId, clients]
  );

  const statusOptions = useMemo(
    () => [
      { value: 'scheduled', label: t('jobs.statuses.scheduled') },
      { value: 'in_progress', label: t('jobs.statuses.inProgress') },
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

  useEffect(() => {
    if (statusValue === 'scheduled') {
      setStatusText(t('jobs.statuses.scheduled'));
    } else if (statusValue === 'in_progress') {
      setStatusText(t('jobs.statuses.inProgress'));
    } else if (statusValue === 'done') {
      setStatusText(t('jobs.statuses.done'));
    }
  }, [statusValue, t]);


  const loadClients = useCallback(async () => {
    if (!userId) return;
    setLoadingClients(true);
    try {
      const data = await listClients(userId);
      const mapped = data.map((client) => ({ id: client.id, name: client.name }));
      setClients(mapped);
      if (preselectedClientId && mapped.some((client) => client.id === preselectedClientId)) {
        setClientId(preselectedClientId);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingClients(false);
    }
  }, [preselectedClientId, userId]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const nextReminder = await getDefaultJobReminderPreference();
      if (mounted) setReminderType(nextReminder);
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
      const job = await createJob(userId, {
        title: trimmedTitle,
        description: description.trim() || null,
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
      router.replace({ pathname: '/(tabs)/poslovi' as any });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => {
    router.replace({ pathname: '/(tabs)/poslovi' as any });
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
  const [scheduledDate, setScheduledDate] = useState(() => formatDate(new Date()));

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
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
          title={t('jobs.add')}
          onBack={onBack}
          onSave={onSave}
          saveLabel={t('common.save')}
          submitting={submitting}
        />

        <View className="px-6">
          <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
            <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.titleLabel')}</Text>
            <AppTextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('jobs.titleLabel')}
              placeholderTextColor={placeholderTextColor}
              className="mt-2"
            />

            <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">
              {t('jobs.clientLabel')}
            </Text>
            <View className="mt-2">
              <Pressable
                onPress={toggleClients}
                className="flex-row items-center justify-between rounded-3xl bg-black/5 px-4 py-3 dark:bg-white/10">
                <Text className="text-base text-black dark:text-white">
                  {selectedClient?.name || t('jobs.selectClient')}
                </Text>
                <Ionicons name={clientOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} />
              </Pressable>
              {selectedClient ? (
                <Pressable onPress={onClearClient} className="mt-2 flex-row items-center">
                  <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
                  <Text className="ml-2 text-sm text-black/60 dark:text-white/70">{t('jobs.clearClient')}</Text>
                </Pressable>
              ) : null}
            </View>

            {clientOpen ? (
              <View className="mt-3 overflow-hidden rounded-3xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-[#1C1C1E]/80">
                {loadingClients ? (
                  <View className="items-center py-6">
                    <ActivityIndicator />
                  </View>
                ) : (
                  <>
                    {clients.length === 0 ? (
                      <View className="p-4">
                        <Text className="text-base text-black/60 dark:text-white/70">
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
                          <Text className="text-base text-black dark:text-white">{item.name || '-'}</Text>
                        </Pressable>
                      ))
                    )}
                  </>
                )}
              </View>
            ) : null}

            <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">
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
                      setStatusText(option.label);
                    }}
                    className={[
                      'mr-2 mt-2 rounded-3xl px-4 py-2',
                      selected
                        ? 'bg-[#007AFF] dark:bg-[#0A84FF]'
                        : 'bg-black/5 dark:bg-white/10',
                    ].join(' ')}>
                    <Text className={selected ? 'text-sm font-semibold text-white' : 'text-sm text-black dark:text-white'}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <AppTextInput
              value={statusText}
              onChangeText={(text) => {
                setStatusText(text);
                setStatusValue(text);
              }}
              placeholder={t('jobs.statusPlaceholder')}
              placeholderTextColor={placeholderTextColor}
              className="mt-3"
            />

            <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">
              {t('jobs.dateLabel')}
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="mt-2 flex-row items-center justify-between rounded-3xl bg-black/5 px-4 py-3 dark:bg-white/10">
              <Text className="text-base text-black dark:text-white">
                {displayDate || t('jobs.datePlaceholder')}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={colors.text} />
            </Pressable>
            {scheduledDate ? (
              <Pressable onPress={() => setScheduledDate('')} className="mt-2 flex-row items-center">
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
                  if (selectedDate) setScheduledDate(formatDate(selectedDate));
                }}
              />
            ) : null}

            <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">
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
                      selected
                        ? 'bg-[#007AFF] dark:bg-[#0A84FF]'
                        : 'bg-black/5 dark:bg-white/10',
                    ].join(' ')}>
                    <Text
                      className={
                        selected
                          ? 'text-sm font-semibold text-white'
                          : 'text-sm text-black dark:text-white'
                      }>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

          <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">{t('jobs.priceLabel')}</Text>
          <AppTextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder={t('jobs.priceLabel')}
            placeholderTextColor={placeholderTextColor}
            className="mt-2"
          />
          <Text className="mt-1 text-xs text-black/50 dark:text-white/60">{t('jobs.amountEurNote')}</Text>

            <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">
              {t('jobs.descriptionLabel')}
            </Text>
            <AppTextInput
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              placeholder={t('jobs.descriptionLabel')}
              placeholderTextColor={placeholderTextColor}
              className="mt-2 min-h-[96px]"
            />

            {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
