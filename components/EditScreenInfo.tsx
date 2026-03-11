import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { ExternalLink } from './ExternalLink';

export default function EditScreenInfo({ path }: { path: string }) {
  return (
    <View className="items-center">
      <View className="items-center px-12">
        <Text className="text-center text-base leading-6 text-black/70 dark:text-white/70">
          Open up the code for this screen:
        </Text>

        <View className="my-2 rounded bg-black/5 px-1 dark:bg-white/10">
          <Text className="font-mono text-sm text-black/70 dark:text-white/70">{path}</Text>
        </View>

        <Text className="text-center text-base leading-6 text-black/70 dark:text-white/70">
          Change any of the text, save the file, and your app will automatically update.
        </Text>
      </View>

      <View className="mt-4 items-center px-5">
        <ExternalLink
          asChild
          href="https://docs.expo.io/get-started/create-a-new-app/#opening-the-app-on-your-phonetablet">
          <Pressable className="py-4">
            <Text className="text-center text-sm text-[#007AFF] dark:text-[#0A84FF]">
              Tap here if your app doesn't automatically update after making changes
            </Text>
          </Pressable>
        </ExternalLink>
      </View>
    </View>
  );
}
