import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

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

  const showBlur = blur && Platform.OS === "ios";
  const overlayBackgroundColor =
    colorScheme === "dark"
      ? "rgba(28,28,30,0.28)"
      : "rgba(255,255,255,0.28)";

  return (
    <View style={[{ position: "relative" }, containerStyle]}>
      {showBlur ? (
        <BlurView
          intensity={35}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: overlayBackgroundColor },
          ]}
        />
      )}

      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: overlayBackgroundColor }]} />

      <View className="px-6 pb-6" style={{ paddingTop: insets.top + 12 }}>
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
