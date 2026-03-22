import { useThemePreference } from '@/providers/ThemePreferenceProvider';

export function useColorScheme() {
  return useThemePreference().colorScheme;
}

export function useSetColorScheme() {
  return useThemePreference().setColorScheme;
}

export function useToggleColorScheme() {
  return useThemePreference().toggleColorScheme;
}
