import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Easing, Linking, Modal, PanResponder, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { CollapsingMainHeader, MainScreenTitle } from '@/components/CollapsingMainHeader';
import { EmptyState } from '@/components/EmptyState';
import { PaymentJobPickerModal } from '@/components/PaymentJobPickerModal';
import { useQuickFindSwipeDown } from '@/components/useQuickFindSwipeDown';
import { useColorScheme } from '@/components/useColorScheme';
import { useMoneyFormatter } from '@/components/useMoneyFormatter';
import { listClientOpenDebtJobs, listClientsWithDebt, type ClientOpenDebtJob, type ClientWithDebt } from '@/lib/clients';
import { setMainFloatingActionsHidden } from '@/lib/floating-actions-visibility';
import { goBackOrReplace } from '@/lib/navigation';
import { triggerSelectionHaptic } from '@/lib/haptics';
import { useAuth } from '@/providers/AuthProvider';

type DebtSwipeSelectRowProps = {
  selected: boolean;
  selectionMode: boolean;
  colorScheme: 'light' | 'dark';
  children: React.ReactNode;
  onOpen: () => void;
  onToggleSelected: () => void;
};

const DEBT_SELECT_SWIPE_THRESHOLD = 36;
const DEBT_SELECT_SWIPE_MAX = 56;
const DEBT_SELECT_GESTURE_START = 3;
const DEBT_SELECT_HORIZONTAL_BIAS = 0.72;

function getSerbianPluralForm(count: number) {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'other';
}

function DebtSelectionCircle({ selected, colorScheme }: { selected: boolean; colorScheme: 'light' | 'dark' }) {
  const accent = colorScheme === 'dark' ? '#72A8FF' : '#1C60C3';
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: selected ? accent : colorScheme === 'dark' ? 'rgba(255,255,255,0.36)' : 'rgba(60,60,67,0.28)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {selected ? (
        <View
          style={{
            width: 11,
            height: 11,
            borderRadius: 5.5,
            backgroundColor: accent,
          }}
        />
      ) : null}
    </View>
  );
}

