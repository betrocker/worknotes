import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

type MascotEmptyStateProps = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'think' | 'thumbs';
  compact?: boolean;
  imageSize?: number;
  centeredAction?: boolean;
};

export function MascotEmptyState({
  title,
  body,
  actionLabel,
  onAction,
  variant = 'think',
  compact = false,
  imageSize,
  centeredAction = false,
}: MascotEmptyStateProps) {
  const imageSource =
    variant === 'thumbs'
      ? require('../assets/images/maskotathumbup.png')
      : require('../assets/images/maskotathink.png');

  return (
    <View className="overflow-hidden rounded-[28px] border border-black/10 bg-white/85 px-5 py-5 dark:border-white/10 dark:bg-[#1C1C1E]/85">
      <View className={compact ? 'items-center' : 'flex-row items-center'}>
        <Image
          source={imageSource}
          resizeMode="contain"
          style={{
            width: imageSize ?? (compact ? 96 : 104),
            height: imageSize ?? (compact ? 96 : 104),
            marginRight: compact ? 0 : 14,
            marginBottom: compact ? 10 : 0,
          }}
        />

        <View className={compact ? 'items-center' : 'flex-1'}>
          <Text
            className={[
              'font-extrabold text-[#1C2745] dark:text-white',
              compact ? 'text-center text-[18px]' : 'text-[19px]',
            ].join(' ')}>
            {title}
          </Text>
          {body ? (
            <Text
              className={[
                'mt-2 text-[#66718F] dark:text-white/70',
                compact ? 'text-center text-[14px]' : 'text-[15px]',
              ].join(' ')}>
              {body}
            </Text>
          ) : null}

          {actionLabel && onAction && !centeredAction ? (
            <Pressable
              onPress={onAction}
              className={[
                'items-center justify-center rounded-3xl bg-[#007AFF] px-5 py-3 dark:bg-[#0A84FF]',
                compact ? 'mt-4 self-stretch' : 'mt-4 self-start',
              ].join(' ')}>
              <Text className="text-base font-semibold text-white">{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {actionLabel && onAction && centeredAction ? (
        <Pressable
          onPress={onAction}
          className="mt-4 self-center rounded-3xl bg-[#007AFF] px-5 py-3 dark:bg-[#0A84FF]">
          <Text className="text-base font-semibold text-white">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
