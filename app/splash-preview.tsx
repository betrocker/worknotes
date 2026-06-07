import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSplashScreen } from '@/components/AppSplashScreen';

export default function SplashPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar style="light" />
      <AppSplashScreen />
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close splash preview"
        className="absolute right-5 h-11 w-11 items-center justify-center rounded-full bg-black/35"
        style={{ top: insets.top + 12 }}>
        <Ionicons name="close" size={22} color="#FFFFFF" />
      </Pressable>
    </>
  );
}
