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
  const { enabled, hasSubscription, restorePurchases, refreshCustomerInfo } = useBilling();
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
    await onSignOut();
  };

  return (
    <LinearGradient
      colors={isDark ? ['#081225', '#12305C', '#10213E', '#0B111C'] : ['#1A4FE0', '#3B73F0', '#7FA8FF', '#EEF3FF']}
      locations={isDark ? [0, 0.28, 0.65, 1] : [0, 0.24, 0.62, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View style={{ minHeight: 292, paddingTop: insets.top + 18, paddingHorizontal: 24, paddingBottom: 24 }}>
          <View style={{ alignItems: 'flex-end', zIndex: 20, elevation: 20 }}>
            <Pressable
              onPress={() => {
                void onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('paywall.close')}
              style={{
                height: 40,
                width: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.14)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.16)',
              }}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', letterSpacing: 0.3, color: 'rgba(255,255,255,0.84)' }}>
            {t('paywall.eyebrow')}
          </Text>
          <Text style={{ marginTop: 18, maxWidth: 220, fontSize: 34, fontWeight: '800', lineHeight: 40, color: '#FFFFFF' }}>
            {t('paywall.title')}
          </Text>
          <Text style={{ marginTop: 12, maxWidth: 220, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.88)' }}>
            {t('paywall.subtitle')}
          </Text>

          <Image
            source={require('../assets/images/maskotavawe.png')}
            resizeMode="contain"
            style={{
              position: 'absolute',
              right: -8,
              top: insets.top + 24,
              width: 210,
              height: 210,
            }}
            pointerEvents="none"
          />
        </View>

        <View
          style={{
            flex: 1,
            minHeight: 0,
            marginTop: -18,
            borderTopLeftRadius: 34,
            borderTopRightRadius: 34,
            backgroundColor: isDark ? 'rgba(18,21,30,0.98)' : 'rgba(247,249,255,0.97)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.84)',
            paddingHorizontal: 18,
            paddingTop: 18,
            shadowColor: '#000000',
            shadowOpacity: isDark ? 0.32 : 0.16,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 18,
            overflow: 'hidden',
          }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: insets.bottom + 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {[
                t('paywall.features.one'),
                t('paywall.features.two'),
                t('paywall.features.three'),
              ].map((feature, index) => (
                <View key={feature} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: index === 0 ? 0 : 12 }}>
                  <View
                    style={{
                      marginTop: 2,
                      height: 32,
                      width: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      backgroundColor: isDark ? '#1E2A44' : '#E8F0FF',
                    }}>
                    <Ionicons
                      name={index === 0 ? 'briefcase-outline' : index === 1 ? 'document-text-outline' : 'notifications-outline'}
                      size={16}
                      color={isDark ? '#DCE7FF' : '#1D4ED8'}
                    />
                  </View>
                  <Text style={{ marginLeft: 12, flex: 1, fontSize: 15, lineHeight: 21, color: isDark ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.72)' }}>
                    {feature}
                  </Text>
                </View>
              ))}

              <Text style={{ marginTop: 20, fontSize: 13, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.52)' }}>
                {t('paywall.choosePlan')}
              </Text>

              <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 18, color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.58)' }}>
                {t('paywall.planHint')}
              </Text>

              {loadingPackages ? (
                <View style={{ marginTop: 16, alignItems: 'center', borderRadius: 22, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', paddingHorizontal: 16, paddingVertical: 20 }}>
                  <ActivityIndicator color={isDark ? '#FFFFFF' : '#1D4ED8'} />
                </View>
              ) : packages.length > 0 ? (
                <View style={{ marginTop: 12, gap: 12 }}>
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#FFFFFF' : '#000000' }}>
                              {title}
                            </Text>
                            <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 18, color: isDark ? 'rgba(255,255,255,0.68)' : 'rgba(0,0,0,0.54)' }}>
                              {product.description || product.title}
                            </Text>
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#FFFFFF' : '#000000' }}>
                              {product.priceString}
                            </Text>
                            <Text style={{ marginTop: 4, fontSize: 12, fontWeight: '500', color: isDark ? 'rgba(255,255,255,0.58)' : 'rgba(0,0,0,0.46)' }}>
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
                <View style={{ marginTop: 12, borderRadius: 22, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', paddingHorizontal: 16, paddingVertical: 16 }}>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.62)' }}>
                    {t('paywall.noPackages')}
                  </Text>
                </View>
              )}

              {isExpoGo ? (
                <Text style={{ marginTop: 16, fontSize: 14, color: isDark ? '#FACC15' : '#B45309' }}>
                  {t('paywall.mockBanner')}
                </Text>
              ) : null}

              {error ? <Text style={{ marginTop: 16, fontSize: 14, color: '#EF4444' }}>{error}</Text> : null}

              <Pressable
                onPress={() => {
                  void openPaywall();
                }}
                disabled={submitting || hasSubscription || !enabled || !selectedPackage || loadingPackages}
                style={{
                  marginTop: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 24,
                  backgroundColor: '#1D4ED8',
                  paddingHorizontal: 16,
                  paddingVertical: 15,
                  opacity: submitting || hasSubscription || !enabled || !selectedPackage || loadingPackages ? 0.6 : 1,
                }}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                      {selectedPackage?.packageType === PACKAGE_TYPE.MONTHLY ? t('paywall.ctaMonthly') : t('paywall.ctaYearly')}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  void onRestore();
                }}
                disabled={restoring}
                style={{
                  marginTop: 12,
                  alignItems: 'center',
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}>
                {restoring ? (
                  <ActivityIndicator color={isDark ? '#FFFFFF' : '#1C2745'} />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? '#FFFFFF' : '#000000' }}>
                    {t('paywall.restore')}
                  </Text>
                )}
              </Pressable>

              <Pressable onPress={() => void onSignOut()} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? 'rgba(255,255,255,0.56)' : 'rgba(0,0,0,0.48)' }}>
                  {t('paywall.signOut')}
                </Text>
              </Pressable>
            </ScrollView>
        </View>
      </View>
    </LinearGradient>
  );
}
