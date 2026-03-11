import { useColorScheme as useNativewindColorScheme } from 'nativewind';

export function useColorScheme() {
  return useNativewindColorScheme().colorScheme;
}

export function useSetColorScheme() {
  return useNativewindColorScheme().setColorScheme;
}

export function useToggleColorScheme() {
  return useNativewindColorScheme().toggleColorScheme;
}
