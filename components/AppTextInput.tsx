import React, { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';

type AppTextInputProps = TextInputProps & {
  className?: string;
  /**
   * When true, placeholder color uses a more muted tone.
   * Useful to keep parity with disabled/submit-loading states.
   */
  placeholderMuted?: boolean;
};

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(function AppTextInput(
  { className, placeholderTextColor, editable, placeholderMuted, style, ...props },
  ref
) {
  const effectiveEditable = editable ?? true;
  const computedPlaceholderTextColor = usePlaceholderTextColor(placeholderMuted || !effectiveEditable);

  return (
    <TextInput
      ref={ref}
      {...props}
      editable={effectiveEditable}
      placeholderTextColor={placeholderTextColor ?? computedPlaceholderTextColor}
      style={[{ fontSize: 16, lineHeight: 22, paddingVertical: 13 }, style]}
      className={[
        'rounded-3xl bg-black/5 px-4 text-base text-black dark:bg-white/10 dark:text-white',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
});
