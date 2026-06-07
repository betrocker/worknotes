import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

const INPUT_HEIGHT = 42;
const FORM_WIDTH = 320;

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const screenBackground = isDark ? colors.background : '#FFFFFF';
  const titleColor = isDark ? '#F7F7F8' : '#25272C';
  const bodyColor = isDark ? 'rgba(235,235,245,0.58)' : 'rgba(60,60,67,0.62)';
  const lineColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(60,60,67,0.28)';
  const placeholderColor = isDark ? 'rgba(235,235,245,0.48)' : 'rgba(60,60,67,0.42)';

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
    <View style={{ flex: 1, backgroundColor: screenBackground }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={{
            flexGrow: 1,
            minHeight: height,
            paddingHorizontal: 36,
            paddingTop: insets.top + 86,
            paddingBottom: Math.max(insets.bottom + 22, 34),
          }}>
          <View
            style={{
              width: '100%',
              maxWidth: FORM_WIDTH,
              alignSelf: 'center',
              flexGrow: 1,
              justifyContent: 'space-between',
            }}>
            <View>
              <View>
                <Text style={{ color: titleColor, fontSize: 28, lineHeight: 34, fontWeight: '500' }}>
                  {t('auth.resetPassword.title')}
                </Text>
                <Text style={{ marginTop: 6, color: bodyColor, fontSize: 16, lineHeight: 22 }}>
                  {t('auth.resetPassword.subtitle')}
                </Text>
              </View>

              <View style={{ marginTop: 52 }}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="done"
                  placeholder={t('common.email')}
                  placeholderTextColor={placeholderColor}
                  selectionColor={colors.tint}
                  editable={!submitting}
                  style={{
                    height: INPUT_HEIGHT,
                    borderBottomWidth: 0.5,
                    borderStyle: 'solid',
                    borderBottomColor: focused ? colors.tint : lineColor,
                    color: titleColor,
                    fontSize: 16,
                    paddingHorizontal: 0,
                    paddingVertical: 0,
                  }}
                />
              </View>

              {error ? <Text style={{ marginTop: 14, color: '#FF6B6B', fontSize: 13 }}>{error}</Text> : null}
              {info ? <Text style={{ marginTop: 14, color: bodyColor, fontSize: 13 }}>{info}</Text> : null}

              <Pressable
                disabled={submitting}
                onPress={sendReset}
                style={{
                  marginTop: 32,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.tint,
                  opacity: submitting ? 0.72 : 1,
                }}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500' }}>
                    {t('auth.resetPassword.submit')}
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={{ paddingTop: 34, alignItems: 'center' }}>
              <Link href="/(auth)/sign-in" asChild>
                <Pressable hitSlop={10}>
                  <Text style={{ color: colors.tint, fontSize: 14, fontWeight: '500', textAlign: 'center' }}>
                    {t('auth.resetPassword.backToSignIn')}
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
