import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility, SchedulableTriggerInputTypes } from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type { NotifyKind, NotifyPrefs } from './types';

/* Everything about notifications on this phone: the Android channels, the
   Accept / Decline buttons, permission, showing an alert right now, the push
   token and the weekly Lost Mode reminder. Every helper fails soft. */

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isWeb = Platform.OS === 'web';

export const DEFAULT_PREFS: NotifyPrefs = { request: true, lost: true, location: true, reply: true, reminder: true };

/** The category that puts Accept / Decline on a contact request. */
export const REQUEST_CATEGORY = 'scan-request';
export const ACTION_ACCEPT = 'accept';
export const ACTION_DECLINE = 'decline';

type Channel = {
  id: string;
  name: string;
  description: string;
  importance: AndroidImportance;
  sound: string | null;
  vibration: number[] | null;
};

/** One Android channel per kind, so people can tune each in system settings. */
const CHANNELS: Record<NotifyKind, Channel> = {
  emergency: {
    id: 'emergency',
    name: 'Emergencies and accidents',
    description: 'Someone reported an emergency or accident involving your vehicle.',
    importance: AndroidImportance.MAX,
    sound: 'emergency.wav',
    vibration: [0, 400, 150, 400, 150, 400],
  },
  request: {
    id: 'requests',
    name: 'Contact requests',
    description: 'Someone scanned your tag and is waiting for you to accept or decline.',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: [0, 250, 200, 250],
  },
  lost: {
    id: 'lost',
    name: 'Lost tag scans',
    description: 'A tag or item of yours was scanned by a finder.',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: [0, 250, 200, 250],
  },
  reply: {
    id: 'replies',
    name: 'Owner replies',
    description: 'The owner of a tag you scanned accepted or declined.',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: [0, 200],
  },
  location: {
    id: 'updates',
    name: 'Location updates',
    description: 'A scanner shared where they are after their first request.',
    importance: AndroidImportance.DEFAULT,
    sound: null,
    vibration: null,
  },
  reminder: {
    id: 'reminders',
    name: 'Reminders',
    description: 'A weekly nudge while Lost Mode is still on.',
    importance: AndroidImportance.LOW,
    sound: null,
    vibration: null,
  },
};

let ready: Promise<void> | null = null;

/** Channels, action buttons and the foreground rule. Runs once. */
function setup(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    Notifications.setNotificationHandler({
      handleNotification: async (n) => {
        // A push that lands while the app is open is announced by the in-app
        // banner; the system banner on top of it would say the same thing twice.
        const remote = (n.request.trigger as { type?: string } | null)?.type === 'push';
        return {
          shouldShowBanner: !remote,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        };
      },
    });

    if (Platform.OS === 'android') {
      // The first version of the app used a single channel.
      await Notifications.deleteNotificationChannelAsync('scans').catch(() => {});
      for (const c of Object.values(CHANNELS)) {
        await Notifications.setNotificationChannelAsync(c.id, {
          name: c.name,
          description: c.description,
          importance: c.importance,
          sound: c.sound,
          enableVibrate: !!c.vibration,
          vibrationPattern: c.vibration,
          lightColor: '#4e46dc',
          lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
        }).catch(() => {});
      }
    }

    await Notifications.setNotificationCategoryAsync(REQUEST_CATEGORY, [
      { identifier: ACTION_ACCEPT, buttonTitle: 'Accept & share', options: { opensAppToForeground: true } },
      { identifier: ACTION_DECLINE, buttonTitle: 'Decline', options: { opensAppToForeground: true, isDestructive: true } },
    ]).catch(() => {});
  })().catch(() => {});
  return ready;
}

export type PermissionState = 'granted' | 'denied' | 'ask' | 'unsupported';

export async function permissionState(): Promise<PermissionState> {
  if (isWeb) return 'unsupported';
  try {
    const p = await Notifications.getPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'denied';
  } catch {
    return 'unsupported';
  }
}

/** Prepares notifications and asks for permission if it was never answered. */
export async function prepareNotifications(): Promise<boolean> {
  if (isWeb) return false;
  try {
    await setup();
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    return perm.granted;
  } catch {
    return false;
  }
}

