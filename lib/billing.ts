import { Platform } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';

const APPLE_API_KEY = process.env.EXPO_PUBLIC_RC_APPLE_API_KEY ?? '';
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_RC_GOOGLE_API_KEY ?? '';

export const RC_ENTITLEMENT_ID = process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID ?? 'pro';

export function getRevenueCatApiKey() {
  if (Platform.OS === 'ios') return APPLE_API_KEY || null;
  if (Platform.OS === 'android') return GOOGLE_API_KEY || null;
  return null;
}

export function hasActiveEntitlement(customerInfo: CustomerInfo | null, entitlementId = RC_ENTITLEMENT_ID) {
  if (!customerInfo) return false;
  if (customerInfo.entitlements.active[entitlementId]) return true;
  return Object.keys(customerInfo.entitlements.active).length > 0;
}
