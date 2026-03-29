import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Purchases, { PACKAGE_TYPE, PurchasesPackage } from 'react-native-purchases';
import { supabase } from '@/lib/supabase';

import { useBilling } from '@/providers/BillingProvider';
import { useColorScheme } from '@/components/useColorScheme';

type PlanCard = {
  item: PurchasesPackage;
  title: string;
  active: boolean;
  isAnnual: boolean;
  priceString: string;
  periodLabel: string;
};

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const isPreview = params.preview === '1';
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  const { enabled, hasSubscription, hasTrialAccess, restorePurchases, refreshCustomerInfo } = useBilling();
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

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
        setSelectedPackageId(
          mockPackages.find((entry) => entry.packageType === PACKAGE_TYPE.ANNUAL)?.identifier ??
            mockPackages[0].identifier
        );
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
          if (prev && available.some((entry) => entry.identifier === prev)) {
            return prev;
          }
          return available.find((entry) => entry.packageType === PACKAGE_TYPE.ANNUAL)?.identifier ?? available[0]?.identifier ?? null;
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
    () => packages.find((entry) => entry.identifier === selectedPackageId) ?? null,
    [packages, selectedPackageId]
  );
  const paywallTitle = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('sr')
    ? 'Nikad više ne zaboravi ko ti duguje'
    : t('paywall.title');
  const canScroll = contentHeight > viewportHeight + 12;
  const canContinueFree = isPreview || hasTrialAccess;

  const planCards = useMemo<PlanCard[]>(() => {
    return packages.map((entry) => ({
      item: entry,
      active: selectedPackageId === entry.identifier,
      isAnnual: entry.packageType === PACKAGE_TYPE.ANNUAL,
      title:
        entry.packageType === PACKAGE_TYPE.MONTHLY
          ? t('paywall.planMonthly')
          : entry.packageType === PACKAGE_TYPE.ANNUAL
            ? t('paywall.planYearly')
            : entry.product.title,
      priceString: entry.product.priceString,
      periodLabel:
        entry.packageType === PACKAGE_TYPE.MONTHLY
          ? t('paywall.periodMonthly')
          : entry.packageType === PACKAGE_TYPE.ANNUAL
            ? t('paywall.periodYearly')
            : entry.product.identifier,
    }));
  }, [packages, selectedPackageId, t]);

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
      await refreshCustomerInfo();
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
      await refreshCustomerInfo();
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

  const onClose = async () => {
    if (isPreview) {
      router.replace('/(tabs)/podesavanja');
      return;
    }
    await onSignOut();
  };

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
      <ScrollView
        className="flex-1"
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
        onContentSizeChange={(_, height) => setContentHeight(height)}
        scrollEnabled={canScroll}
        contentContainerStyle={{
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center justify-end">
          <Pressable
            onPress={() => {
              void onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('paywall.close')}
            className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white dark:border-white/10 dark:bg-[#1C1C1E]">
            <Ionicons name="close" size={18} color={isDark ? '#FFFFFF' : '#1C1C1E'} />
          </Pressable>
        </View>

        <View className="mt-5">
          <Text className="text-center font-extrabold text-app-display text-[#1C2745] dark:text-white">
            {paywallTitle}
          </Text>
          <Text
            className="mt-4 text-center text-app-subtitle"
            style={{ color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.60)' }}>
            {t('paywall.subtitle')}
          </Text>
        </View>

        <View className="mt-8">
          {[
            {
              icon: 'checkmark-circle' as const,
              text: t('paywall.features.one'),
              tintBg: isDark ? '#203126' : '#E8F7EF',
              tintColor: isDark ? '#9DDEB4' : '#2F8C57',
            },
            {
              icon: 'checkmark-circle' as const,
              text: t('paywall.features.two'),
              tintBg: isDark ? '#203126' : '#E8F7EF',
              tintColor: isDark ? '#9DDEB4' : '#2F8C57',
            },
            {
              icon: 'checkmark-circle' as const,
              text: t('paywall.features.three'),
              tintBg: isDark ? '#203126' : '#E8F7EF',
              tintColor: isDark ? '#9DDEB4' : '#2F8C57',
            },
            {
              icon: 'checkmark-circle' as const,
              text: t('paywall.features.four'),
              tintBg: isDark ? '#203126' : '#E8F7EF',
              tintColor: isDark ? '#9DDEB4' : '#2F8C57',
            },
          ].map((feature, index) => (
            <View key={feature.text}>
              <View className="flex-row items-center py-2.5">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: feature.tintBg }}>
                  <Ionicons name={feature.icon} size={20} color={feature.tintColor} />
                </View>
                <Text
                  className="ml-3.5 flex-1 text-app-row-lg font-semibold"
                  style={{ color: isDark ? '#F5F7FB' : 'rgba(0,0,0,0.82)' }}>
                  {feature.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text
          className="mt-7 text-center text-app-meta-lg"
          style={{ color: isDark ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.50)' }}>
          {t('paywall.reassurance')}
        </Text>

        <View className="mt-5 flex-row">
          {loadingPackages ? (
            <View
              className="flex-1 items-center rounded-[20px] border border-black/10 py-5 dark:border-white/10"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }}>
              <ActivityIndicator color={isDark ? '#FFFFFF' : '#1D4ED8'} />
            </View>
          ) : planCards.length > 0 ? (
            planCards.map((plan, index) => (
              <Pressable
                key={plan.item.identifier}
                onPress={() => setSelectedPackageId(plan.item.identifier)}
                className="rounded-[20px] px-4 py-4"
                style={{
                  flex: 1,
                  marginLeft: index === 0 ? 0 : 12,
                  borderWidth: 1,
                  borderColor: plan.active ? '#1D4ED8' : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(17,24,39,0.08)',
                  backgroundColor: plan.active ? '#1D68D8' : isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                  shadowColor: '#1D4ED8',
                  shadowOpacity: plan.active && !isDark ? 0.12 : 0,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 0,
                }}>
                {plan.isAnnual ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: 14,
                      borderRadius: 10,
                      backgroundColor: '#F6D27A',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}>
                    <Text className="text-app-meta font-bold text-[#5D4300]">{t('paywall.bestValue')}</Text>
                  </View>
                ) : null}

                <View className="min-h-[50px]">
                  <Text
                    className={
                      plan.active
                        ? 'text-app-row-lg font-extrabold text-white'
                        : 'text-app-row-lg font-extrabold text-[#1C2745] dark:text-white'
                    }>
                    {plan.title}
                  </Text>
                </View>

                <View
                  className="mt-2 h-px"
                  style={{ backgroundColor: plan.active ? 'rgba(255,255,255,0.22)' : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.12)' }}
                />

                <View className="mt-4">
                  <Text
                    className={
                      plan.active
                        ? 'text-app-section font-extrabold text-white'
                        : 'text-app-section font-extrabold text-[#1C2745] dark:text-white'
                    }>
                    {plan.priceString}
                  </Text>
                  <Text className={plan.active ? 'mt-1 text-app-meta-lg font-medium text-white/85' : 'mt-1 text-app-meta-lg font-medium text-black/55 dark:text-white/60'}>
                    {plan.periodLabel}
                  </Text>
                  {plan.isAnnual ? (
                    <Text className={plan.active ? 'mt-3 text-app-meta-lg font-semibold text-white/85' : 'mt-3 text-app-meta-lg font-semibold text-[#3C69D9] dark:text-[#8FB2FF]'}>
                      {t('paywall.annualSubnote')}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          ) : (
            <View
              className="flex-1 rounded-[22px] border border-black/10 px-4 py-4 dark:border-white/10"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }}>
              <Text
                className="text-app-meta-lg"
                style={{ color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.62)' }}>
                {t('paywall.noPackages')}
              </Text>
            </View>
          )}
        </View>

        {isExpoGo ? (
          <Text className="mt-4 text-app-meta-lg" style={{ color: isDark ? '#FACC15' : '#B45309' }}>
            {t('paywall.mockBanner')}
          </Text>
        ) : null}

        {error ? <Text className="mt-4 text-app-meta-lg text-red-500">{error}</Text> : null}

        <Pressable
          onPress={() => {
            void openPaywall();
          }}
          disabled={submitting || hasSubscription || !enabled || !selectedPackage || loadingPackages}
          className="mt-7 flex-row items-center justify-center rounded-[16px] bg-[#1D68D8] px-4 py-4"
          style={{ opacity: submitting || hasSubscription || !enabled || !selectedPackage || loadingPackages ? 0.6 : 1 }}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-app-body font-bold text-white">
              {t(
                selectedPackage?.packageType === PACKAGE_TYPE.MONTHLY
                  ? 'paywall.ctaMonthly'
                  : 'paywall.ctaYearly'
              )}
            </Text>
          )}
        </Pressable>

        {canContinueFree ? (
          <Pressable onPress={() => void onClose()} className="mt-4 items-center">
            <Text className="text-app-body font-semibold text-[#2F68ED] dark:text-[#8FB2FF]">
              {t('paywall.continueFree')}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => void onSignOut()} className="mt-4 items-center">
            <Text
              className="text-app-body font-semibold"
              style={{ color: isDark ? 'rgba(255,255,255,0.68)' : 'rgba(0,0,0,0.52)' }}>
              {t('paywall.signOut')}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            void onRestore();
          }}
          disabled={restoring}
          className="mt-4 items-center">
          {restoring ? (
            <ActivityIndicator color={isDark ? '#FFFFFF' : '#1C2745'} />
          ) : (
            <Text
              className="text-app-meta-lg font-medium"
              style={{ color: isDark ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.48)' }}>
              {t('paywall.restore')}
            </Text>
          )}
        </Pressable>

        <Text
          className="mt-5 text-center text-app-meta"
          style={{ color: isDark ? 'rgba(255,255,255,0.58)' : 'rgba(0,0,0,0.42)' }}>
          {t('paywall.footerNote')}
        </Text>
      </ScrollView>
    </View>
  );
}
