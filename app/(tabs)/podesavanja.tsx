import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppTextInput } from '@/components/AppTextInput';
import Colors from '@/constants/Colors';
import { useColorScheme, useSetColorScheme } from '@/components/useColorScheme';
import { LargeHeader } from '@/components/LargeHeader';
import { setStoredLanguage } from '@/lib/language';
import {
  getDefaultJobReminderPreference,
  getNotificationsEnabled,
  setDefaultJobReminderPreference,
  setNotificationsEnabled,
  type JobReminderOption,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { getUserDisplayName } from '@/lib/user';
import { useAuth } from '@/providers/AuthProvider';

const DEFAULT_AVATAR = require('../../assets/avatars/avatar.png');
const AVATAR_OPTIONS = [
  { key: 'default', source: DEFAULT_AVATAR, labelKey: 'settings.avatarLabels.default' },
  { key: 'avatar1', source: require('../../assets/avatars/avatar1.png'), labelKey: 'settings.avatarLabels.electrician' },
  { key: 'avatar2', source: require('../../assets/avatars/avatar2.png'), labelKey: 'settings.avatarLabels.plumber' },
  { key: 'avatar3', source: require('../../assets/avatars/avatar3.png'), labelKey: 'settings.avatarLabels.builder' },
  { key: 'avatar4', source: require('../../assets/avatars/avatar4.png'), labelKey: 'settings.avatarLabels.hvac' },
  { key: 'avatar5', source: require('../../assets/avatars/avatar5.png'), labelKey: 'settings.avatarLabels.service' },
] as const;
type AvatarKey = (typeof AVATAR_OPTIONS)[number]['key'];

function AvatarPreview({
  avatarKey,
  size,
}: {
  avatarKey: string | null;
  size: number;
}) {
  const avatar = AVATAR_OPTIONS.find((item) => item.key === avatarKey);
  return (
    <Image
      source={avatar?.source ?? DEFAULT_AVATAR}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.32) }}
      resizeMode="cover"
    />
  );
}

