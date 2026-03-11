import { Link, Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="flex-1 items-center justify-center bg-[#F2F2F7] px-5 dark:bg-black">
        <Text className="text-xl font-bold text-black dark:text-white">
          This screen doesn't exist.
        </Text>

        <Link href="/" asChild>
          <Pressable className="mt-4 py-4">
            <Text className="text-sm text-[#007AFF] dark:text-[#0A84FF]">Go to home screen!</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}
