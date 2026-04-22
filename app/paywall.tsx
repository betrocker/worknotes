import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Purchases, {
  PACKAGE_TYPE,
  PurchasesPackage,
  SubscriptionOption,
} from 'react-native-purchases';
import { supabase } from '@/lib/supabase';

import { useBilling } from '@/providers/BillingProvider';
import { useColorScheme, useReapplyColorScheme } from '@/components/useColorScheme';

type PlanCard = {
  item: PurchasesPackage;
  title: string;
  active: boolean;
  isAnnual: boolean;
  priceString: string;
  periodLabel: string;
  trialDays: number | null;
};

const LIGHT_PALETTE = {
  bg: '#F2F2F7',
  cardBg: '#FFFFFF',
  cardBorder: 'rgba(17,24,39,0.08)',
  cardActiveBg: '#1D68D8',
  cardActiveBorder: '#1D4ED8',
  textPrimary: '#1C2745',
  textSubtitle: 'rgba(0,0,0,0.60)',
  textFeature: 'rgba(0,0,0,0.82)',
  textMeta: 'rgba(0,0,0,0.50)',
  textMetaSoft: 'rgba(0,0,0,0.48)',
  textFooter: 'rgba(0,0,0,0.42)',
  textSignOut: 'rgba(0,0,0,0.52)',
  featureBg: '#E8F7EF',
  featureIcon: '#2F8C57',
  trialBadge: '#2F8C57',
  annualNote: '#3C69D9',
  divider: 'rgba(60,60,67,0.12)',
  closeBg: '#FFFFFF',
  closeBorder: 'rgba(0,0,0,0.10)',
  closeIcon: '#1C1C1E',
  noPackagesBg: '#FFFFFF',
  noPackagesBorder: 'rgba(0,0,0,0.10)',
  noPackagesText: 'rgba(0,0,0,0.62)',
  mockBanner: '#B45309',
  restoreSpinner: '#1C2745',
} as const;

const DARK_PALETTE = {
  bg: '#0B0E14',
  cardBg: '#17181C',
  cardBorder: 'rgba(255,255,255,0.12)',
  cardActiveBg: '#1D68D8',
  cardActiveBorder: '#3C8AF0',
  textPrimary: '#F5F7FB',
  textSubtitle: 'rgba(255,255,255,0.72)',
  textFeature: '#F5F7FB',
  textMeta: 'rgba(255,255,255,0.62)',
  textMetaSoft: 'rgba(255,255,255,0.58)',
  textFooter: 'rgba(255,255,255,0.54)',
  textSignOut: 'rgba(255,255,255,0.68)',
  featureBg: '#16311F',
  featureIcon: '#6EE7A8',
  trialBadge: '#7AD69C',
  annualNote: '#8FB2FF',
  divider: 'rgba(255,255,255,0.10)',
  closeBg: '#1C1C1E',
  closeBorder: 'rgba(255,255,255,0.15)',
  closeIcon: '#FFFFFF',
  noPackagesBg: '#17181C',
  noPackagesBorder: 'rgba(255,255,255,0.10)',
  noPackagesText: 'rgba(255,255,255,0.70)',
  mockBanner: '#FACC15',
  restoreSpinner: '#FFFFFF',
} as const;

function periodUnitToDays(unit: string | undefined, value: number | null | undefined): number | null {
  if (!value || value <= 0) return null;

  switch ((unit ?? '').toUpperCase()) {
    case 'DAY':
      return value;
    case 'WEEK':
      return value * 7;
    case 'MONTH':
      return value * 30;
    case 'YEAR':
      return value * 365;
    default:
      return null;
  }
}

function parseIso8601DurationToDays(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?/.exec(iso);
  if (!match) return null;
  const [, y, m, w, d] = match;
  const total =
    (y ? parseInt(y, 10) * 365 : 0) +
    (m ? parseInt(m, 10) * 30 : 0) +
    (w ? parseInt(w, 10) * 7 : 0) +
    (d ? parseInt(d, 10) : 0);
  return total > 0 ? total : null;
}

