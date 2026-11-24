import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { WEB_URL } from '@/lib/config';
import { buzz } from '@/lib/device';
import { friendlyAuthError, supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { Field, Form, type Values } from '@/ui/form';
import { Button, Card, Empty, H1, LinkText, Muted, Notice, Screen } from '@/ui/kit';

/** Change the password of the signed-in account, without leaving the app. */
export default function ChangePassword() {
  const router = useRouter();
  const { session } = useSession();
  const [values, setValues] = useState<Values>({ current: '', next: '', again: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const email = session?.user.email;
  if (!session || !email) {
    return (
      <Screen edges="bottom">
        <Empty icon="lock" title="Log in first" text="You need to be logged in to change your password.">
          <Button label="Log in" onPress={() => router.push('/login')} style={{ marginTop: 12, alignSelf: 'stretch' }} />
        </Empty>
      </Screen>
    );
  }

  const submit = async () => {
    const current = values.current ?? '';
    const next = values.next ?? '';
    const again = values.again ?? '';
    const found: Record<string, string> = {};
    if (!current) found.current = 'Enter your current password.';
    if (next.length < 6) found.next = 'Use at least 6 characters.';
    else if (next === current) found.next = 'Choose a password different from the current one.';
    if (again !== next) found.again = "The two passwords don't match.";
    setErrors(found);
    setError(null);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      // Prove it is really the owner before changing anything.
      const check = await supabase.auth.signInWithPassword({ email, password: current });
      if (check.error) {
        if (check.error.message.toLowerCase().includes('invalid login')) setErrors({ current: "That isn't your current password." });
        else setError(friendlyAuthError(check.error.message));
        return;
      }
      const { error: err } = await supabase.auth.updateUser({ password: next });
      if (err) {
        setError(friendlyAuthError(err.message));
        return;
      }
      buzz('success');
      setValues({ current: '', next: '', again: '' });
      setDone(true);
    } catch {
      setError("Can't reach SecureTag. Check your internet connection.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Screen edges="bottom">
        <Card style={{ gap: 14 }}>
          <H1 style={{ marginBottom: 0 }}>Password changed</H1>
          <Notice text="Use your new password the next time you log in, here and on securetag.in." />
          <Button label="Done" size="lg" onPress={() => (router.canGoBack() ? router.back() : router.replace('/account'))} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen edges="bottom">
      <Card>
        <H1>Change password</H1>
        <Muted style={{ marginBottom: 16 }}>For {email}. You stay logged in on this phone.</Muted>
        <Form values={values} errors={errors} onChange={setValues} disabled={busy}>
          <View style={{ gap: 14 }}>
            <Field name="current" label="Current password" secure autoCapitalize="none" autoComplete="current-password" textContentType="password" returnKeyType="next" />
            <Field
              name="next"
              label="New password"
              secure
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              hint="At least 6 characters."
              returnKeyType="next"
            />
            <Field
              name="again"
              label="New password again"
              secure
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          </View>
        </Form>
        {error ? (
          <View style={{ marginTop: 14 }}>
            <Notice tone="red" text={error} />
          </View>
        ) : null}
        <Button label="Change password" size="lg" onPress={submit} loading={busy} style={{ marginTop: 18 }} />
        <View style={{ alignItems: 'center', marginTop: 16, minHeight: 28, justifyContent: 'center' }}>
          <LinkText label="Forgot your current password?" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/forgot`).catch(() => {})} />
        </View>
      </Card>
    </Screen>
  );
}
