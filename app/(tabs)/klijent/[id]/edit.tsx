import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Text, View } from 'react-native';

import { StickyFormHeader } from '@/components/StickyFormHeader';
import { useColorScheme } from '@/components/useColorScheme';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { getClientById, updateClient } from '@/lib/clients';
import { goBackOrReplace } from '@/lib/navigation';
import { useAuth } from '@/providers/AuthProvider';

export default function EditClientScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; source?: string }>();
  const { t } = useTranslation();
  const { session } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const scrollY = useRef(new Animated.Value(0)).current;

  const userId = session?.user?.id ?? null;
  const id = typeof params.id === 'string' ? params.id : null;
  const openedFromClientDetail = params.source === 'client-detail';

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
      if (openedFromClientDetail) {
        goBackOrReplace(router, { pathname: '/(tabs)/klijent/[id]' as any, params: { id } });
      } else {
        router.replace({ pathname: '/(tabs)/klijent/[id]' as any, params: { id } });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => {
    if (!id) {
      goBackOrReplace(router, { pathname: '/(tabs)/klijenti' as any });
      return;
    }
    goBackOrReplace(router, { pathname: '/(tabs)/klijent/[id]' as any, params: { id } });
  };

  const sectionSeparatorColor = colorScheme === 'dark' ? 'rgba(84,84,88,0.38)' : 'rgba(60,60,67,0.14)';
  const formSectionContentStyle = { marginLeft: 12, marginTop: 8 };
  const fieldInputClassName = 'mt-2 rounded-xl bg-black/[0.035] px-0 py-0 dark:bg-white/[0.07]';
  const descriptionInputClassName = 'min-h-[76px] rounded-xl bg-black/[0.035] px-0 py-0 dark:bg-white/[0.07]';
  const fieldInputStyle = { height: 38, paddingHorizontal: 10, paddingVertical: 0 };
  const descriptionInputStyle = { minHeight: 76, paddingHorizontal: 10, paddingVertical: 8 };

  const renderFormSection = (title: string) => (
    <View className="mt-5">
      <View className="px-1">
        <Text
          className="text-app-row-title font-semibold"
          style={{ color: colorScheme === 'dark' ? '#72A8FF' : '#1C60C3' }}>
          {title}
        </Text>
      </View>
      <View className="mt-2 h-px" style={{ backgroundColor: sectionSeparatorColor }} />
    </View>
  );

  return (
    <Animated.ScrollView
      stickyHeaderIndices={[0]}
      className="flex-1 bg-[#F2F2F7] dark:bg-[#1D2229]"
      contentContainerClassName="pb-32"
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
      scrollEventThrottle={16}>
      <StickyFormHeader
        title={t('clients.edit')}
        onBack={onBack}
        onSave={onSave}
        saveLabel={t('common.save')}
        submitting={submitting}
        scrollY={scrollY}
      />

      <View className="px-6">
        <Text className="mb-1 text-[28px] font-semibold leading-[34px] text-black dark:text-white">
          {t('clients.edit')}
        </Text>
        <View>
          {loading ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : (
            <>
              {renderFormSection(t('clients.basicSection'))}
              <View style={formSectionContentStyle}>
              <Text className="text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('clients.nameLabel')}</Text>
              <AppTextInput
                value={name}
                onChangeText={setName}
                placeholder={t('clients.nameLabel')}
                placeholderTextColor={placeholderTextColor}
                className={fieldInputClassName}
                style={fieldInputStyle}
              />

              <Text className="mt-4 text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('clients.phoneLabel')}</Text>
              <AppTextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder={t('clients.phoneLabel')}
                placeholderTextColor={placeholderTextColor}
                className={fieldInputClassName}
                style={fieldInputStyle}
              />

              <Text className="mt-4 text-app-meta-lg font-medium text-black/60 dark:text-white/70">{t('clients.addressLabel')}</Text>
              <AppTextInput
                value={address}
                onChangeText={setAddress}
                placeholder={t('clients.addressLabel')}
                placeholderTextColor={placeholderTextColor}
                className={fieldInputClassName}
                style={fieldInputStyle}
              />
              </View>

              {renderFormSection(t('clients.noteLabel'))}
              <View style={formSectionContentStyle}>
              <AppTextInput
                value={note}
                onChangeText={setNote}
                multiline
                placeholder={t('clients.noteLabel')}
                placeholderTextColor={placeholderTextColor}
                className={descriptionInputClassName}
                style={descriptionInputStyle}
              />
              </View>
            </>
          )}

          {error ? <Text className="mt-3 text-app-meta text-red-600">{error}</Text> : null}
        </View>
      </View>
    </Animated.ScrollView>
  );
}
