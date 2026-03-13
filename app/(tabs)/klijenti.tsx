import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Linking, Platform, Pressable, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { LargeHeader } from '@/components/LargeHeader';
import { UserMenuButton } from '@/components/UserMenuButton';
import { useColorScheme } from '@/components/useColorScheme';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { listClientsWithDebt, type ClientWithDebt } from '@/lib/clients';
import { useAuth } from '@/providers/AuthProvider';

export default function KlijentiScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const placeholderTextColor = usePlaceholderTextColor();

  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<ClientWithDebt[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
      setLoading(true);
      setError(null);
    try {
      const data = await listClientsWithDebt(userId);
      setItems(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => {
      const name = (c.name ?? '').toLowerCase();
      const phone = (c.phone ?? '').toLowerCase();
      const note = (c.note ?? '').toLowerCase();
      return name.includes(q) || phone.includes(q) || note.includes(q);
    });
  }, [items, query]);

  const locale = i18n.language === 'sr' ? 'sr-Latn-RS' : i18n.language;
  const formatMoney = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const openUrl = useCallback(
    async (url: string) => {
      try {
        const supported = await Linking.canOpenURL(url);
        if (!supported) return;
        await Linking.openURL(url);
      } catch {
        // ignore
      }
    },
    []
  );

  const onCall = useCallback(
    (phone: string) => {
      const digits = phone.replace(/[^\d+]/g, '');
      if (!digits) return;
      void openUrl(`tel:${digits}`);
    },
    [openUrl]
  );

  const onSms = useCallback(
    (phone: string) => {
      const digits = phone.replace(/[^\d+]/g, '');
      if (!digits) return;
      const url = `sms:${digits}`;
      void openUrl(url);
    },
    [openUrl]
  );

  const onViber = useCallback(
    (phone: string) => {
      const digits = phone.replace(/[^\d+]/g, '');
      if (!digits) return;
      const url = `viber://chat?number=${encodeURIComponent(digits)}`;
      void openUrl(url);
    },
    [openUrl]
  );

  const onAdd = () => {
    router.push({ pathname: '/(tabs)/klijent/new' as any });
  };

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
      <LargeHeader
        title={t('tabs.clients')}
        subtitle={t('screens.clients.subtitle')}
        right={
          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('clients.add')}
              onPress={onAdd}
              className="mr-3 h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
              <Ionicons name="add" size={22} color={colors.text} />
            </Pressable>
            <UserMenuButton />
          </View>
        }
      />

      <View className="px-6 pb-32 pt-3">
        <View className="relative">
          <AppTextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('clients.searchPlaceholder')}
            placeholderTextColor={placeholderTextColor}
            className="pr-12"
          />
          <View style={{ position: 'absolute', right: 16, top: '50%', marginTop: -10 }}>
            <Ionicons name="search" size={20} color={colors.secondaryText} />
          </View>
        </View>

        {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

        <View className="mt-4">
          {loading ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View className="h-3" />}
              ListEmptyComponent={() => (
                <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
                  <Text className="text-lg font-semibold text-black dark:text-white">
                    {t('clients.emptyTitle')}
                  </Text>
                  <Text className="mt-1 text-base text-black/60 dark:text-white/70">
                    {t('clients.emptyBody')}
                  </Text>
                  <Pressable
                    onPress={onAdd}
                    className="mt-4 items-center justify-center rounded-3xl bg-[#007AFF] py-3 dark:bg-[#0A84FF]">
                    <Text className="text-base font-semibold text-white">{t('clients.add')}</Text>
                  </Pressable>
                </View>
              )}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/(tabs)/klijent/[id]' as any, params: { id: item.id } })
                  }
                  className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 px-4 py-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-4">
                      <Text className="text-lg font-semibold text-black dark:text-white" numberOfLines={1}>
                        {item.name || '-'}
                      </Text>

                      {item.phone ? (
                        <View className="mt-2 flex-row items-center">
                          <Ionicons name="call-outline" size={16} color={colors.secondaryText} />
                          <Text className="ml-2 text-base text-black/60 dark:text-white/70" numberOfLines={1}>
                            {item.phone}
                          </Text>
                        </View>
                      ) : null}

                      {item.note ? (
                        <View className="mt-2 flex-row items-start">
                          <Ionicons name="document-text-outline" size={16} color={colors.secondaryText} />
                          <Text
                            className="ml-2 flex-1 text-base text-black/60 dark:text-white/70"
                            numberOfLines={2}>
                            {item.note}
                          </Text>
                        </View>
                      ) : null}

                      {item.debt > 0 ? (
                        <View className="mt-2 flex-row items-center">
                          <Ionicons name="cash-outline" size={16} color={colors.secondaryText} />
                          <Text className="ml-2 text-base text-black/70 dark:text-white/80" numberOfLines={1}>
                            {t('clients.debt')}: {formatMoney.format(item.debt)}
                          </Text>
                        </View>
                      ) : null}

                      {item.phone ? (
                        <View className="mt-3 flex-row items-center">
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              onCall(item.phone!);
                            }}
                            className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
                            <Ionicons name="call-outline" size={18} color={colors.text} />
                          </Pressable>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              onSms(item.phone!);
                            }}
                            className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-[#E8F0FF] dark:bg-[#1E2A44]">
                            <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
                          </Pressable>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              onViber(item.phone!);
                            }}
                            className="h-9 w-9 items-center justify-center rounded-full bg-[#E8F7EF] dark:bg-[#203326]">
                            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.text} />
                          </Pressable>
                        </View>
                      ) : null}
                    </View>

                    <Ionicons name="chevron-forward" size={22} color={colors.secondaryText} />
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </View>
  );
}
