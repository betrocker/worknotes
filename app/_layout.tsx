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
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, TextInput, View } from "react-native";
import "../global.css";

import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { AppSplashScreen } from "@/components/AppSplashScreen";
import { SplashVisibilityProvider } from "@/components/SplashVisibilityContext";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import i18n from "@/lib/i18n";
import { getStoredLanguage, guessInitialLanguage } from "@/lib/language";
import { initializeNotifications } from "@/lib/notifications";
import { getStoredThemePreference, type AppThemePreference } from "@/lib/theme";
import { useBilling, BillingProvider } from "@/providers/BillingProvider";
import { OfflineSyncProvider } from "@/providers/OfflineSyncProvider";
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

const MIN_SPLASH_VISIBLE_MS = 2400;
const SPLASH_FADE_OUT_MS = 520;

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
  const [themePreferenceReady, setThemePreferenceReady] = useState(false);
  const [initialThemePreference, setInitialThemePreference] = useState<AppThemePreference>("dark");
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
        const stored = await getStoredThemePreference();
        if (mounted) setInitialThemePreference(stored ?? "dark");
      } finally {
        if (mounted) setThemePreferenceReady(true);
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
        await Asset.loadAsync([require("../assets/images/splash-logo.png")]);
      } finally {
        if (mounted) setAssetsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !i18nReady || !assetsReady || !themePreferenceReady) return;
    void SplashScreen.hideAsync();
    void initializeNotifications();
  }, [assetsReady, i18nReady, loaded, themePreferenceReady]);

  if (!loaded || !i18nReady || !assetsReady || !themePreferenceReady) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav initialTheme={initialThemePreference} />
    </AuthProvider>
  );
}

function RootLayoutNav({ initialTheme }: { initialTheme: AppThemePreference }) {
  const { initialized } = useAuth();
  return (
    <ThemePreferenceProvider initialTheme={initialTheme}>
      <OnboardingProvider>
        <BillingProvider>
          <OfflineSyncProvider>
            <RootNavigationContent initialized={initialized} />
          </OfflineSyncProvider>
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
  const appReady = initialized && themeReady && onboardingReady;
  const splashLogoOpacity = useRef(new Animated.Value(1)).current;
  const splashOverlayOpacity = useRef(new Animated.Value(1)).current;
  const splashStartedAtRef = useRef(Date.now());
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);

  const inAuthGroup = segments[0] === "(auth)";
  const inOAuthCallback = segments[0] === "auth" && segments[1] === "callback";
  const inOnboarding = segments[0] === "onboarding";
  const inLegal = segments[0] === "(tabs)" && segments[1] === "legal";
  const inPaywall = segments[0] === "paywall";
  const paywallPreview = params.preview === "1";
  const appBackgroundColor = Colors[colorScheme ?? "light"].background;

  useEffect(() => {
    if (!appReady) {
      splashLogoOpacity.stopAnimation();
      splashOverlayOpacity.stopAnimation();
      splashLogoOpacity.setValue(1);
      splashOverlayOpacity.setValue(1);
      setShowSplashOverlay(true);
      return;
    }

    setShowSplashOverlay(true);
    const elapsed = Date.now() - splashStartedAtRef.current;
    const delay = Math.max(0, MIN_SPLASH_VISIBLE_MS - elapsed);
    let animation: Animated.CompositeAnimation | null = null;
    const timeout = setTimeout(() => {
      animation = Animated.parallel([
        Animated.timing(splashLogoOpacity, {
          toValue: 0,
          duration: SPLASH_FADE_OUT_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(splashOverlayOpacity, {
          toValue: 0,
          duration: SPLASH_FADE_OUT_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      animation.start(({ finished }) => {
        if (finished) setShowSplashOverlay(false);
      });
    }, delay);

    return () => {
      clearTimeout(timeout);
      animation?.stop();
    };
  }, [appReady, splashLogoOpacity, splashOverlayOpacity]);

  const renderWithSplashOverlay = (children: ReactNode) => (
    <View style={{ flex: 1, backgroundColor: appBackgroundColor }}>
      {children}
      {showSplashOverlay ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: appBackgroundColor,
            opacity: splashOverlayOpacity,
          }}>
          <AppSplashScreen transparent logoStyle={{ opacity: splashLogoOpacity }} />
        </Animated.View>
      ) : null}
    </View>
  );

  if (appReady) {
    if (
      !session &&
      onboardingReady &&
      !onboardingCompleted &&
      !inOnboarding &&
      !inOAuthCallback &&
      !inLegal
    ) {
      return renderWithSplashOverlay(<Redirect href="/onboarding" />);
    }

    if (!session && !inAuthGroup && !inOAuthCallback && !inOnboarding && !inLegal) {
      return renderWithSplashOverlay(<Redirect href="/(auth)/sign-in" />);
    }

    if (session && inAuthGroup) {
      return renderWithSplashOverlay(<Redirect href="/(tabs)" />);
    }

    if (
      session &&
      onboardingReady &&
      billingReady &&
      onboardingCompleted &&
      hasAccess &&
      inPaywall &&
      !paywallPreview
    ) {
      return renderWithSplashOverlay(<Redirect href="/(tabs)" />);
    }
  }

  if (!appReady) {
    return <AppSplashScreen />;
  }

  const appContent = (
    <View style={{ flex: 1, backgroundColor: appBackgroundColor }}>
      <StatusBar
        style={colorScheme === "dark" ? "light" : "dark"}
      />
      <SplashVisibilityProvider showSplash={false}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="splash-preview" options={{ headerShown: false }} />
            <Stack.Screen name="paywall" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </SplashVisibilityProvider>
    </View>
  );

  return renderWithSplashOverlay(appContent);
}
