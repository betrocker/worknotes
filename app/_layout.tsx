import Ionicons from "@expo/vector-icons/Ionicons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Asset } from "expo-asset";
import { Stack } from "expo-router";
import { useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import "../global.css";

import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { AppSplashScreen } from "@/components/AppSplashScreen";
import { SplashVisibilityProvider } from "@/components/SplashVisibilityContext";
import { useColorScheme } from "@/components/useColorScheme";
import i18n from "@/lib/i18n";
import { getStoredLanguage, guessInitialLanguage } from "@/lib/language";
import { initializeNotifications } from "@/lib/notifications";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...Ionicons.font,
  });
  const [i18nReady, setI18nReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await getStoredLanguage();
        const next = stored ?? guessInitialLanguage();
        if (i18n.language !== next) {
          await i18n.changeLanguage(next);
        }
      } finally {
        if (mounted) setI18nReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Asset.loadAsync([require("../assets/images/maskotavawe.png")]);
      } finally {
        if (mounted) setAssetsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loaded && i18nReady && assetsReady) {
      SplashScreen.hideAsync();
    }
  }, [assetsReady, i18nReady, loaded]);

  useEffect(() => {
    if (!loaded || !i18nReady || !assetsReady) return;
    void initializeNotifications();
  }, [assetsReady, i18nReady, loaded]);

  if (!loaded || !i18nReady || !assetsReady) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { initialized, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!initialized) return;

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [initialized]);

  useEffect(() => {
    if (!initialized) return;
    if (showSplash) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [initialized, router, segments, session, showSplash]);

  if (!initialized) {
    return <AppSplashScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#1A4FE0" }}>
      <SplashVisibilityProvider showSplash={showSplash}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          </Stack>
        </ThemeProvider>
      </SplashVisibilityProvider>

      {showSplash ? (
        <View style={StyleSheet.absoluteFill}>
          <View style={StyleSheet.absoluteFill}>
            <AppSplashScreen />
          </View>
        </View>
      ) : null}
    </View>
  );
}
