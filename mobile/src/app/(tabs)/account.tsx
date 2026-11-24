import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { confirm } from '@/components/cards';
import { api, ApiError } from '@/lib/api';
import { WEB_URL } from '@/lib/config';
import { buzz } from '@/lib/device';
import { useSession } from '@/state/session';
import { Field, Form, PhoneField, ReadOnly, type Values } from '@/ui/form';
import { Button, Card, Eyebrow, H1, H2, ListRow, Muted, Notice, Screen, Small } from '@/ui/kit';
import { C } from '@/ui/theme';

function Links() {
  return (
    <Card style={styles.list}>
      <ListRow icon="external" label="Open securetag.in" role="link" onPress={() => WebBrowser.openBrowserAsync(WEB_URL).catch(() => {})} />
      <ListRow
        icon="mail"
        label="Contact support"
        detail="support@securetag.in"
        role="link"
        onPress={() => Linking.openURL('mailto:support@securetag.in?subject=SecureTag%20app').catch(() => {})}
        last
      />
    </Card>
  );
}

export default function Account() {
  const router = useRouter();
  const { session, account, tags, items, prefs, refresh, signOut } = useSession();
  // What's saved on the account, and the person's unsaved edits on top of it.
  const [edits, setEdits] = useState<Values | null>(null);
  const values: Values = edits ?? { full_name: account?.fullName ?? '', phone: account?.phone ?? '' };
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const version = Constants.expoConfig?.version ?? '1.0.0';

  if (!session) {
    return (
      <Screen edges="top">
        <Eyebrow>Account</Eyebrow>
        <H1 style={{ marginTop: 4 }}>Your account</H1>
        <Card>
          <H2>Own a SecureTag?</H2>
          <Muted>Log in to manage your tags, or create an account to activate a new one.</Muted>
          <Button label="Log in" size="lg" onPress={() => router.push('/login')} style={{ marginTop: 16 }} />
          <Button label="Create an account" variant="secondary" onPress={() => router.push('/register')} style={{ marginTop: 10 }} />
        </Card>
        <Links />
        <Small center>SecureTag {version}</Small>
      </Screen>
    );
  }

  const email = account?.email ?? session.user.email ?? '';
  const initials =
    ((account?.fullName || '').trim() || email)
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'S';
  const total = tags.length + items.length;
  const mutedCount = Object.values(prefs).filter((on) => !on).length;

  const dirty = !!account && (values.full_name !== (account.fullName ?? '') || values.phone !== (account.phone ?? ''));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setFailed(null);
    setErrors({});
    try {
      await api.updateProfile({ full_name: values.full_name, phone: values.phone });
      await refresh();
      setEdits(null);
      buzz('success');
      setSaved(true);
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      setFailed(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const leave = () =>
    confirm('Log out?', "You won't get scan alerts on this phone until you log in again.", 'Log out', async () => {
      setLeaving(true);
      await signOut();
      setLeaving(false);
    });

  return (
    <Screen edges="top">
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={styles.profileName} numberOfLines={1}>
            {account?.fullName || 'Your account'}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {email}
          </Text>
          <Text style={styles.profileMeta}>
            {total === 0 ? 'No tags yet' : `${total} ${total === 1 ? 'tag' : 'tags'} protected`}
          </Text>
        </View>
      </View>

      <Card style={styles.list}>
        <ListRow
          icon="bell"
          label="Notifications"
          detail={mutedCount ? `${mutedCount} ${mutedCount === 1 ? 'type' : 'types'} turned off` : 'All alerts on'}
          onPress={() => router.push('/notifications')}
        />
        <ListRow icon="key" label="Change password" onPress={() => router.push('/password')} last />
      </Card>

      <Card>
        <H2>Profile</H2>
        <Muted style={{ marginTop: -6, marginBottom: 14 }}>Used to pre-fill the details when you activate a new tag.</Muted>
        <Form
          values={values}
          errors={errors}
          disabled={saving}
          onChange={(v) => {
            setEdits(v);
            setSaved(false);
          }}>
          <View style={{ gap: 14 }}>
            <Field name="full_name" label="Your name" required placeholder="Full name" maxLength={80} autoCapitalize="words" autoComplete="name" />
            <PhoneField name="phone" label="Phone number" hint="10-digit Indian numbers get +91 added." />
            <ReadOnly label="Email" value={email} hint="Your login. It can't be changed here." />
          </View>
        </Form>
        {saved ? (
          <View style={{ marginTop: 14 }}>
            <Notice text="Profile saved." />
          </View>
        ) : null}
        {failed && !Object.keys(errors).length ? (
          <View style={{ marginTop: 14 }}>
            <Notice tone="red" text={failed} />
          </View>
        ) : null}
        <Button label="Save profile" onPress={save} loading={saving} disabled={!dirty} style={{ marginTop: 16 }} />
      </Card>

      <Links />

      <Button label="Log out" icon="logout" variant="danger" onPress={leave} loading={leaving} />
      <Small center>SecureTag {version}</Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 4, paddingHorizontal: 16 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  profileName: { fontSize: 21, lineHeight: 26, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  profileEmail: { fontSize: 13.5, color: C.muted, marginTop: 1 },
  profileMeta: { fontSize: 12.5, color: C.brand, fontWeight: '700', marginTop: 4 },
});
