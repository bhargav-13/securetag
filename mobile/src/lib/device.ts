import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Linking, Platform } from 'react-native';

/* Device features: location, notifications, dialer, haptics. Every helper
   fails soft — a denied permission never breaks a flow. */

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isWeb = Platform.OS === 'web';

/** Best-effort position; null if unavailable, denied or slow. The timeout
 *  covers the permission prompt too, so an unanswered prompt never stalls a
 *  request to the owner. */
export function getPosition(timeoutMs = 10000): Promise<{ lat: number; lng: number } | null> {
  const locate = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return null;
    }
  };
  const lastKnown = async () => {
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') return null;
      const last = await Location.getLastKnownPositionAsync();
      return last ? { lat: last.coords.latitude, lng: last.coords.longitude } : null;
    } catch {
      return null;
    }
  };
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: { lat: number; lng: number } | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => lastKnown().then(finish), timeoutMs);
    locate().then(finish);
  });
}

export function call(phone: string | null | undefined) {
  if (!phone) return;
  Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {});
}

export function openMaps(lat: number, lng: number) {
  Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`).catch(() => {});
}

export function buzz(kind: 'success' | 'warning' | 'tap' = 'tap') {
  if (isWeb) return;
  try {
    if (kind === 'tap') Haptics.selectionAsync();
    else
      Haptics.notificationAsync(
        kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      );
  } catch {
    /* no haptics on this device */
  }
}

/* ----------------------------- notifications ----------------------------- */

let notificationsReady = false;

/** Asks for permission (once) and prepares the Android channel. */
export async function prepareNotifications(): Promise<boolean> {
  if (isWeb) return false;
  try {
    if (!notificationsReady) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('scans', {
          name: 'Scan alerts',
          importance: AndroidImportance.MAX,
          vibrationPattern: [0, 250, 200, 250],
          lightColor: '#4e46dc',
        });
      }
      notificationsReady = true;
    }
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    return perm.granted;
  } catch {
    return false;
  }
}

/** Shows an alert right now (used when a live scan event arrives). */
export async function notifyNow(title: string, body: string, data: Record<string, unknown> = {}) {
  if (isWeb) return;
  try {
    if (!(await prepareNotifications())) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: 'default' },
      trigger: Platform.OS === 'android' ? { channelId: 'scans' } : null,
    });
  } catch {
    /* alerts are a nicety; the in-app banner still shows */
  }
}

/**
 * Expo push token for alerts while the app is closed. Needs a real build with
 * an EAS project id — Expo Go on Android can't receive remote pushes — so this
 * quietly returns null there and the app relies on live in-app alerts instead.
 */
export async function getPushToken(): Promise<string | null> {
  if (isWeb) return null;
  if (isExpoGo && Platform.OS === 'android') return null;
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ||
    Constants.easConfig?.projectId;
  if (!projectId) return null;
  try {
    if (!(await prepareNotifications())) return null;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data || null;
  } catch {
    return null;
  }
}

export { Notifications };
