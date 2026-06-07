import Ionicons from '@expo/vector-icons/Ionicons';
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
import { startGoogleOAuth } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';

type AuthField = 'username' | 'email' | 'password';

const INPUT_HEIGHT = 42;
const FORM_WIDTH = 320;

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<AuthField | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const screenBackground = isDark ? colors.background : '#FFFFFF';
  const titleColor = isDark ? '#F7F7F8' : '#25272C';
  const bodyColor = isDark ? 'rgba(235,235,245,0.58)' : 'rgba(60,60,67,0.62)';
  const lineColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(60,60,67,0.28)';
  const placeholderColor = isDark ? 'rgba(235,235,245,0.48)' : 'rgba(60,60,67,0.42)';
  const socialBorderColor = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(60,60,67,0.18)';

  const signUpWithGoogle = async () => {
    setSubmitting(true);
    setError(null);
    setInfo(null);
    const result = await startGoogleOAuth();
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
    }
  };

  const signUp = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError(t('auth.signUp.usernameRequired'));
      setInfo(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfo(null);
    const { error: signUpError, data } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: trimmedUsername,
          name: trimmedUsername,
        },
      },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setInfo(t('auth.signUp.checkEmail'));
    }
  };

  const inputBorderColor = (field: AuthField) => (focusedField === field ? colors.tint : lineColor);

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
                  {t('auth.signUp.title')}
                </Text>
                <Text style={{ marginTop: 6, color: bodyColor, fontSize: 16, lineHeight: 22 }}>
                  {t('auth.signUp.subtitle')}
                </Text>
              </View>

              <View style={{ marginTop: 52 }}>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  placeholder={t('auth.signUp.username')}
                  placeholderTextColor={placeholderColor}
                  selectionColor={colors.tint}
                  editable={!submitting}
                  style={{
                    height: INPUT_HEIGHT,
                    borderBottomWidth: 0.5,
                    borderStyle: 'solid',
                    borderBottomColor: inputBorderColor('username'),
                    color: titleColor,
                    fontSize: 16,
                    paddingHorizontal: 0,
                    paddingVertical: 0,
                  }}
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="next"
                  placeholder={t('common.email')}
                  placeholderTextColor={placeholderColor}
                  selectionColor={colors.tint}
                  editable={!submitting}
                  style={{
                    height: INPUT_HEIGHT,
                    borderBottomWidth: 0.5,
                    borderStyle: 'solid',
                    borderBottomColor: inputBorderColor('email'),
                    color: titleColor,
                    fontSize: 16,
                    marginTop: 24,
                    paddingHorizontal: 0,
                    paddingVertical: 0,
                  }}
                />
                <View
                  style={{
                    height: INPUT_HEIGHT,
                    borderBottomWidth: 0.5,
                    borderStyle: 'solid',
                    borderBottomColor: inputBorderColor('password'),
                    justifyContent: 'center',
                    marginTop: 24,
                  }}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!passwordVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    placeholder={t('common.password')}
                    placeholderTextColor={placeholderColor}
                    selectionColor={colors.tint}
                    editable={!submitting}
                    style={{
                      height: INPUT_HEIGHT,
                      color: titleColor,
                      fontSize: 16,
                      paddingHorizontal: 0,
                      paddingRight: 42,
                      paddingVertical: 0,
                    }}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('auth.passwordVisibility.toggle')}
                    hitSlop={10}
                    onPress={() => setPasswordVisible((current) => !current)}
                    style={{ position: 'absolute', right: 0, height: INPUT_HEIGHT, justifyContent: 'center' }}>
                    <Ionicons
                      name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={placeholderColor}
                    />
                  </Pressable>
                </View>
              </View>

              {error ? <Text style={{ marginTop: 14, color: '#FF6B6B', fontSize: 13 }}>{error}</Text> : null}
              {info ? <Text style={{ marginTop: 14, color: bodyColor, fontSize: 13 }}>{info}</Text> : null}

              <Pressable
                disabled={submitting}
                onPress={signUp}
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
                    {t('auth.signUp.submit')}
                  </Text>
                )}
              </Pressable>

              <Pressable
                disabled={submitting}
                onPress={signUpWithGoogle}
                style={{
                  marginTop: 16,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: socialBorderColor,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: submitting ? 0.6 : 1,
                }}>
                <Ionicons name="logo-google" size={18} color="#4285F4" />
                <Text style={{ marginLeft: 8, color: titleColor, fontSize: 15, fontWeight: '500' }}>
                  {t('auth.signUp.google')}
                </Text>
              </Pressable>

              <View
                style={{
                  marginTop: 14,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ color: bodyColor, fontSize: 12, lineHeight: 17, textAlign: 'center' }}>
                  {t('auth.signUp.termsPrefix')}{' '}
                </Text>
                <Link href="/(tabs)/legal/terms" asChild>
                  <Pressable hitSlop={10} style={{ paddingVertical: 5, marginVertical: -5 }}>
                    <Text style={{ color: colors.tint, fontSize: 12, lineHeight: 17, fontWeight: '500' }}>
                      {t('auth.signUp.termsLink')}
                    </Text>
                  </Pressable>
                </Link>
                <Text style={{ color: bodyColor, fontSize: 12, lineHeight: 17, textAlign: 'center' }}>
                  {' '}
                  {t('auth.signUp.termsJoin')}{' '}
                </Text>
                <Link href="/(tabs)/legal/privacy" asChild>
                  <Pressable hitSlop={10} style={{ paddingVertical: 5, marginVertical: -5 }}>
                    <Text style={{ color: colors.tint, fontSize: 12, lineHeight: 17, fontWeight: '500' }}>
                      {t('auth.signUp.privacyLink')}
                    </Text>
                  </Pressable>
                </Link>
                <Text style={{ color: bodyColor, fontSize: 12, lineHeight: 17 }}>.</Text>
              </View>
            </View>

            <View style={{ paddingTop: 34, alignItems: 'center' }}>
              <Text style={{ color: bodyColor, fontSize: 14, textAlign: 'center' }}>
                {t('auth.signUp.alreadyHavePrompt')}{' '}
                <Link href="/(auth)/sign-in" asChild>
                  <Text style={{ color: colors.tint, fontSize: 14, fontWeight: '500' }}>
                    {t('auth.signUp.alreadyHaveAction')}
                  </Text>
                </Link>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