export const openNotificationSettings = () => Linking.openSettings().catch(() => {});

/** Shows an alert right now (a live event arrived while the app is running). */
export async function notifyNow(
  kind: NotifyKind,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  if (isWeb) return;
  try {
    if (!(await prepareNotifications())) return;
    const c = CHANNELS[kind];
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data, type: kind },
        ...(c.sound ? { sound: c.sound } : {}),
        ...(kind === 'request' ? { categoryIdentifier: REQUEST_CATEGORY } : {}),
      },
      trigger: Platform.OS === 'android' ? { channelId: c.id } : null,
    });
  } catch {
    /* the in-app banner still shows */
  }
}

/** Clears a request's alert from the tray once it has been answered. */
export async function dismissFor(requestId: string) {
  if (isWeb) return;
  try {
    const shown = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      shown
        .filter((n) => (n.request.content.data as { requestId?: string } | undefined)?.requestId === requestId)
        .map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
    );
  } catch {
    /* nothing to clear */
  }
}

export function setBadge(count: number) {
  if (isWeb) return;
  Notifications.setBadgeCountAsync(count).catch(() => {});
}

/* ------------------------------- push token ------------------------------- */

let cachedToken: string | null = null;

/** Whether this build can receive alerts while the app is closed. */
export const pushSupported = (() => {
  if (isWeb) return false;
  if (isExpoGo && Platform.OS === 'android') return false;
  return !!projectId();
})();

function projectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ||
    Constants.easConfig?.projectId
  );
}

/**
 * Expo push token for alerts while the app is closed. Needs a real build with
 * an EAS project id — Expo Go on Android can't receive remote pushes — so this
 * quietly returns null there and the app relies on live in-app alerts instead.
 * `ask: false` never shows the permission prompt.
 */
export async function getPushToken(opts: { ask?: boolean } = {}): Promise<string | null> {
  if (!pushSupported) return null;
  if (cachedToken) return cachedToken;
  try {
    const granted = opts.ask === false ? (await permissionState()) === 'granted' : await prepareNotifications();
    if (!granted) return null;
    await setup();
    const token = await Notifications.getExpoPushTokenAsync({ projectId: projectId()! });
    cachedToken = token.data || null;
    return cachedToken;
  } catch {
    return null;
  }
}

/* --------------------------- Lost Mode reminder --------------------------- */

const REMINDER_ID = 'lost-mode-reminder';
const REMINDER_KEY = 'securetag:lost-reminder';
const WEEK = 7 * 24 * 60 * 60;

/**
 * While any tag is in Lost Mode the owner's contact is public, so nudge them
 * once a week until they turn it off. `names` is what is currently lost.
 */
export async function syncLostReminder(names: string[], enabled: boolean) {
  if (isWeb) return;
  try {
    const want = enabled && names.length > 0 && (await permissionState()) === 'granted';
    const signature = want ? names.slice().sort().join('|') : '';
    const saved = (await AsyncStorage.getItem(REMINDER_KEY)) || '';
    if (saved === signature) return;

    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
    if (want) {
      await setup();
      const what = names.length === 1 ? names[0] : `${names.length} tags`;
      await Notifications.scheduleNotificationAsync({
        identifier: REMINDER_ID,
        content: {
          title: 'Lost Mode is still on',
          body: `Anyone who scans ${what} can see your contact. Found it? Turn Lost Mode off.`,
          data: { type: 'reminder' },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: WEEK,
          repeats: true,
          channelId: CHANNELS.reminder.id,
        },
      });
    }
    await AsyncStorage.setItem(REMINDER_KEY, signature);
  } catch {
    /* a reminder is a nicety */
  }
}

/** On sign-out: no reminders or stale alerts for the next person. */
export async function clearNotifications() {
  if (isWeb) return;
  cachedToken = null;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  await AsyncStorage.removeItem(REMINDER_KEY).catch(() => {});
  await Notifications.dismissAllNotificationsAsync().catch(() => {});
  setBadge(0);
}

export { Notifications };
