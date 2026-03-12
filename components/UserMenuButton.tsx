import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export function UserMenuButton() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { session } = useAuth();
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);

  const user = session?.user ?? null;
  const email = user?.email ?? t('userMenu.unknownUser');
  const displayName = useMemo(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const maybeName = typeof meta?.full_name === 'string' ? meta.full_name : typeof meta?.name === 'string' ? meta.name : '';
    const trimmed = maybeName.trim();
    return trimmed || email;
  }, [email, user?.user_metadata]);

  const onLogout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('userMenu.buttonLabel')}
        onPress={() => setOpen(true)}
        className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
        <Ionicons name="person-circle-outline" size={26} color={colors.text} />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />

          <View style={{ position: 'absolute', right: 16, top: insets.top + 12 }}>
            <View className="w-72 overflow-hidden rounded-3xl border border-black/10 bg-white/95 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/95">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-medium text-black/60 dark:text-white/70">
                    {t('userMenu.account')}
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-black dark:text-white" numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text className="mt-1 text-sm text-black/60 dark:text-white/70" numberOfLines={1}>
                    {email}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('userMenu.closeMenu')}
                  onPress={() => setOpen(false)}
                  className="h-8 w-8 items-center justify-center rounded-3xl">
                  <Ionicons name="close" size={18} color={colors.secondaryText} />
                </Pressable>
              </View>

              <View className="my-4 h-px bg-black/10 dark:bg-white/15" />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('userMenu.signOut')}
                onPress={onLogout}
                className="items-center justify-center rounded-3xl border border-black/10 bg-white/70 py-3 dark:border-white/10 dark:bg-black/20">
                <Text className="text-base font-semibold text-[#FF3B30]">{t('userMenu.signOut')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
