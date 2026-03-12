import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import { isAppLanguage, type AppLanguage } from '@/lib/i18n';

const LANGUAGE_STORAGE_KEY = 'settings.language';

export async function getStoredLanguage(): Promise<AppLanguage | null> {
  try {
    const value = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!value) return null;
    return isAppLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

export async function setStoredLanguage(language: AppLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // ignore
  }
}

export function guessInitialLanguage(): AppLanguage {
  try {
    const locales = Localization.getLocales?.() ?? [];
    const first = locales[0];
    const locale = (first?.languageTag ?? first?.languageCode ?? '').toLowerCase();
    if (locale.startsWith('sr')) return 'sr';
  } catch {
    // ignore
  }

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale?.toLowerCase() ?? '';
    if (locale.startsWith('sr')) return 'sr';
  } catch {
    // ignore
  }

  return 'en';
}
