import React, { useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { LargeHeader } from '@/components/LargeHeader';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const sendReset = async () => {
    setSubmitting(true);
    setError(null);
    setInfo(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // Configure deep link in Supabase Auth settings later.
      redirectTo: 'expotailwindrouter://reset-password',
    });

    setSubmitting(false);
    if (resetError) setError(resetError.message);
    else setInfo('Poslali smo link na email. Otvori ga da promenis lozinku.');
  };

  return (
    <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
      <LargeHeader title="Lozinka" subtitle="Posalji link za reset." />
      <View className="px-6">
        <View className="overflow-hidden rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1C1C1E]/80">
          <Text className="text-sm font-medium text-black/60 dark:text-white/70">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="email@domen.com"
            placeholderTextColor="rgba(60,60,67,0.6)"
            className="mt-2 rounded-xl bg-black/5 px-4 py-3 text-base text-black dark:bg-white/10 dark:text-white"
          />

          {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}
          {info ? <Text className="mt-3 text-sm text-black/60 dark:text-white/70">{info}</Text> : null}

          <Pressable
            disabled={submitting}
            onPress={sendReset}
            className="mt-5 items-center justify-center rounded-xl bg-[#007AFF] py-3 disabled:opacity-60 dark:bg-[#0A84FF]">
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">Posalji link</Text>
            )}
          </Pressable>

          <Link href="/(auth)/sign-in" asChild>
            <Pressable className="mt-3 py-2">
              <Text className="text-sm text-[#007AFF] dark:text-[#0A84FF]">Nazad na prijavu</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

