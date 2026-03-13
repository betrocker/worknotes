import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_ENABLED_KEY = 'settings.notifications_enabled';

type ReminderInput = {
  title: string;
  scheduledDate: string;
  clientName?: string | null;
};

function parseDateOnly(value: string): Date | null {
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day, 9, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function scheduleJobReminder({ title, scheduledDate, clientName }: ReminderInput): Promise<void> {
  try {
    const enabled = await getNotificationsEnabled();
    if (!enabled) return;

    const date = parseDateOnly(scheduledDate);
    if (!date) return;
    if (date.getTime() <= Date.now()) return;

    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      if (requested.status !== 'granted') return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: clientName ? `Klijent: ${clientName}` : 'Podsetnik za zakazan posao.',
        sound: true,
      },
      trigger: date,
    });
  } catch {
    // ignore scheduling errors
  }
}

export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    if (value === null) return true;
    return value === 'true';
  } catch {
    return true;
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
    if (!enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  } catch {
    // ignore
  }
}
