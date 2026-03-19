import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { StickyFormHeader } from '@/components/StickyFormHeader';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { deleteClient, getClientById, updateClient } from '@/lib/clients';
import { useAuth } from '@/providers/AuthProvider';

export default function EditClientScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const { session } = useAuth();

  const userId = session?.user?.id ?? null;
  const id = typeof params.id === 'string' ? params.id : null;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const placeholderTextColor = usePlaceholderTextColor(submitting);

  const load = useCallback(async () => {
    if (!userId || !id) return;
    setLoading(true);
    setError(null);
    try {
      const client = await getClientById(userId, id);
      if (!client) {
        setError(null);
        return;
      }
      setName(client.name ?? '');
      setPhone(client.phone ?? '');
      setAddress(client.address ?? '');
      setNote(client.note ?? '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    if (!userId || !id) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('clients.nameLabel') + ' *');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateClient(userId, id, {
        name: trimmed,
        phone: phone.trim() || null,
        address: address.trim() || null,
        note: note.trim() || null,
      });
      router.replace({ pathname: '/(tabs)/klijent/[id]' as any, params: { id } });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => {
    if (!id) {
      router.replace({ pathname: '/(tabs)/klijenti' as any });
      return;
    }
    router.replace({ pathname: '/(tabs)/klijent/[id]' as any, params: { id } });
  };

  const onDelete = () => {
    if (!userId || !id) return;
    Alert.alert(t('clients.deleteConfirmTitle'), t('clients.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('clients.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteClient(userId, id);
            router.replace({ pathname: '/(tabs)/klijenti' as any });
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      stickyHeaderIndices={[0]}
      className="flex-1 bg-[#F2F2F7] dark:bg-black"
      contentContainerClassName="pb-32">
      <StickyFormHeader
        title={t('clients.edit')}
        onBack={onBack}
        onSave={onSave}
        saveLabel={t('common.save')}
        submitting={submitting}
        right={
          <View className="mr-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('clients.delete')}
              onPress={onDelete}
              className="h-10 w-10 items-center justify-center rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#1C1C1E]/70">
              <Ionicons name="trash" size={18} color="#FF3B30" />
            </Pressable>
          </View>
        }
      />

      <View className="px-6">
        <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
          {loading ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <Text className="text-sm font-medium text-black/60 dark:text-white/70">{t('clients.nameLabel')}</Text>
              <AppTextInput
                value={name}
                onChangeText={setName}
                placeholder={t('clients.nameLabel')}
                placeholderTextColor={placeholderTextColor}
                className="mt-2"
              />

              <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">{t('clients.phoneLabel')}</Text>
              <AppTextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder={t('clients.phoneLabel')}
                placeholderTextColor={placeholderTextColor}
                className="mt-2"
              />

              <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">{t('clients.addressLabel')}</Text>
              <AppTextInput
                value={address}
                onChangeText={setAddress}
                placeholder={t('clients.addressLabel')}
                placeholderTextColor={placeholderTextColor}
                className="mt-2"
              />

              <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">{t('clients.noteLabel')}</Text>
              <AppTextInput
                value={note}
                onChangeText={setNote}
                multiline
                placeholder={t('clients.noteLabel')}
                placeholderTextColor={placeholderTextColor}
                className="mt-2 min-h-[96px]"
              />
            </>
          )}

          {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}
        </View>
      </View>
    </ScrollView>
  );
}
