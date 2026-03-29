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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { supabase } from '@/lib/supabase';
import { startGoogleOAuth } from '@/lib/oauth';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const placeholderTextColor = usePlaceholderTextColor(submitting);
  const keyboardOpen = keyboardInset > 0;
  const scrollRef = useRef<ScrollView>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

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

  const signInWithGoogle = async () => {
    setSubmitting(true);
    setError(null);
    const result = await startGoogleOAuth();
    setSubmitting(false);
    if (!result.ok && result.error) setError(result.error);
  };

  const signIn = async () => {
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (signInError) setError(signInError.message);
  };

  const focusField = (target: 'email' | 'password') => {
    const y = target === 'password' ? 170 : 0;
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y, animated: true });
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
              source={require('../../assets/images/maskotavawe.png')}
              resizeMode="contain"
              style={{ width: 140, height: 140 }}
            />
            <Text className="mt-2 text-center text-app-display font-extrabold text-[#1C2745] dark:text-white">
              {t('auth.signIn.title')}
            </Text>
            <Text className="mt-2 max-w-[260px] text-center text-app-subtitle text-black/60 dark:text-white/70">
              {t('auth.signIn.subtitle')}
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
              <Pressable
                disabled={submitting}
                onPress={signInWithGoogle}
                className="flex-row items-center justify-center rounded-[20px] border py-3.5 disabled:opacity-60"
                style={{
                  borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(20,37,77,0.08)',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFF',
                }}>
                <Ionicons
                  name="logo-google"
                  size={18}
                  color={submitting ? '#8E8E93' : isDark ? '#FFFFFF' : '#1C2745'}
                />
                <Text className="ml-2 text-app-row font-bold text-[#1C2745] dark:text-white">
                  {t('auth.signIn.google')}
                </Text>
              </Pressable>

              <View className="my-4 flex-row items-center">
                <View className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                <Text className="mx-3 text-app-meta font-medium text-black/45 dark:text-white/45">
                  {t('common.or')}
                </Text>
                <View className="h-px flex-1 bg-black/10 dark:bg-white/10" />
              </View>

              <Text className="text-app-meta font-semibold uppercase tracking-[0.3px] text-black/55 dark:text-white/60">
                {t('common.email')}
              </Text>
              <AppTextInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                onFocus={() => focusField('email')}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder={t('auth.placeholders.email')}
                placeholderMuted={submitting}
                placeholderTextColor={placeholderTextColor}
                className="mt-2 rounded-[20px] border border-black/5 bg-[#F6F8FF] px-4 py-3.5 dark:border-white/10 dark:bg-[#232836]"
              />

              <Text className="mt-3 text-app-meta font-semibold uppercase tracking-[0.3px] text-black/55 dark:text-white/60">
                {t('common.password')}
              </Text>
              <View className="mt-2 justify-center">
                <AppTextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => focusField('password')}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  placeholder={t('auth.placeholders.passwordMasked')}
                  placeholderTextColor={placeholderTextColor}
                  className="rounded-[20px] border border-black/5 bg-[#F6F8FF] px-4 py-3.5 pr-12 dark:border-white/10 dark:bg-[#232836]"
                />
                <Pressable
                  onPress={() => setPasswordVisible((current) => !current)}
                  hitSlop={10}
                  style={{ position: 'absolute', right: 14 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('auth.passwordVisibility.toggle')}>
                  <Ionicons
                    name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={isDark ? '#AEB8D4' : '#6C789A'}
                  />
                </Pressable>
              </View>
              <Text className="mt-2 text-app-meta text-black/50 dark:text-white/50">
                {passwordVisible ? t('auth.passwordVisibility.hide') : t('auth.passwordVisibility.show')}
              </Text>

              {error ? <Text className="mt-3 text-app-meta text-red-500">{error}</Text> : null}

              <Pressable
                disabled={submitting}
                onPress={signIn}
                className="mt-4 items-center justify-center rounded-[20px] py-3.5 disabled:opacity-60"
                style={{ backgroundColor: '#2F68ED' }}>
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-app-row font-bold text-white">{t('auth.signIn.submit')}</Text>
                )}
              </Pressable>

              <View className="mt-3 flex-row items-center justify-between">
                <Link href="/(auth)/reset-password" asChild>
                  <Pressable className="py-2">
                    <Text className="text-app-row font-semibold text-[#3C69D9]">
                      {t('auth.signIn.forgot')}
                    </Text>
                  </Pressable>
                </Link>
                <Link href="/(auth)/sign-up" asChild>
                  <Pressable className="py-2">
                    <Text className="text-app-row font-semibold text-[#3C69D9]">
                      {t('auth.signIn.createAccount')}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
