import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import i18n from '@/lib/i18n';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();
const CALLBACK_POLL_MS = 1800;
const CALLBACK_POLL_STEP_MS = 150;

function parseHashParams(urlString: string) {
  try {
    const url = new URL(urlString);
    const hash = url.hash?.startsWith('#') ? url.hash.slice(1) : url.hash;
    if (!hash) return new URLSearchParams();
    return new URLSearchParams(hash);
  } catch {
    return new URLSearchParams();
  }
}

function parseSearchParams(urlString: string) {
  try {
    const url = new URL(urlString);
    return url.searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function getParam(urlString: string, key: string): string | null {
  const search = parseSearchParams(urlString);
  const searchValue = search.get(key);
  if (searchValue) return searchValue;

  const hash = parseHashParams(urlString);
  const hashValue = hash.get(key);
  if (hashValue) return hashValue;

  try {
    const parsed = Linking.parse(urlString);
    const fallback = parsed.queryParams?.[key];
    if (typeof fallback === 'string' && fallback.length > 0) return fallback;
  } catch {
    // no-op
  }

  return null;
}

function looksLikeCallback(urlString: string, redirectTo: string) {
  if (urlString.startsWith(redirectTo)) return true;

  try {
    const parsed = Linking.parse(urlString);
    return parsed.path === 'auth/callback';
  } catch {
    return false;
  }
}

async function completeSessionFromUrl(urlString: string, redirectTo: string) {
  if (!looksLikeCallback(urlString, redirectTo)) {
    return { ok: false as const, error: i18n.t('authCallback.invalidRedirect'), redirectTo };
  }

  const code = getParam(urlString, 'code');
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return { ok: false as const, error: exchangeError.message, redirectTo };
    return { ok: true as const, redirectTo };
  }

  const access_token = getParam(urlString, 'access_token');
  const refresh_token = getParam(urlString, 'refresh_token');
  if (access_token && refresh_token) {
    const { error: setError } = await supabase.auth.setSession({ access_token, refresh_token });
    if (setError) return { ok: false as const, error: setError.message, redirectTo };
    return { ok: true as const, redirectTo };
  }

  return { ok: false as const, error: i18n.t('authCallback.missingToken'), redirectTo };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startGoogleOAuth() {
  // In Expo Go this becomes an exp://.../--/auth/callback URL.
  // In a standalone/dev build it becomes your scheme (e.g. expotailwindrouter://auth/callback).
  const redirectTo = Linking.createURL('auth/callback');
  const isExpoGo =
    Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

  if (isExpoGo) {
    return {
      ok: false as const,
      error: i18n.t('authCallback.expoGoNotSupported'),
      redirectTo,
    };
  }

  const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
        access_type: 'offline',
      },
    },
  });

  if (oauthError) {
    return { ok: false as const, error: oauthError.message, redirectTo };
  }

  let callbackOutcome:
    | { ok: true; redirectTo: string }
    | { ok: false; error: string; redirectTo: string }
    | null = null;

  const subscription = Linking.addEventListener('url', (event) => {
    if (callbackOutcome || !looksLikeCallback(event.url, redirectTo)) return;
    void (async () => {
      callbackOutcome = await completeSessionFromUrl(event.url, redirectTo);
    })();
  });

  const result = await WebBrowser.openAuthSessionAsync(oauthData.url, redirectTo);
  subscription.remove();

  if (result.type === 'success' && result.url) {
    return completeSessionFromUrl(result.url, redirectTo);
  }

  // Android devices sometimes report cancel/dismiss even when the deep-link callback was delivered.
  const pollSteps = Math.ceil(CALLBACK_POLL_MS / CALLBACK_POLL_STEP_MS);
  for (let step = 0; step < pollSteps; step += 1) {
    if (callbackOutcome) return callbackOutcome;
    await wait(CALLBACK_POLL_STEP_MS);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    return { ok: true as const, redirectTo };
  }

  return {
    ok: false as const,
    error:
      result.type === 'cancel' || result.type === 'dismiss'
        ? i18n.t('authCallback.cancelledOrNotReturned')
        : i18n.t('authCallback.unexpectedResult', { type: result.type }),
    redirectTo,
  };
}
