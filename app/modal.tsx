import { StatusBar } from 'expo-status-bar';
import { Platform, Text, View } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-[#F2F2F7] px-6 dark:bg-black">
      <Text className="text-xl font-bold text-black dark:text-white">Modal</Text>
      <View className="my-8 h-px w-4/5 bg-black/10 dark:bg-white/15" />
      <EditScreenInfo path="app/modal.tsx" />

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}
