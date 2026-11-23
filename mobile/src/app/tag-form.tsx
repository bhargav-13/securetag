import { useLocalSearchParams, useRouter } from 'expo-router';
import Stack from 'expo-router/stack';
import { useState } from 'react';
import { View } from 'react-native';

import { api, ApiError } from '@/lib/api';
import { buzz } from '@/lib/device';
import type { Tag } from '@/lib/types';
import { useSession } from '@/state/session';
import { Field, Form, OptionalSection, PhoneField, Section, TextArea, type Values } from '@/ui/form';
import { Button, Card, H1, Loading, Muted, Notice, Pill, Screen, Small } from '@/ui/kit';

const FIELDS = [
  'owner_name',
  'phone',
  'car_model',
  'plate_number',
  'message',
  'emergency_contact_name',
  'emergency_contact_phone',
  'alt_phone',
  'alt_email',
  'address',
] as const;

const fromTag = (tag: Tag): Values => Object.fromEntries(FIELDS.map((k) => [k, tag[k] ?? '']));

/** Vehicle tag details: one form for activating a new tag and editing it later. */
export default function TagForm() {
  const router = useRouter();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const claim = mode === 'claim';
  const { session, account, tags, loading, refresh } = useSession();
  const existing = tags.find((t) => t.id === id);

  // Start from the tag (edit) or the account's name and phone (activate);
  // the person's own edits take over from the first keystroke.
  const [edits, setValues] = useState<Values | null>(null);
  const initial: Values | null = claim
    ? account
      ? { owner_name: account.fullName ?? '', phone: account.phone ?? '' }
      : null
    : existing
      ? fromTag(existing)
      : null;
  const values = edits ?? initial;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!session) {
    return (
      <Screen edges="bottom">
        <Card>
          <H1>Log in first</H1>
          <Muted>You need an account to {claim ? 'activate' : 'edit'} a tag.</Muted>
          <Button label="Log in" size="lg" onPress={() => router.push({ pathname: '/login', params: { code: id } })} style={{ marginTop: 16 }} />
        </Card>
      </Screen>
    );
  }
  if (!values) {
    if (!claim && !loading && account && !existing) {
      return (
        <Screen edges="bottom">
          <Card style={{ gap: 12 }}>
            <Notice tone="red" text="This tag isn't in your account." />
            <Button label="Go back" variant="secondary" onPress={() => router.back()} />
          </Card>
        </Screen>
      );
    }
    return <Loading />;
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      if (claim) await api.claimTag(id, values);
      else await api.updateTag(id, values);
      await refresh();
      buzz('success');
      // Land on the tag itself with a confirmation, replacing this form.
      router.dismissTo({ pathname: '/tag/[code]', params: { code: id, kind: 'vehicle', flash: claim ? 'activated' : 'saved' } });
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
      buzz('warning');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges="bottom">
      <Stack.Screen options={{ title: claim ? 'Activate tag' : 'Edit details' }} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pill label={claim ? 'New tag' : 'Live tag'} tone={claim ? 'amber' : 'green'} />
          <Small>Tag {id}</Small>
        </View>
        <H1 style={{ marginTop: 12 }}>{claim ? 'Activate your tag' : 'Edit vehicle details'}</H1>
        {claim ? (
          <Muted style={{ marginBottom: 8 }}>
            People who scan it can then ask to reach you, and you decide whether to share your number.
          </Muted>
        ) : null}

        <Form values={values} errors={errors} onChange={setValues} disabled={busy}>
          <Section first title="How to reach you" sub="Shared only after you accept a request, or straight away in Lost Mode or an emergency.">
            <Field name="owner_name" label="Your name" required placeholder="Full name" maxLength={80} autoCapitalize="words" autoComplete="name" />
            <PhoneField name="phone" label="Phone number" required hint="10-digit Indian numbers get +91 added." />
          </Section>

          <Section title="Your vehicle" sub="Helps people confirm they've scanned the right car.">
            <Field name="car_model" label="Make & model" placeholder="Hyundai Creta" maxLength={80} autoCapitalize="words" />
            <Field name="plate_number" label="Number plate" placeholder="GJ01 AB 1234" maxLength={20} uppercase />
            <TextArea
              name="message"
              label="Message for people who scan"
              placeholder="Please call if my car is blocking you. Thanks!"
              hint="Shown once your contact is shared."
            />
          </Section>

          <OptionalSection
            title="Emergency contact"
            sub="Someone we can show to helpers if there's an accident."
            fields={['emergency_contact_name', 'emergency_contact_phone']}>
            <Field name="emergency_contact_name" label="Name" placeholder="Spouse, parent or friend" maxLength={80} autoCapitalize="words" />
            <PhoneField name="emergency_contact_phone" label="Phone" autoComplete="off" />
          </OptionalSection>

          <OptionalSection
            title="Backup contact & address"
            sub="Alternate phone, email and where the car is usually parked."
            fields={['alt_phone', 'alt_email', 'address']}>
            <PhoneField name="alt_phone" label="Alternate phone" autoComplete="off" />
            <Field name="alt_email" label="Alternate email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            <TextArea name="address" label="Address / usual parking" placeholder="Home or office address" />
          </OptionalSection>
        </Form>

        {error ? (
          <View style={{ marginTop: 18 }}>
            <Notice tone="red" text={error} />
          </View>
        ) : null}
        <Button
          label={claim ? 'Activate tag' : 'Save changes'}
          size="lg"
          onPress={submit}
          loading={busy}
          style={{ marginTop: 20 }}
        />
        {claim ? (
          <Small center style={{ marginTop: 10 }}>
            You can change these anytime from the app.
          </Small>
        ) : (
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} disabled={busy} style={{ marginTop: 10 }} />
        )}
      </Card>
    </Screen>
  );
}
