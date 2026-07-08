/**
 * Expo app config.
 *
 * The Google Sign-In plugin needs the reversed iOS client ID in `iosUrlScheme`
 * so the installer can patch Info.plist with the OAuth redirect URL scheme.
 * Provide it via `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` in `.env.local`
 * (e.g. `com.googleusercontent.apps.1234567890-abcdef`).
 *
 * Meta/Facebook SDK native config is enabled when `EXPO_PUBLIC_META_APP_ID`
 * and `EXPO_PUBLIC_META_CLIENT_TOKEN` are present.
 */
module.exports = () => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
  const metaAppId = process.env.EXPO_PUBLIC_META_APP_ID?.trim();
  const metaClientToken = process.env.EXPO_PUBLIC_META_CLIENT_TOKEN?.trim();
  const metaDisplayName = process.env.EXPO_PUBLIC_META_DISPLAY_NAME?.trim() || 'eTefter';
  const metaTrackingPermission =
    process.env.EXPO_PUBLIC_META_IOS_TRACKING_PERMISSION?.trim() ||
    'eTefter koristi ovaj identifikator za merenje instalacija i performansi oglasa.';

  const googleSigninPlugin = iosUrlScheme
    ? ['@react-native-google-signin/google-signin', { iosUrlScheme }]
    : '@react-native-google-signin/google-signin';
  const facebookSdkPlugin =
    metaAppId && metaClientToken
      ? [
          'react-native-fbsdk-next',
          {
            appID: metaAppId,
            clientToken: metaClientToken,
            displayName: metaDisplayName,
            scheme: `fb${metaAppId}`,
            advertiserIDCollectionEnabled:
              process.env.EXPO_PUBLIC_META_ADVERTISER_ID_COLLECTION !== 'false',
            autoLogAppEventsEnabled:
              process.env.EXPO_PUBLIC_META_AUTO_LOG_APP_EVENTS !== 'false',
            isAutoInitEnabled: false,
            iosUserTrackingPermission: metaTrackingPermission,
          },
        ]
      : null;

  const plugins = [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-logo.png',
        resizeMode: 'contain',
        backgroundColor: '#1D2229',
        dark: {
          image: './assets/images/splash-logo.png',
          resizeMode: 'contain',
          backgroundColor: '#1D2229',
        },
      },
    ],
    'expo-localization',
    [
      'expo-image-picker',
      {
        photosPermission:
          'eTefter koristi galeriju za dodavanje slika pre i posle posla, kao i loga firme.',
        cameraPermission:
          'eTefter koristi kameru za fotografisanje slika pre i posle posla.',
        microphonePermission: false,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/android-chrome-192x192.png',
        color: '#1A4FE0',
        defaultChannel: 'job-reminders',
      },
    ],
    [
      'expo-tracking-transparency',
      {
        userTrackingPermission: metaTrackingPermission,
      },
    ],
    'expo-sqlite',
    '@react-native-community/datetimepicker',
    'expo-web-browser',
    googleSigninPlugin,
  ];

  if (facebookSdkPlugin) {
    plugins.push(facebookSdkPlugin);
  }

  return {
    expo: {
      name: 'eTefter',
      slug: 'tefter',
      version: '1.0.0',
      orientation: 'default',
      icon: './assets/images/android-chrome-512x512.png',
      scheme: 'tefter',
      userInterfaceStyle: 'automatic',
      splash: {
        image: './assets/images/splash-logo.png',
        resizeMode: 'contain',
        backgroundColor: '#1D2229',
        dark: {
          image: './assets/images/splash-logo.png',
          resizeMode: 'contain',
          backgroundColor: '#1D2229',
        },
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.denis.tefter',
      },
      android: {
        package: 'com.denis.tefter',
        softwareKeyboardLayoutMode: 'resize',
        blockedPermissions: [
          'android.permission.READ_MEDIA_IMAGES',
          'android.permission.READ_MEDIA_VIDEO',
          'android.permission.READ_EXTERNAL_STORAGE',
        ],
        adaptiveIcon: {
          backgroundColor: '#E6F4FE',
          foregroundImage: './assets/images/android-icon-foreground.png',
        },
        predictiveBackGestureEnabled: false,
      },
      web: {
        bundler: 'metro',
        output: 'static',
        favicon: './assets/images/favicon.ico',
      },
      plugins,
      experiments: {
        typedRoutes: true,
      },
      extra: {
        router: {},
        eas: {
          projectId: 'b1e29231-3547-4b69-854f-cd820f069989',
        },
      },
    },
  };
};
