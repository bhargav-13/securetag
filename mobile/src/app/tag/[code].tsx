import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Linking, Platform, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useLostToggle } from '@/components/cards';
import RequestFlow from '@/components/RequestFlow';
import { api } from '@/lib/api';
import { itemTypeLabel } from '@/lib/codes';
import { tagUrl } from '@/lib/config';
import { buzz, call } from '@/lib/device';
import type { LegacyItem, LookupResult, Tag } from '@/lib/types';
import { useSession } from '@/state/session';
import { Icon } from '@/ui/icons';
import { Bold, Button, Card, Empty, Fact, H1, Loading, Muted, Notice, Pill, Screen, Small } from '@/ui/kit';
import { C, R } from '@/ui/theme';

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

function CodeChip({ code }: { code: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{code}</Text>
    </View>
  );
}

/* ------------------------------ unregistered ------------------------------ */

function Activate({ code, kind }: { code: string; kind: 'vehicle' | 'legacy' }) {
  const router = useRouter();
  const { session } = useSession();
  const form = kind === 'vehicle' ? '/tag-form' : '/item-form';
  const params = kind === 'vehicle' ? { id: code, mode: 'claim' } : { code, mode: 'claim' };

  if (session) {
    return (
      <Card>
        <View style={styles.spread}>
          <Pill label="New tag" tone="amber" />
          <CodeChip code={code} />
        </View>
        <H1 style={{ marginTop: 12 }}>Activate your tag</H1>
        <Muted>
          {kind === 'vehicle'
            ? 'Takes a minute. People who scan it can then ask to reach you, and you decide whether to share your number.'
            : 'Takes a minute. If the item goes missing, turn on Lost Mode and whoever finds it can reach you.'}
        </Muted>
        <Button
          label={kind === 'vehicle' ? 'Add vehicle details' : 'Add item details'}
          icon="arrowRight"
          size="lg"
          onPress={() => router.push({ pathname: form, params })}
          style={{ marginTop: 18 }}
        />
      </Card>
    );
  }

  return (
    <Card style={{ alignItems: 'center', gap: 6 }}>
      <Pill label="New tag" tone="amber" />
      <H1 center style={{ marginTop: 8 }}>
        Activate this tag
      </H1>
      <Muted center>This SecureTag isn&apos;t linked to anyone yet. If it&apos;s yours, activate it in two quick steps:</Muted>
      <View style={styles.steps}>
        <View style={styles.step}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>1</Text>
          </View>
          <Text style={styles.stepText}>
            <Bold>Create an account</Bold> (or log in)
          </Text>
        </View>
        <View style={styles.step}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>2</Text>
          </View>
          <Text style={styles.stepText}>
            <Bold>Add your {kind === 'vehicle' ? 'vehicle' : 'item'} details</Bold> and you&apos;re done
          </Text>
        </View>
      </View>
      <Button
        label="Register & activate"
        size="lg"
        onPress={() => router.push({ pathname: '/register', params: { code } })}
        style={styles.stretch}
      />
      <Button
        label="I already have an account"
        variant="secondary"
        onPress={() => router.push({ pathname: '/login', params: { code } })}
        style={styles.stretch}
      />
      <Small style={{ marginTop: 6 }}>Tag ID: {code}</Small>
    </Card>
  );
}

/* --------------------------------- owner --------------------------------- */

function shareLink(url: string, what: string) {
  if (Platform.OS === 'web') {
    Clipboard.setStringAsync(url).catch(() => {});
    return;
  }
  Share.share({ message: `${what}: ${url}`, url }).catch(() => {});
}

