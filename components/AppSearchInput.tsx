import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import React, { forwardRef } from 'react';
import { Platform, Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';

type AppSearchInputProps = TextInputProps & {
  className?: string;
};

export const AppSearchInput = forwardRef<TextInput, AppSearchInputProps>(function AppSearchInput(
  { className, placeholderTextColor, style, editable, value, onChangeText, ...props },
  ref
) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const computedPlaceholderTextColor = usePlaceholderTextColor(!editable);
  const hasValue = typeof value === 'string' && value.length > 0;

  return (
    <View
      className={[
        'overflow-hidden rounded-[22px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        borderWidth: 1,
        borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(60,60,67,0.12)',
        backgroundColor: colorScheme === 'dark' ? 'rgba(18,18,22,0.24)' : 'rgba(255,255,255,0.34)',
        shadowColor: '#000',
        shadowOpacity: colorScheme === 'dark' ? 0.12 : 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 78 : 42}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        {...(Platform.OS === 'android' ? { experimentalBlurMethod: 'dimezisBlurView' as const } : {})}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <View className="flex-row items-center px-3">
        <Ionicons name="search" size={18} color={colors.secondaryText} />
        <TextInput
          ref={ref}
          {...props}
          value={value}
          onChangeText={onChangeText}
          editable={editable ?? true}
          placeholderTextColor={placeholderTextColor ?? computedPlaceholderTextColor}
          className="ml-2 flex-1 text-app-body text-black dark:text-white"
          style={[{ paddingVertical: 11 }, style]}
        />
        {hasValue ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.clearSearch')}
            onPress={() => onChangeText?.('')}
            className="ml-2 h-6 w-6 items-center justify-center rounded-full"
            style={{
              backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(60,60,67,0.18)',
              borderWidth: 1,
              borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.46)',
            }}>
            <Ionicons
              name="close"
              size={13}
              color={colorScheme === 'dark' ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.96)'}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});
