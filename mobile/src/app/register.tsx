import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { api } from '@/lib/api';
import { useLeaveAuth } from '@/lib/nav';
import { friendlyAuthError, supabase } from '@/lib/supabase';
import { Field, Form, PhoneField, type Values } from '@/ui/form';
import { Button, Card, H1, LinkText, Muted, Notice, Screen, Small } from '@/ui/kit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Same rule as the website: 10-digit Indian numbers get +91, anything else
 *  must be a full international number. Returns null if it can't be real. */
function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s\-().]/g, '');
  if (!s) return null;
  const plus = s.startsWith('+');
  const digits = s.replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) return null;
  if (plus) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
}

export default function Register() {
  const router = useRouter();
  const leave = useLeaveAuth();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [values, setValues] = useState<Values>({ full_name: '', phone: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const full_name = (values.full_name ?? '').trim().replace(/\s+/g, ' ');
    const email = (values.email ?? '').trim().toLowerCase();
    const password = values.password ?? '';
    const phone = normalizePhone(values.phone ?? '');

    const fe: Record<string, string> = {};
    if (!full_name) fe.full_name = 'Enter your name.';
    if (!(values.phone ?? '').trim()) fe.phone = 'Enter a phone number.';
    else if (!phone) fe.phone = 'Enter a valid number, e.g. 98765 43210 or +44 7700 900123.';
    if (!email) fe.email = 'Enter your email.';
    else if (!EMAIL_RE.test(email)) fe.email = 'Enter a valid email address.';
    if (password.length < 6) fe.password = 'Use at least 6 characters.';
    setErrors(fe);
    if (Object.keys(fe).length) {
      setError('Please fix the highlighted fields.');
      return;
    }

    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, phone } },
    });
    if (err) {
      setBusy(false);
      setError(friendlyAuthError(err.message));
      return;
    }
    // With email confirmation on, Supabase hides "already registered" behind a
    // user that has no identities. Say so instead of promising an email.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setBusy(false);
      setError('An account with this email already exists. Log in instead.');
      return;
    }
    if (!data.session) {
      // Email confirmation is on: they finish in their inbox, then log in here.
      setBusy(false);
      setSentTo(email);
      return;
    }
    // Signed in straight away: copy the name onto the profile row.
    await api.updateProfile({ full_name, phone: phone ?? '' }).catch(() => {});
    setBusy(false);
    leave();
  };

  if (sentTo) {
    return (
      <Screen edges="bottom">
        <Card>
          <H1>Check your email</H1>
          <Muted>
            We sent a confirmation link to {sentTo}. Open it, then come back here and log in
            {code ? ` to activate tag ${code}` : ''}.
          </Muted>
          <Button
            label="I've confirmed, log in"
            size="lg"
            onPress={() => router.replace({ pathname: '/login', params: { email: sentTo, ...(code ? { code } : {}) } })}
            style={{ marginTop: 18 }}
          />
          <Small center style={{ marginTop: 12 }}>
            No email after a minute? Check your spam folder.
          </Small>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen edges="bottom">
      <Card>
        <H1>Create your account</H1>
        <Muted style={{ marginBottom: 16 }}>
          {code ? `One quick step before activating tag ${code}.` : 'It takes a minute. Then scan your tag to activate it.'}
        </Muted>
        <Form values={values} errors={errors} onChange={setValues} disabled={busy}>
          <View style={{ gap: 14 }}>
            <Field name="full_name" label="Your name" required placeholder="Full name" maxLength={80} autoCapitalize="words" autoComplete="name" />
            <PhoneField name="phone" label="Phone number" required hint="10-digit Indian numbers get +91 added." />
            <Field
              name="email"
              label="Email"
              required
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <Field
              name="password"
              label="Password"
              required
              secure
              hint="At least 6 characters."
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
        <Button label="Create account" size="lg" onPress={submit} loading={busy} style={{ marginTop: 18 }} />
      </Card>
      <Small center>
        Already have an account?{' '}
        <LinkText label="Log in" onPress={() => router.replace({ pathname: '/login', params: code ? { code } : {} })} />
      </Small>
    </Screen>
  );
}
