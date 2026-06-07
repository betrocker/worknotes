import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'tefter:onboarding:completed';

export async function getOnboardingCompleted(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === 'true';
}

export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  if (completed) {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    return;
  }
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}