function DebtSwipeSelectRow({
  selected,
  selectionMode,
  colorScheme,
  children,
  onOpen,
  onToggleSelected,
}: DebtSwipeSelectRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const circleProgress = useRef(new Animated.Value(selectionMode ? 1 : 0)).current;
  const maxSwipeDistanceRef = useRef(0);
  const currentSwipeDistanceRef = useRef(0);
  const suppressOpenRef = useRef(false);
  const [swiping, setSwiping] = useState(false);

  useEffect(() => {
    Animated.spring(circleProgress, {
      toValue: selectionMode ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    }).start();
  }, [circleProgress, selectionMode]);

  const resetSwipe = useCallback(() => {
    const duration = Math.min(190, Math.max(90, currentSwipeDistanceRef.current * 2.8));
    Animated.timing(translateX, {
      toValue: 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setSwiping(false);
        maxSwipeDistanceRef.current = 0;
        currentSwipeDistanceRef.current = 0;
      }
    });
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          gesture.dx < -DEBT_SELECT_GESTURE_START &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * DEBT_SELECT_HORIZONTAL_BIAS,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dx < -DEBT_SELECT_GESTURE_START &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * DEBT_SELECT_HORIZONTAL_BIAS,
        onPanResponderGrant: () => {
          maxSwipeDistanceRef.current = 0;
          currentSwipeDistanceRef.current = 0;
          suppressOpenRef.current = false;
          setSwiping(true);
        },
        onPanResponderMove: (_, gesture) => {
          const rawNext = Math.min(0, gesture.dx);
          const distance = Math.abs(rawNext);
          if (distance > 6) {
            suppressOpenRef.current = true;
          }
          maxSwipeDistanceRef.current = Math.max(maxSwipeDistanceRef.current, distance);
          currentSwipeDistanceRef.current = distance;
          const next =
            distance > DEBT_SELECT_SWIPE_MAX
              ? -(DEBT_SELECT_SWIPE_MAX + (distance - DEBT_SELECT_SWIPE_MAX) * 0.18)
              : rawNext;
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldSelect = maxSwipeDistanceRef.current > DEBT_SELECT_SWIPE_THRESHOLD || gesture.vx < -0.55;
          if (shouldSelect) {
            onToggleSelected();
          }
          resetSwipe();
        },
        onPanResponderTerminate: resetSwipe,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [onToggleSelected, resetSwipe, translateX]
  );

  const circleOpacity = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const circleScale = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1],
  });
  const revealOpacity = translateX.interpolate({
    inputRange: [-24, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const revealTranslateX = translateX.interpolate({
    inputRange: [-DEBT_SELECT_SWIPE_MAX, 0],
    outputRange: [0, 16],
    extrapolate: 'clamp',
  });
  const revealScale = translateX.interpolate({
    inputRange: [-DEBT_SELECT_SWIPE_MAX, -16, 0],
    outputRange: [1, 0.92, 0.86],
    extrapolate: 'clamp',
  });
  const selectedRowBackground = colorScheme === 'dark' ? 'rgba(47, 105, 190, 0.26)' : '#D5E5FF';
  const activeRowBackground = colorScheme === 'dark' ? '#30333A' : '#E4E6EA';
  const movingRowBackground = swiping ? activeRowBackground : 'transparent';
  const revealBackgroundColor = colorScheme === 'dark' ? '#315FAD' : '#1C60C3';

  return (
    <Animated.View
      {...panResponder.panHandlers}
      className="flex-row items-center"
      style={{ marginVertical: 1, borderRadius: 12 }}>
      {selected ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: -12,
            right: -12,
            bottom: 0,
            borderRadius: 12,
            backgroundColor: selectedRowBackground,
          }}
        />
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 78,
          paddingRight: 10,
          borderRadius: 12,
          backgroundColor: revealBackgroundColor,
          opacity: revealOpacity,
          alignItems: 'flex-end',
          justifyContent: 'center',
          transform: [{ translateX: revealTranslateX }, { scale: revealScale }],
        }}>
        <Ionicons name="checkbox-outline" size={22} color="#FFFFFF" />
      </Animated.View>
      <Animated.View
        className="flex-1 flex-row items-center"
        style={{
          marginHorizontal: -8,
          paddingHorizontal: 8,
          paddingVertical: 6,
          borderRadius: 12,
          backgroundColor: movingRowBackground,
          transform: [{ translateX }],
        }}>
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            if (suppressOpenRef.current) {
              suppressOpenRef.current = false;
              return;
            }
            onOpen();
          }}
          className="flex-1">
          {children}
        </Pressable>

        <Animated.View
          style={{
            width: selectionMode ? 34 : 0,
            opacity: circleOpacity,
            alignItems: 'flex-end',
            transform: [{ scale: circleScale }],
          }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            disabled={!selectionMode}
            onPress={onToggleSelected}
            hitSlop={8}
            className="items-end justify-center">
            <DebtSelectionCircle selected={selected} colorScheme={colorScheme} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

export default function DugovanjaScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const quickFindSwipe = useQuickFindSwipeDown();
  const selectionBarProgress = useRef(new Animated.Value(0)).current;
  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<ClientWithDebt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminderClient, setReminderClient] = useState<ClientWithDebt | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [paymentPicker, setPaymentPicker] = useState<{ clientName: string | null; jobs: ClientOpenDebtJob[] } | null>(null);
  const [debtJobsPicker, setDebtJobsPicker] = useState<{ clientName: string | null; jobs: ClientOpenDebtJob[] } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listClientsWithDebt(userId);
      setItems(data.filter((item) => item.debt > 0));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const formatMoney = useMoneyFormatter({ maximumFractionDigits: 0 });

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (b.debt !== a.debt) return b.debt - a.debt;
        const aTime = new Date(a.latest_activity_at ?? a.created_at ?? 0).getTime();
        const bTime = new Date(b.latest_activity_at ?? b.created_at ?? 0).getTime();
        return bTime - aTime;
      }),
    [items]
  );

  const totalDebt = useMemo(() => items.reduce((sum, item) => sum + item.debt, 0), [items]);
  const debtorsCount = items.length;
  const selectedClient = useMemo(
    () => sortedItems.find((item) => item.id === selectedClientId) ?? null,
    [selectedClientId, sortedItems]
  );
  const selectionMode = Boolean(selectedClient);

  useEffect(() => {
    Animated.spring(selectionBarProgress, {
      toValue: selectionMode ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 210,
      mass: 0.82,
    }).start();
  }, [selectionBarProgress, selectionMode]);

  useEffect(() => {
    if (selectedClientId && !selectedClient) {
      setSelectedClientId(null);
    }
  }, [selectedClient, selectedClientId]);

  useEffect(() => {
    setMainFloatingActionsHidden(selectionMode);
    return () => setMainFloatingActionsHidden(false);
  }, [selectionMode]);
  const formatDebtorsShortLabel = useCallback(
    (count: number) => {
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return `${count} ${t(`debts.debtorsShortForms.${form}`)}`;
      }
      return `${count} ${count === 1 ? t('debts.debtorsShortForms.one') : t('debts.debtorsShortForms.other')}`;
    },
    [i18n.language, t]
  );
  const subtitle = `${t('debts.totalPrefix')}: ${formatMoney.format(totalDebt)} • ${formatDebtorsShortLabel(debtorsCount)}`;
  const formatDebtJobsLabel = useCallback(
    (count: number) => {
      if (count <= 0) return '';
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return `${count} ${t(`debts.debtJobsForms.${form}`)}`;
      }
      return `${count} ${count === 1 ? t('debts.debtJobsForms.one') : t('debts.debtJobsForms.other')}`;
    },
    [i18n.language, t]
  );
  const sectionSeparatorColor = colorScheme === 'dark' ? 'rgba(84,84,88,0.38)' : 'rgba(60,60,67,0.14)';
  const primaryActionColor = colorScheme === 'dark' ? '#0A84FF' : '#1C60C3';
  const isDark = colorScheme === 'dark';
  const reminderModalWidth = Math.max(280, Math.round(windowWidth * 0.8));
  const reminderModalMaxHeight = Math.max(300, Math.min(440, Math.round(windowHeight * 0.62)));
  const modalBackgroundColor = isDark ? Colors.dark.menuSurface : '#FFFFFF';
  const modalBorderColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(60,60,67,0.12)';
  const modalBackdropColor = isDark ? 'rgba(0,0,0,0.42)' : 'rgba(16,24,40,0.22)';

  const getDebtJobLabel = useCallback(
    (item: ClientWithDebt) => {
      if (item.debt_jobs_count > 1) return formatDebtJobsLabel(item.debt_jobs_count);
      if (item.top_debt_job_title) return item.top_debt_job_title;
      return t('debts.activeJobAvailable');
    },
    [formatDebtJobsLabel, t]
  );

  const openUrl = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) return;
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  }, []);

  const onSms = useCallback(
    (phone: string, message?: string) => {
      const digits = phone.replace(/[^\d+]/g, '');
      if (!digits) return;
      const body = message ? `${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}` : '';
      void openUrl(`sms:${digits}${body}`);
    },
    [openUrl]
  );

  const onCall = useCallback(
    (phone: string) => {
      const digits = phone.replace(/[^\d+]/g, '');
      if (!digits) return;
      void openUrl(`tel:${digits}`);
    },
    [openUrl]
  );

  const onViber = useCallback(
    (phone: string, message?: string) => {
      const digits = phone.replace(/[^\d+]/g, '');
      if (!digits) return;
      if (message) {
        void openUrl(`viber://forward?text=${encodeURIComponent(message)}`);
        return;
      }
      void openUrl(`viber://chat?number=${encodeURIComponent(digits)}`);
    },
    [openUrl]
  );

  const buildReminderMessage = useCallback(
    (item: ClientWithDebt) => {
      const target =
        item.debt_jobs_count > 1
          ? i18n.language === 'sr'
            ? t(`debts.reminderJobsCountForms.${getSerbianPluralForm(item.debt_jobs_count)}`, { count: item.debt_jobs_count })
            : t('debts.reminderJobsCountForms.other', { count: item.debt_jobs_count })
          : item.top_debt_job_title || t('debts.activeJobAvailable');

      return t('debts.reminderMessage', {
        name: item.name || t('common.unnamed'),
        debt: formatMoney.format(item.debt),
        target,
      });
    },
    [formatMoney, i18n.language, t]
  );

  const addPayment = useCallback(
    async (item: ClientWithDebt) => {
      if (!userId) return;
      if (item.debt <= 0) {
        return;
      }

      try {
        const jobs = await listClientOpenDebtJobs(userId, item.id);
        if (jobs.length === 0) {
          return;
        }
        if (jobs.length === 1) {
          router.push({
            pathname: '/(tabs)/posao/[id]/payment/new' as any,
            params: { id: jobs[0].id, returnTo: 'debts' },
          });
          return;
        }
        setPaymentPicker({ clientName: item.name, jobs });
        return;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [router, userId]
  );

  const toggleSelectedClient = useCallback((item: ClientWithDebt) => {
    triggerSelectionHaptic();
    setSelectedClientId((current) => (current === item.id ? null : item.id));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedClientId(null);
  }, []);

  const onCallSelected = useCallback(() => {
    if (!selectedClient?.phone) return;
    const phone = selectedClient.phone;
    clearSelection();
    onCall(phone);
  }, [clearSelection, onCall, selectedClient]);

  const onRemindSelected = useCallback(() => {
    if (!selectedClient?.phone) return;
    setReminderClient(selectedClient);
    clearSelection();
  }, [clearSelection, selectedClient]);

  const onPaymentSelected = useCallback(() => {
    if (!selectedClient) return;
    const item = selectedClient;
    clearSelection();
    void addPayment(item);
  }, [addPayment, clearSelection, selectedClient]);

  const onRowPress = useCallback(
    async (item: ClientWithDebt) => {
      if (!userId) return;
      try {
        const jobs = await listClientOpenDebtJobs(userId, item.id);
        if (jobs.length === 0) return;
        if (jobs.length === 1) {
          router.push(`/(tabs)/posao/${jobs[0].id}` as any);
          return;
        }
        setDebtJobsPicker({ clientName: item.name, jobs });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [router, userId]
  );

  const onCloseReminderModal = useCallback(() => {
    setReminderClient(null);
  }, []);

  const onClosePaymentPicker = useCallback(() => {
    setPaymentPicker(null);
  }, []);

  const onCloseDebtJobsPicker = useCallback(() => {
    setDebtJobsPicker(null);
  }, []);

  const renderDebtRow = (item: ClientWithDebt) => (
    <View
      key={item.id}
      style={{ marginTop: 1 }}>
      <DebtSwipeSelectRow
        selected={selectedClientId === item.id}
        selectionMode={selectionMode}
        colorScheme={colorScheme}
        onOpen={() => {
          void onRowPress(item);
        }}
        onToggleSelected={() => toggleSelectedClient(item)}>
        <View className="flex-row items-center justify-between">
          <View style={{ marginRight: 12, flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '400' }} numberOfLines={1}>
              {item.name || '-'}
            </Text>
            <View style={{ marginTop: -1, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.secondaryText, fontSize: 12 }} numberOfLines={1}>
                {getDebtJobLabel(item)}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text style={{ color: colorScheme === 'dark' ? '#FF8A8A' : '#C84D4D', fontSize: 13 }}>
              {formatMoney.format(item.debt)}
            </Text>
          </View>
        </View>
      </DebtSwipeSelectRow>
    </View>
  );

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-[#1D2229]">
      <CollapsingMainHeader
        title={t('tabs.debts')}
        iconName="cash-outline"
        scrollY={scrollY}
        left={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => goBackOrReplace(router, '/(tabs)' as any)}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center">
            <Ionicons name="chevron-back" size={25} color="#717983" />
          </Pressable>
        }
        right={
          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('tabs.profile')}
              onPress={() => router.push('/(tabs)/podesavanja' as any)}
              hitSlop={8}
              style={{
                width: 38,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="person-outline" size={20} color="#717983" />
            </Pressable>
          </View>
        }
      />

      <Animated.ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: quickFindSwipe.onScroll }
        )}
        {...quickFindSwipe.touchHandlers}
        refreshControl={quickFindSwipe.refreshControl}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 148 }}>
        <MainScreenTitle title={t('tabs.debts')} iconName="cash-outline" scrollY={scrollY} />
        <Text className="-mt-4 mb-4 text-app-subtitle text-black/60 dark:text-white/70">
          {subtitle}
        </Text>

        {error ? <Text className="mt-3 text-app-meta text-red-600 dark:text-red-400">{error}</Text> : null}

        <View style={{ marginTop: 24, marginBottom: 22 }}>
          <Text
            className="text-app-row-title font-semibold"
            style={{ color: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3' }}>
            {t('tabs.debts')}
          </Text>
          <View
            className="mt-2 h-px"
            style={{ backgroundColor: sectionSeparatorColor }}
          />
          <View style={{ marginLeft: 12, marginTop: 8 }}>
          {loading ? (
            <View className="items-center py-8">
              <ActivityIndicator />
            </View>
          ) : sortedItems.length > 0 ? (
            sortedItems.map((item) => renderDebtRow(item))
          ) : (
            <EmptyState
              title={t('debts.emptyTitle')}
              body={t('debts.emptyBody')}
              compact
            />
          )}
          </View>
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents={selectionMode ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: Math.max(insets.top + 8, 18),
          right: 20,
          zIndex: 70,
          elevation: 0,
          opacity: selectionBarProgress,
          transform: [
            {
              translateY: selectionBarProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            },
          ],
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={clearSelection}
          style={{
            minHeight: 38,
            borderRadius: 19,
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.68)',
            backgroundColor: primaryActionColor,
            shadowOpacity: 0,
            elevation: 0,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <Text className="text-app-subtitle font-semibold" style={{ color: '#FFFFFF' }}>
            {t('common.close')}
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        pointerEvents={selectionMode ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: Math.max(insets.bottom + 18, 24),
          zIndex: 60,
          elevation: 0,
          opacity: selectionBarProgress,
          transform: [
            {
              translateY: selectionBarProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
          ],
        }}>
        <View
          style={{
            minHeight: 48,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.24)',
            backgroundColor: 'rgba(56,64,76,0.9)',
            shadowOpacity: 0,
            elevation: 0,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <View className="flex-1 flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.call')}
              disabled={!selectedClient?.phone}
              onPress={onCallSelected}
              className="min-h-[42px] flex-1 flex-row items-center justify-center rounded-full px-1 disabled:opacity-35">
              <Ionicons name="call-outline" size={17} color="#FFFFFF" />
              <Text className="ml-1.5 text-app-row-lg font-semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                {t('jobs.call')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('debts.remind')}
              disabled={!selectedClient?.phone}
              onPress={onRemindSelected}
              className="min-h-[42px] flex-1 flex-row items-center justify-center rounded-full px-1 disabled:opacity-35">
              <Ionicons name="chatbubble-ellipses-outline" size={17} color="#FFFFFF" />
              <Text className="ml-1.5 text-app-row-lg font-semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                {t('debts.remind')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('jobs.charge')}
              onPress={onPaymentSelected}
              className="min-h-[42px] flex-1 flex-row items-center justify-center rounded-full px-1">
              <Ionicons name="cash-outline" size={17} color="#FFFFFF" />
              <Text className="ml-1.5 text-app-row-lg font-semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                {t('jobs.charge')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Modal transparent visible={Boolean(reminderClient)} animationType="fade" onRequestClose={onCloseReminderModal}>
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: modalBackdropColor }}>
          <Pressable onPress={onCloseReminderModal} className="absolute inset-0" />
          <View
            style={{
              width: reminderModalWidth,
              maxHeight: reminderModalMaxHeight,
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
                  {reminderClient?.name || t('debts.remind')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  onPress={onCloseReminderModal}
                  hitSlop={8}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)' }}>
                  <Ionicons name="close" size={19} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <View className="px-4 pb-5">
              {reminderClient ? (
                <Text className="mb-4 text-center text-app-row leading-5" style={{ color: colors.secondaryText }}>
                  {buildReminderMessage(reminderClient)}
                </Text>
              ) : null}

              <Pressable
                onPress={() => {
                  if (!reminderClient?.phone) return;
                  const message = buildReminderMessage(reminderClient);
                  onCloseReminderModal();
                  onSms(reminderClient.phone, message);
                }}
                className="flex-row items-center py-2.5">
                <Ionicons name="chatbubble-outline" size={18} color={colors.accent} />
                <Text className="ml-3 flex-1 text-base font-medium" style={{ color: colors.text }}>
                  {t('jobs.sms')}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!reminderClient?.phone) return;
                  const message = buildReminderMessage(reminderClient);
                  onCloseReminderModal();
                  onViber(reminderClient.phone, message);
                }}
                className="flex-row items-center py-2.5">
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.accent} />
                <Text className="ml-3 flex-1 text-base font-medium" style={{ color: colors.text }}>
                  {t('jobs.viber')}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <PaymentJobPickerModal
        visible={Boolean(paymentPicker)}
        clientName={paymentPicker?.clientName ?? null}
        jobs={paymentPicker?.jobs ?? []}
        onClose={onClosePaymentPicker}
        onSelect={(jobId) => {
          onClosePaymentPicker();
          router.push({
            pathname: '/(tabs)/posao/[id]/payment/new' as any,
            params: { id: jobId, returnTo: 'debts' },
          });
        }}
      />

      <PaymentJobPickerModal
        visible={Boolean(debtJobsPicker)}
        clientName={debtJobsPicker?.clientName ?? null}
        jobs={debtJobsPicker?.jobs ?? []}
        onClose={onCloseDebtJobsPicker}
        onSelect={(jobId) => {
          onCloseDebtJobsPicker();
          router.push(`/(tabs)/posao/${jobId}`);
        }}
      />
    </View>
  );
}
