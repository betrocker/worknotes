import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY_PREFIX = 'tefter:onboarding:completed:';

function getOnboardingKey(userId: string) {
  return `${ONBOARDING_KEY_PREFIX}${userId}`;
}

export async function getOnboardingCompleted(userId: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(getOnboardingKey(userId));
  return value === 'true';
}

export async function setOnboardingCompleted(userId: string, completed: boolean): Promise<void> {
  const key = getOnboardingKey(userId);
  if (completed) {
    await AsyncStorage.setItem(key, 'true');
    return;
  }
  await AsyncStorage.removeItem(key);
}

export async function resetOnboarding(userId: string): Promise<void> {
  await AsyncStorage.removeItem(getOnboardingKey(userId));
}
