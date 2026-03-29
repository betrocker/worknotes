import Ionicons from '@expo/vector-icons/Ionicons';
import React, { forwardRef } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
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
        'flex-row items-center rounded-[14px] px-3',
        colorScheme === 'dark' ? 'bg-white/[0.08]' : 'bg-[#ECECF0]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}>
      <Ionicons name="search" size={18} color={colors.secondaryText} />
      <TextInput
        ref={ref}
        {...props}
        value={value}
        onChangeText={onChangeText}
        editable={editable ?? true}
        placeholderTextColor={placeholderTextColor ?? computedPlaceholderTextColor}
        className="ml-2 flex-1 text-app-body text-black dark:text-white"
        style={[{ paddingVertical: 10 }, style]}
      />
      {hasValue ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.clearSearch')}
          onPress={() => onChangeText?.('')}
          className="ml-2 h-5 w-5 items-center justify-center rounded-full"
          style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(60,60,67,0.18)' }}>
          <Ionicons
            name="close"
            size={12}
            color={colorScheme === 'dark' ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.96)'}
          />
        </Pressable>
      ) : null}
    </View>
  );
});
