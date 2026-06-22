import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useSegments } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/Colors';
import { useMoneyFormatter } from '@/components/useMoneyFormatter';
import { listClientsWithDebt, type ClientWithDebt } from '@/lib/clients';
import { listJobs, type JobListItem } from '@/lib/jobs';
import { subscribeQuickFindOpen } from '@/lib/quick-find';
import { useAuth } from '@/providers/AuthProvider';

const MAX_RESULTS = 12;
const separatorColor = (isDark: boolean) => (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.12)');

type ResultTarget = {
  type: 'screen' | 'job' | 'client' | 'debt';
  id?: string;
  routeName?: 'home' | 'clients' | 'jobs' | 'debts' | 'profile';
};

type ResultItem = {
  id: string;
  type: 'screen' | 'job' | 'client' | 'debt';
  title: string;
  subtitle: string;
  amount?: number;
  target: ResultTarget;
  route: () => void;
};

type Props = {
  className?: string;
  hostOnly?: boolean;
  style?: object;
};

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function QuickFindButton({ className, hostOnly = false, style }: Props) {
  const router = useRouter();
  const segments = useSegments();
  const { t } = useTranslation();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const insets = useSafeAreaInsets();
  const menuColors = Colors.dark;

  const inputRef = useRef<TextInput>(null);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panelProgress = useRef(new Animated.Value(0)).current;

  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [clients, setClients] = useState<ClientWithDebt[]>([]);
  const [loading, setLoading] = useState(false);

  const moneyFormatter = useMoneyFormatter({ maximumFractionDigits: 0 });

  const loadData = useCallback(async () => {
    if (!userId) {
      setJobs([]);
      setClients([]);
      return;
    }
    setLoading(true);
    try {
      const [jobRows, clientRows] = await Promise.all([
        listJobs(userId, { includeArchived: true }),
        listClientsWithDebt(userId),
      ]);
      setJobs(jobRows);
      setClients(clientRows);
    } catch {
      setJobs([]);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const open = useCallback(() => {
    if (mounted) return;
    setMounted(true);
    setQuery('');
    void loadData();
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 170,
          useNativeDriver: true,
        }),
        Animated.spring(panelProgress, {
          toValue: 1,
          damping: 20,
          stiffness: 230,
          mass: 0.85,
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => inputRef.current?.focus(), 120);
    });
  }, [backdropOpacity, loadData, mounted, panelProgress]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(panelProgress, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [backdropOpacity, panelProgress]);

  useEffect(() => {
    if (!hostOnly) return undefined;
    return subscribeQuickFindOpen(open);
  }, [hostOnly, open]);

  const routeForTarget = useCallback(
    (target: ResultTarget) => {
      if (target.type === 'screen') {
        switch (target.routeName) {
          case 'clients':
            return () => router.push('/(tabs)/klijenti' as any);
          case 'jobs':
            return () => router.push('/(tabs)/poslovi' as any);
          case 'debts':
            return () => router.push('/(tabs)/dugovanja' as any);
          case 'profile':
            return () => router.push('/(tabs)/podesavanja' as any);
          default:
            return () => router.push('/(tabs)' as any);
        }
      }
      if (target.type === 'job' && target.id) {
        return () => router.push({ pathname: '/(tabs)/posao/[id]' as any, params: { id: target.id } });
      }
      if (target.type === 'client' && target.id) {
        return () => router.push({ pathname: '/(tabs)/klijent/[id]' as any, params: { id: target.id } });
      }
      return () => router.push('/(tabs)/dugovanja' as any);
    },
    [router]
  );

  const currentScreenRoute = useMemo<ResultTarget['routeName']>(() => {
    const focusedRoute = segments[1] ?? 'index';
    if (focusedRoute === 'poslovi' || focusedRoute === 'posao') return 'jobs';
    if (focusedRoute === 'klijenti' || focusedRoute === 'klijent') return 'clients';
    if (focusedRoute === 'dugovanja') return 'debts';
    if (focusedRoute === 'podesavanja') return 'profile';
    return 'home';
  }, [segments]);

  const navigationLinks = useMemo<ResultItem[]>(
    () => [
      {
        id: 'screen:home',
        type: 'screen',
        title: t('tabs.home'),
        subtitle: t('home.dayOverviewTitle'),
        target: { type: 'screen', routeName: 'home' },
        route: () => router.push('/(tabs)' as any),
      },
      {
        id: 'screen:jobs',
        type: 'screen',
        title: t('tabs.jobs'),
        subtitle: t('tabs.jobs'),
        target: { type: 'screen', routeName: 'jobs' },
        route: () => router.push('/(tabs)/poslovi' as any),
      },
      {
        id: 'screen:clients',
        type: 'screen',
        title: t('tabs.clients'),
        subtitle: t('tabs.clients'),
        target: { type: 'screen', routeName: 'clients' },
        route: () => router.push('/(tabs)/klijenti' as any),
      },
      {
        id: 'screen:debts',
        type: 'screen',
        title: t('tabs.debts'),
        subtitle: t('tabs.debts'),
        target: { type: 'screen', routeName: 'debts' },
        route: () => router.push('/(tabs)/dugovanja' as any),
      },
    ],
    [router, t]
  );

  const navigate = useCallback(
    (item: ResultItem) => {
      close();
      const route = routeForTarget(item.target);
      setTimeout(route, 120);
    },
    [close, routeForTarget]
  );

  const results = useMemo<ResultItem[]>(() => {
    const q = normalize(query);
    if (!q) return [];

    const jobResults = jobs
      .filter((job) => {
        const haystack = [
          job.title,
          job.description,
          job.client?.name,
          job.status,
          job.scheduled_date,
        ].map(normalize).join(' ');
        return haystack.includes(q);
      })
      .slice(0, 5)
      .map<ResultItem>((job) => ({
        id: `job:${job.id}`,
        type: 'job',
        title: job.title || t('jobs.untitled'),
        subtitle: job.client?.name || t('jobs.noClient'),
        amount: job.price ?? undefined,
        target: { type: 'job', id: job.id },
        route: () => router.push({ pathname: '/(tabs)/posao/[id]' as any, params: { id: job.id } }),
      }));

    const clientResults = clients
      .filter((client) => {
        const haystack = [client.name, client.phone, client.address, client.note].map(normalize).join(' ');
        return haystack.includes(q);
      })
      .slice(0, 4)
      .map<ResultItem>((client) => ({
        id: `client:${client.id}`,
        type: 'client',
        title: client.name || t('common.unnamed'),
        subtitle: client.phone || client.address || (client.jobs_count > 0 ? t('home.jobsCountShort', { count: client.jobs_count }) : t('clients.noContactInfo')),
        target: { type: 'client', id: client.id },
        route: () => router.push({ pathname: '/(tabs)/klijent/[id]' as any, params: { id: client.id } }),
      }));

    const debtResults = clients
      .filter((client) => client.debt > 0)
      .filter((client) => {
        const haystack = [client.name, client.phone, client.address, client.top_debt_job_title].map(normalize).join(' ');
        return haystack.includes(q);
      })
      .slice(0, 3)
      .map<ResultItem>((client) => ({
        id: `debt:${client.id}`,
        type: 'debt',
        title: client.name || t('common.unnamed'),
        subtitle: client.top_debt_job_title || t('tabs.debts'),
        amount: client.debt,
        target: { type: 'debt', id: client.id },
        route: () => router.push('/(tabs)/dugovanja' as any),
      }));

    return [...jobResults, ...clientResults, ...debtResults].slice(0, MAX_RESULTS);
  }, [clients, jobs, query, router, t]);

  const resultMeta = useCallback(
    (type: ResultItem['type']) => {
      if (type === 'screen') return { icon: 'apps-outline' as const, label: t('quickFind.screen'), color: '#3C69D9' };
      if (type === 'client') return { icon: 'person-outline' as const, label: t('tabs.clients'), color: '#2F8C57' };
      if (type === 'debt') return { icon: 'cash-outline' as const, label: t('tabs.debts'), color: '#C84D4D' };
      return { icon: 'briefcase-outline' as const, label: t('tabs.jobs'), color: '#3C69D9' };
    },
    [t]
  );

  const screenIconName = useCallback((routeName: ResultTarget['routeName']) => {
    if (routeName === 'home') return 'today-outline' as const;
    if (routeName === 'jobs') return 'clipboard-outline' as const;
    if (routeName === 'clients') return 'people-outline' as const;
    if (routeName === 'debts') return 'cash-outline' as const;
    if (routeName === 'profile') return 'person-outline' as const;
    return 'apps-outline' as const;
  }, []);

  const screenIconColor = useCallback((routeName: ResultTarget['routeName']) => {
    if (routeName === 'home') return '#fd2d65';
    if (routeName === 'jobs') return '#d1a642';
    if (routeName === 'clients') return '#4db1a6';
    if (routeName === 'debts') return '#4cbf60';
    if (routeName === 'profile') return '#fd2d65';
    return menuColors.secondaryText;
  }, [menuColors.secondaryText]);

  return (
    <>
      {hostOnly ? null : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('quickFind.open')}
        onPress={open}
        hitSlop={8}
        className={className}
        style={[
          {
            width: 38,
            height: 38,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}>
        <Ionicons name="search" size={19} color="#717983" />
      </Pressable>
      )}

      <Modal visible={mounted} transparent animationType="none" onRequestClose={close}>
        <View className="flex-1">
          <Animated.View
            className="absolute bottom-0 left-0 right-0 top-0"
            style={{ opacity: backdropOpacity }}>
            <Pressable className="absolute bottom-0 left-0 right-0 top-0 bg-black/35" onPress={close} />
          </Animated.View>

          <Animated.View
            style={{
              position: 'absolute',
              left: 28,
              right: 28,
              top: insets.top + 12,
              opacity: panelProgress,
              transform: [
                {
                  translateY: panelProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-18, 0],
                  }),
                },
                {
                  scale: panelProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            }}>
            <View
              style={{
                overflow: 'hidden',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.18)',
                minHeight: 260,
                maxHeight: 520,
                backgroundColor: menuColors.menuSurface,
                shadowColor: '#000000',
                shadowOpacity: 0.24,
                shadowRadius: 22,
                shadowOffset: { width: 0, height: 12 },
                elevation: 22,
              }}>
              <View style={{ minHeight: 260, padding: 16 }}>
                <View className="flex-row items-center">
                  <View
                    className="flex-1 flex-row items-center rounded-full px-3"
                    style={{
                      height: 38,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                    }}>
                    <Ionicons name="search" size={17} color={menuColors.secondaryText} />
                    <TextInput
                      ref={inputRef}
                      value={query}
                      onChangeText={setQuery}
                      returnKeyType="search"
                      placeholder={t('quickFind.placeholder')}
                      placeholderTextColor={menuColors.secondaryText}
                      style={{ marginLeft: 8, flex: 1, paddingVertical: 7, color: menuColors.text, fontSize: 16 }}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                    onPress={close}
                    className="ml-2 items-center justify-center rounded-full"
                    style={{
                      height: 38,
                      width: 38,
                      backgroundColor: 'rgba(255,255,255,0.10)',
                    }}>
                    <Ionicons name="close" size={17} color={menuColors.secondaryText} />
                  </Pressable>
                </View>

                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 430 }}>
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ color: menuColors.secondaryText, fontSize: 14, fontWeight: '600' }}>
                      {t('quickFind.navigationTitle')}
                    </Text>
                    <View className="mt-2 h-px" style={{ backgroundColor: separatorColor(true) }} />
                    <View className="mt-1">
                      {navigationLinks.map((item) => (
                        <Pressable
                          key={item.id}
                          accessibilityRole="link"
                          onPress={() => navigate(item)}
                          className="flex-row items-center pl-3"
                          style={{ paddingVertical: 7 }}>
                          <Ionicons
                            name={screenIconName(item.target.routeName)}
                            size={17}
                            color={screenIconColor(item.target.routeName)}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={{ color: menuColors.text, fontSize: 17, fontWeight: '400', flex: 1 }} numberOfLines={1}>
                            {item.title}
                          </Text>
                          {item.target.routeName === currentScreenRoute ? (
                            <Ionicons name="checkmark" size={19} color="#1C60C3" style={{ marginLeft: 12 }} />
                          ) : null}
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {query.trim() ? (
                  <View style={{ marginTop: 14 }}>
                    <View className="flex-row items-center justify-between">
                      <Text style={{ color: menuColors.secondaryText, fontSize: 14, fontWeight: '600' }}>
                        {t('quickFind.results')}
                      </Text>
                      {loading ? <ActivityIndicator size="small" color={menuColors.secondaryText} /> : null}
                    </View>
                    <View className="mt-2 h-px" style={{ backgroundColor: separatorColor(true) }} />

                    {query.trim() && results.length === 0 && !loading ? (
                      <Text className="mt-3 text-app-meta-lg" style={{ color: menuColors.secondaryText }}>
                        {t('quickFind.noResults')}
                      </Text>
                    ) : null}

                    {results.map((result, index) => {
                      const meta = resultMeta(result.type);
                      const isScreen = result.type === 'screen';
                      const previous = index > 0 ? results[index - 1] : null;
                      const separatesScreens = result.type !== 'screen' && previous?.type === 'screen';
                      return (
                        <React.Fragment key={result.id}>
                        {separatesScreens ? (
                          <View className="my-1 h-px" style={{ backgroundColor: separatorColor(true) }} />
                        ) : null}
                        <Pressable
                          onPress={() => navigate(result)}
                          className="flex-row items-center py-1.5 pl-3">
                          <View className="flex-1">
                            <View className="flex-row items-center">
                              {isScreen ? (
                                <Ionicons
                                  name={screenIconName(result.target.routeName)}
                                  size={17}
                                  color={screenIconColor(result.target.routeName)}
                                  style={{ marginRight: 8 }}
                                />
                              ) : null}
                              <Text style={{ color: menuColors.text, fontSize: 17, fontWeight: '400', flex: 1 }} numberOfLines={1}>
                                {result.title}
                              </Text>
                            </View>
                            {!isScreen ? (
                              <Text style={{ color: menuColors.secondaryText, fontSize: 13 }} numberOfLines={1}>
                                {meta.label} · {result.subtitle}
                              </Text>
                            ) : null}
                          </View>
                          {result.amount != null ? (
                            <Text className="ml-3 text-app-meta-lg" style={{ color: menuColors.secondaryText }}>
                              {moneyFormatter.format(result.amount)}
                            </Text>
                          ) : null}
                        </Pressable>
                        </React.Fragment>
                      );
                    })}
                  </View>
                  ) : null}
                </ScrollView>
                <Text
                  className="px-3 text-center"
                  style={{ marginTop: 'auto', paddingTop: 18, color: menuColors.secondaryText, fontSize: 13, lineHeight: 18 }}>
                  {t('quickFind.hint')}
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

export function QuickFindHost() {
  return <QuickFindButton hostOnly />;
}
