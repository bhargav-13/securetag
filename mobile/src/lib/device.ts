import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

/* Device features: location, dialer, haptics (notifications: ./notifications). Every helper
   fails soft — a denied permission never breaks a flow. */

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
