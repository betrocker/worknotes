import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import i18n from '@/lib/i18n';

import { supabase } from '@/lib/supabase';

let googleConfigured = false;

function ensureGoogleConfigured() {
  if (googleConfigured) return { ok: true as const };

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  if (!webClientId) {
    return {
      ok: false as const,
      error: i18n.t('authCallback.googleMissingWebClientId'),
    };
  }

  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
    offlineAccess: false,
  });

  googleConfigured = true;
  return { ok: true as const };
}

export async function startGoogleOAuth() {
  const isExpoGo =
    Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

  if (isExpoGo) {
    return { ok: false as const, error: i18n.t('authCallback.expoGoNotSupported') };
  }

  if (Platform.OS === 'web') {
    return { ok: false as const, error: i18n.t('authCallback.webNotSupported') };
  }

  const configResult = ensureGoogleConfigured();
  if (!configResult.ok) {
    return configResult;
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const googleResponse = await GoogleSignin.signIn();

    if (!isSuccessResponse(googleResponse)) {
      return { ok: false as const, error: i18n.t('authCallback.cancelledOrNotReturned') };
    }

    const idToken = googleResponse.data.idToken;
    if (!idToken) {
      console.warn(
        '[oauth] Google sign-in returned no idToken. Make sure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is the "Web application" OAuth Client ID (not the Android one) and that an Android OAuth Client ID with the correct SHA-1 + package name exists in Google Cloud Console.'
      );
      return { ok: false as const, error: i18n.t('authCallback.missingToken') };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      console.warn('[oauth] supabase.auth.signInWithIdToken failed:', error.message, error);
      return { ok: false as const, error: `Supabase: ${error.message}` };
    }

    return { ok: true as const };
  } catch (error: unknown) {
    console.warn('[oauth] Google sign-in threw:', error);

    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { ok: false as const, error: i18n.t('authCallback.cancelledOrNotReturned') };
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        return { ok: false as const, error: i18n.t('authCallback.googleInProgress') };
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          ok: false as const,
          error: i18n.t('authCallback.googlePlayServicesUnavailable'),
        };
      }
      const codeLabel = error.code ? `[${error.code}] ` : '';
      const message = error.message || i18n.t('authCallback.unexpectedResult', { type: 'native_google_signin' });
      return { ok: false as const, error: `${codeLabel}${message}` };
    }

    if (error instanceof Error && error.message) {
      return { ok: false as const, error: error.message };
    }

    return {
      ok: false as const,
      error: i18n.t('authCallback.unexpectedResult', { type: 'native_google_signin' }),
    };
  }
}
