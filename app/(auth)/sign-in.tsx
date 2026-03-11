import React, { useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { LargeHeader } from '@/components/LargeHeader';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <View className="flex-1 bg-[#F2F2F7] dark:bg-black">
      <LargeHeader title="Prijava" subtitle="Uloguj se da sinhronizujes podatke." />
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

          <Text className="mt-4 text-sm font-medium text-black/60 dark:text-white/70">
            Lozinka
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="rgba(60,60,67,0.6)"
            className="mt-2 rounded-xl bg-black/5 px-4 py-3 text-base text-black dark:bg-white/10 dark:text-white"
          />

          {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

          <Pressable
            disabled={submitting}
            onPress={signIn}
            className="mt-5 items-center justify-center rounded-xl bg-[#007AFF] py-3 disabled:opacity-60 dark:bg-[#0A84FF]">
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">Prijavi se</Text>
            )}
          </Pressable>

          <View className="mt-4 flex-row items-center justify-between">
            <Link href="/(auth)/reset-password" asChild>
              <Pressable className="py-2">
                <Text className="text-sm text-[#007AFF] dark:text-[#0A84FF]">
                  Zaboravljena lozinka?
                </Text>
              </Pressable>
            </Link>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable className="py-2">
                <Text className="text-sm text-[#007AFF] dark:text-[#0A84FF]">Napravi nalog</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </View>
  );
}

