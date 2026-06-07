import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';

import { clearSupabaseAuthStorage, isInvalidRefreshTokenError, supabase } from '@/lib/supabase';

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

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!cancelled) router.replace('/(tabs)' as any);
          return;
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          if (!cancelled) router.replace('/(tabs)' as any);
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
            const { error } = await supabase.auth.exchangeCodeForSession(queryCode);
            if (error) throw error;
            if (!cancelled) router.replace('/(tabs)' as any);
            return;
          }

          if (queryAccessToken && queryRefreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: queryAccessToken,
              refresh_token: queryRefreshToken,
            });
            if (error) throw error;
            if (!cancelled) router.replace('/(tabs)' as any);
            return;
          }
        }

        if (!cancelled) {
          router.replace('/(auth)/sign-in');
        }
      } catch (error: unknown) {
        if (isInvalidRefreshTokenError(error)) {
          await clearSupabaseAuthStorage();
        } else {
          console.warn('[auth] Failed to resolve auth callback:', error);
        }

        if (!cancelled) {
          router.replace('/(auth)/sign-in');
        }
      }
    };

    void resolveCallback();

    return () => {
      cancelled = true;
    };
  }, [params.access_token, params.code, params.refresh_token, router]);

  return (
    <View className="flex-1 items-center justify-center bg-[#F2F2F7] dark:bg-[#1D2229]">
      <ActivityIndicator />
      <Text className="mt-3 text-app-meta text-black/60 dark:text-white/70">{t('authCallback.connecting')}</Text>
    </View>
  );
}
