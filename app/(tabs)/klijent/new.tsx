import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { StickyFormHeader } from '@/components/StickyFormHeader';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { createClient } from '@/lib/clients';
import { useAuth } from '@/providers/AuthProvider';

export default function NewClientScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useAuth();

  const userId = session?.user?.id ?? null;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const placeholderTextColor = usePlaceholderTextColor(submitting);

  const onSave = async () => {
    if (!userId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('clients.nameLabel') + ' *');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createClient(userId, {
        name: trimmed,
        phone: phone.trim() || null,
        address: address.trim() || null,
        note: note.trim() || null,
      });
      router.replace({ pathname: '/(tabs)/klijenti' as any });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => {
    router.replace({ pathname: '/(tabs)/klijenti' as any });
  };

  return (
    <ScrollView
      stickyHeaderIndices={[0]}
      className="flex-1 bg-[#F2F2F7] dark:bg-black"
      contentContainerClassName="pb-32">
      <StickyFormHeader
        title={t('clients.add')}
        onBack={onBack}
        onSave={onSave}
        saveLabel={t('common.save')}
        submitting={submitting}
      />

      <View className="px-6">
        <View className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/90">
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

          {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}
        </View>
      </View>
    </ScrollView>
  );
}
