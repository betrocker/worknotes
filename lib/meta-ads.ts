import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Platform } from 'react-native';

const META_APP_ID = process.env.EXPO_PUBLIC_META_APP_ID?.trim() ?? '';
const META_CLIENT_TOKEN = process.env.EXPO_PUBLIC_META_CLIENT_TOKEN?.trim() ?? '';
const META_DISPLAY_NAME = process.env.EXPO_PUBLIC_META_DISPLAY_NAME?.trim() || 'eTefter';
const META_AUTO_LOG_APP_EVENTS = process.env.EXPO_PUBLIC_META_AUTO_LOG_APP_EVENTS !== 'false';
const META_ADVERTISER_ID_COLLECTION =
  process.env.EXPO_PUBLIC_META_ADVERTISER_ID_COLLECTION !== 'false';

let initialized = false;

export function isMetaAdsConfigured() {
  return Boolean(META_APP_ID && META_CLIENT_TOKEN);
}

export async function initializeMetaAds() {
  if (initialized || Platform.OS === 'web' || !isMetaAdsConfigured()) return;
  initialized = true;

  try {
    const { Settings } = await import('react-native-fbsdk-next');

    Settings.setAppID(META_APP_ID);
    Settings.setClientToken(META_CLIENT_TOKEN);
    Settings.setAppName(META_DISPLAY_NAME);
    Settings.setAutoLogAppEventsEnabled(META_AUTO_LOG_APP_EVENTS);

    if (Platform.OS === 'ios') {
      const { granted } = await requestTrackingPermissionsAsync();
      const trackingEnabled = granted && META_ADVERTISER_ID_COLLECTION;

      Settings.setAdvertiserIDCollectionEnabled(trackingEnabled);
      Settings.initializeSDK();
      await Settings.setAdvertiserTrackingEnabled(trackingEnabled);
      return;
    }

    Settings.setAdvertiserIDCollectionEnabled(META_ADVERTISER_ID_COLLECTION);
    Settings.initializeSDK();
  } catch (error) {
    initialized = false;
    if (__DEV__) {
      console.warn('[meta-ads] Failed to initialize Meta SDK.', error);
    }
  }
}