function OwnerVehicle({ tag, flash }: { tag: Tag; flash?: string }) {
  const router = useRouter();
  const lost = useLostToggle('vehicle', tag.id, tag.lost_mode);
  const [copied, setCopied] = useState(false);
  const url = tagUrl(tag.id);

  const copy = async () => {
    await Clipboard.setStringAsync(url).catch(() => {});
    buzz('success');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {flash === 'activated' ? (
        <Notice text="Your tag is live. When someone scans it, you'll be asked to share your contact." />
      ) : flash === 'saved' ? (
        <Notice text="Changes saved." />
      ) : null}
      <Card>
        <View style={styles.spread}>
          <Pill label="Live tag" tone="green" />
          {tag.lost_mode ? <Pill label="Lost mode ON" tone="amber" icon="alert" /> : <CodeChip code={tag.id} />}
        </View>
        <H1 style={{ marginTop: 12 }}>{tag.car_model || 'Your vehicle'}</H1>
        <View style={{ marginTop: 4 }}>
          <Fact k="Owner" v={tag.owner_name} />
          <Fact k="Phone" v={tag.phone} />
          <Fact k="Number plate" v={tag.plate_number} />
          <Fact k="Emergency contact" v={[tag.emergency_contact_name, tag.emergency_contact_phone].filter(Boolean).join(' · ') || null} />
          <Fact k="Alternate phone" v={tag.alt_phone} />
          <Fact k="Message" v={tag.message} />
        </View>

        <Button
          label={tag.lost_mode ? 'Turn OFF Lost Mode' : 'Turn ON Lost Mode'}
          icon={tag.lost_mode ? undefined : 'alert'}
          variant={tag.lost_mode ? 'secondary' : 'amber'}
          loading={lost.busy}
          onPress={lost.toggle}
          style={{ marginTop: 18 }}
        />
        <Small style={{ marginTop: 10 }}>
          In Lost Mode, anyone who scans instantly sees your contact and can share their location. No Accept needed.
        </Small>
        <Button
          label="Edit details"
          icon="edit"
          variant="secondary"
          onPress={() => router.push({ pathname: '/tag-form', params: { id: tag.id, mode: 'edit' } })}
          style={{ marginTop: 14 }}
        />
      </Card>

      <Card style={{ alignItems: 'center' }}>
        <Text style={styles.qrTitle}>Your tag&apos;s QR code</Text>
        <Muted center style={{ marginBottom: 14 }}>
          This is what people scan. Show it to someone to test, or share the link.
        </Muted>
        <View style={styles.qrBox} accessibilityLabel={`QR code for tag ${tag.id}`}>
          <QRCode value={url} size={184} color={C.text} backgroundColor={C.white} />
        </View>
        <Text style={styles.qrCode}>{tag.id}</Text>
        <View style={styles.qrActions}>
          <Button label={copied ? 'Copied' : 'Copy link'} icon={copied ? 'check' : 'copy'} variant="ghost" size="sm" onPress={copy} style={{ flex: 1 }} />
          <Button label="Share" icon="share" variant="ghost" size="sm" onPress={() => shareLink(url, 'My SecureTag')} style={{ flex: 1 }} />
        </View>
      </Card>
    </>
  );
}

function OwnerItem({ item, flash }: { item: LegacyItem; flash?: string }) {
  const router = useRouter();
  const lost = useLostToggle('item', item.id, item.lost_mode);
  return (
    <>
      {flash === 'activated' ? (
        <Notice text={`Tag ${item.id} is active. Turn on Lost Mode if the item goes missing.`} />
      ) : flash === 'saved' ? (
        <Notice text="Changes saved." />
      ) : null}
      <Card>
        <View style={styles.spread}>
          {item.lost_mode ? <Pill label="Reported lost" tone="amber" icon="alert" /> : <Pill label="Secured" tone="green" />}
          <CodeChip code={item.id} />
        </View>
        <H1 style={{ marginTop: 12 }}>{item.item_name || 'Your item'}</H1>
        <View style={{ marginTop: 4 }}>
          <Fact k="Type" v={itemTypeLabel(item.item_type)} />
          <Fact k="Owner" v={item.owner_name} />
          <Fact k="Phone" v={item.phone} />
          <Fact k="Second phone" v={item.alt_phone} />
          <Fact k="Message" v={item.message} />
        </View>
        <Button
          label={item.lost_mode ? 'Turn OFF Lost Mode' : 'Mark as lost'}
          icon={item.lost_mode ? undefined : 'alert'}
          variant={item.lost_mode ? 'secondary' : 'amber'}
          loading={lost.busy}
          onPress={lost.toggle}
          style={{ marginTop: 18 }}
        />
        <Small style={{ marginTop: 10 }}>
          Your details stay hidden from finders until you mark the item as lost.
        </Small>
        <Button
          label="Edit details"
          icon="edit"
          variant="secondary"
          onPress={() => router.push({ pathname: '/item-form', params: { code: item.id, mode: 'edit' } })}
          style={{ marginTop: 14 }}
        />
      </Card>
    </>
  );
}

/* ------------------------------ finder: items ------------------------------ */

function ItemSecured({ code, name }: { code: string; name: string | null }) {
  const subject = encodeURIComponent(`Found SecureTag item (${code})`);
  return (
    <Card>
      <Pill label="Secured" tone="green" icon="lock" />
      <Small style={{ marginTop: 14 }}>Item</Small>
      <H1>{name || 'SecureTag item'}</H1>
      <Muted>
        This item is registered and secured with its owner. To help return it, contact our team and we&apos;ll reach the owner on your
        behalf.
      </Muted>
      <Button
        label="Contact SecureTag support"
        icon="mail"
        size="lg"
        onPress={() => Linking.openURL(`mailto:support@securetag.in?subject=${subject}`).catch(() => {})}
        style={{ marginTop: 18 }}
      />
      <Small center style={{ marginTop: 10 }}>
        support@securetag.in
      </Small>
    </Card>
  );
}

