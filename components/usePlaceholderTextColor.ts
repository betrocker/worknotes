import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export function usePlaceholderTextColor(disabled?: boolean) {
  const colorScheme = useColorScheme() ?? 'light';

  if (disabled) {
    return colorScheme === 'dark' ? 'rgba(235,235,245,0.4)' : 'rgba(60,60,67,0.4)';
  }

  return Colors[colorScheme].secondaryText;
}