function billingPeriodToDays(period: { unit?: string; value?: number; iso8601?: string } | null | undefined): number | null {
  if (!period) return null;
  const isoDays = parseIso8601DurationToDays(period.iso8601 ?? null);
  if (isoDays) return isoDays;
  return periodUnitToDays(period.unit, period.value);
}

function getFreeTrialDaysFromOption(option: SubscriptionOption | null | undefined): number | null {
  if (!option) return null;

  const free = option.freePhase;
  if (free) {
    const days = billingPeriodToDays(free.billingPeriod);
    if (days) return days;
  }

  for (const phase of option.pricingPhases ?? []) {
    const micros = phase.price?.amountMicros;
    const isFreeByAmount = micros !== undefined && micros <= 0;
    const isFreeByMode = phase.offerPaymentMode === 'FREE_TRIAL';
    if (isFreeByAmount || isFreeByMode) {
      const days = billingPeriodToDays(phase.billingPeriod);
      if (days) return days;
    }
  }

  return null;
}

function getPackageTrialDays(pkg: PurchasesPackage | null): number | null {
  if (!pkg) return null;

  const product = pkg.product;

  const defaultDays = getFreeTrialDaysFromOption(product.defaultOption);
  if (defaultDays) return defaultDays;

  for (const option of product.subscriptionOptions ?? []) {
    const days = getFreeTrialDaysFromOption(option);
    if (days) return days;
  }

  const introPrice = product.introPrice;
  if (introPrice && introPrice.price === 0) {
    const introDays = periodUnitToDays(introPrice.periodUnit, introPrice.periodNumberOfUnits);
    if (introDays) return introDays;
  }

  return null;
}

