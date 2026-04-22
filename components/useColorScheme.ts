import { useThemePreference } from '@/providers/ThemePreferenceProvider';

export function useColorScheme() {
  return useThemePreference().colorScheme;
}

export function useSetColorScheme() {
  return useThemePreference().setColorScheme;
}

export function useReapplyColorScheme() {
  return useThemePreference().reapplyColorScheme;
}

export function useToggleColorScheme() {
  return useThemePreference().toggleColorScheme;
}
