import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppTextInput } from '@/components/AppTextInput';
import Colors from '@/constants/Colors';
import { useColorScheme, useSetColorScheme } from '@/components/useColorScheme';
import { LargeHeader } from '@/components/LargeHeader';
import { deleteCurrentAccount } from '@/lib/account';
import { setStoredLanguage } from '@/lib/language';
import {
  getDefaultJobReminderPreference,
  getNotificationsEnabled,
  setDefaultJobReminderPreference,
  setNotificationsEnabled,
  type JobReminderOption,
} from '@/lib/notifications';
import { deleteProfileAsset, uploadCompanyLogo } from '@/lib/profile-assets';
import { supabase } from '@/lib/supabase';
import { getUserDisplayName } from '@/lib/user';
import { useAuth } from '@/providers/AuthProvider';
import { useBilling } from '@/providers/BillingProvider';

export default function PodesavanjaScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const setColorScheme = useSetColorScheme();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const router = useRouter();
  const colors = Colors[colorScheme];
  const { hasSubscription, hasTrialAccess, trialDaysRemaining, trialEndsAt } = useBilling();

  const isDark = colorScheme === 'dark';
  const isEnglish = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('en');
  const [themeSwitchValue, setThemeSwitchValue] = useState(isDark);
  const [themeSwitchPending, setThemeSwitchPending] = useState(false);
  const [pendingThemeTarget, setPendingThemeTarget] = useState<boolean | null>(null);
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean | null>(null);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [defaultReminder, setDefaultReminder] = useState<JobReminderOption>('same_day');
  const [username, setUsername] = useState('');
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);
  const [usernameSubmitting, setUsernameSubmitting] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyNameDraft, setCompanyNameDraft] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyPhoneDraft, setCompanyPhoneDraft] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyAddressDraft, setCompanyAddressDraft] = useState('');
  const [companyPib, setCompanyPib] = useState('');
  const [companyPibDraft, setCompanyPibDraft] = useState('');
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState('');
  const [companyRegistrationNumberDraft, setCompanyRegistrationNumberDraft] = useState('');
  const [companyAccountNumber, setCompanyAccountNumber] = useState('');
  const [companyAccountNumberDraft, setCompanyAccountNumberDraft] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [companyLogoPath, setCompanyLogoPath] = useState<string | null>(null);
  const [companyLogoDraftUrl, setCompanyLogoDraftUrl] = useState<string | null>(null);
  const [companyLogoDraftPath, setCompanyLogoDraftPath] = useState<string | null>(null);
  const [companyLogoDraftLocalUri, setCompanyLogoDraftLocalUri] = useState<string | null>(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companySubmitting, setCompanySubmitting] = useState(false);
  const [companyUploading, setCompanyUploading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyMessage, setCompanyMessage] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [infoModalKey, setInfoModalKey] = useState<'support' | 'version' | null>(null);
  const themeToggleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const user = session?.user ?? null;
  const email = user?.email ?? '—';
  const displayName = useMemo(() => getUserDisplayName(user, email), [email, user]);
  const hasCompanyDetails = Boolean(
    companyName ||
      companyPhone ||
      companyAddress ||
      companyPib ||
      companyRegistrationNumber ||
      companyAccountNumber ||
      companyLogoUrl
  );
  const appVersion = useMemo(() => {
    const configVersion =
      Constants.expoConfig?.version ??
      Constants.manifest2?.extra?.expoClient?.version ??
      null;
    return configVersion || '1.0.0';
  }, []);
  const profileInitials = useMemo(() => {
    const source = (username || displayName || email || '').trim();
    if (!source) return 'T';
    const parts = source
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return 'T';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }, [displayName, email, username]);
  const infoItems = useMemo(
    () => [
      {
        key: 'terms' as const,
        icon: 'document-text-outline' as const,
        iconBg: isDark ? '#243047' : '#EEF3FF',
        iconColor: isDark ? '#8FB2FF' : '#2F68ED',
        title: t('settings.termsTitle'),
        body: t('settings.termsBody'),
      },
      {
        key: 'privacy' as const,
        icon: 'shield-checkmark-outline' as const,
        iconBg: isDark ? '#203126' : '#EEF8F1',
        iconColor: isDark ? '#7AD69C' : '#2F8C57',
        title: t('settings.privacyTitle'),
        body: t('settings.privacyBody'),
      },
      {
        key: 'support' as const,
        icon: 'help-buoy-outline' as const,
        iconBg: isDark ? '#2F2717' : '#FFF8EF',
        iconColor: isDark ? '#F4C16A' : '#B76E0D',
        title: t('settings.support'),
        body: t('settings.supportHelp'),
      },
      {
        key: 'version' as const,
        icon: 'information-circle-outline' as const,
        iconBg: isDark ? '#2D2540' : '#F2EEFF',
        iconColor: isDark ? '#C0A7FF' : '#7359C8',
        title: t('settings.appVersion'),
        body: `Tefter ${appVersion}`,
      },
    ],
    [appVersion, isDark, t]
  );
  const activeInfoItem = useMemo(
    () => infoItems.find((item) => item.key === infoModalKey) ?? null,
    [infoItems, infoModalKey]
  );
  const trialEndsLabel = useMemo(() => {
    if (!trialEndsAt) return null;
    return new Date(trialEndsAt).toLocaleDateString(
      i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language,
      { day: '2-digit', month: '2-digit', year: 'numeric' }
    );
  }, [i18n.language, trialEndsAt]);

  const reminderOptions = useMemo(
    () => [
      { value: 'none' as const, label: t('jobs.reminders.none') },
      { value: 'same_day' as const, label: t('jobs.reminders.sameDay') },
      { value: 'day_before' as const, label: t('jobs.reminders.dayBefore') },
    ],
    [t]
  );

  const switchTrackColor = useMemo(
    () => ({
      false: isDark ? '#3A3A3C' : '#D7DCE7',
      true: isDark ? '#3A7BFF' : '#2F68ED',
    }),
    [isDark]
  );
  const switchThumbColor = isDark ? '#FFFFFF' : '#FFFFFF';
  const switchBgColor = isDark ? '#2C2C2E' : '#D7DCE7';

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [enabled, reminder] = await Promise.all([
        getNotificationsEnabled(),
        getDefaultJobReminderPreference(),
      ]);
      if (mounted) {
        setNotificationsEnabledState(enabled);
        setDefaultReminder(reminder);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (themeSwitchPending) {
      if (pendingThemeTarget != null && isDark === pendingThemeTarget) {
        setThemeSwitchValue(isDark);
        setThemeSwitchPending(false);
        setPendingThemeTarget(null);
      }
      return;
    }
    setThemeSwitchValue(isDark);
  }, [isDark, pendingThemeTarget, themeSwitchPending]);

  useEffect(() => {
    return () => {
      if (themeToggleTimerRef.current) {
        clearTimeout(themeToggleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setUsername(displayName === email ? '' : displayName);
  }, [displayName, email]);

  useEffect(() => {
    if (!usernameMessage) return;
    const timer = setTimeout(() => {
      setUsernameMessage(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [usernameMessage]);

  useEffect(() => {
    if (!companyMessage) return;
    const timer = setTimeout(() => {
      setCompanyMessage(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [companyMessage]);

  useEffect(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const storedCompanyName = typeof meta?.company_name === 'string' ? meta.company_name : '';
    const storedCompanyPhone = typeof meta?.company_phone === 'string' ? meta.company_phone : '';
    const storedCompanyAddress = typeof meta?.company_address === 'string' ? meta.company_address : '';
    const storedCompanyPib = typeof meta?.company_pib === 'string' ? meta.company_pib : '';
    const storedCompanyRegistrationNumber =
      typeof meta?.company_registration_number === 'string' ? meta.company_registration_number : '';
    const storedCompanyAccountNumber =
      typeof meta?.company_account_number === 'string' ? meta.company_account_number : '';
    const storedCompanyLogoPath = typeof meta?.company_logo_path === 'string' ? meta.company_logo_path : null;
    const storedCompanyLogoUrl = typeof meta?.company_logo_url === 'string' ? meta.company_logo_url : null;
    setCompanyName(storedCompanyName);
    setCompanyNameDraft(storedCompanyName);
    setCompanyPhone(storedCompanyPhone);
    setCompanyPhoneDraft(storedCompanyPhone);
    setCompanyAddress(storedCompanyAddress);
    setCompanyAddressDraft(storedCompanyAddress);
    setCompanyPib(storedCompanyPib);
    setCompanyPibDraft(storedCompanyPib);
    setCompanyRegistrationNumber(storedCompanyRegistrationNumber);
    setCompanyRegistrationNumberDraft(storedCompanyRegistrationNumber);
    setCompanyAccountNumber(storedCompanyAccountNumber);
    setCompanyAccountNumberDraft(storedCompanyAccountNumber);
    setCompanyLogoPath(storedCompanyLogoPath);
    setCompanyLogoUrl(storedCompanyLogoUrl);
    setCompanyLogoDraftPath(storedCompanyLogoPath);
    setCompanyLogoDraftUrl(storedCompanyLogoUrl);
    setCompanyLogoDraftLocalUri(null);
  }, [user?.user_metadata]);

  const openUsernameModal = () => {
    setUsernameDraft(username);
    setUsernameError(null);
    setUsernameMessage(null);
    setUsernameModalOpen(true);
  };

  const closeUsernameModal = () => {
    if (usernameSubmitting) return;
    setUsernameModalOpen(false);
    setUsernameError(null);
  };

  const openCompanyModal = () => {
    setCompanyNameDraft(companyName);
    setCompanyPhoneDraft(companyPhone);
    setCompanyAddressDraft(companyAddress);
    setCompanyPibDraft(companyPib);
    setCompanyRegistrationNumberDraft(companyRegistrationNumber);
    setCompanyAccountNumberDraft(companyAccountNumber);
    setCompanyLogoDraftPath(companyLogoPath);
    setCompanyLogoDraftUrl(companyLogoUrl);
    setCompanyLogoDraftLocalUri(null);
    setCompanyError(null);
    setCompanyMessage(null);
    setCompanyModalOpen(true);
  };

  const closeCompanyModal = () => {
    if (companySubmitting || companyUploading) return;
    setCompanyModalOpen(false);
    setCompanyError(null);
  };

  const onSaveUsername = async () => {
    const trimmed = usernameDraft.trim();
    if (!trimmed) {
      setUsernameError(t('settings.usernameRequired'));
      setUsernameMessage(null);
      return;
    }

    setUsernameSubmitting(true);
    setUsernameError(null);
    setUsernameMessage(null);
    const { error } = await supabase.auth.updateUser({
      data: {
        username: trimmed,
        name: trimmed,
      },
    });
    setUsernameSubmitting(false);

    if (error) {
      setUsernameError(error.message);
      return;
    }

    setUsername(trimmed);
    setUsernameMessage(t('settings.usernameSaved'));
    setUsernameModalOpen(false);
  };

  const onPickCompanyLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setCompanyError(t('settings.logoPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled) return;

    const nextUri = result.assets[0]?.uri ?? null;
    if (!nextUri) return;

    setCompanyLogoDraftLocalUri(nextUri);
    setCompanyError(null);
    setCompanyMessage(null);
  };

  const onRemoveCompanyLogo = () => {
    setCompanyLogoDraftLocalUri(null);
    setCompanyLogoDraftPath(null);
    setCompanyLogoDraftUrl(null);
    setCompanyError(null);
    setCompanyMessage(null);
  };

  const onSaveCompany = async () => {
    if (!user?.id) return;

    const trimmed = companyNameDraft.trim();
    const trimmedPhone = companyPhoneDraft.trim();
    const trimmedAddress = companyAddressDraft.trim();
    const trimmedPib = companyPibDraft.trim();
    const trimmedRegistrationNumber = companyRegistrationNumberDraft.trim();
    const trimmedAccountNumber = companyAccountNumberDraft.trim();
    setCompanySubmitting(true);
    setCompanyError(null);
    setCompanyMessage(null);

    let nextLogoPath = companyLogoDraftPath;
    let nextLogoUrl = companyLogoDraftUrl;
    let uploadedLogoPath: string | null = null;

    try {
      if (companyLogoDraftLocalUri) {
        setCompanyUploading(true);
        const uploaded = await uploadCompanyLogo({
          userId: user.id,
          uri: companyLogoDraftLocalUri,
        });
        setCompanyUploading(false);

        nextLogoPath = uploaded.path;
        nextLogoUrl = uploaded.url;
        uploadedLogoPath = uploaded.path;
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          company_name: trimmed,
          company_phone: trimmedPhone,
          company_address: trimmedAddress,
          company_pib: trimmedPib,
          company_registration_number: trimmedRegistrationNumber,
          company_account_number: trimmedAccountNumber,
          company_logo_path: nextLogoPath,
          company_logo_url: nextLogoUrl,
        },
      });

      if (error) throw new Error(error.message);

      if (companyLogoPath && companyLogoPath !== nextLogoPath) {
        await deleteProfileAsset(companyLogoPath);
      }

      setCompanyName(trimmed);
      setCompanyPhone(trimmedPhone);
      setCompanyAddress(trimmedAddress);
      setCompanyPib(trimmedPib);
      setCompanyRegistrationNumber(trimmedRegistrationNumber);
      setCompanyAccountNumber(trimmedAccountNumber);
      setCompanyLogoPath(nextLogoPath);
      setCompanyLogoUrl(nextLogoUrl);
      setCompanyPhoneDraft(trimmedPhone);
      setCompanyAddressDraft(trimmedAddress);
      setCompanyPibDraft(trimmedPib);
      setCompanyRegistrationNumberDraft(trimmedRegistrationNumber);
      setCompanyAccountNumberDraft(trimmedAccountNumber);
      setCompanyLogoDraftPath(nextLogoPath);
      setCompanyLogoDraftUrl(nextLogoUrl);
      setCompanyLogoDraftLocalUri(null);
      setCompanyModalOpen(false);
      setCompanyMessage(t('settings.companySaved'));
    } catch (error) {
      if (uploadedLogoPath) {
        try {
          await deleteProfileAsset(uploadedLogoPath);
        } catch {
          // ignore cleanup failure
        }
      }
      setCompanyError(error instanceof Error ? error.message : String(error));
    } finally {
      setCompanySubmitting(false);
      setCompanyUploading(false);
    }
  };

  const onDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccountTitle'),
      t('settings.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccountConfirm'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setDeletingAccount(true);
                const { error } = await deleteCurrentAccount();
                if (error) throw error;
                await supabase.auth.signOut();
                router.replace('/(auth)/sign-in');
              } catch (error) {
                Alert.alert(
                  t('settings.deleteAccountFailedTitle'),
                  error instanceof Error ? error.message : t('settings.deleteAccountFailedBody')
                );
              } finally {
                setDeletingAccount(false);
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      stickyHeaderIndices={[0]}
      className="flex-1 bg-[#F2F2F7] dark:bg-black"
      contentContainerStyle={{ paddingBottom: 168 }}>
      <LargeHeader
        title={t('tabs.profile')}
      />

      <View className="px-6 pt-3">
        <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-5 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <View className="flex-row items-center">
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: 60,
                height: 60,
                backgroundColor: isDark ? '#263245' : '#DCE6F7',
              }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: isDark ? '#8FB2FF' : '#2F68ED' }}>
                {profileInitials}
              </Text>
            </View>

            <View className="ml-4 flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="mr-3 flex-1 text-app-section font-extrabold text-[#1C2745] dark:text-white" numberOfLines={1}>
                  {displayName}
                </Text>
                <Pressable
                  onPress={openUsernameModal}
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.editProfile')}
                  className="h-10 w-10 items-center justify-center">
                  <FontAwesome name="pencil" size={18} color={isDark ? '#8FB2FF' : '#2F68ED'} />
                </Pressable>
              </View>
              <Text className="mt-1 text-app-meta-lg text-black/60 dark:text-white/70" numberOfLines={1}>
                {email}
              </Text>
              {hasSubscription ? (
                <View className="mt-3 self-start rounded-full bg-[#EEF8F1] px-3 py-1.5 dark:bg-[#203126]">
                  <Text className="text-app-meta-lg font-semibold text-[#2F8C57] dark:text-[#7AD69C]">
                    {t('settings.premiumActive')}
                  </Text>
                </View>
              ) : hasTrialAccess ? (
                <View className="mt-3">
                  <Pressable
                    onPress={() => router.push({ pathname: '/paywall', params: { preview: '1' } })}
                    className="self-start rounded-full bg-[#2F68ED] px-4 py-2 dark:bg-[#3A7BFF]">
                    <Text className="text-app-meta-lg font-semibold text-white">
                      {t('settings.buyPremium')}
                    </Text>
                  </Pressable>
                  <Text className="mt-2 text-app-meta-lg text-black/60 dark:text-white/70">
                    {t('settings.freeTrialBody', { count: trialDaysRemaining })}
                  </Text>
                  {trialEndsLabel ? (
                    <Text className="mt-1 text-app-meta-lg text-black/55 dark:text-white/65">
                      {t('settings.freeTrialEndsAt', { date: trialEndsLabel })}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>

          {usernameMessage ? (
            <View className="mt-4 rounded-[20px] bg-black/5 px-4 py-3 dark:bg-white/5">
              <Text className="text-app-meta-lg text-[#2F8C57] dark:text-[#7AD69C]">{usernameMessage}</Text>
            </View>
          ) : null}
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <View className="flex-row items-center justify-between">
            <Text className="text-app-section font-extrabold text-[#1C2745] dark:text-white">
              {t('settings.companySection')}
            </Text>
            <Pressable
              onPress={openCompanyModal}
              accessibilityRole="button"
              accessibilityLabel={t('settings.editProfile')}
              className="h-10 w-10 items-center justify-center">
              <FontAwesome name="pencil" size={18} color={isDark ? '#8FB2FF' : '#2F68ED'} />
            </Pressable>
          </View>

          <View className="mt-4 h-px bg-black/10 dark:bg-white/10" />
          {hasCompanyDetails ? (
            <>
              <View className="mt-4 flex-row items-start">
                <View
                  className="items-center justify-center rounded-[16px] border border-black/5 dark:border-white/10"
                  style={{
                    width: 68,
                    height: 68,
                    backgroundColor: isDark ? '#2A2A2D' : '#F5F7FB',
                  }}>
                  {companyLogoUrl ? (
                    <Image
                      source={{ uri: companyLogoUrl }}
                      style={{ width: 52, height: 52, borderRadius: 12 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name="business-outline" size={24} color={colors.secondaryText} />
                  )}
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-app-row-lg font-bold text-[#1C2745] dark:text-white">
                    {companyName || t('settings.companyNamePlaceholder')}
                  </Text>
                  {companyAddress || companyPhone ? (
                    <View className="mt-1 flex-row items-center flex-wrap">
                      {companyAddress ? (
                        <Text className="text-app-meta-lg text-black/60 dark:text-white/70">
                          {companyAddress}
                        </Text>
                      ) : null}
                      {companyAddress && companyPhone ? (
                        <Text className="text-app-meta-lg text-black/60 dark:text-white/70">{' • '}</Text>
                      ) : null}
                      {companyPhone ? (
                        <Text className="text-app-meta-lg text-black/60 dark:text-white/70">
                          {companyPhone}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  {companyPib || companyRegistrationNumber ? (
                    <Text className="mt-2 text-app-meta-lg text-black/65 dark:text-white/75" numberOfLines={1}>
                      {companyPib ? `${t('settings.companyPib')}: ${companyPib}` : ''}
                      {companyPib && companyRegistrationNumber ? ' • ' : ''}
                      {companyRegistrationNumber
                        ? `${t('settings.companyRegistrationNumberShort')}: ${companyRegistrationNumber}`
                        : ''}
                    </Text>
                  ) : null}
                </View>
              </View>

              {companyAccountNumber ? (
                <>
                  <View className="mt-4 h-px bg-black/10 dark:bg-white/10" />
                  <View className="mt-4 flex-row items-center justify-between">
                    <Text className="text-app-meta-lg text-black/55 dark:text-white/65">
                      {t('settings.companyAccountNumber')}
                    </Text>
                    <Text className="ml-4 flex-1 text-right text-app-meta-lg font-semibold text-[#1C2745] dark:text-white" numberOfLines={1}>
                      {companyAccountNumber}
                    </Text>
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <Text className="mt-4 text-app-meta-lg text-black/60 dark:text-white/70">
              {t('settings.companyEmpty')}
            </Text>
          )}

          {companyMessage ? (
            <View className="mt-4 rounded-[20px] bg-black/5 px-4 py-3 dark:bg-white/5">
              <Text className="text-app-meta-lg text-[#2F8C57] dark:text-[#7AD69C]">{companyMessage}</Text>
            </View>
          ) : null}
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <View className="px-4 py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-[#EEF3FF] dark:bg-[#243047]">
                    <Ionicons name="moon-outline" size={18} color={colors.tint} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-app-row-lg font-bold text-[#1C2745] dark:text-white">
                      {t('settings.darkTheme')}
                    </Text>
                    <Text className="mt-1 text-app-meta-lg text-black/60 dark:text-white/70">
                      {t('settings.darkThemeHelp')}
                    </Text>
                  </View>
                </View>
              </View>
              <Switch
                value={themeSwitchValue}
                disabled={themeSwitchPending}
                onValueChange={(next) => {
                  setThemeSwitchValue(next);
                  setThemeSwitchPending(true);
                  setPendingThemeTarget(next);
                  if (themeToggleTimerRef.current) {
                    clearTimeout(themeToggleTimerRef.current);
                  }
                  themeToggleTimerRef.current = setTimeout(() => {
                    setColorScheme(next ? 'dark' : 'light');
                    themeToggleTimerRef.current = null;
                  }, 90);
                }}
                trackColor={switchTrackColor}
                thumbColor={switchThumbColor}
                ios_backgroundColor={switchBgColor}
              />
            </View>
          </View>

          <View className="mx-4 h-px bg-black/10 dark:bg-white/10" />

          <View className="px-4 py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-[#EEF8F1] dark:bg-[#203126]">
                    <Ionicons name="notifications-outline" size={18} color={isDark ? '#7AD69C' : '#2F8C57'} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-app-row-lg font-bold text-[#1C2745] dark:text-white">
                      {t('settings.notifications')}
                    </Text>
                    <Text className="mt-1 text-app-meta-lg text-black/60 dark:text-white/70">
                      {t('settings.notificationsHelp')}
                    </Text>
                  </View>
                </View>
              </View>
              <Switch
                value={notificationsEnabled ?? false}
                disabled={notificationsEnabled == null || notificationsSaving}
                onValueChange={(next) => {
                  const previous = notificationsEnabled ?? false;
                  setNotificationsEnabledState(next);
                  setNotificationsSaving(true);
                  void (async () => {
                    try {
                      await setNotificationsEnabled(next);
                    } catch {
                      setNotificationsEnabledState(previous);
                    } finally {
                      setNotificationsSaving(false);
                    }
                  })();
                }}
                trackColor={switchTrackColor}
                thumbColor={switchThumbColor}
                ios_backgroundColor={switchBgColor}
              />
            </View>

            {notificationsEnabled ? (
              <>
                <View className="mt-4 h-px bg-black/10 dark:bg-white/10" />
                <Text className="mt-4 text-app-meta-lg font-medium text-black/60 dark:text-white/70">
                  {t('settings.defaultReminder')}
                </Text>
                <Text className="mt-1 text-app-meta-lg text-black/50 dark:text-white/60">
                  {t('settings.defaultReminderHelp')}
                </Text>
                <View className="mt-3 flex-row items-center">
                  {reminderOptions.map((option) => {
                    const selected = defaultReminder === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          setDefaultReminder(option.value);
                          void setDefaultJobReminderPreference(option.value);
                        }}
                        className={[
                          'mr-2 rounded-3xl px-3 py-2',
                          selected ? 'bg-[#2F68ED] dark:bg-[#3A7BFF]' : 'bg-black/5 dark:bg-white/5',
                        ].join(' ')}>
                        <Text
                          className={
                            selected
                              ? 'text-app-meta font-semibold text-white'
                              : 'text-app-meta text-black dark:text-white'
                          }>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </View>

          <View className="mx-4 h-px bg-black/10 dark:bg-white/10" />

          <View className="px-4 py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-[#F2EEFF] dark:bg-[#2D2540]">
                  <Ionicons name="language-outline" size={18} color={isDark ? '#C0A7FF' : '#7359C8'} />
                </View>
                <View className="ml-3">
                  <Text className="text-app-row-lg font-bold text-[#1C2745] dark:text-white">
                    {t('settings.language')}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => {
                    void i18n.changeLanguage('sr');
                    void setStoredLanguage('sr');
                  }}
                  className={[
                    'mr-2 rounded-3xl px-4 py-2.5',
                    !isEnglish ? 'bg-[#2F68ED] dark:bg-[#3A7BFF]' : 'bg-black/5 dark:bg-white/5',
                  ].join(' ')}>
                  <Text
                    className={
                      !isEnglish
                        ? 'text-app-meta font-semibold text-white'
                        : 'text-app-meta text-black dark:text-white'
                    }>
                    {t('settings.serbian')}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    void i18n.changeLanguage('en');
                    void setStoredLanguage('en');
                  }}
                  className={[
                    'rounded-3xl px-4 py-2.5',
                    isEnglish ? 'bg-[#2F68ED] dark:bg-[#3A7BFF]' : 'bg-black/5 dark:bg-white/5',
                  ].join(' ')}>
                  <Text
                    className={
                      isEnglish
                        ? 'text-app-meta font-semibold text-white'
                        : 'text-app-meta text-black dark:text-white'
                    }>
                    {t('settings.english')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <Text className="text-app-section font-extrabold text-[#1C2745] dark:text-white">
            {t('settings.infoSection')}
          </Text>
          <View className="mt-4">
            {infoItems.map((item, index) => (
              <View key={item.key}>
                {index > 0 ? <View className="mx-0 h-px bg-black/10 dark:bg-white/10" /> : null}
                <Pressable
                  onPress={() => {
                    if (item.key === 'terms' || item.key === 'privacy') {
                      router.push(`/(tabs)/legal/${item.key}`);
                      return;
                    }
                    setInfoModalKey(item.key);
                  }}
                  className="flex-row items-center py-3.5">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-[14px]"
                    style={{ backgroundColor: item.iconBg }}>
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-app-row-lg font-medium text-[#1C2745] dark:text-white">
                      {item.title}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <Pressable
            onPress={() => {
              void supabase.auth.signOut();
            }}
            className="flex-row items-center px-4 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-[#FFE5E2] dark:bg-[#3A2020]">
              <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-app-row-lg font-medium text-[#D93025] dark:text-[#FF8A80]">
                {t('settings.signOut')}
              </Text>
              <Text className="mt-1 text-app-meta-lg text-black/60 dark:text-white/70">
                {t('settings.signOutHelp')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D93025" />
          </Pressable>

          <View className="mx-4 h-px bg-black/10 dark:bg-white/10" />

          <Pressable
            onPress={onDeleteAccount}
            disabled={deletingAccount}
            className="flex-row items-center px-4 py-4 disabled:opacity-70">
            <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-[#FFE8E5] dark:bg-[#3A2020]">
              {deletingAccount ? (
                <ActivityIndicator color="#FF3B30" />
              ) : (
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-app-row-lg font-medium text-[#D93025] dark:text-[#FF8A80]">
                {t('settings.deleteAccount')}
              </Text>
              <Text className="mt-1 text-app-meta-lg text-black/60 dark:text-white/70">
                {t('settings.deleteAccountHelp')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D93025" />
          </Pressable>
        </View>
      </View>

      <Modal transparent visible={usernameModalOpen} animationType="fade" onRequestClose={closeUsernameModal}>
        <View className="flex-1 items-center justify-center bg-black/35 px-6">
          <Pressable onPress={closeUsernameModal} className="absolute inset-0" />
          <View className="w-full max-w-[360px] overflow-hidden rounded-3xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#1C1C1E]">
            <View className="flex-row items-center justify-between">
              <Text className="text-app-section font-extrabold text-[#1C2745] dark:text-white">
                {t('settings.editProfileTitle')}
              </Text>
              <Pressable
                onPress={closeUsernameModal}
                className="h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            <Text className="mt-4 text-app-row font-bold text-[#1C2745] dark:text-white">
              {t('settings.changeUsername')}
            </Text>
            <AppTextInput
              value={usernameDraft}
              onChangeText={(next) => {
                setUsernameDraft(next);
                if (usernameError) setUsernameError(null);
                if (usernameMessage) setUsernameMessage(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t('auth.signUp.usernamePlaceholder')}
              className="mt-4"
            />

            {usernameError ? <Text className="mt-3 text-app-meta text-red-600">{usernameError}</Text> : null}

            <Pressable
              onPress={onSaveUsername}
              disabled={usernameSubmitting}
              className="mt-4 flex-row items-center justify-center rounded-3xl bg-[#2F68ED] py-3 disabled:opacity-60 dark:bg-[#0A84FF]">
              {usernameSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  <Text className="ml-2 text-app-row font-semibold text-white">{t('settings.saveProfileChanges')}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={companyModalOpen} animationType="fade" onRequestClose={closeCompanyModal}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 items-center justify-center bg-black/35 px-6">
          <Pressable onPress={closeCompanyModal} className="absolute inset-0" />
          <View className="w-full max-w-[360px] overflow-hidden rounded-3xl border border-black/10 bg-white dark:border-white/10 dark:bg-[#1C1C1E]">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              style={{ maxHeight: 640 }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-app-section font-extrabold text-[#1C2745] dark:text-white">
                  {t('settings.companySection')}
                </Text>
                <Pressable
                  onPress={closeCompanyModal}
                  className="h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>

              <Text className="mt-2 text-app-meta text-black/60 dark:text-white/70">
                {t('settings.companyHelp')}
              </Text>

              <Text className="mt-4 text-app-row font-bold text-[#1C2745] dark:text-white">
                {t('settings.companyLogo')}
              </Text>
              <View className="mt-4">
                <View className="flex-row items-center justify-between">
                  <View
                    className="items-center justify-center rounded-[18px] border border-black/5 dark:border-white/10"
                    style={{
                      width: 88,
                      height: 88,
                    }}>
                    {companyLogoDraftLocalUri || companyLogoDraftUrl ? (
                      <Image
                        source={{ uri: companyLogoDraftLocalUri ?? companyLogoDraftUrl ?? undefined }}
                        style={{ width: 72, height: 72, borderRadius: 14 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons name="image-outline" size={26} color={colors.secondaryText} />
                    )}
                  </View>

                  <View className="ml-4 flex-1 items-end">
                    <View className="flex-row items-center">
                      <Pressable
                        onPress={() => {
                          void onPickCompanyLogo();
                        }}
                        disabled={companyUploading}
                      accessibilityRole="button"
                      accessibilityLabel={companyLogoDraftLocalUri || companyLogoDraftUrl ? t('settings.changeLogo') : t('settings.uploadLogo')}
                      className="mr-2 h-11 w-11 items-center justify-center rounded-full bg-[#E8F0FF] disabled:opacity-60 dark:bg-[#243047]">
                      <Ionicons
                        name="add"
                        size={20}
                        color={isDark ? '#8FB2FF' : '#2F68ED'}
                      />
                      </Pressable>
                      {companyLogoDraftLocalUri || companyLogoDraftUrl ? (
                        <Pressable
                          onPress={onRemoveCompanyLogo}
                          disabled={companyUploading}
                          accessibilityRole="button"
                          accessibilityLabel={t('settings.removeLogo')}
                        className="h-11 w-11 items-center justify-center rounded-full bg-[#FFF3F2] disabled:opacity-60 dark:bg-[#2A1A1A]">
                        <Ionicons name="trash-outline" size={19} color="#FF3B30" />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
              </View>

              <Text className="mt-4 text-app-row font-bold text-[#1C2745] dark:text-white">
                {t('settings.companyName')}
              </Text>
              <AppTextInput
                value={companyNameDraft}
                onChangeText={(next) => {
                  setCompanyNameDraft(next);
                  if (companyError) setCompanyError(null);
                  if (companyMessage) setCompanyMessage(null);
                }}
                autoCapitalize="words"
                autoCorrect={false}
                placeholder={t('settings.companyNamePlaceholder')}
                className="mt-4"
              />

              <Text className="mt-4 text-app-row font-bold text-[#1C2745] dark:text-white">
                {t('settings.companyPhone')}
              </Text>
              <AppTextInput
                value={companyPhoneDraft}
                onChangeText={(next) => {
                  setCompanyPhoneDraft(next);
                  if (companyError) setCompanyError(null);
                  if (companyMessage) setCompanyMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="phone-pad"
                placeholder={t('settings.companyPhonePlaceholder')}
                className="mt-4"
              />

              <Text className="mt-4 text-app-row font-bold text-[#1C2745] dark:text-white">
                {t('settings.companyAddress')}
              </Text>
              <AppTextInput
                value={companyAddressDraft}
                onChangeText={(next) => {
                  setCompanyAddressDraft(next);
                  if (companyError) setCompanyError(null);
                  if (companyMessage) setCompanyMessage(null);
                }}
                autoCapitalize="words"
                autoCorrect={false}
                placeholder={t('settings.companyAddressPlaceholder')}
                className="mt-4"
              />

              <Text className="mt-4 text-app-row font-bold text-[#1C2745] dark:text-white">
                {t('settings.companyPib')}
              </Text>
              <AppTextInput
                value={companyPibDraft}
                onChangeText={(next) => {
                  setCompanyPibDraft(next);
                  if (companyError) setCompanyError(null);
                  if (companyMessage) setCompanyMessage(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="number-pad"
                placeholder={t('settings.companyPibPlaceholder')}
                className="mt-4"
              />

              <Text className="mt-4 text-app-row font-bold text-[#1C2745] dark:text-white">
                {t('settings.companyRegistrationNumber')}
              </Text>
              <AppTextInput
                value={companyRegistrationNumberDraft}
                onChangeText={(next) => {
                  setCompanyRegistrationNumberDraft(next);
                  if (companyError) setCompanyError(null);
                  if (companyMessage) setCompanyMessage(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="number-pad"
                placeholder={t('settings.companyRegistrationNumberPlaceholder')}
                className="mt-4"
              />

              <Text className="mt-4 text-app-row font-bold text-[#1C2745] dark:text-white">
                {t('settings.companyAccountNumber')}
              </Text>
              <AppTextInput
                value={companyAccountNumberDraft}
                onChangeText={(next) => {
                  setCompanyAccountNumberDraft(next);
                  if (companyError) setCompanyError(null);
                  if (companyMessage) setCompanyMessage(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder={t('settings.companyAccountNumberPlaceholder')}
                className="mt-4"
              />

              {companyError ? <Text className="mt-3 text-app-meta text-red-600">{companyError}</Text> : null}

              <Pressable
                onPress={() => {
                  void onSaveCompany();
                }}
                disabled={companySubmitting || companyUploading}
                className="mt-4 flex-row items-center justify-center rounded-3xl bg-[#2F68ED] py-3 disabled:opacity-60 dark:bg-[#0A84FF]">
                {companySubmitting || companyUploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    <Text className="ml-2 text-app-row font-semibold text-white">{t('settings.saveCompany')}</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent visible={Boolean(activeInfoItem)} animationType="fade" onRequestClose={() => setInfoModalKey(null)}>
        <View className="flex-1 items-center justify-center bg-black/35 px-6">
          <Pressable onPress={() => setInfoModalKey(null)} className="absolute inset-0" />
          <View className="w-full max-w-[360px] overflow-hidden rounded-3xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#1C1C1E]">
            <View className="flex-row items-center justify-between">
              <Text className="text-app-section font-extrabold text-[#1C2745] dark:text-white">
                {activeInfoItem?.title}
              </Text>
              <Pressable
                onPress={() => setInfoModalKey(null)}
                className="h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>
            <Text className="mt-4 text-app-meta text-black/70 dark:text-white/75">
              {activeInfoItem?.body}
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
