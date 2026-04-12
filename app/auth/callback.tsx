import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

// This screen is only a safety net for deep-link redirects.
// The primary flow exchanges the code from WebBrowser.openAuthSessionAsync result URL.
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; access_token?: string; refresh_token?: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    const resolveCallback = async () => {
      const code = typeof params.code === 'string' ? params.code : undefined;
      const accessToken = typeof params.access_token === 'string' ? params.access_token : undefined;
      const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : undefined;

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled) router.replace('/(tabs)');
        return;
      }

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!cancelled) router.replace('/(tabs)');
        return;
      }

      // Fallback for callbacks where params aren't forwarded via route props.
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const parsed = Linking.parse(initialUrl);
        const queryCode = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
        const queryAccessToken =
          typeof parsed.queryParams?.access_token === 'string' ? parsed.queryParams.access_token : null;
        const queryRefreshToken =
          typeof parsed.queryParams?.refresh_token === 'string' ? parsed.queryParams.refresh_token : null;

        if (queryCode) {
          await supabase.auth.exchangeCodeForSession(queryCode);
          if (!cancelled) router.replace('/(tabs)');
          return;
        }

        if (queryAccessToken && queryRefreshToken) {
          await supabase.auth.setSession({
            access_token: queryAccessToken,
            refresh_token: queryRefreshToken,
          });
          if (!cancelled) router.replace('/(tabs)');
          return;
        }
      }

      if (!cancelled) {
        router.replace('/(auth)/sign-in');
      }
    };

    void resolveCallback();

    return () => {
      cancelled = true;
    };
  }, [params.access_token, params.code, params.refresh_token, router]);

  return (
    <View className="flex-1 items-center justify-center bg-[#F2F2F7] dark:bg-black">
      <ActivityIndicator />
      <Text className="mt-3 text-app-meta text-black/60 dark:text-white/70">{t('authCallback.connecting')}</Text>
    </View>
  );
}
