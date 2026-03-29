import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { parseDateInput } from '@/lib/date';
import type { ClientOpenDebtJob } from '@/lib/clients';

type Props = {
  visible: boolean;
  clientName: string | null;
  jobs: ClientOpenDebtJob[];
  onClose: () => void;
  onSelect: (jobId: string) => void;
};

export function PaymentJobPickerModal({ visible, clientName, jobs, onClose, onSelect }: Props) {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;

  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
    [locale]
  );

  const formatDate = (value: string | null) => {
    if (!value) return t('jobs.unscheduled');
    const parsed = parseDateInput(value);
    if (!parsed) return value;
    return dateFormatter.format(parsed);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/35 px-6">
        <Pressable onPress={onClose} className="absolute inset-0" />
        <View className="w-full max-w-[360px] overflow-hidden rounded-3xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#1C1C1E]">
          <Pressable
            onPress={onClose}
            className="absolute right-4 top-4 z-10 h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>

          <View className="flex-row items-start">
            <View className="mr-12 flex-1">
              <Text className="text-app-row-lg font-semibold text-black dark:text-white" numberOfLines={1}>
                {clientName || t('clients.selectPaymentJob')}
              </Text>
              <Text className="mt-1 text-app-meta-lg text-black/55 dark:text-white/65">
                {t('clients.selectPaymentJob')}
              </Text>
            </View>
          </View>

          <View className="mt-4">
            {jobs.map((job, index) => (
              <Pressable
                key={job.id}
                onPress={() => onSelect(job.id)}
                className="py-3"
                style={{
                  borderTopWidth: index > 0 ? 1 : 0,
                  borderTopColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(60,60,67,0.12)',
                }}>
                <View className="flex-row items-start justify-between">
                  <View className="mr-3 flex-1">
                    <Text className="text-app-row font-semibold text-black dark:text-white" numberOfLines={1}>
                      {job.title || t('jobs.untitled')}
                    </Text>
                    <Text className="mt-1 text-app-meta-lg text-black/55 dark:text-white/65">
                      {formatDate(job.scheduled_date)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-app-row font-extrabold text-[#C84D4D]">
                      {moneyFormatter.format(job.debt)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
