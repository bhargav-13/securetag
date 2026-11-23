import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { WEB_URL } from '@/lib/config';
import { useLeaveAuth } from '@/lib/nav';
import { friendlyAuthError, supabase } from '@/lib/supabase';
import { Field, Form, type Values } from '@/ui/form';
import { ShieldMark } from '@/ui/icons';
import { Button, Card, H1, LinkText, Muted, Notice, Screen, Small } from '@/ui/kit';

export default function Login() {
  const router = useRouter();
  const leave = useLeaveAuth();
  const { code, email: emailParam } = useLocalSearchParams<{ code?: string; email?: string }>();
  const [values, setValues] = useState<Values>({ email: emailParam ?? '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const email = (values.email ?? '').trim();
    const password = values.password ?? '';
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      setError(friendlyAuthError(err.message));
      return;
    }
    leave();
  };

  return (
    <Screen edges="bottom">
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <ShieldMark size={52} />
      </View>
      <Card>
        <H1>Welcome back</H1>
        <Muted style={{ marginBottom: 16 }}>
          {code ? `Log in to activate tag ${code}. You'll come straight back to it.` : 'Log in to manage your tags and answer contact requests.'}
        </Muted>
        <Form values={values} onChange={setValues} disabled={busy}>
          <View style={{ gap: 14 }}>
            <Field
              name="email"
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <Field
              name="password"
              label="Password"
              secure
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
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
        <Button label="Log in" size="lg" onPress={submit} loading={busy} style={{ marginTop: 18 }} />
        <View style={{ alignItems: 'center', marginTop: 16, minHeight: 28, justifyContent: 'center' }}>
          <LinkText label="Forgot password?" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/forgot`).catch(() => {})} />
        </View>
      </Card>
      <Small center>
        New to SecureTag?{' '}
        <LinkText label="Create an account" onPress={() => router.replace({ pathname: '/register', params: code ? { code } : {} })} />
      </Small>
    </Screen>
  );
}
