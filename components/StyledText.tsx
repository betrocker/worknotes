import React from 'react';
import { Text, type TextProps } from 'react-native';

type MonoTextProps = TextProps & { className?: string };

export function MonoText({ className, ...props }: MonoTextProps) {
  return <Text {...props} className={['font-mono', className].filter(Boolean).join(' ')} />;
}
