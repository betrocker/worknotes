import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppTextInput } from '@/components/AppTextInput';
import Colors from '@/constants/Colors';
import { useColorScheme, useSetColorScheme } from '@/components/useColorScheme';
import { deleteCurrentAccount } from '@/lib/account';
import { getCurrencySymbol, type AppCurrency } from '@/lib/currency';
import { setStoredLanguage } from '@/lib/language';
import type { AppLanguage } from '@/lib/i18n';
import type { AppThemePreference } from '@/lib/theme';
import {
  getDefaultJobReminderPreference,
  getDefaultReminderTime,
  getNotificationsEnabled,
  setDefaultJobReminderPreference,
  setDefaultReminderTime,
  setNotificationsEnabled,
  type JobReminderOption,
  type ReminderTimeOption,
} from '@/lib/notifications';
import { deleteProfileAsset, uploadCompanyLogo } from '@/lib/profile-assets';
import { supabase } from '@/lib/supabase';
import { getUserDisplayName } from '@/lib/user';
import { goBackOrReplace } from '@/lib/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useBilling } from '@/providers/BillingProvider';
import { useCurrency } from '@/providers/CurrencyProvider';
import { useThemePreference } from '@/providers/ThemePreferenceProvider';

type SettingsScreenKey =
  | 'menu'
  | 'profile'
  | 'profileEdit'
  | 'subscription'
  | 'company'
  | 'companyEdit'
  | 'theme'
  | 'language'
  | 'currency'
  | 'documents'
  | 'support'
  | 'notifications'
  | 'about'
  | 'account';

const SUPPORT_EMAIL = 'podrska@etefter.app';
const APP_ICON = require('../../assets/images/splash-logo.png');

