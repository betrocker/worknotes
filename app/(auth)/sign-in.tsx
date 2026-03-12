import React, { useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { LargeHeader } from '@/components/LargeHeader';
import { useColorScheme } from '@/components/useColorScheme';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { supabase } from '@/lib/supabase';
import { startGoogleOAuth } from '@/lib/oauth';

export default function SignInScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const placeholderTextColor = usePlaceholderTextColor(submitting);
  const placeholderTextColorEnabled = usePlaceholderTextColor();

  const signInWithGoogle = async () => {
    setSubmitting(true);
    setError(null);
    const result = await startGoogleOAuth();
    setSubmitting(false);
    if (!result.ok && result.error) {
      setError(result.error);
    } else if (!result.ok && !result.error) {
      // Cancel/close is not an error.
      setError(null);
    }
  };

  const signIn = async () => {
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (signInError) setError(signInError.message);
  };

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
      <LargeHeader title={t('auth.signIn.title')} subtitle={t('auth.signIn.subtitle')} />
      <View className="px-6">
        <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
          <Pressable
            disabled={submitting}
            onPress={signInWithGoogle}
            className="flex-row items-center justify-center rounded-3xl border border-black/10 bg-white py-3 disabled:opacity-60 dark:border-white/10 dark:bg-[#2C2C2E]">
            <Ionicons
              name="logo-google"
              size={18}
              color={submitting ? '#8E8E93' : colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
            />
            <Text className="ml-2 text-base font-semibold text-black dark:text-white">
              {t('auth.signIn.google')}
            </Text>
          </Pressable>

          <View className="my-4 flex-row items-center">
            <View className="h-px flex-1 bg-black/10 dark:bg-white/15" />
            <Text className="mx-3 text-xs text-black/50 dark:text-white/50">{t('common.or')}</Text>
            <View className="h-px flex-1 bg-black/10 dark:bg-white/15" />
          </View>

          <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('common.email')}</Text>
          <AppTextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t('auth.placeholders.email')}
            placeholderMuted={submitting}
            placeholderTextColor={placeholderTextColor}
            className="mt-2"
          />

          <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">{t('common.password')}</Text>
          <AppTextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t('auth.placeholders.passwordMasked')}
            placeholderTextColor={placeholderTextColorEnabled}
            className="mt-2"
          />

          {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

          <Pressable
            disabled={submitting}
            onPress={signIn}
            className="mt-5 items-center justify-center rounded-3xl bg-[#007AFF] py-3 disabled:opacity-60 dark:bg-[#0A84FF]">
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">{t('auth.signIn.submit')}</Text>
            )}
          </Pressable>

          <View className="mt-4 flex-row items-center justify-between">
            <Link href="/(auth)/reset-password" asChild>
              <Pressable className="py-2">
                <Text className="text-sm text-[#007AFF] dark:text-[#0A84FF]">
                  {t('auth.signIn.forgot')}
                </Text>
              </Pressable>
            </Link>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable className="py-2">
                <Text className="text-sm text-[#007AFF] dark:text-[#0A84FF]">{t('auth.signIn.createAccount')}</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </View>
  );
}
