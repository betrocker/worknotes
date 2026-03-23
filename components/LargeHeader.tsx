import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export function LargeHeader({
  title,
  subtitle,
  right,
  elevated = false,
  blur = true,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  elevated?: boolean;
  blur?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const containerStyle = elevated ? { zIndex: 20 } : { zIndex: 20 };

  return (
    <View
      style={[
        {
          position: "relative",
          backgroundColor: colors.background,
        },
        containerStyle,
      ]}>
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 24 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="font-bold text-[34px] leading-[40px] tracking-tight text-black dark:text-white">
              {title}
            </Text>
          </View>
          {right ? <View>{right}</View> : null}
        </View>
        {subtitle ? (
          <Text className="mt-1 text-base text-black/60 dark:text-white/70">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
