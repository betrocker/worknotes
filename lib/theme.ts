import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppThemePreference = 'light' | 'dark';

const THEME_STORAGE_KEY = 'tefter:theme';

export async function getStoredThemePreference(): Promise<AppThemePreference | null> {
  const value = await AsyncStorage.getItem(THEME_STORAGE_KEY);
  if (value === 'light' || value === 'dark') return value;
  return null;
}

export async function setStoredThemePreference(theme: AppThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
}
