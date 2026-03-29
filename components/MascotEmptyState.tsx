import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

type MascotEmptyStateProps = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'think' | 'thumbs';
  compact?: boolean;
  stacked?: boolean;
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
  stacked = false,
  imageSize,
  centeredAction = false,
}: MascotEmptyStateProps) {
  const imageSource =
    variant === 'thumbs'
      ? require('../assets/images/maskotathumbup.png')
      : require('../assets/images/maskotathink.png');

  return (
    <View className={compact ? 'px-2 py-2' : 'px-2 py-3'}>
      <View className={compact || stacked ? 'items-center' : 'flex-row items-center'}>
        <Image
          source={imageSource}
          resizeMode="contain"
          style={{
            width: imageSize ?? (compact ? 96 : 104),
            height: imageSize ?? (compact ? 96 : 104),
            marginRight: compact || stacked ? 0 : 14,
            marginBottom: compact || stacked ? 10 : 0,
          }}
        />

        <View className={compact || stacked ? 'items-center' : 'flex-1'}>
          <Text
            className={[
              'font-extrabold text-app-section text-[#1C2745] dark:text-white',
              compact || stacked ? 'text-center' : '',
            ].join(' ')}>
            {title}
          </Text>
          {body ? (
            <Text
              className={[
                'mt-2 text-app-meta-lg text-[#66718F] dark:text-white/70',
                compact || stacked ? 'text-center' : '',
              ].join(' ')}>
              {body}
            </Text>
          ) : null}

          {actionLabel && onAction && !centeredAction ? (
            <Pressable
              onPress={onAction}
              className={[
                'items-center justify-center rounded-3xl bg-[#007AFF] px-5 py-3 dark:bg-[#0A84FF]',
                compact || stacked ? 'mt-4 self-stretch' : 'mt-4 self-start',
              ].join(' ')}>
              <Text className="text-app-body font-semibold text-white">{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {actionLabel && onAction && centeredAction ? (
        <Pressable
          onPress={onAction}
          className="mt-4 self-center rounded-3xl bg-[#007AFF] px-5 py-3 dark:bg-[#0A84FF]">
          <Text className="text-app-body font-semibold text-white">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
