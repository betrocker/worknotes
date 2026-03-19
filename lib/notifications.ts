import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import i18n from '@/lib/i18n';

const NOTIFICATIONS_ENABLED_KEY = 'settings.notifications_enabled';
const DEFAULT_REMINDER_KEY = 'settings.notifications.default_reminder';
const DEFAULT_CHANNEL_ID = 'job-reminders';
const REMINDER_PREFERENCE_PREFIX = 'jobs.reminder.preference:';
const REMINDER_NOTIFICATION_ID_PREFIX = 'jobs.reminder.notification:';

export type JobReminderOption = 'none' | 'same_day' | 'day_before';

type ReminderInput = {
  jobId: string;
  title: string;
  scheduledDate: string;
  reminderType: JobReminderOption;
  clientName?: string | null;
};

function parseDateOnly(value: string, reminderType: JobReminderOption): Date | null {
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return null;
  const date =
    reminderType === 'day_before'
      ? new Date(year, month - 1, day - 1, 18, 0, 0)
      : new Date(year, month - 1, day, 9, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getPreferenceKey(jobId: string): string {
  return `${REMINDER_PREFERENCE_PREFIX}${jobId}`;
}

function getNotificationKey(jobId: string): string {
  return `${REMINDER_NOTIFICATION_ID_PREFIX}${jobId}`;
}

export async function initializeNotifications(): Promise<void> {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
        name: i18n.t('notifications.channelName'),
        description: i18n.t('notifications.channelDescription'),
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
  } catch {
    // ignore initialization errors
  }
}

export async function getJobReminderPreference(jobId: string): Promise<JobReminderOption> {
  try {
    const value = await AsyncStorage.getItem(getPreferenceKey(jobId));
    if (value === 'none' || value === 'same_day' || value === 'day_before') return value;
    return await getDefaultJobReminderPreference();
  } catch {
    return await getDefaultJobReminderPreference();
  }
}

export async function setJobReminderPreference(
  jobId: string,
  reminderType: JobReminderOption
): Promise<void> {
  try {
    await AsyncStorage.setItem(getPreferenceKey(jobId), reminderType);
  } catch {
    // ignore
  }
}

export async function clearJobReminderPreference(jobId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(getPreferenceKey(jobId));
  } catch {
    // ignore
  }
}

export async function getDefaultJobReminderPreference(): Promise<JobReminderOption> {
  try {
    const value = await AsyncStorage.getItem(DEFAULT_REMINDER_KEY);
    if (value === 'none' || value === 'same_day' || value === 'day_before') return value;
    return 'same_day';
  } catch {
    return 'same_day';
  }
}

export async function setDefaultJobReminderPreference(reminderType: JobReminderOption): Promise<void> {
  try {
    await AsyncStorage.setItem(DEFAULT_REMINDER_KEY, reminderType);
  } catch {
    // ignore
  }
}

export async function cancelJobReminder(jobId: string): Promise<void> {
  try {
    const key = getNotificationKey(jobId);
    const scheduledId = await AsyncStorage.getItem(key);
    if (scheduledId) {
      await Notifications.cancelScheduledNotificationAsync(scheduledId);
      await AsyncStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export async function scheduleJobReminder({
  jobId,
  title,
  scheduledDate,
  reminderType,
  clientName,
}: ReminderInput): Promise<void> {
  try {
    await cancelJobReminder(jobId);
    if (reminderType === 'none') return;

    const enabled = await getNotificationsEnabled();
    if (!enabled) return;

    const date = parseDateOnly(scheduledDate, reminderType);
    if (!date) return;
    if (date.getTime() <= Date.now()) return;

    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      if (requested.status !== 'granted') return;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: clientName
          ? i18n.t('notifications.jobReminderBodyWithClient', { clientName })
          : i18n.t('notifications.jobReminderBody'),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...(Platform.OS === 'android' ? { channelId: DEFAULT_CHANNEL_ID } : null),
      },
    });
    await AsyncStorage.setItem(getNotificationKey(jobId), notificationId);
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
