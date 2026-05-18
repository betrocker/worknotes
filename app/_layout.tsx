import Ionicons from "@expo/vector-icons/Ionicons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Asset } from "expo-asset";
import { StatusBar } from "expo-status-bar";
import { Redirect, Stack, useGlobalSearchParams, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import "../global.css";

import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { SplashVisibilityProvider } from "@/components/SplashVisibilityContext";
import { useColorScheme } from "@/components/useColorScheme";
import i18n from "@/lib/i18n";
import { getStoredLanguage, guessInitialLanguage } from "@/lib/language";
import { initializeNotifications } from "@/lib/notifications";
import { useBilling, BillingProvider } from "@/providers/BillingProvider";
import { OnboardingProvider, useOnboarding } from "@/providers/OnboardingProvider";
import { ThemePreferenceProvider, useThemePreference } from "@/providers/ThemePreferenceProvider";

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

const GlobalText = Text as typeof Text & {
  defaultProps?: {
    allowFontScaling?: boolean;
    maxFontSizeMultiplier?: number;
  };
};
const GlobalTextInput = TextInput as typeof TextInput & {
  defaultProps?: {
    allowFontScaling?: boolean;
    maxFontSizeMultiplier?: number;
  };
};

GlobalText.defaultProps = GlobalText.defaultProps || {};
GlobalText.defaultProps.allowFontScaling = false;
GlobalText.defaultProps.maxFontSizeMultiplier = 1;

GlobalTextInput.defaultProps = GlobalTextInput.defaultProps || {};
GlobalTextInput.defaultProps.allowFontScaling = false;
GlobalTextInput.defaultProps.maxFontSizeMultiplier = 1;

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
  const { initialized } = useAuth();
  return (
    <ThemePreferenceProvider>
      <OnboardingProvider>
        <BillingProvider>
          <RootNavigationContent initialized={initialized} />
        </BillingProvider>
      </OnboardingProvider>
    </ThemePreferenceProvider>
  );
}

function RootNavigationContent({ initialized }: { initialized: boolean }) {
  const colorScheme = useColorScheme();
  const { ready: themeReady } = useThemePreference();
  const { session } = useAuth();
  const { ready: onboardingReady, completed: onboardingCompleted } = useOnboarding();
  const { ready: billingReady, hasAccess } = useBilling();
  const segments = useSegments();
  const params = useGlobalSearchParams<{ preview?: string }>();
  const appReady = initialized && themeReady;

  useEffect(() => {
    if (appReady) {
      void SplashScreen.hideAsync();
    }
  }, [appReady]);

  const inAuthGroup = segments[0] === "(auth)";
  const inOAuthCallback = segments[0] === "auth" && segments[1] === "callback";
  const inOnboarding = segments[0] === "onboarding";
  const inPaywall = segments[0] === "paywall";
  const paywallPreview = params.preview === "1";

  if (appReady) {
    if (!session && !inAuthGroup && !inOAuthCallback) {
      return <Redirect href="/(auth)/sign-in" />;
    }

    if (session && onboardingReady && !onboardingCompleted && !inOnboarding) {
      return <Redirect href="/onboarding" />;
    }

    if (session && onboardingReady && billingReady && onboardingCompleted && !hasAccess && !inPaywall) {
      return <Redirect href="/paywall" />;
    }

    if (
      session &&
      onboardingReady &&
      billingReady &&
      onboardingCompleted &&
      hasAccess &&
      (inAuthGroup || inOnboarding || (inPaywall && !paywallPreview))
    ) {
      return <Redirect href="/(tabs)" />;
    }
  }

  if (!appReady) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0C63E7" }}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#1A4FE0" }}>
      <StatusBar
        style={colorScheme === "dark" ? "light" : "dark"}
      />
      <SplashVisibilityProvider showSplash={false}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="paywall" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </SplashVisibilityProvider>
    </View>
  );
}
