import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Purchases, { PACKAGE_TYPE, PurchasesPackage } from 'react-native-purchases';
import { supabase } from '@/lib/supabase';

import { useBilling } from '@/providers/BillingProvider';
import { useColorScheme } from '@/components/useColorScheme';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  const { enabled, hasAccess, restorePurchases } = useBilling();
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadOfferings = async () => {
      if (!enabled) {
        setPackages([]);
        setSelectedPackageId(null);
        return;
      }

      if (isExpoGo) {
        const mockPackages = [
          {
            identifier: '$rc_monthly',
            packageType: PACKAGE_TYPE.MONTHLY,
            product: {
              identifier: 'tefter_monthly',
              description: t('paywall.mockMonthlyDescription'),
              title: t('paywall.planMonthly'),
              price: 499,
              priceString: t('paywall.mockMonthlyPrice'),
            },
          },
          {
            identifier: '$rc_annual',
            packageType: PACKAGE_TYPE.ANNUAL,
            product: {
              identifier: 'tefter_yearly',
              description: t('paywall.mockYearlyDescription'),
              title: t('paywall.planYearly'),
              price: 3990,
              priceString: t('paywall.mockYearlyPrice'),
            },
          },
        ] as unknown as PurchasesPackage[];

        if (!active) return;
        setPackages(mockPackages);
        setSelectedPackageId(mockPackages[0].identifier);
        setLoadingPackages(false);
        return;
      }

      setLoadingPackages(true);
      setError(null);
      try {
        const offerings = await Purchases.getOfferings();
        const available =
          offerings.current?.availablePackages?.slice().sort((a, b) => {
            const rank = (value: PurchasesPackage) => {
              switch (value.packageType) {
                case PACKAGE_TYPE.MONTHLY:
                  return 1;
                case PACKAGE_TYPE.ANNUAL:
                  return 2;
                default:
                  return 99;
              }
            };
            return rank(a) - rank(b);
          }) ?? [];

        if (!active) return;

        setPackages(available);
        setSelectedPackageId((prev) => {
          if (prev && available.some((item) => item.identifier === prev)) {
            return prev;
          }
          return available[0]?.identifier ?? null;
        });
      } catch (e: unknown) {
        if (!active) return;
        setPackages([]);
        setSelectedPackageId(null);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) {
          setLoadingPackages(false);
        }
      }
    };

    void loadOfferings();

    return () => {
      active = false;
    };
  }, [enabled, isExpoGo, t]);

  const selectedPackage = useMemo(
    () => packages.find((item) => item.identifier === selectedPackageId) ?? null,
    [packages, selectedPackageId]
  );

  const openPaywall = async () => {
    if (isExpoGo) {
      setError(t('paywall.mockNotice'));
      return;
    }

    if (!enabled || !selectedPackage) return;
    setSubmitting(true);
    setError(null);
    try {
      await Purchases.purchasePackage(selectedPackage);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onRestore = async () => {
    setRestoring(true);
    setError(null);
    try {
      await restorePurchases();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRestoring(false);
    }
  };

  const onSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <LinearGradient
      colors={isDark ? ['#081225', '#12305C', '#10213E', '#0B111C'] : ['#1A4FE0', '#3B73F0', '#7FA8FF', '#EEF3FF']}
      locations={isDark ? [0, 0.28, 0.65, 1] : [0, 0.24, 0.62, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ minHeight: 330, paddingTop: insets.top + 18, paddingHorizontal: 24 }}>
          <Text className="text-[15px] font-semibold tracking-[0.3px] text-white/84">
            {t('paywall.eyebrow')}
          </Text>
          <Text className="mt-5 max-w-[220px] text-[34px] font-extrabold leading-[40px] text-white">
            {t('paywall.title')}
          </Text>
          <Text className="mt-3 max-w-[220px] text-[15px] leading-[22px] text-white/88">
            {t('paywall.subtitle')}
          </Text>

          <Image
            source={require('../assets/images/maskotavawe.png')}
            resizeMode="contain"
            style={{
              position: 'absolute',
              right: -8,
              top: insets.top + 20,
              width: 230,
              height: 230,
            }}
          />
        </View>

        <View
          style={{
            borderTopLeftRadius: 34,
            borderTopRightRadius: 34,
            backgroundColor: isDark ? 'rgba(18,21,30,0.98)' : 'rgba(247,249,255,0.97)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.84)',
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: insets.bottom + 20,
            shadowColor: '#000000',
            shadowOpacity: isDark ? 0.32 : 0.16,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 18,
          }}>
          <View
            style={{
              borderRadius: 28,
              backgroundColor: isDark ? 'rgba(28,32,44,0.92)' : 'rgba(255,255,255,0.86)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(235,240,255,0.96)',
              padding: 18,
              shadowColor: '#000000',
              shadowOpacity: isDark ? 0.26 : 0.18,
              shadowRadius: 10,
              shadowOffset: { width: 2, height: 6 },
              elevation: 12,
            }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                t('paywall.features.one'),
                t('paywall.features.two'),
                t('paywall.features.three'),
              ].map((feature, index) => (
                <View key={feature} className={index === 0 ? 'flex-row items-start' : 'mt-3 flex-row items-start'}>
                  <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-[#E8F0FF] dark:bg-[#1E2A44]">
                    <Ionicons
                      name={index === 0 ? 'briefcase-outline' : index === 1 ? 'document-text-outline' : 'notifications-outline'}
                      size={16}
                      color={isDark ? '#DCE7FF' : '#1D4ED8'}
                    />
                  </View>
                  <Text className="ml-3 flex-1 text-[15px] leading-[21px] text-black/72 dark:text-white/78">
                    {feature}
                  </Text>
                </View>
              ))}

              <Text className="mt-6 text-[13px] font-semibold uppercase tracking-[0.3px] text-black/52 dark:text-white/54">
                {t('paywall.choosePlan')}
              </Text>

              {loadingPackages ? (
                <View className="mt-4 items-center rounded-[22px] border border-black/8 bg-black/4 px-4 py-5 dark:border-white/10 dark:bg-white/5">
                  <ActivityIndicator color={isDark ? '#FFFFFF' : '#1D4ED8'} />
                </View>
              ) : packages.length > 0 ? (
                <View className="mt-3 gap-3">
                  {packages.map((item) => {
                    const active = selectedPackageId === item.identifier;
                    const product = item.product;
                    const accent = active ? '#1D4ED8' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(29,78,216,0.10)';
                    const title =
                      item.packageType === PACKAGE_TYPE.MONTHLY
                        ? t('paywall.planMonthly')
                        : item.packageType === PACKAGE_TYPE.ANNUAL
                          ? t('paywall.planYearly')
                          : product.title;

                    return (
                      <Pressable
                        key={item.identifier}
                        onPress={() => setSelectedPackageId(item.identifier)}
                        style={{
                          borderRadius: 22,
                          borderWidth: 1,
                          borderColor: active ? '#1D4ED8' : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(17,24,39,0.08)',
                          backgroundColor: active ? accent : isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                        }}>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 pr-3">
                            <Text className="text-[16px] font-extrabold text-black dark:text-white">
                              {title}
                            </Text>
                            <Text className="mt-1 text-[13px] leading-[18px] text-black/54 dark:text-white/60">
                              {product.description || product.title}
                            </Text>
                          </View>

                          <View className="items-end">
                            <Text className="text-[18px] font-extrabold text-black dark:text-white">
                              {product.priceString}
                            </Text>
                            <Text className="mt-1 text-[12px] font-medium text-black/46 dark:text-white/54">
                              {item.packageType === PACKAGE_TYPE.MONTHLY
                                ? t('paywall.periodMonthly')
                                : item.packageType === PACKAGE_TYPE.ANNUAL
                                  ? t('paywall.periodYearly')
                                  : product.identifier}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View className="mt-3 rounded-[22px] border border-black/8 bg-black/4 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                  <Text className="text-[14px] leading-[20px] text-black/62 dark:text-white/66">
                    {t('paywall.noPackages')}
                  </Text>
                </View>
              )}

              {isExpoGo ? (
                <Text className="mt-4 text-sm text-amber-600 dark:text-amber-300">
                  {t('paywall.mockBanner')}
                </Text>
              ) : null}

              {error ? <Text className="mt-4 text-sm text-red-500">{error}</Text> : null}

              <Pressable
                onPress={() => {
                  void openPaywall();
                }}
                disabled={submitting || hasAccess || !enabled || !selectedPackage || loadingPackages}
                className="mt-6 flex-row items-center justify-center rounded-[24px] bg-[#1D4ED8] px-4 py-4 disabled:opacity-60">
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text className="text-base font-semibold text-white">{t('paywall.cta')}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  void onRestore();
                }}
                disabled={restoring}
                className="mt-3 items-center rounded-[22px] border border-black/8 bg-black/5 px-4 py-3 dark:border-white/10 dark:bg-white/6">
                {restoring ? (
                  <ActivityIndicator color={isDark ? '#FFFFFF' : '#1C2745'} />
                ) : (
                  <Text className="text-[15px] font-semibold text-black dark:text-white">
                    {t('paywall.restore')}
                  </Text>
                )}
              </Pressable>

              <Pressable onPress={() => void onSignOut()} className="mt-4 items-center">
                <Text className="text-[14px] font-medium text-black/48 dark:text-white/52">
                  {t('paywall.signOut')}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}
