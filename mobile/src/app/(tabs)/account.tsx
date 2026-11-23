import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { confirm } from '@/components/cards';
import { api, ApiError } from '@/lib/api';
import { WEB_URL } from '@/lib/config';
import { buzz } from '@/lib/device';
import { useSession } from '@/state/session';
import { Field, Form, PhoneField, ReadOnly, type Values } from '@/ui/form';
import { Icon, type IconName } from '@/ui/icons';
import { Button, Card, Eyebrow, H1, H2, Muted, Notice, Screen, Small } from '@/ui/kit';
import { C } from '@/ui/theme';

function LinkRow({ icon, label, onPress, last }: { icon: IconName; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => [styles.linkRow, !last && styles.linkRowBorder, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={19} color={C.brand} />
      <Text style={styles.linkLabel}>{label}</Text>
      <Icon name="chevronRight" size={18} color={C.muted} />
    </Pressable>
  );
}

function Links() {
  return (
    <Card style={{ paddingVertical: 6 }}>
      <LinkRow icon="external" label="Open securetag.in" onPress={() => WebBrowser.openBrowserAsync(WEB_URL).catch(() => {})} />
      <LinkRow
        icon="mail"
        label="Contact support"
        onPress={() => Linking.openURL('mailto:support@securetag.in?subject=SecureTag%20app').catch(() => {})}
        last
      />
    </Card>
  );
}

export default function Account() {
  const router = useRouter();
  const { session, account, refresh, signOut } = useSession();
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
      <Eyebrow>Account</Eyebrow>
      <H1 style={{ marginTop: 4, marginBottom: 0 }}>Your account</H1>

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
            <ReadOnly label="Email" value={account?.email ?? session.user.email ?? ''} hint="Your login. It can't be changed here." />
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

      <Card style={{ paddingVertical: 6 }}>
        <LinkRow
          icon="lock"
          label="Change password"
          onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/forgot`).catch(() => {})}
          last
        />
      </Card>

      <Links />

      <Button label="Log out" icon="logout" variant="danger" onPress={leave} loading={leaving} />
      <Small center>SecureTag {version}</Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  linkRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
});
