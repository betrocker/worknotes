import React, { useEffect, useState } from 'react';
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
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { supabase } from '@/lib/supabase';
import { startGoogleOAuth } from '@/lib/oauth';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
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
  const sheetMinHeight = Math.max(540, height - (insets.top + 220));
  const isAndroid = Platform.OS === 'android';

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

  return (
    <LinearGradient
      colors={isDark ? ['#081225', '#12305C', '#10213E', '#0B111C'] : ['#1A4FE0', '#3B73F0', '#7FA8FF', '#EEF3FF']}
      locations={isDark ? [0, 0.28, 0.65, 1] : [0, 0.24, 0.62, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          scrollEnabled={isAndroid}>
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ minHeight: 250, paddingTop: insets.top + 18, paddingHorizontal: 24 }}>
            <Text className="text-[32px] font-extrabold leading-[38px] text-white">
              {t('auth.signIn.title')}
            </Text>
            <Text className="mt-2 max-w-[210px] text-[15px] leading-[22px] text-white/88">
              {t('auth.signIn.subtitle')}
            </Text>

            <Image
              source={require('../../assets/images/maskotavawe.png')}
              resizeMode="contain"
              style={{
                position: 'absolute',
                right: -6,
                top: insets.top + 6,
                width: 220,
                height: 220,
              }}
            />
          </View>

          <View
            style={{
              minHeight: sheetMinHeight,
              borderTopLeftRadius: 34,
              borderTopRightRadius: 34,
              backgroundColor: isDark ? 'rgba(18,21,30,0.98)' : 'rgba(247,249,255,0.97)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.84)',
              paddingHorizontal: 18,
              paddingTop: 18,
              paddingBottom: 28,
              shadowColor: '#000000',
              shadowOpacity: isDark ? 0.32 : 0.16,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: -4 },
              elevation: 18,
            }}>
            <View
              style={{
                flex: 1,
                borderRadius: 28,
                backgroundColor: isDark ? 'rgba(28,32,44,0.92)' : 'rgba(255,255,255,0.86)',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(235,240,255,0.96)',
                padding: 16,
                shadowColor: '#000000',
                shadowOpacity: isDark ? 0.26 : 0.18,
                shadowRadius: 10,
                shadowOffset: { width: 2, height: 6 },
                elevation: 12,
              }}>
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                scrollEnabled={!isAndroid}
                contentContainerStyle={{
                  flexGrow: 1,
                  paddingBottom: keyboardInset + insets.bottom + 24,
                }}>
              <Pressable
                disabled={submitting}
                onPress={signInWithGoogle}
                className="flex-row items-center justify-center rounded-[22px] border py-3.5 disabled:opacity-60"
                style={{
                  borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(20,37,77,0.08)',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.88)',
                }}>
                <Ionicons
                  name="logo-google"
                  size={18}
                  color={submitting ? '#8E8E93' : isDark ? '#FFFFFF' : '#1C2745'}
                />
                <Text className="ml-2 text-[15px] font-bold text-[#1C2745] dark:text-white">
                  {t('auth.signIn.google')}
                </Text>
              </Pressable>

              <View className="my-5 flex-row items-center">
                <View className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                <Text className="mx-3 text-xs font-medium text-black/45 dark:text-white/45">
                  {t('common.or')}
                </Text>
                <View className="h-px flex-1 bg-black/10 dark:bg-white/10" />
              </View>

              <Text className="text-[13px] font-semibold uppercase tracking-[0.3px] text-black/55 dark:text-white/60">
                {t('common.email')}
              </Text>
              <AppTextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                placeholder={t('auth.placeholders.email')}
                placeholderMuted={submitting}
                placeholderTextColor={placeholderTextColor}
                className="mt-2 rounded-[22px] border border-black/5 bg-[#F6F8FF] px-4 py-3.5 dark:border-white/10 dark:bg-[#232836]"
              />

              <Text className="mt-4 text-[13px] font-semibold uppercase tracking-[0.3px] text-black/55 dark:text-white/60">
                {t('common.password')}
              </Text>
              <View className="mt-2 justify-center">
                <AppTextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={t('auth.placeholders.passwordMasked')}
                  placeholderTextColor={placeholderTextColor}
                  className="rounded-[22px] border border-black/5 bg-[#F6F8FF] px-4 py-3.5 pr-12 dark:border-white/10 dark:bg-[#232836]"
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
              <Text className="mt-2 text-[12px] text-black/50 dark:text-white/50">
                {passwordVisible ? t('auth.passwordVisibility.hide') : t('auth.passwordVisibility.show')}
              </Text>

              {error ? <Text className="mt-3 text-sm text-red-500">{error}</Text> : null}

              <Pressable
                disabled={submitting}
                onPress={signIn}
                className="mt-5 items-center justify-center rounded-[22px] py-3.5 disabled:opacity-60"
                style={{ backgroundColor: '#2F68ED' }}>
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-[15px] font-bold text-white">{t('auth.signIn.submit')}</Text>
                )}
              </Pressable>

              <View className="mt-4 flex-row items-center justify-between">
                <Link href="/(auth)/reset-password" asChild>
                  <Pressable className="py-2">
                    <Text className="text-[13px] font-semibold text-[#3C69D9]">
                      {t('auth.signIn.forgot')}
                    </Text>
                  </Pressable>
                </Link>
                <Link href="/(auth)/sign-up" asChild>
                  <Pressable className="py-2">
                    <Text className="text-[13px] font-semibold text-[#3C69D9]">
                      {t('auth.signIn.createAccount')}
                    </Text>
                  </Pressable>
                </Link>
              </View>
              </ScrollView>
            </View>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
