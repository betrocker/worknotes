import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import i18n from '@/lib/i18n';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

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

export async function startGoogleOAuth() {
  // In Expo Go this becomes an exp://.../--/auth/callback URL.
  // In a standalone/dev build it becomes your scheme (e.g. expotailwindrouter://auth/callback).
  const redirectTo = Linking.createURL('auth/callback');
  console.log('[oauth] redirectTo:', redirectTo);

  const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
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

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    return { ok: false as const, error: null as string | null, redirectTo };
  }

  // Supabase may return:
  // - PKCE code in query: ?code=...
  // - Tokens in hash: #access_token=...&refresh_token=...
  const search = parseSearchParams(result.url);
  const code = search.get('code');
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return { ok: false as const, error: exchangeError.message, redirectTo };
    return { ok: true as const, redirectTo };
  }

  const hash = parseHashParams(result.url);
  const access_token = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  if (access_token && refresh_token) {
    const { error: setError } = await supabase.auth.setSession({ access_token, refresh_token });
    if (setError) return { ok: false as const, error: setError.message, redirectTo };
    return { ok: true as const, redirectTo };
  }

  return { ok: false as const, error: i18n.t('authCallback.missingToken'), redirectTo };
}