export default function PodesavanjaScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const setColorScheme = useSetColorScheme();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colors = Colors[colorScheme];

  const isDark = colorScheme === 'dark';
  const isEnglish = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('en');
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean | null>(null);
  const [defaultReminder, setDefaultReminder] = useState<JobReminderOption>('same_day');
  const [username, setUsername] = useState('');
  const [usernameDraft, setUsernameDraft] = useState('');
  const [avatarKey, setAvatarKey] = useState<AvatarKey>('default');
  const [avatarKeyDraft, setAvatarKeyDraft] = useState<AvatarKey>('default');
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);
  const [usernameSubmitting, setUsernameSubmitting] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
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

  const reminderOptions = useMemo(
    () => [
      { value: 'none' as const, label: t('jobs.reminders.none') },
      { value: 'same_day' as const, label: t('jobs.reminders.sameDay') },
      { value: 'day_before' as const, label: t('jobs.reminders.dayBefore') },
    ],
    [t]
  );

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
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const storedAvatarKey =
      typeof meta?.avatar_key === 'string' &&
      AVATAR_OPTIONS.some((item) => item.key === meta.avatar_key)
        ? (meta.avatar_key as AvatarKey)
        : 'default';
    setAvatarKey(storedAvatarKey);
    setAvatarKeyDraft(storedAvatarKey);
  }, [user?.user_metadata]);

  const openUsernameModal = () => {
    setUsernameDraft(username);
    setAvatarKeyDraft(avatarKey);
    setUsernameError(null);
    setUsernameMessage(null);
    setUsernameModalOpen(true);
  };

  const closeUsernameModal = () => {
    if (usernameSubmitting) return;
    setUsernameModalOpen(false);
    setUsernameError(null);
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
        avatar_key: avatarKeyDraft,
      },
    });
    setUsernameSubmitting(false);

    if (error) {
      setUsernameError(error.message);
      return;
    }

    setUsername(trimmed);
    setAvatarKey(avatarKeyDraft);
    setUsernameMessage(t('settings.usernameSaved'));
    setUsernameModalOpen(false);
  };

  return (
    <ScrollView
      stickyHeaderIndices={[0]}
      className="flex-1 bg-[#F2F2F7] dark:bg-black"
      contentContainerClassName="pb-32">
      <LargeHeader
        title={t('tabs.profile')}
      />

      <View className="px-6 pt-3">
        <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-5 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <View className="flex-row items-center">
            <AvatarPreview avatarKey={avatarKey} size={64} />

            <View className="ml-4 flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="mr-3 flex-1 text-[18px] font-extrabold text-[#1C2745] dark:text-white" numberOfLines={1}>
                  {displayName}
                </Text>
                <Pressable
                  onPress={openUsernameModal}
                  className="rounded-2xl bg-[#E8F0FF] px-3 py-2 dark:bg-[#243047]">
                  <Text className="text-sm font-semibold text-[#2F68ED] dark:text-[#8FB2FF]">
                    {t('settings.editProfile')}
                  </Text>
                </Pressable>
              </View>
              <Text className="mt-1 text-sm text-black/60 dark:text-white/70" numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>

          {usernameMessage ? (
            <View className="mt-5 rounded-[20px] bg-black/5 px-4 py-3 dark:bg-white/5">
              <Text className="text-sm text-[#2F8C57] dark:text-[#7AD69C]">{usernameMessage}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => {
              void supabase.auth.signOut();
            }}
            className="mt-5 flex-row items-center justify-center rounded-3xl border border-[#F1C7C4] bg-[#FFF3F2] py-3 dark:border-[#5A2B2A] dark:bg-[#2A1A1A]">
            <Ionicons name="log-out-outline" size={18} color="#FF3B30" />
            <Text className="ml-2 text-base font-semibold text-[#FF3B30]">{t('settings.signOut')}</Text>
          </Pressable>
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-[#EEF3FF] dark:bg-[#243047]">
                  <Ionicons name="moon-outline" size={18} color={colors.tint} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[18px] font-extrabold text-[#1C2745] dark:text-white">
                    {t('settings.darkTheme')}
                  </Text>
                  <Text className="mt-1 text-sm text-black/60 dark:text-white/70">
                    {t('settings.darkThemeHelp')}
                  </Text>
                </View>
              </View>
            </View>
            <Switch value={isDark} onValueChange={(next) => setColorScheme(next ? 'dark' : 'light')} />
          </View>
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-[#EEF8F1] dark:bg-[#203126]">
                  <Ionicons name="notifications-outline" size={18} color={isDark ? '#7AD69C' : '#2F8C57'} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[18px] font-extrabold text-[#1C2745] dark:text-white">
                    {t('settings.notifications')}
                  </Text>
                  <Text className="mt-1 text-sm text-black/60 dark:text-white/70">
                    {t('settings.notificationsHelp')}
                  </Text>
                </View>
              </View>
            </View>
            <Switch
              value={notificationsEnabled ?? false}
              disabled={notificationsEnabled == null}
              onValueChange={(next) => {
                setNotificationsEnabledState(next);
                void setNotificationsEnabled(next);
              }}
            />
          </View>

          <View className="mt-4 rounded-[22px] bg-black/5 p-3 dark:bg-white/5">
            <Text className="text-sm font-medium text-black/60 dark:text-white/70">
              {t('settings.defaultReminder')}
            </Text>
            <Text className="mt-1 text-sm text-black/50 dark:text-white/60">
              {t('settings.defaultReminderHelp')}
            </Text>
            <View className="mt-3 flex-row flex-wrap">
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
                      'mr-2 mt-2 rounded-3xl px-4 py-2',
                      selected ? 'bg-[#2F68ED] dark:bg-[#3A7BFF]' : 'bg-white dark:bg-[#2C2C2E]',
                    ].join(' ')}>
                    <Text
                      className={
                        selected
                          ? 'text-sm font-semibold text-white'
                          : 'text-sm text-black dark:text-white'
                      }>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-[#F2EEFF] dark:bg-[#2D2540]">
                  <Ionicons name="language-outline" size={18} color={isDark ? '#C0A7FF' : '#7359C8'} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[18px] font-extrabold text-[#1C2745] dark:text-white">
                    {t('settings.language')}
                  </Text>
                  <Text className="mt-1 text-sm text-black/60 dark:text-white/70">
                    {t('settings.languageHelp')}{' '}
                    <Text className="font-medium">
                      {isEnglish ? t('settings.english') : t('settings.serbian')}
                    </Text>
                    .
                  </Text>
                </View>
              </View>
            </View>
            <Switch
              value={isEnglish}
              onValueChange={(nextIsEnglish) => {
                const next = nextIsEnglish ? 'en' : 'sr';
                void i18n.changeLanguage(next);
                void setStoredLanguage(next);
              }}
            />
          </View>
        </View>

        <View className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-[#FFF4E8] dark:bg-[#3A2D1E]">
              <Ionicons name="information-circle-outline" size={18} color={isDark ? '#FFB067' : '#C7771B'} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[18px] font-extrabold text-[#1C2745] dark:text-white">
                {t('settings.appVersion')}
              </Text>
              <Text className="mt-1 text-sm text-black/60 dark:text-white/70">
                {`Tefter ${appVersion}`}
              </Text>
            </View>
          </View>

          <View className="mt-4 rounded-[20px] bg-black/5 px-4 py-3 dark:bg-white/5">
            <Text className="text-sm font-semibold text-[#1C2745] dark:text-white">{t('settings.support')}</Text>
            <Text className="mt-1 text-sm text-black/60 dark:text-white/70">
              {t('settings.supportHelp')}
            </Text>
          </View>
        </View>
      </View>

      <Modal transparent visible={usernameModalOpen} animationType="fade" onRequestClose={closeUsernameModal}>
        <View className="flex-1 items-center justify-center bg-black/35 px-6">
          <Pressable onPress={closeUsernameModal} className="absolute inset-0" />
          <View className="w-full max-w-[360px] overflow-hidden rounded-3xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#1C1C1E]">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-black dark:text-white">
                {t('settings.editProfile')}
              </Text>
              <Pressable
                onPress={closeUsernameModal}
                className="h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            <Text className="mt-2 text-sm text-black/60 dark:text-white/70">
              {t('settings.usernameHelp')}
            </Text>

            <View className="mt-4 rounded-[24px] bg-black/5 p-4 dark:bg-white/5">
              <View className="flex-row items-center">
                <AvatarPreview
                  avatarKey={avatarKeyDraft}
                  size={64}
                />
                <View className="ml-4 flex-1">
                  <Text className="text-base font-semibold text-[#1C2745] dark:text-white">
                    {usernameDraft.trim() || displayName}
                  </Text>
                  <Text className="mt-1 text-sm text-black/60 dark:text-white/70" numberOfLines={1}>
                    {email}
                  </Text>
                </View>
              </View>

              <Text className="mt-4 text-sm font-semibold text-[#1C2745] dark:text-white">
                {t('settings.avatar')}
              </Text>
              <View className="mt-3 flex-row flex-wrap justify-between">
                {AVATAR_OPTIONS.map((avatar) => {
                  const selected = avatarKeyDraft === avatar.key;
                  return (
                    <Pressable
                      key={avatar.key}
                      onPress={() => setAvatarKeyDraft(avatar.key)}
                      className="mt-2 items-center rounded-[22px] px-2 pb-3 pt-2"
                      style={{
                        width: '31%',
                        borderWidth: selected ? 3 : 1,
                        borderColor: selected
                          ? isDark
                            ? '#8FB2FF'
                            : '#2F68ED'
                          : isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(28,39,69,0.08)',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
                      }}>
                      <Image
                        source={avatar.source}
                        style={{ width: 84, height: 84, borderRadius: 16 }}
                        resizeMode="cover"
                      />
                      <Text
                        className="mt-2 text-center text-xs font-semibold"
                        style={{ color: isDark ? 'rgba(255,255,255,0.86)' : '#1C2745' }}>
                        {t(avatar.labelKey)}
                      </Text>
                      {selected ? (
                        <View className="absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full bg-[#2F68ED]">
                          <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text className="mt-4 text-sm font-semibold text-[#1C2745] dark:text-white">
              {t('settings.username')}
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

            {usernameError ? <Text className="mt-3 text-sm text-red-600">{usernameError}</Text> : null}

            <Pressable
              onPress={onSaveUsername}
              disabled={usernameSubmitting}
              className="mt-4 flex-row items-center justify-center rounded-3xl bg-[#2F68ED] py-3 disabled:opacity-60 dark:bg-[#0A84FF]">
              {usernameSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  <Text className="ml-2 text-base font-semibold text-white">{t('settings.saveUsername')}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
