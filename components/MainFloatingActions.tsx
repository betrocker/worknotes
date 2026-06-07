import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/Colors';
import { PaymentJobPickerModal } from '@/components/PaymentJobPickerModal';
import { useColorScheme } from '@/components/useColorScheme';
import {
  listClientOpenDebtJobs,
  listClientsWithDebt,
  type ClientOpenDebtJob,
} from '@/lib/clients';
import { triggerFabHaptic } from '@/lib/haptics';
import { useAuth } from '@/providers/AuthProvider';

type Props = {
  focusedRouteName: string | null;
  containerWidth: number;
  onOpenChange?: (open: boolean) => void;
  closeSignal?: number;
  hidden?: boolean;
};

type GlobalPaymentJob = ClientOpenDebtJob & {
  clientName?: string | null;
};

const MAIN_ACTION_ROUTES = new Set(['index', 'klijenti', 'poslovi', 'dugovanja']);
const CLOSED_SIZE = 48;
const OPEN_HEIGHT = 204;
const CLOSED_BACKGROUND = '#4287f4';

export function MainFloatingActions({ focusedRouteName, containerWidth, onOpenChange, closeSignal = 0, hidden = false }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const menuColors = Colors.dark;
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const progress = useRef(new Animated.Value(0)).current;
  const hiddenProgress = useRef(new Animated.Value(hidden ? 1 : 0)).current;
  const lastCloseSignal = useRef(closeSignal);
  const [open, setOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentPicker, setPaymentPicker] = useState<{ jobs: GlobalPaymentJob[] } | null>(null);

  const visible = !!focusedRouteName && MAIN_ACTION_ROUTES.has(focusedRouteName);
  const openWidth = containerWidth > 0 ? Math.min(containerWidth, Math.round(containerWidth * 0.84)) : 0;
  const openRight = containerWidth > openWidth ? (containerWidth - openWidth) / 2 : 0;
  const glassBorderColor = 'rgba(255,255,255,0.18)';

  useEffect(() => {
    if (!visible && open) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 160,
        useNativeDriver: false,
      }).start(() => {
        setOpen(false);
        onOpenChange?.(false);
      });
    }
  }, [onOpenChange, open, progress, visible]);

  useEffect(() => {
    if (hidden && open) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start(() => {
        setOpen(false);
        onOpenChange?.(false);
      });
    }

    Animated.timing(hiddenProgress, {
      toValue: hidden ? 1 : 0,
      duration: hidden ? 190 : 210,
      useNativeDriver: true,
    }).start();
  }, [hidden, hiddenProgress, onOpenChange, open, progress]);

  const animateOpen = useCallback(() => {
    setOpen(true);
    onOpenChange?.(true);
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: false,
      damping: 19,
      stiffness: 220,
      mass: 0.82,
    }).start();
  }, [onOpenChange, progress]);

  const animateClose = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 170,
      useNativeDriver: false,
    }).start(() => {
      setOpen(false);
      onOpenChange?.(false);
    });
  }, [onOpenChange, progress]);

  useEffect(() => {
    if (closeSignal === lastCloseSignal.current) return;
    lastCloseSignal.current = closeSignal;
    if (open) {
      animateClose();
    }
  }, [animateClose, closeSignal, open]);

  const toggleOpen = useCallback(() => {
    triggerFabHaptic();
    if (open) {
      animateClose();
      return;
    }
    animateOpen();
  }, [animateClose, animateOpen, open]);

  const returnTo = useMemo(() => {
    if (focusedRouteName === 'klijenti') return 'clients';
    if (focusedRouteName === 'dugovanja') return 'debts';
    return 'job';
  }, [focusedRouteName]);

  const openNewJob = useCallback(() => {
    animateClose();
    router.push('/(tabs)/posao/new');
  }, [animateClose, router]);

  const openNewClient = useCallback(() => {
    animateClose();
    router.push('/(tabs)/klijent/new');
  }, [animateClose, router]);

  const openNewPayment = useCallback(async () => {
    animateClose();
    if (!userId) return;

    setPaymentLoading(true);
    try {
      const clients = (await listClientsWithDebt(userId)).filter((client) => client.debt > 0);
      const groupedJobs = await Promise.all(
        clients.map(async (client) => {
          const jobs = await listClientOpenDebtJobs(userId, client.id);
          return jobs.map((job) => ({
            ...job,
            clientName: client.name,
          }));
        })
      );
      const jobs = groupedJobs
        .flat()
        .sort((a, b) => b.debt - a.debt);

      if (jobs.length === 0) {
        Alert.alert(t('clients.noOpenDebtTitle'), t('clients.noOpenDebtBody'));
        return;
      }

      if (jobs.length === 1) {
        router.push({
          pathname: '/(tabs)/posao/[id]/payment/new' as any,
          params: { id: jobs[0].id, returnTo },
        });
        return;
      }

      setPaymentPicker({ jobs });
    } catch (error: unknown) {
      Alert.alert(t('clients.selectPaymentJob'), error instanceof Error ? error.message : String(error));
    } finally {
      setPaymentLoading(false);
    }
  }, [animateClose, returnTo, router, t, userId]);

  if (!visible || !containerWidth || !openWidth) return null;

  const actions = [
    {
      key: 'job',
      label: t('fab.newJob'),
      sublabel: t('fab.newJobHint'),
      icon: 'briefcase-outline' as const,
      color: '#3C69D9',
      backgroundColor: colorScheme === 'dark' ? 'rgba(58,105,217,0.18)' : 'rgba(60,105,217,0.12)',
      onPress: openNewJob,
      loading: false,
    },
    {
      key: 'client',
      label: t('fab.newClient'),
      sublabel: t('fab.newClientHint'),
      icon: 'person-add-outline' as const,
      color: '#2F8C57',
      backgroundColor: colorScheme === 'dark' ? 'rgba(47,140,87,0.20)' : 'rgba(47,140,87,0.12)',
      onPress: openNewClient,
      loading: false,
    },
    {
      key: 'payment',
      label: t('fab.newPayment'),
      sublabel: t('fab.newPaymentHint'),
      icon: 'wallet-outline' as const,
      color: '#C26A1A',
      backgroundColor: colorScheme === 'dark' ? 'rgba(255,191,122,0.18)' : 'rgba(194,106,26,0.12)',
      onPress: openNewPayment,
      loading: paymentLoading,
    },
  ];

  return (
    <>
      <Animated.View
        pointerEvents={hidden ? 'none' : 'box-none'}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: OPEN_HEIGHT,
          zIndex: 30,
          elevation: 30,
          opacity: hiddenProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
          transform: [
            {
              translateY: hiddenProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 96],
              }),
            },
          ],
        }}>
        <Animated.View
          style={{
            position: 'absolute',
            right: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, openRight],
            }),
            bottom: 0,
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [CLOSED_SIZE, openWidth],
            }),
            height: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [CLOSED_SIZE, OPEN_HEIGHT],
            }),
            borderRadius: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [24, 30],
            }),
            borderWidth: 1,
            borderColor: glassBorderColor,
            overflow: 'hidden',
            shadowOpacity: 0,
            elevation: 0,
          }}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundColor: menuColors.menuSurface,
              }}
          />
          <BlurView
            intensity={Platform.OS === 'ios' ? 92 : 54}
            tint="dark"
            {...(Platform.OS === 'android' ? { experimentalBlurMethod: 'dimezisBlurView' as const } : {})}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: menuColors.menuSurface,
              opacity: progress.interpolate({
                inputRange: [0, 0.55, 1],
                outputRange: [0, 0, 1],
              }),
            }}
          />

          <Animated.View
            pointerEvents={open ? 'none' : 'auto'}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 0, 0],
              }),
            }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('fab.open')}
              onPress={toggleOpen}
              style={{
                height: CLOSED_SIZE,
                width: CLOSED_SIZE,
                borderRadius: CLOSED_SIZE / 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: CLOSED_BACKGROUND,
                borderWidth: 1,
                borderColor: glassBorderColor,
              }}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </Pressable>
          </Animated.View>

          <Animated.View
            pointerEvents={open ? 'auto' : 'none'}
            style={{
              flex: 1,
              paddingHorizontal: 10,
              paddingVertical: 10,
              opacity: progress.interpolate({
                inputRange: [0, 0.56, 1],
                outputRange: [0, 0, 1],
              }),
            }}>
            {actions.map((action, index) => (
              <Pressable
                key={action.key}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={action.onPress}
                disabled={action.loading}
                style={{
                  minHeight: 58,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  borderRadius: 20,
                  paddingHorizontal: 8,
                  paddingRight: action.key === 'job' ? 34 : 8,
                  paddingTop: 8,
                  borderTopWidth: index > 0 ? 1 : 0,
                  borderTopColor: 'rgba(255,255,255,0.07)',
                }}>
                <View
                  style={{
                    height: 24,
                    width: 24,
                    marginTop: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {action.loading ? (
                    <ActivityIndicator size="small" color={action.color} />
                  ) : (
                    <Ionicons name={action.icon} size={18} color={action.color} />
                  )}
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: menuColors.text,
                      fontSize: 17,
                      fontWeight: '400',
                    }}>
                    {action.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 2,
                      color: menuColors.secondaryText,
                      fontSize: 14,
                      fontWeight: '500',
                    }}>
                    {action.sublabel}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <PaymentJobPickerModal
        visible={Boolean(paymentPicker)}
        clientName={null}
        jobs={paymentPicker?.jobs ?? []}
        onClose={() => setPaymentPicker(null)}
        onSelect={(jobId) => {
          setPaymentPicker(null);
          router.push({
            pathname: '/(tabs)/posao/[id]/payment/new' as any,
            params: { id: jobId, returnTo },
          });
        }}
      />
    </>
  );
}