function ItemLost({ r }: { r: Extract<LookupResult, { kind: 'legacy'; state: 'lost' }> }) {
  const mailto = r.email
    ? `mailto:${r.email}?subject=${encodeURIComponent(`SecureTag item found: ${r.item_name || ''}`.trim())}&body=${encodeURIComponent(
        'Hi, I found your item with a SecureTag. Please reach out so we can arrange a handover. Thank you!'
      )}`
    : null;
  return (
    <Card>
      <Pill label="Reported lost" tone="amber" icon="alert" />
      <H1 style={{ marginTop: 12 }}>Please contact the owner</H1>
      <Muted>You&apos;ve found a lost item protected by SecureTag. The owner is hoping to hear from you.</Muted>
      <Small style={{ marginTop: 14 }}>Item</Small>
      <Text style={styles.itemName}>{r.item_name || 'SecureTag item'}</Text>
      {r.message ? <Text style={styles.ownerMsg}>&ldquo;{r.message}&rdquo;</Text> : null}
      {r.email ? (
        <View style={{ marginTop: 10 }}>
          <Fact k="Email" v={r.email} />
        </View>
      ) : null}
      <View style={{ gap: 8, marginTop: 16 }}>
        {r.phones.map((num, i) => (
          <Button key={num} label={`Call ${num}`} icon="phone" size={i === 0 ? 'lg' : 'md'} variant={i === 0 ? 'accept' : 'secondary'} onPress={() => call(num)} />
        ))}
        {mailto ? (
          <Button
            label="Email the owner"
            icon="mail"
            variant={r.phones.length ? 'secondary' : 'primary'}
            onPress={() => Linking.openURL(mailto).catch(() => {})}
          />
        ) : null}
      </View>
      {r.phones.length === 0 && !r.email ? (
        <Muted style={{ marginTop: 12 }}>
          The owner hasn&apos;t shared direct contact details. Please email support@securetag.in and we&apos;ll connect you.
        </Muted>
      ) : null}
    </Card>
  );
}

/* --------------------------------- screen --------------------------------- */

export default function TagScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code: string; kind?: string; flash?: string }>();
  const code = String(params.code || '');
  const kind = params.kind === 'vehicle' || params.kind === 'legacy' ? params.kind : undefined;
  const { session, tags, items } = useSession();
  const userId = session?.user.id ?? null;

  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // A finder's scan of an item is logged once, not on every refresh.
  const audited = useRef(false);

  const load = useCallback(async () => {
    try {
      const audit = !audited.current;
      audited.current = true;
      setResult(
        await api.lookup(code, { kind, audit, os: Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web' })
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this tag.');
    }
    // userId: look again after logging in or out, the answer depends on who asks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, kind, userId]);

  // Reload whenever the screen comes back into view (after a form or login).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!result && !error) return <Loading label="Looking up this tag" />;

  let body: ReactNode;
  if (!result) {
    body = (
      <Card style={{ gap: 12 }}>
        <Notice tone="red" text={error || 'Could not load this tag.'} />
        <Button label="Try again" onPress={load} />
      </Card>
    );
  } else if (result.kind === 'notfound') {
    body = (
      <Empty icon="tag" title="Tag not found" text={`"${code}" isn't a SecureTag code. Codes are case-sensitive, so check it and try again.`}>
        <Button label="Scan again" icon="qr" onPress={() => router.back()} style={styles.stretch} />
      </Empty>
    );
  } else if (result.kind === 'vehicle') {
    if (result.state === 'unregistered') body = <Activate code={result.id} kind="vehicle" />;
    else if (result.state === 'owner') {
      // Prefer the live copy so Lost Mode changes show at once.
      const tag = tags.find((t) => t.id === result.id) ?? result.tag;
      body = <OwnerVehicle tag={tag} flash={params.flash} />;
    } else {
      body = (
        <>
          <RequestFlow tagId={result.id} lostMode={result.lostMode} />
          <View style={styles.powered}>
            <Icon name="lock" size={13} color={C.muted} />
            <Small>Powered by SecureTag · Your privacy is protected</Small>
          </View>
        </>
      );
    }
  } else if (result.state === 'unregistered') body = <Activate code={result.code} kind="legacy" />;
  else if (result.state === 'owner') {
    const item = items.find((t) => t.id === result.code) ?? result.item;
    body = <OwnerItem item={item} flash={params.flash} />;
  } else if (result.state === 'secured') body = <ItemSecured code={result.code} name={result.item_name} />;
  else body = <ItemLost r={result} />;

  return (
    <Screen edges="bottom" onRefresh={onRefresh} refreshing={refreshing}>
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  chip: { backgroundColor: C.brandSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.sm },
  chipText: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: C.brandInk, letterSpacing: 0.5 },
  stretch: { alignSelf: 'stretch', marginTop: 8 },
  steps: { alignSelf: 'stretch', gap: 10, marginVertical: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 13, fontWeight: '800', color: C.brand },
  stepText: { flex: 1, fontSize: 14.5, lineHeight: 21, color: C.text },
  qrTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 4 },
  qrBox: { padding: 14, backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.border },
  qrCode: { fontFamily: mono, fontSize: 16, fontWeight: '700', letterSpacing: 2, color: C.text, marginTop: 12 },
  qrActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 14 },
  itemName: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 2 },
  ownerMsg: { fontSize: 15, lineHeight: 22, color: C.text, fontStyle: 'italic', marginTop: 10 },
  powered: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
});
