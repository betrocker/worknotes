import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { parseDateInput } from '@/lib/date';
import type { ClientOpenDebtJob } from '@/lib/clients';

type Props = {
  visible: boolean;
  clientName: string | null;
  jobs: (ClientOpenDebtJob & { clientName?: string | null })[];
  onClose: () => void;
  onSelect: (jobId: string) => void;
};

export function PaymentJobPickerModal({ visible, clientName, jobs, onClose, onSelect }: Props) {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const modalWidth = Math.max(280, Math.round(windowWidth * 0.8));
  const modalMaxHeight = Math.max(300, Math.min(480, Math.round(windowHeight * 0.69)));
  const modalBackgroundColor = isDark ? Colors.dark.menuSurface : '#FFFFFF';
  const modalBorderColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(60,60,67,0.12)';
  const modalBackdropColor = isDark ? 'rgba(0,0,0,0.42)' : 'rgba(16,24,40,0.22)';

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
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }),
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
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: modalBackdropColor }}>
        <Pressable onPress={onClose} className="absolute inset-0" />
        <View
          style={{
            width: modalWidth,
            maxHeight: modalMaxHeight,
            borderRadius: 30,
            borderWidth: 1,
            borderColor: modalBorderColor,
            overflow: 'hidden',
            backgroundColor: modalBackgroundColor,
          }}>
          <View style={{ height: 64, backgroundColor: modalBackgroundColor }}>
            <View className="h-full flex-row items-center justify-between px-4">
              <View className="h-9 w-9" />
              <Text className="flex-1 text-center text-app-row-title font-semibold" style={{ color: colors.text }} numberOfLines={1}>
                {clientName || t('clients.selectPaymentJob')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                onPress={onClose}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)' }}>
                <Ionicons name="close" size={19} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: modalMaxHeight - 64 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 18 }}>
            <Text className="mb-4 text-center text-app-row" style={{ color: colors.secondaryText }}>
              {t('clients.selectPaymentJob')}
            </Text>
            {jobs.map((job) => (
              <Pressable
                key={job.id}
                onPress={() => onSelect(job.id)}
                className="flex-row items-center py-2.5">
                <View className="flex-1 flex-row items-center justify-between">
                  <View className="mr-3 flex-1">
                    <Text className="text-base" style={{ color: colors.text }} numberOfLines={1}>
                      {job.title || t('jobs.untitled')}
                    </Text>
                    <Text className="text-app-meta-lg" style={{ color: colors.secondaryText }} numberOfLines={1}>
                      {job.clientName ? `${job.clientName} • ${formatDate(job.scheduled_date)}` : formatDate(job.scheduled_date)}
                    </Text>
                  </View>
                  <View className="items-end justify-center">
                    <Text className="text-app-row text-[#C84D4D] dark:text-[#FF8A8A]">
                      {moneyFormatter.format(job.debt)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} style={{ marginLeft: 8 }} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
