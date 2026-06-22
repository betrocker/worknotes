import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Animated, Easing, Linking, Modal, PanResponder, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { EmptyState } from '@/components/EmptyState';
import { PaymentJobPickerModal } from '@/components/PaymentJobPickerModal';
import { CollapsingMainHeader, MainScreenTitle } from '@/components/CollapsingMainHeader';
import { useQuickFindSwipeDown } from '@/components/useQuickFindSwipeDown';
import { useColorScheme } from '@/components/useColorScheme';
import { useMoneyFormatter } from '@/components/useMoneyFormatter';
import { deleteClient, listClientOpenDebtJobs, listClientsWithDebt, type ClientOpenDebtJob, type ClientWithDebt } from '@/lib/clients';
import { setMainFloatingActionsHidden } from '@/lib/floating-actions-visibility';
import { goBackOrReplace } from '@/lib/navigation';
import { triggerSelectionHaptic } from '@/lib/haptics';
import { useAuth } from '@/providers/AuthProvider';

type ClientSwipeSelectRowProps = {
  item: ClientWithDebt;
  selected: boolean;
  selectionMode: boolean;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
  paymentLabel: string;
  noContactLabel: string;
  formatJobsLabel: (count: number) => string;
  formatMoney: Intl.NumberFormat;
  onOpen: (item: ClientWithDebt) => void;
  onToggleSelected: (item: ClientWithDebt) => void;
  onAddPayment: (item: ClientWithDebt) => void;
};

const CLIENT_SELECT_SWIPE_THRESHOLD = 36;
const CLIENT_SELECT_SWIPE_MAX = 56;
const CLIENT_SELECT_GESTURE_START = 3;
const CLIENT_SELECT_HORIZONTAL_BIAS = 0.72;

function ClientSelectionCircle({ selected, colorScheme }: { selected: boolean; colorScheme: 'light' | 'dark' }) {
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

function ClientSwipeSelectRow({
  item,
  selected,
  selectionMode,
  colors,
  colorScheme,
  paymentLabel,
  noContactLabel,
  formatJobsLabel,
  formatMoney,
  onOpen,
  onToggleSelected,
  onAddPayment,
}: ClientSwipeSelectRowProps) {
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
          gesture.dx < -CLIENT_SELECT_GESTURE_START &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * CLIENT_SELECT_HORIZONTAL_BIAS,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dx < -CLIENT_SELECT_GESTURE_START &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * CLIENT_SELECT_HORIZONTAL_BIAS,
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
            distance > CLIENT_SELECT_SWIPE_MAX
              ? -(CLIENT_SELECT_SWIPE_MAX + (distance - CLIENT_SELECT_SWIPE_MAX) * 0.18)
              : rawNext;
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldSelect = maxSwipeDistanceRef.current > CLIENT_SELECT_SWIPE_THRESHOLD || gesture.vx < -0.55;
          if (shouldSelect) {
            onToggleSelected(item);
          }
          resetSwipe();
        },
        onPanResponderTerminate: resetSwipe,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [item, onToggleSelected, resetSwipe, translateX]
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
    inputRange: [-CLIENT_SELECT_SWIPE_MAX, 0],
    outputRange: [0, 16],
    extrapolate: 'clamp',
  });
  const revealScale = translateX.interpolate({
    inputRange: [-CLIENT_SELECT_SWIPE_MAX, -16, 0],
    outputRange: [1, 0.92, 0.86],
    extrapolate: 'clamp',
  });
  const selectedRowBackground = colorScheme === 'dark' ? 'rgba(47, 105, 190, 0.26)' : '#D5E5FF';
  const activeRowBackground = colorScheme === 'dark' ? '#30333A' : '#E4E6EA';
  const movingRowBackground = swiping ? activeRowBackground : 'transparent';
  const revealBackgroundColor = colorScheme === 'dark' ? '#315FAD' : '#1C60C3';
  const secondaryText = item.phone || item.address || (item.jobs_count > 0 ? formatJobsLabel(item.jobs_count) : noContactLabel);

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
          paddingVertical: 5,
          borderRadius: 12,
          backgroundColor: movingRowBackground,
          transform: [{ translateX }],
        }}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={item.name || '-'}
          onPress={() => {
            if (suppressOpenRef.current) {
              suppressOpenRef.current = false;
              return;
            }
            onOpen(item);
          }}
          className="flex-1">
          <View className="flex-row items-center justify-between">
            <View style={{ marginRight: 12, flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '400' }} numberOfLines={1}>
                {item.name || '-'}
              </Text>
              {secondaryText ? (
                <View style={{ marginTop: -1, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.secondaryText, fontSize: 12 }} numberOfLines={1}>
                    {secondaryText}
                  </Text>
                </View>
              ) : null}
            </View>

            {item.debt > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={paymentLabel}
                hitSlop={8}
                onPress={(event) => {
                  event.stopPropagation();
                  onAddPayment(item);
                }}
                className="items-end">
                <Text
                  className="text-app-row font-semibold"
                  style={{ color: colorScheme === 'dark' ? '#FF8A8A' : '#C84D4D' }}
                  numberOfLines={1}>
                  {formatMoney.format(item.debt)}
                </Text>
              </Pressable>
            ) : null}
          </View>
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
            onPress={() => onToggleSelected(item)}
            hitSlop={8}
            className="items-end justify-center">
            <ClientSelectionCircle selected={selected} colorScheme={colorScheme} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