function findTrialOption(pkg: PurchasesPackage | null): SubscriptionOption | null {
  if (!pkg) return null;
  const product = pkg.product;
  if (getFreeTrialDaysFromOption(product.defaultOption)) {
    return product.defaultOption ?? null;
  }
  return (product.subscriptionOptions ?? []).find((option) => getFreeTrialDaysFromOption(option)) ?? null;
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const reapplyColorScheme = useReapplyColorScheme();
  const isDark = colorScheme === 'dark';
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  const isPreview = params.preview === '1';
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  const {
    enabled,
    hasSubscription,
    restorePurchases,
    refreshCustomerInfo,
  } = useBilling();
  const [submitting, setSubmitting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  // Reapply preferred theme whenever the paywall mounts or regains focus.
  // Play Billing sheets can flip NativeWind's internal colorScheme; this
  // keeps the paywall visually stable on the user's preferred theme.
  useEffect(() => {
    reapplyColorScheme();
  }, [reapplyColorScheme]);

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
          mockPackages.find((entry) => getPackageTrialDays(entry) != null)?.identifier ??
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

        if (__DEV__) {
          available.forEach((pkg) => {
            console.log(
              '[paywall] package',
              pkg.identifier,
              'defaultOption freePhase:',
              pkg.product.defaultOption?.freePhase,
              'subscriptionOptions:',
              pkg.product.subscriptionOptions?.map((opt) => ({
                id: opt.id,
                freePhase: opt.freePhase,
                pricingPhases: opt.pricingPhases?.map((p) => ({
                  amountMicros: p.price?.amountMicros,
                  offerPaymentMode: p.offerPaymentMode,
                  billingPeriod: p.billingPeriod,
                })),
              }))
            );
          });
        }

        setPackages(available);
        setSelectedPackageId((prev) => {
          if (prev && available.some((entry) => entry.identifier === prev)) {
            return prev;
          }
          return (
            available.find((entry) => getPackageTrialDays(entry) != null)?.identifier ??
            available.find((entry) => entry.packageType === PACKAGE_TYPE.ANNUAL)?.identifier ??
            available[0]?.identifier ??
            null
          );
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
  const selectedTrialDays = useMemo(() => getPackageTrialDays(selectedPackage), [selectedPackage]);
  const paywallTitle = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('sr')
    ? 'Nikad više ne zaboravi ko ti duguje'
    : t('paywall.title');
  const canScroll = contentHeight > viewportHeight + 12;
  const canDismiss = isPreview;

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
      trialDays: getPackageTrialDays(entry),
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
    // Pin preferred theme before we hand the UI over to Play Billing —
    // cancelling the sheet fires appearance/AppState events that can flip
    // NativeWind's scheme if we don't keep reapplying.
    reapplyColorScheme();
    try {
      const trialOption = findTrialOption(selectedPackage);
      const defaultOption = selectedPackage.product.defaultOption;
      if (trialOption && trialOption !== defaultOption) {
        await Purchases.purchaseSubscriptionOption(trialOption);
      } else {
        await Purchases.purchasePackage(selectedPackage);
      }
      await refreshCustomerInfo();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      reapplyColorScheme();
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
      reapplyColorScheme();
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
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
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
          {canDismiss ? (
            <Pressable
              onPress={() => {
                void onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('paywall.close')}
              className="h-10 w-10 items-center justify-center rounded-3xl"
              style={{
                backgroundColor: palette.closeBg,
                borderWidth: 1,
                borderColor: palette.closeBorder,
              }}>
              <Ionicons name="close" size={18} color={palette.closeIcon} />
            </Pressable>
          ) : null}
        </View>

        <View className="mt-5">
          <Text
            className="text-center font-extrabold text-app-display"
            style={{ color: palette.textPrimary }}>
            {paywallTitle}
          </Text>
          <Text
            className="mt-4 text-center text-app-subtitle"
            style={{ color: palette.textSubtitle }}>
            {t('paywall.subtitle')}
          </Text>
        </View>

        <View className="mt-8">
          {[
            { icon: 'checkmark-circle' as const, text: t('paywall.features.one') },
            { icon: 'checkmark-circle' as const, text: t('paywall.features.two') },
            { icon: 'checkmark-circle' as const, text: t('paywall.features.three') },
            { icon: 'checkmark-circle' as const, text: t('paywall.features.four') },
          ].map((feature) => (
            <View key={feature.text}>
              <View className="flex-row items-center py-2.5">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: palette.featureBg }}>
                  <Ionicons name={feature.icon} size={20} color={palette.featureIcon} />
                </View>
                <Text
                  className="ml-3.5 flex-1 text-app-row-lg font-semibold"
                  style={{ color: palette.textFeature }}>
                  {feature.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text
          className="mt-7 text-center text-app-meta-lg"
          style={{ color: palette.textMeta }}>
          {t('paywall.reassurance')}
        </Text>

        <View className="mt-5 flex-row">
          {loadingPackages ? (
            <View
              className="flex-1 items-center rounded-[20px] py-5"
              style={{
                backgroundColor: palette.cardBg,
                borderWidth: 1,
                borderColor: palette.cardBorder,
              }}>
              <ActivityIndicator color={isDark ? '#FFFFFF' : '#1D4ED8'} />
            </View>
          ) : planCards.length > 0 ? (
            planCards.map((plan, index) => {
              const activeBg = palette.cardActiveBg;
              const activeBorder = palette.cardActiveBorder;
              const activeTextPrimary = '#FFFFFF';
              const activeTextSubtle = 'rgba(255,255,255,0.85)';
              const activeTextSubtleStrong = 'rgba(255,255,255,0.92)';

              return (
                <Pressable
                  key={plan.item.identifier}
                  onPress={() => setSelectedPackageId(plan.item.identifier)}
                  className="rounded-[20px] px-4 py-4"
                  style={{
                    flex: 1,
                    marginLeft: index === 0 ? 0 : 12,
                    borderWidth: 1,
                    borderColor: plan.active ? activeBorder : palette.cardBorder,
                    backgroundColor: plan.active ? activeBg : palette.cardBg,
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
                      <Text className="text-app-meta font-bold" style={{ color: '#5D4300' }}>
                        {t('paywall.bestValue')}
                      </Text>
                    </View>
                  ) : null}

                  <View className="min-h-[50px]">
                    <Text
                      className="text-app-row-lg font-extrabold"
                      style={{ color: plan.active ? activeTextPrimary : palette.textPrimary }}>
                      {plan.title}
                    </Text>
                  </View>

                  <View
                    className="mt-2 h-px"
                    style={{
                      backgroundColor: plan.active ? 'rgba(255,255,255,0.22)' : palette.divider,
                    }}
                  />

                  <View className="mt-4">
                    <Text
                      className="text-app-section font-extrabold"
                      style={{ color: plan.active ? activeTextPrimary : palette.textPrimary }}>
                      {plan.priceString}
                    </Text>
                    <Text
                      className="mt-1 text-app-meta-lg font-medium"
                      style={{
                        color: plan.active ? activeTextSubtle : palette.textMeta,
                      }}>
                      {plan.periodLabel}
                    </Text>
                    {plan.isAnnual ? (
                      <Text
                        className="mt-3 text-app-meta-lg font-semibold"
                        style={{
                          color: plan.active ? activeTextSubtle : palette.annualNote,
                        }}>
                        {t('paywall.annualSubnote')}
                      </Text>
                    ) : null}
                    {plan.trialDays ? (
                      <Text
                        className="mt-2 text-app-meta-lg font-semibold"
                        style={{
                          color: plan.active ? activeTextSubtleStrong : palette.trialBadge,
                        }}>
                        {t('paywall.trialBadge', { count: plan.trialDays })}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View
              className="flex-1 rounded-[22px] px-4 py-4"
              style={{
                backgroundColor: palette.noPackagesBg,
                borderWidth: 1,
                borderColor: palette.noPackagesBorder,
              }}>
              <Text className="text-app-meta-lg" style={{ color: palette.noPackagesText }}>
                {t('paywall.noPackages')}
              </Text>
            </View>
          )}
        </View>

        {isExpoGo ? (
          <Text className="mt-4 text-app-meta-lg" style={{ color: palette.mockBanner }}>
            {t('paywall.mockBanner')}
          </Text>
        ) : null}

        {error ? <Text className="mt-4 text-app-meta-lg text-red-500">{error}</Text> : null}

        <Pressable
          onPress={() => {
            void openPaywall();
          }}
          disabled={submitting || hasSubscription || !enabled || !selectedPackage || loadingPackages}
          className="mt-7 flex-row items-center justify-center rounded-[16px] px-4 py-4"
          style={{
            backgroundColor: '#1D68D8',
            opacity: submitting || hasSubscription || !enabled || !selectedPackage || loadingPackages ? 0.6 : 1,
          }}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-app-body font-bold" style={{ color: '#FFFFFF' }}>
              {selectedTrialDays && !hasSubscription
                ? t('paywall.ctaTrial', { count: selectedTrialDays })
                : t(
                    selectedPackage?.packageType === PACKAGE_TYPE.MONTHLY
                      ? 'paywall.ctaMonthly'
                      : 'paywall.ctaYearly'
                  )}
            </Text>
          )}
        </Pressable>

        {canDismiss ? null : (
          <Pressable onPress={() => void onSignOut()} className="mt-4 items-center">
            <Text
              className="text-app-body font-semibold"
              style={{ color: palette.textSignOut }}>
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
            <ActivityIndicator color={palette.restoreSpinner} />
          ) : (
            <Text
              className="text-app-meta-lg font-medium"
              style={{ color: palette.textMetaSoft }}>
              {t('paywall.restore')}
            </Text>
          )}
        </Pressable>

        <Text
          className="mt-5 text-center text-app-meta"
          style={{ color: palette.textFooter }}>
          {t('paywall.footerNote')}
        </Text>
      </ScrollView>
    </View>
  );
}
