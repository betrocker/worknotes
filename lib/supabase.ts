import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

function getSupabaseProjectRef(url: string) {
  try {
    return new URL(url).hostname.split('.')[0] || 'local';
  } catch {
    return 'local';
  }
}

const supabaseProjectRef = getSupabaseProjectRef(supabaseUrl);

export const SUPABASE_AUTH_STORAGE_KEY = `sb-${supabaseProjectRef}-auth-token`;

const SUPABASE_AUTH_STORAGE_KEYS = [
  SUPABASE_AUTH_STORAGE_KEY,
  `${SUPABASE_AUTH_STORAGE_KEY}-code-verifier`,
  `${SUPABASE_AUTH_STORAGE_KEY}-user`,
];

export function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return message.includes('Invalid Refresh Token') || message.includes('Refresh Token Not Found');
}

export async function clearSupabaseAuthStorage() {
  await Promise.all(SUPABASE_AUTH_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key)));
}

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast in development so misconfiguration is obvious.
  console.warn(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type SupabaseDatabase = Database;
export type DbUser = Database['public']['Tables']['users']['Row'];
export type DbClient = Database['public']['Tables']['clients']['Row'];
export type DbJob = Database['public']['Tables']['jobs']['Row'];
