import Constants from 'expo-constants';
import { Platform } from 'react-native';
import i18n from '@/lib/i18n';

import { supabase } from '@/lib/supabase';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

let googleConfigured = false;
let googleSigninModule: GoogleSigninModule | null = null;

async function loadGoogleSigninModule() {
  try {
    googleSigninModule ??= await import('@react-native-google-signin/google-signin');
    return { ok: true as const, module: googleSigninModule };
  } catch (error: unknown) {
    console.warn('[oauth] Google Sign-In native module is unavailable:', error);
    return { ok: false as const, error: i18n.t('authCallback.googleNativeModuleMissing') };
  }
}

function ensureGoogleConfigured(googleSignin: GoogleSigninModule) {
  if (googleConfigured) return { ok: true as const };

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  if (!webClientId) {
    return {
      ok: false as const,
      error: i18n.t('authCallback.googleMissingWebClientId'),
    };
  }

  googleSignin.GoogleSignin.configure({
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

  const googleSigninResult = await loadGoogleSigninModule();
  if (!googleSigninResult.ok) {
    return googleSigninResult;
  }

  const googleSignin = googleSigninResult.module;
  const configResult = ensureGoogleConfigured(googleSignin);
  if (!configResult.ok) {
    return configResult;
  }

  try {
    await googleSignin.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const googleResponse = await googleSignin.GoogleSignin.signIn();

    if (!googleSignin.isSuccessResponse(googleResponse)) {
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

    if (googleSignin.isErrorWithCode(error)) {
      if (error.code === googleSignin.statusCodes.SIGN_IN_CANCELLED) {
        return { ok: false as const, error: i18n.t('authCallback.cancelledOrNotReturned') };
      }
      if (error.code === googleSignin.statusCodes.IN_PROGRESS) {
        return { ok: false as const, error: i18n.t('authCallback.googleInProgress') };
      }
      if (error.code === googleSignin.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
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
