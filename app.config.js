/**
 * Expo app config.
 *
 * The Google Sign-In plugin needs the reversed iOS client ID in `iosUrlScheme`
 * so the installer can patch Info.plist with the OAuth redirect URL scheme.
 * Provide it via `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` in `.env.local`
 * (e.g. `com.googleusercontent.apps.1234567890-abcdef`).
 */
module.exports = () => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();

  const googleSigninPlugin = iosUrlScheme
    ? ['@react-native-google-signin/google-signin', { iosUrlScheme }]
    : '@react-native-google-signin/google-signin';

  return {
    expo: {
      name: 'Tefter',
      slug: 'tefter',
      version: '1.0.0',
      orientation: 'default',
      icon: './assets/images/icon.png',
      scheme: 'tefter',
      userInterfaceStyle: 'automatic',
      splash: {
        image: './assets/images/splash-blank.png',
        resizeMode: 'contain',
        backgroundColor: '#0C63E7',
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
          foregroundImage: './assets/images/icon.png',
        },
        predictiveBackGestureEnabled: false,
      },
      web: {
        bundler: 'metro',
        output: 'static',
        favicon: './assets/images/favicon.png',
      },
      plugins: [
        'expo-router',
        [
          'expo-splash-screen',
          {
            image: './assets/images/splash-blank.png',
            resizeMode: 'contain',
            backgroundColor: '#0C63E7',
          },
        ],
        'expo-localization',
        [
          'expo-image-picker',
          {
            photosPermission:
              'Tefter koristi galeriju za dodavanje slika pre i posle posla, kao i loga firme.',
            cameraPermission:
              'Tefter koristi kameru za fotografisanje slika pre i posle posla.',
            microphonePermission: false,
          },
        ],
        [
          'expo-notifications',
          {
            icon: './assets/images/icon.png',
            color: '#1A4FE0',
            defaultChannel: 'job-reminders',
          },
        ],
        '@react-native-community/datetimepicker',
        googleSigninPlugin,
      ],
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
