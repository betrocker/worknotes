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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { usePlaceholderTextColor } from '@/components/usePlaceholderTextColor';
import { AppTextInput } from '@/components/AppTextInput';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
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
  const heroMinHeight = keyboardOpen ? 132 : 250;
  const sheetMinHeight = Math.max(540, height - (insets.top + 220));
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
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ minHeight: heroMinHeight, paddingTop: insets.top + 18, paddingHorizontal: 24 }}>
            <Text className="text-[32px] font-extrabold leading-[38px] text-white">
              {t('auth.resetPassword.title')}
            </Text>
            <Text className="mt-2 max-w-[230px] text-[15px] leading-[22px] text-white/88">
              {t('auth.resetPassword.subtitle')}
            </Text>

            <Image
              source={require('../../assets/images/maskotathink.png')}
              resizeMode="contain"
              style={{
                position: 'absolute',
                right: -2,
                top: insets.top + 10,
                width: keyboardOpen ? 120 : 212,
                height: keyboardOpen ? 120 : 212,
              }}
            />
          </View>

          <View
            style={{
              flex: keyboardOpen ? 1 : undefined,
              minHeight: keyboardOpen ? 0 : sheetMinHeight,
              borderTopLeftRadius: 34,
              borderTopRightRadius: 34,
              backgroundColor: isDark ? 'rgba(18,21,30,0.98)' : 'rgba(247,249,255,0.97)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.84)',
              paddingHorizontal: 18,
              paddingTop: 18,
              paddingBottom: 40,
              shadowColor: '#000000',
              shadowOpacity: isDark ? 0.32 : 0.16,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: -4 },
              elevation: 18,
            }}>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: keyboardInset + insets.bottom + 24,
              }}>
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

              {error ? <Text className="mt-3 text-sm text-red-500">{error}</Text> : null}
              {info ? <Text className="mt-3 text-sm text-black/60 dark:text-white/70">{info}</Text> : null}

              <Pressable
                disabled={submitting}
                onPress={sendReset}
                className="mt-5 items-center justify-center rounded-[22px] py-3.5 disabled:opacity-60"
                style={{ backgroundColor: '#2F68ED' }}>
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-[15px] font-bold text-white">{t('auth.resetPassword.submit')}</Text>
                )}
              </Pressable>

              <Link href="/(auth)/sign-in" asChild>
                <Pressable className="mt-3 py-2">
                  <Text className="text-center text-[13px] font-semibold text-[#3C69D9]">
                    {t('auth.resetPassword.backToSignIn')}
                  </Text>
                </Pressable>
              </Link>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
