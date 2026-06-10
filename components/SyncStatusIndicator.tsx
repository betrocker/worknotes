import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useOfflineSync } from '@/providers/OfflineSyncProvider';

export function SyncStatusIndicator() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { isOnline, isSyncing, pendingOperations, lastError } = useOfflineSync();

  if (!isSyncing && pendingOperations === 0 && !lastError) {
    return null;
  }

  const status = lastError
    ? {
        color: '#E5484D',
        text: t('sync.failed'),
      }
    : isSyncing
      ? {
          color: colors.tint,
          text: t('sync.syncing'),
        }
      : !isOnline && pendingOperations > 0
        ? {
            color: '#F5A524',
            text: t('sync.waiting'),
          }
        : {
            color: '#F5A524',
            text: t('sync.pending'),
          };

  return (
    <View style={{ marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          backgroundColor: status.color,
        }}
      />
      <Text style={{ color: colors.secondaryText, fontSize: 13, lineHeight: 17 }} numberOfLines={1}>
        {status.text}
      </Text>
    </View>
  );
}
