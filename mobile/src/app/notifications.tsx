import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { showError } from '@/components/cards';
import {
  notifyNow,
  openNotificationSettings,
  permissionState,
  prepareNotifications,
  pushSupported,
  type PermissionState,
} from '@/lib/notifications';
import type { NotifyPrefs } from '@/lib/types';
import { useSession } from '@/state/session';
import type { IconName } from '@/ui/icons';
import { Button, Card, Empty, H2, ListRow, Muted, Notice, Pill, Screen, Small } from '@/ui/kit';
import { C } from '@/ui/theme';

const ROWS: { key: keyof NotifyPrefs; icon: IconName; label: string; detail: string }[] = [
  { key: 'request', icon: 'bell', label: 'Contact requests', detail: 'Someone scanned your vehicle and is waiting. Accept or decline from the notification.' },
  { key: 'lost', icon: 'tag', label: 'Lost and item scans', detail: 'A tag in Lost Mode, or one of your items, was scanned.' },
  { key: 'location', icon: 'pin', label: 'Location updates', detail: 'The scanner shared where they are after their request.' },
  { key: 'reply', icon: 'send', label: 'Owner replies', detail: 'When you scan a tag: the owner accepted or declined.' },
  { key: 'reminder', icon: 'clock', label: 'Lost Mode reminder', detail: 'A weekly nudge while Lost Mode is still on.' },
];

function Toggle({ value, onChange, disabled, label }: { value: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: '#d5d8ea', true: '#a9a5f0' }}
      thumbColor={value ? C.brand : C.white}
      ios_backgroundColor="#d5d8ea"
      accessibilityLabel={label}
    />
  );
}

export default function NotificationSettings() {
  const router = useRouter();
  const { session, prefs, setPref } = useSession();
  const [perm, setPerm] = useState<PermissionState | null>(null);
  const [tested, setTested] = useState(false);

  // Re-check when coming back from the system settings.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      permissionState().then((p) => {
        if (alive) setPerm(p);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  if (!session) {
    return (
      <Screen edges="bottom">
        <Empty icon="bell" title="Log in to set up alerts" text="Notifications are tied to your account, so you get them on every phone you log in on.">
          <Button label="Log in" onPress={() => router.push('/login')} style={{ marginTop: 12, alignSelf: 'stretch' }} />
        </Empty>
      </Screen>
    );
  }

  const allow = async () => {
    await prepareNotifications();
    setPerm(await permissionState());
  };

  const flip = async (key: keyof NotifyPrefs, on: boolean) => {
    try {
      await setPref(key, on);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not save this setting.');
    }
  };

  const test = async () => {
    await notifyNow('request', 'Parking issue: someone needs to reach you', 'This is a test. Real requests have Accept and Decline buttons here.', {
      test: true,
    });
    setTested(true);
  };

  return (
    <Screen edges="bottom">
      {perm === 'denied' ? (
        <Card style={{ gap: 12 }}>
          <Notice tone="red" text="Notifications are turned off for SecureTag on this phone, so you will miss scan alerts." />
          <Button label="Open phone settings" icon="external" onPress={openNotificationSettings} />
        </Card>
      ) : perm === 'ask' ? (
        <Card style={{ gap: 12 }}>
          <Notice tone="amber" icon="bell" text="Allow notifications so you know the moment someone scans your tag." />
          <Button label="Allow notifications" icon="bell" onPress={allow} />
        </Card>
      ) : perm === 'unsupported' ? (
        <Notice tone="brand" icon="info" text="Notifications work in the phone app. In the browser you see alerts while this page is open." />
      ) : null}

      <Card>
        <H2 style={{ marginBottom: 2 }}>Always on</H2>
        <ListRow
          icon="alert"
          tone="red"
          label="Emergencies and accidents"
          detail="Loud alert with its own sound. Cannot be turned off."
          right={<Pill label="On" tone="red" />}
          last
        />
      </Card>

      <Card>
        <H2 style={{ marginBottom: 2 }}>Choose what you get</H2>
        {ROWS.map((r, i) => (
          <ListRow
            key={r.key}
            icon={r.icon}
            label={r.label}
            detail={r.detail}
            last={i === ROWS.length - 1}
            right={<Toggle value={prefs[r.key]} onChange={(v) => flip(r.key, v)} label={r.label} />}
          />
        ))}
      </Card>

      {perm === 'granted' ? (
        <Card style={{ gap: 10 }}>
          <H2 style={{ marginBottom: 0 }}>Try it</H2>
          <Muted>Sends a sample contact request to this phone so you can see and hear it.</Muted>
          <Button label={tested ? 'Sent. Send another' : 'Send a test notification'} icon="send" variant="secondary" onPress={test} />
          {Platform.OS === 'android' ? (
            <Button label="Sound and vibration per type" icon="settings" variant="ghost" onPress={openNotificationSettings} />
          ) : null}
        </Card>
      ) : null}

      <View style={styles.foot}>
        <Text style={styles.footTitle}>{pushSupported ? 'Alerts arrive even when the app is closed.' : 'Alerts arrive while the app is open.'}</Text>
        <Small center>
          {pushSupported
            ? 'You also get an email for every scan.'
            : 'This preview build cannot receive alerts while closed; the installed app can. You also get an email for every scan.'}
        </Small>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  foot: { alignItems: 'center', gap: 4, paddingHorizontal: 12, marginTop: 4 },
  footTitle: { fontSize: 13.5, fontWeight: '700', color: C.text, textAlign: 'center' },
});
