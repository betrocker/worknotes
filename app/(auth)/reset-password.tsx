import React, { useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LargeHeader } from '@/components/LargeHeader';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const placeholderTextColor = usePlaceholderTextColor(submitting);

  const sendReset = async () => {
    setSubmitting(true);
    setError(null);
    setInfo(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // Configure deep link in Supabase Auth settings later.
      redirectTo: 'expotailwindrouter://reset-password',
    });

    setSubmitting(false);
    if (resetError) setError(resetError.message);
    else setInfo(t('auth.resetPassword.sent'));
  };

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
      <LargeHeader title={t('auth.resetPassword.title')} subtitle={t('auth.resetPassword.subtitle')} />
      <View className="px-6">
        <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
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

          {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}
          {info ? <Text className="mt-3 text-sm text-black/60 dark:text-white/70">{info}</Text> : null}

          <Pressable
            disabled={submitting}
            onPress={sendReset}
            className="mt-5 items-center justify-center rounded-3xl bg-[#007AFF] py-3 disabled:opacity-60 dark:bg-[#0A84FF]">
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">{t('auth.resetPassword.submit')}</Text>
            )}
          </Pressable>

          <Link href="/(auth)/sign-in" asChild>
            <Pressable className="mt-3 py-2">
              <Text className="text-sm text-[#007AFF] dark:text-[#0A84FF]">{t('auth.resetPassword.backToSignIn')}</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}
