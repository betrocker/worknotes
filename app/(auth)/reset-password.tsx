import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const placeholderTextColor = usePlaceholderTextColor(submitting);
  const keyboardOpen = keyboardInset > 0;
  const scrollRef = useRef<ScrollView>(null);
  const emailRef = useRef<TextInput>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sendReset = async () => {
    setSubmitting(true);
    setError(null);
    setInfo(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'tefter://reset-password',
    });

    setSubmitting(false);
    if (resetError) setError(resetError.message);
    else setInfo(t('auth.resetPassword.sent'));
  };

  const focusEmail = () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }, Platform.OS === 'ios' ? 60 : 120);
    });
  };

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <View style={{ flex: 1, paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 16 }}>
          <View className="items-center">
            <Image
              source={require('../../assets/images/maskotathink.png')}
              resizeMode="contain"
              style={{ width: 136, height: 136 }}
            />
            <Text className="mt-2 text-center text-app-display font-extrabold text-[#1C2745] dark:text-white">
              {t('auth.resetPassword.title')}
            </Text>
            <Text className="mt-2 max-w-[270px] text-center text-app-subtitle text-black/60 dark:text-white/70">
              {t('auth.resetPassword.subtitle')}
            </Text>
          </View>

          <View
            className="mt-6 overflow-hidden rounded-[28px] border border-black/10 bg-white dark:border-white/10 dark:bg-[#1C1C1E]"
            style={{ flex: keyboardOpen ? 1 : undefined, minHeight: keyboardOpen ? 0 : undefined }}>
            <ScrollView
              ref={scrollRef}
              style={{ flex: keyboardOpen ? 1 : undefined }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: keyboardInset + 20,
                flexGrow: keyboardOpen ? 1 : 0,
              }}>
              <Text className="text-app-meta font-semibold uppercase tracking-[0.3px] text-black/55 dark:text-white/60">
                {t('common.email')}
              </Text>
              <AppTextInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                onFocus={focusEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                returnKeyType="done"
                placeholder={t('auth.placeholders.email')}
                placeholderMuted={submitting}
                placeholderTextColor={placeholderTextColor}
                className="mt-2 rounded-[20px] border border-black/5 bg-[#F6F8FF] px-4 py-3.5 dark:border-white/10 dark:bg-[#232836]"
              />

              {error ? <Text className="mt-3 text-app-meta text-red-500">{error}</Text> : null}
              {info ? <Text className="mt-3 text-app-meta text-black/60 dark:text-white/70">{info}</Text> : null}

              <Pressable
                disabled={submitting}
                onPress={sendReset}
                className="mt-4 items-center justify-center rounded-[20px] py-3.5 disabled:opacity-60"
                style={{ backgroundColor: '#2F68ED' }}>
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-app-row font-bold text-white">{t('auth.resetPassword.submit')}</Text>
                )}
              </Pressable>

              <Link href="/(auth)/sign-in" asChild>
                <Pressable className="mt-2 py-2">
                  <Text className="text-center text-app-row font-semibold text-[#3C69D9]">
                    {t('auth.resetPassword.backToSignIn')}
                  </Text>
                </Pressable>
              </Link>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