function getSerbianPluralForm(count: number) {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'other';
}

export default function KlijentiScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const quickFindSwipe = useQuickFindSwipeDown();

  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<ClientWithDebt[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactClient, setContactClient] = useState<ClientWithDebt | null>(null);
  const [paymentPicker, setPaymentPicker] = useState<{ clientName: string | null; jobs: ClientOpenDebtJob[] } | null>(null);
  const selectionMode = selectedClientId != null;
  const singleSelectedClient = useMemo(
    () => items.find((item) => item.id === selectedClientId) ?? null,
    [items, selectedClientId]
  );
  const canContactSelectedClient = Boolean(singleSelectedClient?.phone);
  const selectionBarProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setSelectedClientId((current) => (current && items.some((item) => item.id === current) ? current : null));
  }, [items]);

  useEffect(() => {
    Animated.spring(selectionBarProgress, {
      toValue: selectionMode ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.82,
    }).start();
  }, [selectionBarProgress, selectionMode]);

  useEffect(() => {
    setMainFloatingActionsHidden(selectionMode);
    return () => setMainFloatingActionsHidden(false);
  }, [selectionMode]);

  const load = useCallback(async () => {
    if (!userId) return;
      setLoading(true);
      setError(null);
    try {
      const data = await listClientsWithDebt(userId);
      setItems(data);
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

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;

  const sortedClients = useMemo(
    () => [...items].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', locale, { sensitivity: 'base' })),
    [items, locale]
  );

  const formatMoney = useMoneyFormatter({ maximumFractionDigits: 0 });

  const openUrl = useCallback(
    async (url: string) => {
      try {
        const supported = await Linking.canOpenURL(url);
        if (!supported) return;
        await Linking.openURL(url);
      } catch {
        // ignore
      }
    },
    []
  );

  const onSms = useCallback(
    (phone: string) => {
      const digits = phone.replace(/[^\d+]/g, '');
      if (!digits) return;
      const url = `sms:${digits}`;
      void openUrl(url);
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
    (phone: string) => {
      const digits = phone.replace(/[^\d+]/g, '');
      if (!digits) return;
      const url = `viber://chat?number=${encodeURIComponent(digits)}`;
      void openUrl(url);
    },
    [openUrl]
  );

  const onAddPayment = useCallback(
    async (client: ClientWithDebt) => {
      if (!userId) return;
      if (client.debt <= 0) {
        Alert.alert(t('clients.noOpenDebtTitle'), t('clients.noOpenDebtBody'));
        return;
      }
      try {
        const jobs = await listClientOpenDebtJobs(userId, client.id);
        if (jobs.length === 0) {
          Alert.alert(t('clients.noOpenDebtTitle'), t('clients.noOpenDebtBody'));
          return;
        }
        if (jobs.length === 1) {
          router.push({
            pathname: '/(tabs)/posao/[id]/payment/new' as any,
            params: { id: jobs[0].id, returnTo: 'clients' },
          });
          return;
        }
        setPaymentPicker({ clientName: client.name, jobs });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [router, t, userId]
  );

  const onCloseContactModal = useCallback(() => {
    setContactClient(null);
  }, []);

  const onClosePaymentPicker = useCallback(() => {
    setPaymentPicker(null);
  }, []);

  const clientsWithDebt = useMemo(() => items.filter((c) => c.debt > 0).length, [items]);
  const formatClientsShortLabel = useCallback(
    (count: number) => {
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return `${count} ${t(`clients.totalClientsShortForms.${form}`)}`;
      }
      return `${count} ${count === 1 ? t('clients.totalClientsShortForms.one') : t('clients.totalClientsShortForms.other')}`;
    },
    [i18n.language, t]
  );
  const formatJobsShortLabel = useCallback(
    (count: number) => {
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return `${count} ${t(`jobs.jobsCountForms.${form}`)}`;
      }
      return `${count} ${count === 1 ? t('jobs.jobsCountForms.one') : t('jobs.jobsCountForms.other')}`;
    },
    [i18n.language, t]
  );
  const formatDebtsShortLabel = useCallback(
    (count: number) => {
      if (i18n.language === 'sr') {
        const form = getSerbianPluralForm(count);
        return `${count} ${t(`clients.activeDebtsShortForms.${form}`)}`;
      }
      return `${count} ${count === 1 ? t('clients.activeDebtsShortForms.one') : t('clients.activeDebtsShortForms.other')}`;
    },
    [i18n.language, t]
  );
  const headerSubtitle = `${formatClientsShortLabel(items.length)} • ${formatDebtsShortLabel(clientsWithDebt)}`;
  const sectionSeparatorColor = colorScheme === 'dark' ? 'rgba(84,84,88,0.38)' : 'rgba(60,60,67,0.14)';
  const primaryActionColor = colorScheme === 'dark' ? '#72A8FF' : '#1C60C3';
  const isDark = colorScheme === 'dark';
  const contactModalWidth = Math.max(280, Math.round(windowWidth * 0.8));
  const contactModalMaxHeight = Math.max(260, Math.min(420, Math.round(windowHeight * 0.6)));
  const modalBackgroundColor = isDark ? Colors.dark.menuSurface : '#FFFFFF';
  const modalBorderColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(60,60,67,0.12)';
  const modalBackdropColor = isDark ? 'rgba(0,0,0,0.42)' : 'rgba(16,24,40,0.22)';

  const openClient = useCallback(
    (item: ClientWithDebt) => {
      router.push({ pathname: '/(tabs)/klijent/[id]' as any, params: { id: item.id } });
    },
    [router]
  );

  const toggleSelectedClient = useCallback((item: ClientWithDebt) => {
    triggerSelectionHaptic();
    setSelectedClientId((current) => (current === item.id ? null : item.id));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedClientId(null);
  }, []);

  const onContactSelected = useCallback(() => {
    if (!singleSelectedClient?.phone) return;
    clearSelection();
    setContactClient(singleSelectedClient);
  }, [clearSelection, singleSelectedClient]);

  const onEditSelectedClient = useCallback(() => {
    const clientId = selectedClientId;
    if (!clientId) return;
    clearSelection();
    router.push({ pathname: '/(tabs)/klijent/[id]/edit' as any, params: { id: clientId } });
  }, [clearSelection, router, selectedClientId]);

  const onDeleteSelectedClient = useCallback(() => {
    if (!userId || !singleSelectedClient) return;
    Alert.alert(t('clients.deleteConfirmTitle'), t('clients.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('clients.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const previousItems = items;
            const clientId = singleSelectedClient.id;
            setItems((current) => current.filter((item) => item.id !== clientId));
            clearSelection();
            try {
              await deleteClient(userId, clientId);
              await load();
            } catch (e: unknown) {
              setItems(previousItems);
              setError(e instanceof Error ? e.message : String(e));
            }
          })();
        },
      },
    ]);
  }, [clearSelection, items, load, singleSelectedClient, t, userId]);

  const renderClientRow = (item: ClientWithDebt) => (
    <ClientSwipeSelectRow
      key={item.id}
      item={item}
      selected={selectedClientId === item.id}
      selectionMode={selectionMode}
      colors={colors}
      colorScheme={colorScheme}
      paymentLabel={t('jobs.payment')}
      noContactLabel={t('clients.noContactInfo')}
      formatJobsLabel={formatJobsShortLabel}
      formatMoney={formatMoney}
      onOpen={openClient}
      onToggleSelected={toggleSelectedClient}
      onAddPayment={onAddPayment}
    />
  );

  const renderClientSection = (title: string, clients: ClientWithDebt[], emptyTitle: string, emptyBody?: string) => (
    <View style={{ marginBottom: 22 }}>
      <Text
        className="text-app-row-title font-semibold"
        style={{ color: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3' }}>
        {title}
      </Text>
      <View
        className="mt-2 h-px"
        style={{ backgroundColor: sectionSeparatorColor }}
      />
      <View style={{ marginLeft: 12, marginTop: 8 }}>
        {clients.length > 0 ? (
          clients.map((item) => renderClientRow(item))
        ) : (
          <EmptyState
            title={emptyTitle}
            body={emptyBody}
            compact
          />
        )}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-[#1D2229]">
      <CollapsingMainHeader
        title={t('tabs.clients')}
        iconName="people-outline"
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
              disabled={selectionMode}
              onPress={() => {
                if (selectionMode) return;
                router.push('/(tabs)/podesavanja' as any);
              }}
              hitSlop={8}
              style={{
                width: 38,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: selectionMode ? 0 : 1,
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
        <MainScreenTitle title={t('tabs.clients')} iconName="people-outline" scrollY={scrollY} />
        <Text className="-mt-4 mb-4 text-app-subtitle text-black/60 dark:text-white/70">
          {headerSubtitle}
        </Text>

        {error ? <Text className="mt-3 text-app-meta text-red-600">{error}</Text> : null}

        <View style={{ marginTop: 24 }}>
          {loading ? (
            <View className="items-center py-8">
              <ActivityIndicator />
            </View>
          ) : (
            renderClientSection(
              t('clients.allClients'),
              sortedClients,
              t('clients.emptyTitle'),
              t('clients.emptyBody')
            )
          )}
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
          flexDirection: 'row',
          alignItems: 'center',
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
              accessibilityLabel={t('clients.contact')}
              disabled={!canContactSelectedClient}
              onPress={onContactSelected}
              className="min-h-[42px] flex-1 flex-row items-center justify-center rounded-full px-1 disabled:opacity-35">
              <Ionicons name="call-outline" size={17} color="#FFFFFF" />
              <Text className="ml-1.5 text-app-row-lg font-semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                {t('clients.contact')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('clients.edit')}
              disabled={!singleSelectedClient}
              onPress={onEditSelectedClient}
              className="min-h-[42px] flex-1 flex-row items-center justify-center rounded-full px-1 disabled:opacity-35">
              <Ionicons name="create-outline" size={17} color="#FFFFFF" />
              <Text className="ml-1.5 text-app-row-lg font-semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                {t('jobs.editShort')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('clients.delete')}
              disabled={!singleSelectedClient}
              onPress={onDeleteSelectedClient}
              className="min-h-[42px] flex-1 flex-row items-center justify-center rounded-full px-1 disabled:opacity-35">
              <Ionicons name="trash-outline" size={17} color="#FFFFFF" />
              <Text className="ml-1.5 text-app-row-lg font-semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                {t('clients.delete')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Modal transparent visible={Boolean(contactClient)} animationType="fade" onRequestClose={onCloseContactModal}>
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: modalBackdropColor }}>
          <Pressable onPress={onCloseContactModal} className="absolute inset-0" />
          <View
            style={{
              width: contactModalWidth,
              maxHeight: contactModalMaxHeight,
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
                  {contactClient?.name || t('clients.contact')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  onPress={onCloseContactModal}
                  hitSlop={8}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)' }}>
                  <Ionicons name="close" size={19} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <View className="px-4 pb-5">
              {contactClient?.phone ? (
                <Text className="mb-4 text-center text-app-row" style={{ color: colors.secondaryText }} numberOfLines={1}>
                  {contactClient.phone}
                </Text>
              ) : null}

              <Pressable
                onPress={() => {
                  if (!contactClient?.phone) return;
                  onCloseContactModal();
                  onCall(contactClient.phone);
                }}
                className="flex-row items-center py-2.5">
                <Ionicons name="call-outline" size={18} color={colors.accent} />
                <Text className="ml-3 flex-1 text-base font-medium" style={{ color: colors.text }}>
                  {t('jobs.call')}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!contactClient?.phone) return;
                  onCloseContactModal();
                  onSms(contactClient.phone);
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
                  if (!contactClient?.phone) return;
                  onCloseContactModal();
                  onViber(contactClient.phone);
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
            params: { id: jobId, returnTo: 'clients' },
          });
        }}
      />
    </View>
  );
}
