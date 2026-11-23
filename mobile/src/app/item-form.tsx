import { useLocalSearchParams, useRouter } from 'expo-router';
import Stack from 'expo-router/stack';
import { useState } from 'react';
import { View } from 'react-native';

import { api, ApiError } from '@/lib/api';
import { ITEM_TYPE_OPTIONS, ITEM_TYPES } from '@/lib/codes';
import { buzz } from '@/lib/device';
import type { LegacyItem } from '@/lib/types';
import { useSession } from '@/state/session';
import { ChoiceChips, Field, Form, OptionalSection, PhoneField, ReadOnly, Section, Select, TextArea, type Values } from '@/ui/form';
import { Button, Card, H1, Loading, Muted, Notice, Pill, Screen, Small } from '@/ui/kit';

const FIELDS = ['item_name', 'owner_name', 'phone', 'alt_phone', 'message', 'address', 'city', 'state', 'country'] as const;

function fromItem(item: LegacyItem): Values {
  const v: Values = Object.fromEntries(FIELDS.map((k) => [k, item[k] ?? '']));
  // An unknown stored type must not silently turn into the first option.
  v.item_type = item.item_type && ITEM_TYPES[item.item_type] ? item.item_type : 'OTHER';
  const pref = (item.pref_contact || '').toUpperCase();
  v.pref_contact = ['PHONE', 'EMAIL'].filter((p) => pref === '' || pref.includes(p)).join(',');
  return v;
}

/** Luggage / wallet / other item details: activate a blank code or edit one. */
export default function ItemForm() {
  const router = useRouter();
  const { code, mode } = useLocalSearchParams<{ code: string; mode?: string }>();
  const claim = mode === 'claim';
  const { session, account, items, loading, refresh } = useSession();
  const existing = items.find((t) => t.id === code);

  // Derived starting values; the person's own edits take over once they type.
  const [edits, setValues] = useState<Values | null>(null);
  const initial: Values | null = claim
    ? account
      ? {
          owner_name: account.fullName ?? '',
          phone: account.phone ?? '',
          item_type: 'TRAVELLUGGAGE',
          pref_contact: 'PHONE,EMAIL',
          country: 'India',
        }
      : null
    : existing
      ? fromItem(existing)
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
          <Button label="Log in" size="lg" onPress={() => router.push({ pathname: '/login', params: { code } })} style={{ marginTop: 16 }} />
        </Card>
      </Screen>
    );
  }
  if (!values) {
    if (!claim && !loading && account && !existing) {
      return (
        <Screen edges="bottom">
          <Card style={{ gap: 12 }}>
            <Notice tone="red" text="This item isn't in your account." />
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
    // The API expects pref_contact as a list, like the website's checkboxes.
    const body = { ...values, pref_contact: (values.pref_contact ?? '').split(',').filter(Boolean) };
    try {
      if (claim) await api.claimItem(code, body);
      else await api.updateItem(code, body);
      await refresh();
      buzz('success');
      router.dismissTo({ pathname: '/tag/[code]', params: { code, kind: 'legacy', flash: claim ? 'activated' : 'saved' } });
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
      <Stack.Screen options={{ title: claim ? 'Activate tag' : 'Edit item' }} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pill label={claim ? 'New tag' : 'Your item'} tone={claim ? 'amber' : 'green'} />
          <Small>Tag {code}</Small>
        </View>
        <H1 style={{ marginTop: 12 }}>{claim ? 'Activate your tag' : 'Edit item details'}</H1>

        <Form values={values} errors={errors} onChange={setValues} disabled={busy}>
          <Section first title="Your item">
            <Field name="item_name" label="Item name" required placeholder="Blue American Tourister" maxLength={80} autoCapitalize="sentences" />
            <Select name="item_type" label="Type" required options={ITEM_TYPE_OPTIONS} />
            <TextArea
              name="message"
              label="Message for the finder"
              placeholder="Reward if found! Has a red ribbon on the handle."
              hint="Shown only while the item is marked Lost."
            />
          </Section>

          <Section title="How a finder reaches you" sub="Your details stay hidden until you mark the item as Lost.">
            <Field name="owner_name" label="Your name" required placeholder="Full name" maxLength={80} autoCapitalize="words" autoComplete="name" />
            <PhoneField name="phone" label="Phone number" required hint="10-digit Indian numbers get +91 added." />
            <PhoneField name="alt_phone" label="Second phone" autoComplete="off" />
            <ReadOnly label="Email" value={account?.email ?? session.user.email ?? ''} hint="Your account email. It links this item to you." />
            <ChoiceChips
              name="pref_contact"
              label="When Lost, show the finder my"
              options={[
                ['PHONE', 'Phone number'],
                ['EMAIL', 'Email'],
              ]}
            />
          </Section>

          <OptionalSection title="Address" sub="Private: never shown to finders. Helps support return the item." fields={['address', 'city', 'state']}>
            <TextArea name="address" label="Street address" placeholder="House, street, area, PIN code" />
            <Field name="city" label="City" maxLength={60} autoCapitalize="words" />
            <Field name="state" label="State" maxLength={60} autoCapitalize="words" />
            <Field name="country" label="Country" maxLength={60} autoCapitalize="words" />
          </OptionalSection>
        </Form>

        {error ? (
          <View style={{ marginTop: 18 }}>
            <Notice tone="red" text={error} />
          </View>
        ) : null}
        <Button label={claim ? 'Activate tag' : 'Save changes'} size="lg" onPress={submit} loading={busy} style={{ marginTop: 20 }} />
        {claim ? (
          <Small center style={{ marginTop: 10 }}>
            You can edit this and turn on Lost Mode anytime from the app.
          </Small>
        ) : (
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} disabled={busy} style={{ marginTop: 10 }} />
        )}
      </Card>
    </Screen>
  );
}
