import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { supabase } from '@/lib/supabase';

// This screen is only a safety net for deep-link redirects.
// The primary flow exchanges the code from WebBrowser.openAuthSessionAsync result URL.
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const code = typeof params.code === 'string' ? params.code : undefined;
    if (!code) return;

    supabase.auth.exchangeCodeForSession(code).finally(() => {
      router.replace('/(tabs)');
    });
  }, [params.code, router]);

  return (
    <View className="flex-1 items-center justify-center bg-[#F2F2F7] dark:bg-black">
      <ActivityIndicator />
      <Text className="mt-3 text-sm text-black/60 dark:text-white/70">{t('authCallback.connecting')}</Text>
    </View>
  );
}
