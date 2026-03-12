import { Link, Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <View className="flex-1 items-center justify-center bg-[#F2F2F7] px-5 dark:bg-black">
        <Text className="text-xl font-bold text-black dark:text-white">
          {t('notFound.message')}
        </Text>

        <Link href="/" asChild>
          <Pressable className="mt-4 py-4">
            <Text className="text-sm text-[#007AFF] dark:text-[#0A84FF]">{t('notFound.goHome')}</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}
