import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
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
import Colors from '@/constants/Colors';

type PlanCard = {
  item: PurchasesPackage;
  title: string;
  active: boolean;
  isAnnual: boolean;
  priceString: string;
  periodLabel: string;
};

const APP_ICON = require('../assets/images/splash-logo.png');
const FORM_WIDTH = 340;

function isFreeTrialOption(option: SubscriptionOption | null | undefined) {
  if (!option) return false;
  if (option.freePhase) return true;
  return (option.pricingPhases ?? []).some((phase) => {
    const micros = phase.price?.amountMicros;
    return phase.offerPaymentMode === 'FREE_TRIAL' || (micros !== undefined && micros <= 0);
  });
}

function findPaidSubscriptionOption(pkg: PurchasesPackage | null): SubscriptionOption | null {
  if (!pkg) return null;
  const product = pkg.product;
  if (product.defaultOption && !isFreeTrialOption(product.defaultOption)) {
    return product.defaultOption;
  }
  return (product.subscriptionOptions ?? []).find((option) => !isFreeTrialOption(option)) ?? null;
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const reapplyColorScheme = useReapplyColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
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
  const paywallTitle = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('sr')
    ? 'Nikad više ne zaboravi ko ti duguje'
    : t('paywall.title');
  const screenBackground = isDark ? colors.background : '#FFFFFF';
  const titleColor = isDark ? '#F7F7F8' : '#25272C';
  const bodyColor = colors.secondaryText;
  const planSurface = isDark ? colors.elevatedSurface : '#F6F7FA';
  const activePlanSurface = isDark ? '#3D4654' : '#E9EEF8';
  const planBorderColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(60,60,67,0.12)';
  const activePlanBorderColor = colors.accent;
  const featureItems = useMemo(
    () => [
      t('paywall.features.one'),
      t('paywall.features.two'),
      t('paywall.features.three'),
      t('paywall.features.four'),
    ],
    [t]
  );
  const canScroll = contentHeight > viewportHeight + 12;
  const canDismiss = isPreview;

  const planCards = useMemo<PlanCard[]>(() => {
    return packages
      .map((entry) => ({
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
      }))
      .sort((a, b) => Number(b.isAnnual) - Number(a.isAnnual));
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
      const paidOption = findPaidSubscriptionOption(selectedPackage);
      if (paidOption) {
        await Purchases.purchaseSubscriptionOption(paidOption);
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
      router.replace('/(tabs)/podesavanja' as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: screenBackground }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {canDismiss ? (
        <Pressable
          onPress={() => {
            void onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.close')}
          className="absolute right-5 z-10 h-10 w-10 items-center justify-center rounded-full"
          style={{ top: insets.top + 12, backgroundColor: colors.elevatedSurface }}>
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
      ) : null}

      <ScrollView
        className="flex-1"
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
        onContentSizeChange={(_, nextHeight) => setContentHeight(nextHeight)}
        scrollEnabled={canScroll}
        contentContainerStyle={{
          flexGrow: 1,
          minHeight: Math.max(height, 760),
          paddingTop: insets.top + 54,
          paddingBottom: Math.max(insets.bottom + 24, 34),
          paddingHorizontal: 28,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View
          style={{
            width: '100%',
            maxWidth: FORM_WIDTH,
            alignSelf: 'center',
            flexGrow: 1,
            justifyContent: 'space-between',
          }}>
          <View>
            <View className="flex-row items-center">
              <Image source={APP_ICON} resizeMode="contain" style={{ width: 46, height: 46, borderRadius: 12 }} />
              <View className="ml-3">
                <Text className="text-app-row font-semibold" style={{ color: colors.accent }}>
                  {t('paywall.eyebrow')}
                </Text>
                <Text className="text-app-row-title font-semibold" style={{ color: titleColor }}>
                  eTefter Premium
                </Text>
              </View>
            </View>

            <Text style={{ marginTop: 34, color: titleColor, fontSize: 28, lineHeight: 34, fontWeight: '500' }}>
              {paywallTitle}
            </Text>
            <Text style={{ marginTop: 8, color: bodyColor, fontSize: 16, lineHeight: 22 }}>
              {t('paywall.subtitle')}
            </Text>

            <View style={{ marginTop: 28 }}>
              {featureItems.map((feature) => (
                <View key={feature} className="mt-3 flex-row items-center">
                  <View
                    className="h-6 w-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.iconSurface }}>
                    <Ionicons name="checkmark" size={15} color={colors.accent} />
                  </View>
                  <Text className="ml-3 flex-1 text-app-row" style={{ color: colors.text }}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ marginTop: 30 }}>
              <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                {t('paywall.choosePlan')}
              </Text>
              <View style={{ marginTop: 8, height: 1, backgroundColor: colors.separator }} />
            </View>

            <View style={{ marginTop: 12 }}>
              {loadingPackages ? (
                <View
                  className="items-center rounded-[18px] py-5"
                  style={{ backgroundColor: planSurface, borderWidth: 1, borderColor: planBorderColor }}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : planCards.length > 0 ? (
                planCards.map((plan, index) => (
                  <Pressable
                    key={plan.item.identifier}
                    onPress={() => setSelectedPackageId(plan.item.identifier)}
                    className="flex-row items-center rounded-[18px] px-4 py-3.5"
                    style={{
                      marginTop: index === 0 ? 0 : 10,
                      borderWidth: plan.active ? 1.5 : 1,
                      borderColor: plan.active ? activePlanBorderColor : planBorderColor,
                      backgroundColor: plan.active ? activePlanSurface : planSurface,
                    }}>
                    <View
                      className="h-7 w-7 items-center justify-center rounded-full"
                      style={{
                        borderWidth: plan.active ? 0 : 1,
                        borderColor: colors.separator,
                        backgroundColor: plan.active ? colors.accent : 'transparent',
                      }}>
                      {plan.active ? <Ionicons name="checkmark" size={17} color={colors.onAccent} /> : null}
                    </View>

                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-app-row-lg font-semibold" style={{ color: colors.text }}>
                          {plan.title}
                        </Text>
                        {plan.isAnnual ? (
                          <View className="ml-2 rounded-full px-2 py-0.5" style={{ backgroundColor: colors.warningSurface }}>
                            <Text className="text-app-meta font-semibold" style={{ color: colors.warningText }}>
                              {t('paywall.bestValue')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="mt-0.5 text-app-meta-lg" style={{ color: colors.secondaryText }}>
                        {plan.isAnnual ? t('paywall.annualSubnote') : t('paywall.monthlySubnote')}
                      </Text>
                    </View>

                    <View className="ml-3 items-end">
                      <Text className="text-app-row font-semibold" style={{ color: colors.text }}>
                        {plan.priceString}
                      </Text>
                      <Text className="text-app-meta" style={{ color: colors.secondaryText }}>
                        {plan.periodLabel}
                      </Text>
                    </View>
                  </Pressable>
                ))
              ) : (
                <View
                  className="rounded-[18px] px-4 py-4"
                  style={{ backgroundColor: planSurface, borderWidth: 1, borderColor: planBorderColor }}>
                  <Text className="text-app-meta-lg" style={{ color: colors.secondaryText }}>{t('paywall.noPackages')}</Text>
                </View>
              )}
            </View>

            {isExpoGo ? (
              <Text className="mt-4 text-center text-app-meta-lg" style={{ color: colors.warningText }}>
                {t('paywall.mockBanner')}
              </Text>
            ) : null}

            {error ? <Text className="mt-4 text-center text-app-meta-lg" style={{ color: '#FF6B6B' }}>{error}</Text> : null}

            <Pressable
              onPress={() => {
                void openPaywall();
              }}
              disabled={submitting || hasSubscription || !enabled || !selectedPackage || loadingPackages}
              className="mt-7 flex-row items-center justify-center rounded-[22px] px-5"
              style={{
                height: 44,
                backgroundColor: colors.accent,
                opacity: submitting || hasSubscription || !enabled || !selectedPackage || loadingPackages ? 0.6 : 1,
              }}>
              {submitting ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text className="text-app-row font-semibold" style={{ color: colors.onAccent }}>
                  {t('paywall.cta')}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={{ paddingTop: 26, alignItems: 'center' }}>
            <Pressable
              onPress={() => {
                void onRestore();
              }}
              disabled={restoring}
              hitSlop={10}>
              {restoring ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text className="text-app-row font-semibold" style={{ color: colors.accent }}>
                  {t('paywall.restore')}
                </Text>
              )}
            </Pressable>

            {canDismiss ? null : (
              <Pressable onPress={() => void onSignOut()} className="mt-4" hitSlop={10}>
                <Text className="text-app-meta-lg font-semibold" style={{ color: colors.secondaryText }}>
                  {t('paywall.signOut')}
                </Text>
              </Pressable>
            )}

            <Text className="mt-4 text-center text-app-meta" style={{ color: colors.secondaryText }}>
              {t('paywall.footerNote')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