export default function PodesavanjaScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const setColorScheme = useSetColorScheme();
  const { themePreference } = useThemePreference();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const router = useRouter();
  const colors = Colors[colorScheme];
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { hasSubscription } = useBilling();

  const isDark = colorScheme === 'dark';
  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().split('-')[0];
  const defaultSupportSubject = t('settings.supportEmailSubject');
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean | null>(null);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [defaultReminder, setDefaultReminder] = useState<JobReminderOption>('same_day');
  const [defaultReminderTime, setDefaultReminderTimeState] = useState<ReminderTimeOption>('09:00');
  const [username, setUsername] = useState('');
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameInputFocused, setUsernameInputFocused] = useState(false);
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
  const [focusedCompanyField, setFocusedCompanyField] = useState<string | null>(null);
  const [companySubmitting, setCompanySubmitting] = useState(false);
  const [companyUploading, setCompanyUploading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyMessage, setCompanyMessage] = useState<string | null>(null);
  const [supportSubject, setSupportSubject] = useState(defaultSupportSubject);
  const [supportMessage, setSupportMessage] = useState('');
  const [focusedSupportField, setFocusedSupportField] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [settingsScreen, setSettingsScreen] = useState<SettingsScreenKey>('menu');
  const settingsSlideX = useRef(new Animated.Value(0)).current;
  const settingsScrollRef = useRef<ScrollView | null>(null);
  const lastDefaultSupportSubjectRef = useRef(defaultSupportSubject);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const user = session?.user ?? null;
  const email = user?.email ?? '—';
  const displayName = useMemo(() => getUserDisplayName(user, email), [email, user]);
  const appVersion = useMemo(() => {
    const configVersion =
      Constants.expoConfig?.version ??
      Constants.manifest2?.extra?.expoClient?.version ??
      null;
    return configVersion || '1.0.0';
  }, []);
  const infoItems = useMemo(
    () => [
      {
        key: 'terms' as const,
        icon: 'document-text-outline' as const,
        iconBg: isDark ? '#202B40' : '#DFE8FA',
        iconColor: isDark ? '#8FB2FF' : '#2F68ED',
        title: t('settings.termsTitle'),
        body: t('settings.termsBody'),
      },
      {
        key: 'privacy' as const,
        icon: 'shield-checkmark-outline' as const,
        iconBg: isDark ? '#1C2B22' : '#DDEFE2',
        iconColor: isDark ? '#7AD69C' : '#2F8C57',
        title: t('settings.privacyTitle'),
        body: t('settings.privacyBody'),
      },
      {
        key: 'support' as const,
        icon: 'help-buoy-outline' as const,
        iconBg: isDark ? '#292111' : '#F3E2C9',
        iconColor: isDark ? '#F4C16A' : '#B76E0D',
        title: t('settings.support'),
        body: t('settings.supportHelp'),
      },
      {
        key: 'version' as const,
        icon: 'information-circle-outline' as const,
        iconBg: isDark ? '#261F38' : '#E6DFF7',
        iconColor: isDark ? '#C0A7FF' : '#7359C8',
        title: t('settings.aboutTitle'),
        body: `eTefter ${appVersion}`,
      },
    ],
    [appVersion, isDark, t]
  );
  const documentInfoItems = useMemo(
    () => infoItems.filter((item) => item.key === 'terms' || item.key === 'privacy' || item.key === 'support'),
    [infoItems]
  );
  const secondaryInfoItems = useMemo(
    () => infoItems.filter((item) => item.key === 'version'),
    [infoItems]
  );
  const settingsScreenTitle = useMemo(() => {
    switch (settingsScreen) {
      case 'profile':
        return t('settings.profileTitle');
      case 'profileEdit':
        return t('settings.editProfileTitle');
      case 'subscription':
        return t('settings.subscriptionTitle');
      case 'company':
        return t('settings.companySection');
      case 'companyEdit':
        return t('settings.companySection');
      case 'theme':
        return t('settings.themeTitle');
      case 'language':
        return t('settings.languageTitle');
      case 'currency':
        return t('settings.currencyTitle');
      case 'documents':
        return t('settings.documentsTitle');
      case 'support':
        return t('settings.support');
      case 'notifications':
        return t('settings.notifications');
      case 'about':
        return t('settings.aboutTitle');
      case 'account':
        return t('settings.accountSection');
      default:
        return t('tabs.settings');
    }
  }, [settingsScreen, t]);
  const reminderOptions = useMemo(
    () => [
      { value: 'none' as const, label: t('jobs.reminders.none'), icon: 'notifications-off-outline' as const },
      { value: 'same_day' as const, label: t('jobs.reminders.sameDay'), icon: 'today-outline' as const },
      { value: 'day_before' as const, label: t('jobs.reminders.dayBefore'), icon: 'calendar-outline' as const },
    ],
    [t]
  );
  const reminderTimeOptions = useMemo(
    () => [
      { value: '09:00' as const, label: '09:00' },
      { value: '12:00' as const, label: '12:00' },
      { value: '18:00' as const, label: '18:00' },
    ],
    []
  );
  const themeOptions = useMemo(
    () => [
      {
        value: 'light' as const,
        label: t('settings.themeLight'),
        icon: 'sunny-outline' as const,
        iconBg: isDark ? colors.elevatedSurface : '#F2F4F7',
        iconColor: isDark ? '#F4C16A' : '#B76E0D',
      },
      {
        value: 'dark' as const,
        label: t('settings.themeDark'),
        icon: 'moon-outline' as const,
        iconBg: isDark ? colors.elevatedSurface : '#F2F4F7',
        iconColor: isDark ? '#C0A7FF' : '#7359C8',
      },
      {
        value: 'system' as const,
        label: t('settings.themeAutomatic'),
        icon: 'phone-portrait-outline' as const,
        iconBg: isDark ? colors.elevatedSurface : '#F2F4F7',
        iconColor: isDark ? '#8FB2FF' : '#2F68ED',
      },
    ],
    [colors.elevatedSurface, isDark, t]
  );
  const languageOptions = useMemo(
    () => [
      { value: 'sr' as const, label: 'Srpski', flag: '🇷🇸' },
      { value: 'en' as const, label: 'English', flag: '🇬🇧' },
      { value: 'de' as const, label: 'Deutsch', flag: '🇩🇪' },
      { value: 'fr' as const, label: 'Français', flag: '🇫🇷' },
      { value: 'es' as const, label: 'Español', flag: '🇪🇸' },
    ],
    []
  );
  const currencyOptions = useMemo(
    () => [
      { value: 'RSD' as const, label: t('settings.currencyRsd'), icon: 'cash-outline' as const },
      { value: 'EUR' as const, label: t('settings.currencyEur'), icon: 'logo-euro' as const },
      { value: 'USD' as const, label: t('settings.currencyUsd'), icon: 'logo-usd' as const },
    ],
    [t]
  );

  const switchTrackColor = useMemo(
    () => ({
      false: isDark ? '#4A4F58' : '#C8CDD6',
      true: isDark ? '#3A7BFF' : '#2F68ED',
    }),
    [isDark]
  );
  const switchThumbColor = notificationsEnabled ? '#FFFFFF' : isDark ? '#DDE3EA' : '#F7F8FA';
  const switchBgColor = isDark ? '#4A4F58' : '#C8CDD6';
  const modalWidth = Math.max(280, Math.round(windowWidth * 0.8));
  const modalMaxHeight = Math.max(320, Math.min(560, Math.round(windowHeight * 0.78)));
  const modalContentMaxHeight = Math.max(240, modalMaxHeight - 64);
  const modalBackgroundColor = isDark ? Colors.dark.menuSurface : '#FFFFFF';
  const modalBorderColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(60,60,67,0.12)';
  const modalBackdropColor = isDark ? 'rgba(0,0,0,0.42)' : 'rgba(16,24,40,0.22)';
  const settingsInputSurfaceColor = isDark ? colors.elevatedSurface : '#F2F4F7';
  const settingsInputFocusedBorderColor = isDark ? '#A6C8FF' : '#5FA2FF';
  const settingsScrollBottomPadding = keyboardVisible
    ? settingsScreen === 'companyEdit'
      ? 145
      : settingsScreen === 'profileEdit'
        ? 180
        : settingsScreen === 'support'
          ? 220
          : 28
    : 28;
  const profileInputBorderColor = usernameInputFocused
    ? settingsInputFocusedBorderColor
    : colors.inputBorder;
  const profileInputBorderWidth = usernameInputFocused ? 2 : 1;
  const getInputBorderColor = (focused: boolean) => (focused ? settingsInputFocusedBorderColor : colors.inputBorder);
  const getInputBorderWidth = (focused: boolean) => (focused ? 2 : 1);
  const subscriptionStatusColor = hasSubscription ? colors.successText : colors.warningText;
  const subscriptionStatusSurfaceColor = hasSubscription ? colors.successSurface : colors.warningSurface;

  const onSelectThemePreference = useCallback((nextTheme: AppThemePreference) => {
    setColorScheme(nextTheme);
  }, [setColorScheme]);

  const onSelectLanguage = useCallback((nextLanguage: AppLanguage) => {
    void i18n.changeLanguage(nextLanguage);
    void setStoredLanguage(nextLanguage);
  }, [i18n]);

  const onSelectCurrency = useCallback((nextCurrency: AppCurrency) => {
    setCurrency(nextCurrency);
  }, [setCurrency]);

  const onSendSupportEmail = useCallback(async () => {
    const subject = supportSubject.trim() || t('settings.supportEmailSubject');
    const message = supportMessage.trim();
    const body = [
      message,
      '',
      '---',
      `${t('settings.supportEmailUser')}: ${email}`,
      `${t('settings.supportEmailVersion')}: ${appVersion}`,
    ].join('\n');
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(t('settings.supportEmailUnavailableTitle'), t('settings.supportEmailUnavailableBody', { email: SUPPORT_EMAIL }));
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('settings.supportEmailUnavailableTitle'), t('settings.supportEmailUnavailableBody', { email: SUPPORT_EMAIL }));
    }
  }, [appVersion, email, supportMessage, supportSubject, t]);

  useEffect(() => {
    setSupportSubject((current) => {
      const shouldReplace = !current.trim() || current === lastDefaultSupportSubjectRef.current;
      lastDefaultSupportSubjectRef.current = defaultSupportSubject;
      return shouldReplace ? defaultSupportSubject : current;
    });
  }, [defaultSupportSubject]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [enabled, reminder, reminderTime] = await Promise.all([
        getNotificationsEnabled(),
        getDefaultJobReminderPreference(),
        getDefaultReminderTime(),
      ]);
      if (mounted) {
        setNotificationsEnabledState(enabled);
        setDefaultReminder(reminder);
        setDefaultReminderTimeState(reminderTime);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setFocusedCompanyField(null);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (settingsScreen !== 'companyEdit' || !focusedCompanyField) return;

    const scrollTargets: Record<string, number> = {
      name: 160,
      phone: 235,
      address: 310,
      pib: 385,
      registration: 405,
      account: 455,
    };
    const y = scrollTargets[focusedCompanyField] ?? 0;
    const timer = setTimeout(() => {
      settingsScrollRef.current?.scrollTo({ y, animated: true });
    }, keyboardVisible ? 80 : 220);

    return () => clearTimeout(timer);
  }, [focusedCompanyField, keyboardVisible, settingsScreen]);

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

  const prepareCompanyDraft = useCallback(() => {
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
  }, [
    companyAccountNumber,
    companyAddress,
    companyLogoPath,
    companyLogoUrl,
    companyName,
    companyPhone,
    companyPib,
    companyRegistrationNumber,
  ]);

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
    setSettingsScreen('profile');
  };

  const onPickCompanyLogo = async () => {
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
      setCompanyNameDraft(trimmed);
      setCompanyPhoneDraft(trimmedPhone);
      setCompanyAddressDraft(trimmedAddress);
      setCompanyPibDraft(trimmedPib);
      setCompanyRegistrationNumberDraft(trimmedRegistrationNumber);
      setCompanyAccountNumberDraft(trimmedAccountNumber);
      setCompanyLogoDraftPath(nextLogoPath);
      setCompanyLogoDraftUrl(nextLogoUrl);
      setCompanyLogoDraftLocalUri(null);
      setSettingsScreen('company');
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

  const animateSettingsScreen = useCallback((nextScreen: SettingsScreenKey, direction: 'forward' | 'back') => {
    settingsSlideX.stopAnimation();
    settingsSlideX.setValue(direction === 'forward' ? modalWidth : -modalWidth);
    setSettingsScreen(nextScreen);
    requestAnimationFrame(() => {
      Animated.spring(settingsSlideX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 220,
        friction: 26,
      }).start();
    });
  }, [modalWidth, settingsSlideX]);

  const openSettingsScreen = useCallback((nextScreen: Exclude<SettingsScreenKey, 'menu'>) => {
    animateSettingsScreen(nextScreen, 'forward');
  }, [animateSettingsScreen]);

  const openProfileEditScreen = useCallback(() => {
    setUsernameDraft(username);
    setUsernameError(null);
    setUsernameMessage(null);
    animateSettingsScreen('profileEdit', 'forward');
  }, [animateSettingsScreen, username]);

  const openCompanyEditScreen = useCallback(() => {
    prepareCompanyDraft();
    animateSettingsScreen('companyEdit', 'forward');
  }, [animateSettingsScreen, prepareCompanyDraft]);

  const goBackToSettingsMenu = useCallback(() => {
    if (usernameSubmitting || companySubmitting || companyUploading) return;
    if (settingsScreen === 'profileEdit') {
      animateSettingsScreen('profile', 'back');
      return;
    }
    if (settingsScreen === 'companyEdit') {
      animateSettingsScreen('company', 'back');
      return;
    }
    if (settingsScreen === 'support') {
      animateSettingsScreen('documents', 'back');
      return;
    }
    animateSettingsScreen('menu', 'back');
  }, [animateSettingsScreen, companySubmitting, companyUploading, settingsScreen, usernameSubmitting]);

  const renderSettingsRow = ({
    icon,
    iconBg: _iconBg,
    iconColor,
    label,
    onPress,
    destructive = false,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    iconBg: string;
    iconColor: string;
    label: string;
    onPress: () => void;
    destructive?: boolean;
  }) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center py-1.5">
      <View className="h-8 w-8 items-center justify-center">
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text
        className="ml-3 flex-1 text-base font-medium"
        style={{ color: destructive ? (isDark ? '#D98780' : '#A9433C') : colors.text }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={destructive ? (isDark ? '#B66B65' : '#A9433C') : colors.secondaryText} />
    </Pressable>
  );

  const renderMenuSection = (rows: React.ReactNode[], first = false) => (
    <View className={first ? 'mt-1' : 'mt-4'}>
      {rows}
    </View>
  );

  const renderCompanyDetailRow = (label: string, value: string | null | undefined) => (
    <View className="mt-3 flex-row items-start justify-between">
      <Text className="text-app-row" style={{ color: colors.secondaryText }}>
        {label}
      </Text>
      <Text
        className="ml-4 flex-1 text-right text-app-row font-semibold"
        style={{ color: value ? colors.text : colors.secondaryText }}
        numberOfLines={2}>
        {value || t('settings.notEntered')}
      </Text>
    </View>
  );

  const renderCompanyInput = ({
    id,
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    autoCapitalize = 'none',
  }: {
    id: string;
    label: string;
    value: string;
    onChangeText: (next: string) => void;
    placeholder: string;
    keyboardType?: React.ComponentProps<typeof AppTextInput>['keyboardType'];
    autoCapitalize?: React.ComponentProps<typeof AppTextInput>['autoCapitalize'];
  }) => (
    <View className="mt-4">
      <Text className="text-app-row font-semibold" style={{ color: colors.text }}>
        {label}
      </Text>
      <AppTextInput
        value={value}
        onChangeText={(next) => {
          onChangeText(next);
          if (companyError) setCompanyError(null);
          if (companyMessage) setCompanyMessage(null);
        }}
        onFocus={() => setFocusedCompanyField(id)}
        onBlur={() => setFocusedCompanyField(null)}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        placeholder={placeholder}
        className="mt-3"
        style={{
          backgroundColor: settingsInputSurfaceColor,
          borderWidth: getInputBorderWidth(focusedCompanyField === id),
          borderColor: getInputBorderColor(focusedCompanyField === id),
          borderRadius: 16,
          color: colors.text,
          paddingVertical: 8,
        }}
      />
    </View>
  );

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: modalBackdropColor }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        onPress={() => goBackOrReplace(router, '/(tabs)' as any)}
        className="absolute inset-0"
      />
      <View
        style={{
          width: modalWidth,
          height: modalMaxHeight,
          maxHeight: modalMaxHeight,
          borderRadius: 30,
          borderWidth: 1,
          borderColor: modalBorderColor,
          overflow: 'hidden',
          backgroundColor: modalBackgroundColor,
        }}>
        <View
          style={{
            height: 64,
            overflow: 'hidden',
            backgroundColor: modalBackgroundColor,
          }}>
          <View className="h-full flex-row items-center justify-between px-4">
            <View className="h-9 w-9 items-center justify-center">
              {settingsScreen === 'menu' ? null : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common.back')}
                  onPress={goBackToSettingsMenu}
                  hitSlop={8}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)' }}>
                  <Ionicons name="chevron-back" size={21} color={colors.text} />
                </Pressable>
              )}
            </View>
            <Text className="flex-1 text-center text-app-row-title font-semibold" style={{ color: colors.text }} numberOfLines={1}>
              {settingsScreenTitle}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={() => goBackOrReplace(router, '/(tabs)' as any)}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)' }}>
              <Ionicons name="close" size={19} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <Animated.ScrollView
          ref={settingsScrollRef}
          style={{ maxHeight: modalContentMaxHeight }}
          contentContainerStyle={{ paddingBottom: settingsScrollBottomPadding }}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
      <Animated.View style={{ transform: [{ translateX: settingsSlideX }] }}>
      <View className="px-4 pt-2">
        {settingsScreen === 'menu' ? (
          <>
            {renderMenuSection([
              <React.Fragment key="profile">
                {renderSettingsRow({
                  icon: 'person-outline',
                  iconBg: colors.iconSurface,
                  iconColor: colors.accent,
                  label: t('settings.profileTitle'),
                  onPress: () => openSettingsScreen('profile'),
                })}
              </React.Fragment>,
              <React.Fragment key="subscription">
                {renderSettingsRow({
                  icon: 'card-outline',
                  iconBg: isDark ? '#1C2B22' : '#DDEFE2',
                  iconColor: isDark ? '#7AD69C' : '#2F8C57',
                  label: t('settings.subscriptionTitle'),
                  onPress: () => openSettingsScreen('subscription'),
                })}
              </React.Fragment>,
              <React.Fragment key="company">
                {renderSettingsRow({
                  icon: 'business-outline',
                  iconBg: isDark ? '#292111' : '#F3E2C9',
                  iconColor: isDark ? '#F4C16A' : '#B76E0D',
                  label: t('settings.companySection'),
                  onPress: () => openSettingsScreen('company'),
                })}
              </React.Fragment>,
              <React.Fragment key="theme">
                {renderSettingsRow({
                  icon: 'moon-outline',
                  iconBg: isDark ? '#261F38' : '#E6DFF7',
                  iconColor: isDark ? '#C0A7FF' : '#7359C8',
                  label: t('settings.themeTitle'),
                  onPress: () => openSettingsScreen('theme'),
                })}
              </React.Fragment>,
              <React.Fragment key="language">
                {renderSettingsRow({
                  icon: 'language-outline',
                  iconBg: isDark ? '#182A39' : '#DCEAF7',
                  iconColor: isDark ? '#72C4FF' : '#1C73B8',
                  label: t('settings.languageTitle'),
                  onPress: () => openSettingsScreen('language'),
                })}
              </React.Fragment>,
              <React.Fragment key="currency">
                {renderSettingsRow({
                  icon: 'cash-outline',
                  iconBg: isDark ? '#182A39' : '#DCEAF7',
                  iconColor: isDark ? '#72C4FF' : '#1C73B8',
                  label: t('settings.currencyTitle'),
                  onPress: () => openSettingsScreen('currency'),
                })}
              </React.Fragment>,
            ], true)}

            {renderMenuSection([
              <React.Fragment key="notifications">
                {renderSettingsRow({
                  icon: 'notifications-outline',
                  iconBg: isDark ? '#1C2B22' : '#DDEFE2',
                  iconColor: isDark ? '#7AD69C' : '#2F8C57',
                  label: t('settings.notifications'),
                  onPress: () => openSettingsScreen('notifications'),
                })}
              </React.Fragment>,
              <React.Fragment key="documents">
                {renderSettingsRow({
                  icon: 'documents-outline',
                  iconBg: isDark ? '#202B40' : '#DFE8FA',
                  iconColor: isDark ? '#8FB2FF' : '#2F68ED',
                  label: t('settings.documentsAndSupport'),
                  onPress: () => openSettingsScreen('documents'),
                })}
              </React.Fragment>,
              ...secondaryInfoItems.map((item) => (
                <React.Fragment key={item.key}>
                  {renderSettingsRow({
                    icon: item.icon,
                    iconBg: item.iconBg,
                    iconColor: item.iconColor,
                    label: item.title,
                    onPress: () => {
                      openSettingsScreen('about');
                    },
                  })}
                </React.Fragment>
              )),
            ])}

            {renderMenuSection([
              <React.Fragment key="account">
                {renderSettingsRow({
                  icon: 'person-circle-outline',
                  iconBg: isDark ? '#202B40' : '#DFE8FA',
                  iconColor: isDark ? '#8FB2FF' : '#2F68ED',
                  label: t('settings.accountSection'),
                  onPress: () => openSettingsScreen('account'),
                })}
              </React.Fragment>,
            ])}
          </>
        ) : null}

        {settingsScreen === 'profile' ? (
          <>
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="flex-1 pr-5 text-app-row leading-5" style={{ color: colors.secondaryText }}>
                {t('settings.profileHelp')}
              </Text>
              <View className="h-16 w-16 items-center justify-center rounded-[22px]" style={{ backgroundColor: colors.iconSurface }}>
                <Ionicons name="person-circle-outline" size={40} color={colors.accent} />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                {t('settings.profileSection')}
              </Text>
              <View className="mt-2 h-px" style={{ backgroundColor: colors.separator }} />
            </View>

            <View className="mt-4">
              <Text className="text-app-section font-semibold" style={{ color: colors.text }} numberOfLines={1}>
                {displayName}
              </Text>
              <Text className="mt-0.5 text-app-row" style={{ color: colors.secondaryText }} numberOfLines={1}>
                {email}
              </Text>
            </View>

            {usernameMessage ? (
              <View
                className="mt-5 rounded-[18px] px-4 py-3"
                style={{ backgroundColor: colors.successSurface }}>
                <Text className="text-app-meta-lg" style={{ color: colors.successText }}>{usernameMessage}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={openProfileEditScreen}
              className="mt-6 flex-row items-center justify-center rounded-[16px] px-4 py-2.5"
              style={{ backgroundColor: colors.elevatedSurface }}>
              <Text className="text-app-row-lg font-semibold" style={{ color: colors.text }}>
                {t('settings.editProfile')}
              </Text>
            </Pressable>
          </>
        ) : null}

        {settingsScreen === 'profileEdit' ? (
          <>
            <Text className="mt-1 text-app-row leading-5" style={{ color: colors.secondaryText }}>
              {t('settings.profileEditHelp')}
            </Text>

            <View className="mt-6">
              <Text className="text-app-row font-semibold" style={{ color: colors.text }}>
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
                onFocus={() => setUsernameInputFocused(true)}
                onBlur={() => setUsernameInputFocused(false)}
                className="mt-3"
                style={{
                  backgroundColor: settingsInputSurfaceColor,
                  borderWidth: profileInputBorderWidth,
                  borderColor: profileInputBorderColor,
                  borderRadius: 16,
                  color: colors.text,
                  paddingVertical: 8,
                }}
              />
            </View>

            <View className="mt-5">
              <Text className="text-app-row font-semibold" style={{ color: colors.text }}>
                {t('common.email')}
              </Text>
              <Text className="mt-2 text-app-row-lg" style={{ color: colors.secondaryText }} numberOfLines={1}>
                {email}
              </Text>
            </View>

            {usernameError ? <Text className="mt-4 text-app-meta text-red-600">{usernameError}</Text> : null}

            <Pressable
              onPress={onSaveUsername}
              disabled={usernameSubmitting}
              className="mt-6 flex-row items-center justify-center rounded-[16px] px-4 py-2.5 disabled:opacity-60"
              style={{ backgroundColor: colors.accent }}>
              {usernameSubmitting ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text className="text-app-row-lg font-semibold" style={{ color: colors.onAccent }}>{t('settings.saveProfileChanges')}</Text>
              )}
            </Pressable>
          </>
        ) : null}

        {settingsScreen === 'subscription' ? (
          <>
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="flex-1 pr-5 text-app-row leading-5" style={{ color: colors.secondaryText }}>
                {t('settings.subscriptionHelp')}
              </Text>
              <View className="h-16 w-16 items-center justify-center rounded-[22px]" style={{ backgroundColor: colors.iconSurface }}>
                <Ionicons name={hasSubscription ? 'shield-checkmark-outline' : 'card-outline'} size={36} color={subscriptionStatusColor} />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                {t('settings.statusSection')}
              </Text>
              <View className="mt-2 h-px" style={{ backgroundColor: colors.separator }} />
            </View>

            <View className="mt-4">
              <Text className="text-app-section font-semibold" style={{ color: colors.text }} numberOfLines={1}>
                {hasSubscription ? t('settings.premiumActive') : t('settings.freePlan')}
              </Text>
              {hasSubscription ? (
                <Text className="mt-0.5 text-app-row" style={{ color: colors.secondaryText }}>
                  {t('settings.premiumAvailable')}
                </Text>
              ) : null}
            </View>

            <View
              className="mt-5 rounded-[18px] px-4 py-3"
              style={{ backgroundColor: subscriptionStatusSurfaceColor }}>
              <Text className="text-app-meta-lg font-semibold" style={{ color: subscriptionStatusColor }}>
                {hasSubscription ? t('settings.subscriptionStatus') : t('settings.planLimitsTitle')}
              </Text>
              {hasSubscription ? (
                <Text className="mt-1 text-app-meta-lg" style={{ color: colors.secondaryText }}>
                  {t('settings.premiumStatusBody')}
                </Text>
              ) : (
                <>
                  <Text className="mt-1 text-app-meta-lg" style={{ color: colors.secondaryText }}>
                    {t('settings.freePlanIncludes')}
                  </Text>
                  <Text className="mt-1 text-app-meta-lg" style={{ color: colors.secondaryText }}>
                    {t('settings.freePlanClientsLimit')}
                  </Text>
                  <Text className="text-app-meta-lg" style={{ color: colors.secondaryText }}>
                    {t('settings.freePlanJobsLimit')}
                  </Text>
                </>
              )}
            </View>

            {!hasSubscription ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace({ pathname: '/paywall', params: { preview: '1' } })}
                className="mt-6 flex-row items-center justify-center rounded-[16px] px-4 py-2.5"
                style={{ backgroundColor: colors.accent }}>
                <Text className="text-app-row-lg font-semibold" style={{ color: colors.onAccent }}>
                  {t('settings.buyPremium')}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {settingsScreen === 'company' ? (
          <>
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="flex-1 pr-5 text-app-row leading-5" style={{ color: colors.secondaryText }}>
                {t('settings.companyDetailsHelp')}
              </Text>
              <View className="h-16 w-16 items-center justify-center rounded-[22px]" style={{ backgroundColor: colors.iconSurface }}>
                {companyLogoUrl ? (
                  <Image source={{ uri: companyLogoUrl }} style={{ width: 46, height: 46, borderRadius: 11 }} resizeMode="contain" />
                ) : (
                  <Ionicons name="business-outline" size={34} color={colors.accent} />
                )}
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                {t('settings.companyDetailsSection')}
              </Text>
              <View className="mt-2 h-px" style={{ backgroundColor: colors.separator }} />
            </View>

            <View className="mt-1">
              {renderCompanyDetailRow(t('settings.companyName'), companyName)}
              {renderCompanyDetailRow(t('settings.companyPhone'), companyPhone)}
              {renderCompanyDetailRow(t('settings.companyAddress'), companyAddress)}
              {renderCompanyDetailRow(t('settings.companyPib'), companyPib)}
              {renderCompanyDetailRow(t('settings.companyRegistrationNumberShort'), companyRegistrationNumber)}
              {renderCompanyDetailRow(t('settings.companyAccountNumber'), companyAccountNumber)}
            </View>

            {companyMessage ? (
              <View className="mt-5 rounded-[18px] px-4 py-3" style={{ backgroundColor: colors.successSurface }}>
                <Text className="text-app-meta-lg" style={{ color: colors.successText }}>{companyMessage}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={openCompanyEditScreen}
              className="mt-6 flex-row items-center justify-center rounded-[16px] px-4 py-2.5"
              style={{ backgroundColor: colors.elevatedSurface }}>
              <Text className="text-app-row-lg font-semibold" style={{ color: colors.text }}>
                {t('settings.editProfile')}
              </Text>
            </Pressable>
          </>
        ) : null}

        {settingsScreen === 'companyEdit' ? (
          <>
            <Text className="mt-1 text-app-row leading-5" style={{ color: colors.secondaryText }}>
              {t('settings.companyHelp')}
            </Text>

            <View className="mt-6">
              <Text className="text-app-row font-semibold" style={{ color: colors.text }}>
                {t('settings.companyLogo')}
              </Text>
              <View className="mt-3 flex-row items-center justify-between">
                <View
                  className="items-center justify-center rounded-[18px]"
                  style={{
                    width: 76,
                    height: 76,
                    backgroundColor: colors.iconSurface,
                    borderWidth: 1,
                    borderColor: colors.glassBorder,
                  }}>
                  {companyLogoDraftLocalUri || companyLogoDraftUrl ? (
                    <Image
                      source={{ uri: companyLogoDraftLocalUri ?? companyLogoDraftUrl ?? undefined }}
                      style={{ width: 58, height: 58, borderRadius: 12 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name="image-outline" size={24} color={colors.secondaryText} />
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
                      className="mr-2 h-11 w-11 items-center justify-center rounded-full disabled:opacity-60">
                      <Ionicons name="add" size={24} color="#FFFFFF" />
                    </Pressable>
                    {companyLogoDraftLocalUri || companyLogoDraftUrl ? (
                      <Pressable
                        onPress={onRemoveCompanyLogo}
                        disabled={companyUploading}
                        accessibilityRole="button"
                        accessibilityLabel={t('settings.removeLogo')}
                        className="h-11 w-11 items-center justify-center rounded-full disabled:opacity-60">
                        <Ionicons name="trash-outline" size={21} color={isDark ? '#D98780' : '#A9433C'} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>

            {renderCompanyInput({
              id: 'name',
              label: t('settings.companyName'),
              value: companyNameDraft,
              onChangeText: setCompanyNameDraft,
              placeholder: t('settings.companyNamePlaceholder'),
              autoCapitalize: 'words',
            })}
            {renderCompanyInput({
              id: 'phone',
              label: t('settings.companyPhone'),
              value: companyPhoneDraft,
              onChangeText: setCompanyPhoneDraft,
              placeholder: t('settings.companyPhonePlaceholder'),
              keyboardType: 'phone-pad',
            })}
            {renderCompanyInput({
              id: 'address',
              label: t('settings.companyAddress'),
              value: companyAddressDraft,
              onChangeText: setCompanyAddressDraft,
              placeholder: t('settings.companyAddressPlaceholder'),
              autoCapitalize: 'words',
            })}
            {renderCompanyInput({
              id: 'pib',
              label: t('settings.companyPib'),
              value: companyPibDraft,
              onChangeText: setCompanyPibDraft,
              placeholder: t('settings.companyPibPlaceholder'),
              keyboardType: 'number-pad',
              autoCapitalize: 'characters',
            })}
            {renderCompanyInput({
              id: 'registration',
              label: t('settings.companyRegistrationNumber'),
              value: companyRegistrationNumberDraft,
              onChangeText: setCompanyRegistrationNumberDraft,
              placeholder: t('settings.companyRegistrationNumberPlaceholder'),
              keyboardType: 'number-pad',
              autoCapitalize: 'characters',
            })}
            {renderCompanyInput({
              id: 'account',
              label: t('settings.companyAccountNumber'),
              value: companyAccountNumberDraft,
              onChangeText: setCompanyAccountNumberDraft,
              placeholder: t('settings.companyAccountNumberPlaceholder'),
              autoCapitalize: 'characters',
            })}

            {companyError ? <Text className="mt-4 text-app-meta text-red-600">{companyError}</Text> : null}

            <Pressable
              onPress={() => {
                void onSaveCompany();
              }}
              disabled={companySubmitting || companyUploading}
              className="mt-6 flex-row items-center justify-center rounded-[16px] px-4 py-2.5 disabled:opacity-60"
              style={{ backgroundColor: colors.accent }}>
              {companySubmitting || companyUploading ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text className="text-app-row-lg font-semibold" style={{ color: colors.onAccent }}>
                  {t('settings.saveCompany')}
                </Text>
              )}
            </Pressable>
          </>
        ) : null}

        {settingsScreen === 'theme' ? (
          <>
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="flex-1 pr-5 text-app-row leading-5" style={{ color: colors.secondaryText }}>
                {t('settings.themeHelp')}
              </Text>
              <View className="h-16 w-16 items-center justify-center rounded-[22px]" style={{ backgroundColor: colors.iconSurface }}>
                <Ionicons name="color-palette-outline" size={36} color={colors.accent} />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                {t('settings.themeSection')}
              </Text>
              <View className="mt-2 h-px" style={{ backgroundColor: colors.separator }} />
            </View>

            <View className="mt-2">
              {themeOptions.map((option, index) => {
                const selected = themePreference === option.value;
                return (
                  <React.Fragment key={option.value}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onSelectThemePreference(option.value)}
                      className="flex-row items-center py-2.5">
                      <View className="h-10 w-10 items-center justify-center rounded-[10px]" style={{ backgroundColor: option.iconBg }}>
                        <Ionicons name={option.icon} size={18} color={option.iconColor} />
                      </View>
                      <Text className="ml-3 flex-1 text-base" style={{ color: colors.text }}>
                        {option.label}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={19} color="#1C60C3" />
                      ) : null}
                    </Pressable>
                    {index < themeOptions.length - 1 ? (
                      <View className="h-px" style={{ backgroundColor: colors.separator }} />
                    ) : null}
                  </React.Fragment>
                );
              })}
            </View>

            <Text className="mt-4 text-center text-app-meta-lg leading-5" style={{ color: colors.secondaryText }}>
              {t('settings.themeAutomaticHelp')}
            </Text>
          </>
        ) : null}

        {settingsScreen === 'language' ? (
          <>
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="flex-1 pr-5 text-app-row leading-5" style={{ color: colors.secondaryText }}>
                {t('settings.languageHelpDetailed')}
              </Text>
              <View className="h-16 w-16 items-center justify-center rounded-[22px]" style={{ backgroundColor: colors.iconSurface }}>
                <Ionicons name="language-outline" size={36} color={colors.accent} />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                {t('settings.languageSection')}
              </Text>
              <View className="mt-2 h-px" style={{ backgroundColor: colors.separator }} />
            </View>

            <View className="mt-2">
              {languageOptions.map((option, index) => {
                const selected = currentLanguage === option.value;
                return (
                  <React.Fragment key={option.value}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onSelectLanguage(option.value)}
                      className="flex-row items-center py-2.5">
                      <View className="h-10 w-10 items-center justify-center rounded-[10px]">
                        <Text style={{ fontSize: 22, lineHeight: 26 }}>{option.flag}</Text>
                      </View>
                      <Text className="ml-3 flex-1 text-base" style={{ color: colors.text }}>
                        {option.label}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={19} color="#1C60C3" />
                      ) : null}
                    </Pressable>
                    {index < languageOptions.length - 1 ? (
                      <View className="h-px" style={{ backgroundColor: colors.separator }} />
                    ) : null}
                  </React.Fragment>
                );
              })}
            </View>
          </>
        ) : null}

        {settingsScreen === 'currency' ? (
          <>
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="flex-1 pr-5 text-app-row leading-5" style={{ color: colors.secondaryText }}>
                {t('settings.currencyHelp')}
              </Text>
              <View className="h-16 w-16 items-center justify-center rounded-[22px]" style={{ backgroundColor: colors.iconSurface }}>
                <Ionicons name="cash-outline" size={36} color={colors.accent} />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                {t('settings.currencySection')}
              </Text>
              <View className="mt-2 h-px" style={{ backgroundColor: colors.separator }} />
            </View>

            <View className="mt-2">
              {currencyOptions.map((option, index) => {
                const selected = currency === option.value;
                return (
                  <React.Fragment key={option.value}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onSelectCurrency(option.value)}
                      className="flex-row items-center py-2.5">
                      <View className="h-8 w-8 items-center justify-center">
                        <Ionicons name={option.icon} size={18} color={colors.accent} />
                      </View>
                      <Text className="ml-3 flex-1 text-base" style={{ color: colors.text }}>
                        {option.label} <Text style={{ color: colors.secondaryText }}>{getCurrencySymbol(option.value)}</Text>
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark" size={19} color="#1C60C3" />
                      ) : null}
                    </Pressable>
                    {index < currencyOptions.length - 1 ? (
                      <View className="h-px" style={{ backgroundColor: colors.separator }} />
                    ) : null}
                  </React.Fragment>
                );
              })}
            </View>
          </>
        ) : null}

        {settingsScreen === 'documents' ? (
          <>
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="flex-1 pr-5 text-app-row leading-5" style={{ color: colors.secondaryText }}>
                {t('settings.documentsHelp')}
              </Text>
              <View className="h-16 w-16 items-center justify-center rounded-[22px]" style={{ backgroundColor: colors.iconSurface }}>
                <Ionicons name="documents-outline" size={36} color={colors.accent} />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                {t('settings.documentsSection')}
              </Text>
              <View className="mt-2 h-px" style={{ backgroundColor: colors.separator }} />
            </View>

            <View className="mt-2">
              {documentInfoItems.map((item, index) => (
                <React.Fragment key={item.key}>
                  {renderSettingsRow({
                    icon: item.icon,
                    iconBg: item.iconBg,
                    iconColor: item.iconColor,
                    label: item.title,
                    onPress: () => {
                      if (item.key === 'terms' || item.key === 'privacy') {
                        router.push(`/legal/${item.key}` as any);
                        return;
                      }
                      openSettingsScreen('support');
                    },
                  })}
                  {index < documentInfoItems.length - 1 ? (
                    <View className="h-px" style={{ backgroundColor: colors.separator }} />
                  ) : null}
                </React.Fragment>
              ))}
            </View>
          </>
        ) : null}

        {settingsScreen === 'support' ? (
          <>
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="flex-1 pr-5 text-app-row leading-5" style={{ color: colors.secondaryText }}>
                {t('settings.supportEmailHelp')}
              </Text>
              <View className="h-16 w-16 items-center justify-center rounded-[22px]" style={{ backgroundColor: colors.iconSurface }}>
                <Ionicons name="mail-outline" size={36} color={colors.accent} />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                {t('settings.supportMessageSection')}
              </Text>
              <View className="mt-2 h-px" style={{ backgroundColor: colors.separator }} />
            </View>

            <View className="mt-4">
              <Text className="text-app-row font-semibold" style={{ color: colors.text }}>
                {t('settings.supportSubjectLabel')}
              </Text>
              <AppTextInput
                value={supportSubject}
                onChangeText={setSupportSubject}
                onFocus={() => setFocusedSupportField('subject')}
                onBlur={() => setFocusedSupportField(null)}
                autoCapitalize="sentences"
                autoCorrect
                className="mt-3"
                style={{
                  backgroundColor: settingsInputSurfaceColor,
                  borderWidth: getInputBorderWidth(focusedSupportField === 'subject'),
                  borderColor: getInputBorderColor(focusedSupportField === 'subject'),
                  borderRadius: 16,
                  color: colors.text,
                  paddingVertical: 8,
                }}
              />
            </View>

            <View className="mt-4">
              <Text className="text-app-row font-semibold" style={{ color: colors.text }}>
                {t('settings.supportMessageLabel')}
              </Text>
              <AppTextInput
                value={supportMessage}
                onChangeText={setSupportMessage}
                onFocus={() => setFocusedSupportField('message')}
                onBlur={() => setFocusedSupportField(null)}
                autoCapitalize="sentences"
                autoCorrect
                multiline
                textAlignVertical="top"
                placeholder={t('settings.supportMessagePlaceholder')}
                className="mt-3"
                style={{
                  minHeight: 116,
                  backgroundColor: settingsInputSurfaceColor,
                  borderWidth: getInputBorderWidth(focusedSupportField === 'message'),
                  borderColor: getInputBorderColor(focusedSupportField === 'message'),
                  borderRadius: 16,
                  color: colors.text,
                  paddingVertical: 10,
                }}
              />
            </View>

            <Text className="mt-4 text-center text-app-meta-lg leading-5" style={{ color: colors.secondaryText }}>
              {t('settings.supportEmailNote', { email: SUPPORT_EMAIL })}
            </Text>

            <Pressable
              onPress={() => {
                void onSendSupportEmail();
              }}
              className="mt-6 flex-row items-center justify-center rounded-[16px] px-4 py-2.5"
              style={{ backgroundColor: colors.accent }}>
              <Text className="text-app-row-lg font-semibold" style={{ color: colors.onAccent }}>
                {t('settings.supportEmailSend')}
              </Text>
            </Pressable>
          </>
        ) : null}

        {settingsScreen === 'notifications' ? (
          <>
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="flex-1 pr-5 text-app-row leading-5" style={{ color: colors.secondaryText }}>
                {t('settings.notificationsDetailHelp')}
              </Text>
              <View className="h-16 w-16 items-center justify-center rounded-[22px]" style={{ backgroundColor: colors.iconSurface }}>
                <Ionicons name="notifications-outline" size={36} color={colors.accent} />
              </View>
            </View>

            <View className="mt-6 flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-base" style={{ color: colors.text }}>
                  {t('settings.notifications')}
                </Text>
                <Text className="mt-0.5 text-app-meta-lg" style={{ color: colors.secondaryText }}>
                  {t('settings.notificationsHelp')}
                </Text>
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
                <View className="mt-6">
                  <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                    {t('settings.defaultReminder')}
                  </Text>
                  <View className="mt-2 h-px" style={{ backgroundColor: colors.separator }} />
                </View>

                <View className="mt-2">
                  {reminderOptions.map((option, index) => {
                    const selected = defaultReminder === option.value;
                    return (
                      <React.Fragment key={option.value}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            setDefaultReminder(option.value);
                            void setDefaultJobReminderPreference(option.value);
                          }}
                          className="flex-row items-center py-1.5">
                          <View
                            className="h-8 w-8 items-center justify-center">
                            <Ionicons name={option.icon} size={18} color={colors.accent} />
                          </View>
                          <Text className="ml-2.5 flex-1 text-base" style={{ color: colors.text }}>
                            {option.label}
                          </Text>
                          {selected ? <Ionicons name="checkmark" size={19} color="#1C60C3" /> : null}
                        </Pressable>
                        {index < reminderOptions.length - 1 ? (
                          <View className="h-px" style={{ backgroundColor: colors.separator }} />
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </View>

                <View className="mt-6">
                  <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                    {t('settings.reminderTime')}
                  </Text>
                  <View className="mt-2 h-px" style={{ backgroundColor: colors.separator }} />
                </View>

                <View className="mt-2">
                  {reminderTimeOptions.map((option, index) => {
                    const selected = defaultReminderTime === option.value;
                    return (
                      <React.Fragment key={option.value}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            setDefaultReminderTimeState(option.value);
                            void setDefaultReminderTime(option.value);
                          }}
                          className="flex-row items-center py-1.5">
                          <View
                            className="h-8 w-8 items-center justify-center">
                            <Ionicons name="time-outline" size={18} color={colors.accent} />
                          </View>
                          <Text className="ml-2.5 flex-1 text-base" style={{ color: colors.text }}>
                            {option.label}
                          </Text>
                          {selected ? <Ionicons name="checkmark" size={19} color="#1C60C3" /> : null}
                        </Pressable>
                        {index < reminderTimeOptions.length - 1 ? (
                          <View className="h-px" style={{ backgroundColor: colors.separator }} />
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </View>

                <Text className="mt-4 text-center text-app-meta-lg leading-5" style={{ color: colors.secondaryText }}>
                  {t('settings.reminderTimeHelp')}
                </Text>
              </>
            ) : null}
          </>
        ) : null}

        {settingsScreen === 'about' ? (
          <>
            <View className="mt-2 items-center">
              <View className="items-center justify-center" style={{ width: 104, height: 104 }}>
                <Image source={APP_ICON} style={{ width: 74, height: 74 }} resizeMode="contain" />
              </View>
              <Text className="mt-4 text-app-section font-semibold" style={{ color: colors.text }}>
                eTefter
              </Text>
              <Text
                className="mt-1 max-w-[230px] text-center text-app-meta-lg leading-5"
                style={{ color: colors.secondaryText }}>
                {t('settings.aboutBody')}
              </Text>
            </View>

            <View className="mt-7">
              <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                {t('settings.aboutSection')}
              </Text>
              <View className="mt-2 h-px" style={{ backgroundColor: colors.separator }} />
            </View>

            <View className="mt-2">
              <View className="flex-row items-center py-2">
                <Text className="flex-1 text-base" style={{ color: colors.text }}>
                  {t('settings.versionLabel')}
                </Text>
                <Text className="text-base" style={{ color: colors.secondaryText }}>
                  {appVersion}
                </Text>
              </View>
              <View className="h-px" style={{ backgroundColor: colors.separator }} />
              <View className="flex-row items-center py-2">
                <Text className="flex-1 text-base" style={{ color: colors.text }}>
                  {t('settings.support')}
                </Text>
                <Text className="text-base" style={{ color: colors.secondaryText }}>
                  {SUPPORT_EMAIL}
                </Text>
              </View>
              <View className="h-px" style={{ backgroundColor: colors.separator }} />
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  void Linking.openURL('https://etefter.app');
                }}
                className="flex-row items-center py-2">
                <Text className="flex-1 text-base" style={{ color: colors.text }}>
                  {t('settings.websiteLabel')}
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-base" style={{ color: colors.secondaryText }}>
                    etefter.app
                  </Text>
                  <Ionicons name="open-outline" size={15} color={colors.secondaryText} style={{ marginLeft: 6 }} />
                </View>
              </Pressable>
            </View>
          </>
        ) : null}

        {settingsScreen === 'account' ? (
          <>
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="flex-1 pr-5 text-app-row leading-5" style={{ color: colors.secondaryText }}>
                {t('settings.accountHelp')}
              </Text>
              <View className="h-16 w-16 items-center justify-center rounded-[22px]" style={{ backgroundColor: colors.iconSurface }}>
                <Ionicons name="person-circle-outline" size={38} color={colors.accent} />
              </View>
            </View>

            <View className="mt-6">
              <Text className="text-app-row font-semibold" style={{ color: colors.secondaryText }}>
                {t('settings.accountSection')}
              </Text>
              <View className="mt-2 h-px" style={{ backgroundColor: colors.separator }} />
            </View>

            <View className="mt-2">
              <Pressable
                onPress={() => {
                  void supabase.auth.signOut();
                }}
                className="flex-row items-center py-2">
                <Ionicons name="log-out-outline" size={18} color={colors.accent} />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-medium" style={{ color: colors.text }}>
                    {t('settings.signOut')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
              </Pressable>

              <View className="h-px" style={{ backgroundColor: colors.separator }} />

              <Pressable
                onPress={onDeleteAccount}
                disabled={deletingAccount}
                className="flex-row items-center py-2 disabled:opacity-70">
                {deletingAccount ? (
                  <ActivityIndicator color={isDark ? '#D98780' : '#A9433C'} />
                ) : (
                  <Ionicons name="trash-outline" size={18} color={isDark ? '#D98780' : '#A9433C'} />
                )}
                <View className="ml-3 flex-1">
                  <Text className="text-base font-medium text-[#A9433C] dark:text-[#D98780]">
                    {t('settings.deleteAccount')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={isDark ? '#B66B65' : '#A9433C'} />
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
      </Animated.View>
        </Animated.ScrollView>
      </View>

    </View>
  );
}
