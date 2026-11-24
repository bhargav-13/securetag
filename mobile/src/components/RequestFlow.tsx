import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '@/lib/api';
import { REASONS } from '@/lib/codes';
import { buzz, call, getPosition } from '@/lib/device';
import { getPushToken, notifyNow, prepareNotifications } from '@/lib/notifications';
import type { Contact } from '@/lib/types';
import { Icon, PathIcon, ShieldMark } from '@/ui/icons';
import { Bold, Button, Card, Fact, H1, Muted, Notice, Pill, Small } from '@/ui/kit';
import { C, R } from '@/ui/theme';

/** Resolves with the promise, or null if it takes longer than `ms`. */
const within = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

/** The answer came in while the scanner was looking at another app. */
function tellScanner(accepted: boolean, tagId: string, requestId: string) {
  if (AppState.currentState === 'active') return;
  notifyNow(
    'reply',
    accepted ? 'The owner shared their contact' : 'The owner declined',
    accepted ? 'Open SecureTag to call them.' : 'They chose not to share their contact this time.',
    { tagId, requestId }
  );
}

const pendingKey = (tagId: string) => `securetag:pending:${tagId}`;
const forget = (tagId: string) => AsyncStorage.removeItem(pendingKey(tagId)).catch(() => {});

type Phase = 'loading' | 'reason' | 'submitting' | 'pending' | 'accepted' | 'declined' | 'error';

/* ------------------------------ contact card ------------------------------ */

function ContactCard({
  contact,
  lostMode,
  requestId,
  reason,
}: {
  contact: Contact;
  lostMode: boolean;
  requestId: string;
  reason: string | null;
}) {
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);

  // In an emergency the owner may be the person in trouble, so lead with the
  // alternate / emergency number and keep the owner's own line second.
  const urgent = reason === 'Emergency' || reason === 'Accident';
  const numbers: { label: string; phone: string }[] = [];
  if (contact.phone) numbers.push({ label: `Call ${contact.owner_name || 'the owner'}`, phone: contact.phone });
  if (contact.alt_phone) numbers.push({ label: 'Call alternate number', phone: contact.alt_phone });
  if (contact.emergency_contact_phone)
    numbers.push({
      label: `Call emergency contact${contact.emergency_contact_name ? ` (${contact.emergency_contact_name})` : ''}`,
      phone: contact.emergency_contact_phone,
    });
  if (urgent && numbers.length > 1) numbers.push(numbers.shift()!);

  const shareLocation = async () => {
    setSharing(true);
    setShareFailed(false);
    const pos = await getPosition();
    if (!pos) {
      setSharing(false);
      setShareFailed(true);
      return;
    }
    try {
      await api.shareLocation(requestId, pos.lat, pos.lng);
      setShared(true);
      buzz('success');
    } catch {
      setShareFailed(true);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card>
      <Pill label="Contact shared" tone="green" icon="check" />
      <H1 style={{ marginTop: 12 }}>Contact the owner</H1>
      {contact.message ? <Muted>{contact.message}</Muted> : null}
      <View style={{ marginTop: 10 }}>
        <Fact k="Owner" v={contact.owner_name} />
        <Fact k="Phone" v={contact.phone} onPress={() => call(contact.phone)} />
        <Fact k="Vehicle" v={contact.car_model} />
        <Fact k="Number plate" v={contact.plate_number} />
        <Fact k="Address" v={contact.address} />
        <Fact k="Email" v={contact.alt_email} />
      </View>
      <View style={{ gap: 8, marginTop: 16 }}>
        {numbers.map((n, i) => (
          <Button
            key={n.phone + n.label}
            label={n.label}
            icon="phone"
            size={i === 0 ? 'lg' : 'md'}
            variant={i === 0 ? 'accept' : 'secondary'}
            onPress={() => call(n.phone)}
          />
        ))}
      </View>
      {lostMode ? (
        <View style={styles.lostNote}>
          <Text style={styles.lostText}>
            <Bold>This car is marked lost.</Bold>{' '}
            {shared ? 'Thanks. Your location was shared with the owner.' : 'Help the owner locate it:'}
          </Text>
          {!shared ? (
            <Button label="Share my location" icon="pin" size="sm" onPress={shareLocation} loading={sharing} style={{ marginTop: 10 }} />
          ) : null}
          {shareFailed ? <Small style={{ marginTop: 8, color: C.red }}>Couldn&apos;t get your location. Check that location is allowed, then try again.</Small> : null}
        </View>
      ) : null}
    </Card>
  );
}

function Waiting({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={{ alignItems: 'center' }}>
      <View style={styles.pulse}>
        <ShieldMark size={44} />
        <ActivityIndicator color={C.brand} style={styles.pulseSpin} />
      </View>
      <H1 center style={{ marginTop: 14 }}>
        {title}
      </H1>
      {children}
    </Card>
  );
}

/* ------------------------------ the flow ------------------------------ */

/** Scanner side of a registered vehicle tag: pick a reason, alert the owner,
 *  wait for Accept (or get the contact at once in Lost Mode / emergencies). */
export default function RequestFlow({ tagId, lostMode }: { tagId: string; lostMode: boolean }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [reason, setReason] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [requestId, setRequestId] = useState('');
  const [contact, setContact] = useState<Contact | null>(null);
  const [err, setErr] = useState('');
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Resume a request that is still waiting (app was closed or screen left).
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(pendingKey(tagId))
      .then((saved) => {
        if (cancelled) return;
        if (saved) {
          setRequestId(saved);
          setPhase('pending');
        } else setPhase('reason');
      })
      .catch(() => !cancelled && setPhase('reason'));
    return () => {
      cancelled = true;
    };
  }, [tagId]);

  // Poll for the owner's answer while pending.
  useEffect(() => {
    if (phase !== 'pending' || !requestId) return;
    let stop = false;
    const tick = async () => {
      try {
        const data = await api.scanStatus(requestId);
        if (stop) return;
        if (data.status === 'accepted' || data.status === 'auto') {
          forget(tagId);
          if (data.contact) {
            setContact(data.contact);
            setPhase('accepted');
            buzz('success');
            tellScanner(true, tagId, requestId);
          } else {
            setErr('The owner accepted, but their details could not be loaded. Please scan again.');
            setPhase('error');
          }
        } else if (data.status === 'declined') {
          forget(tagId);
          setPhase('declined');
          buzz('warning');
          tellScanner(false, tagId, requestId);
        } else if (data.status === 'notfound') {
          forget(tagId);
          setPhase('reason');
        }
      } catch {
        /* offline for a moment: keep polling */
      }
    };
    tick();
    const timer = setInterval(tick, 2500);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [phase, requestId, tagId]);

  const submit = async () => {
    if (!reason) return;
    setPhase('submitting');
    // Location first, so the owner's alert says where the car is.
    const pos = await getPosition();
    // So this phone hears the owner's answer even if the app is closed.
    // Never holds the request up: a slow or unanswered prompt is skipped.
    const pushToken = await within(
      prepareNotifications().then(() => getPushToken({ ask: false })),
      4000
    );
    try {
      const res = await api.createScan({
        tagId,
        reason,
        message: message.trim() || undefined,
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null,
        pushToken,
      });
      if (!alive.current) return;
      setRequestId(res.requestId);
      if (res.status === 'auto' && res.contact) {
        setContact(res.contact);
        setPhase('accepted');
        buzz('success');
      } else {
        AsyncStorage.setItem(pendingKey(tagId), res.requestId).catch(() => {});
        setPhase('pending');
      }
    } catch (e) {
      if (!alive.current) return;
      setErr(e instanceof Error ? e.message : 'Please try again.');
      setPhase('error');
    }
  };

  const startOver = () => {
    forget(tagId);
    setRequestId('');
    setContact(null);
    setErr('');
    setPhase('reason');
  };

  if (phase === 'loading') {
    return (
      <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
        <ActivityIndicator color={C.brand} size="large" />
      </Card>
    );
  }

  if (phase === 'accepted' && contact) {
    return <ContactCard contact={contact} lostMode={lostMode} requestId={requestId} reason={reason} />;
  }

  if (phase === 'declined') {
    return (
      <Card style={{ alignItems: 'center', gap: 8 }}>
        <Pill label="Not shared" tone="amber" />
        <H1 center style={{ marginTop: 6 }}>
          Owner didn&apos;t share contact
        </H1>
        <Muted center>
          The owner chose not to share their details right now. If it&apos;s urgent, please contact local authorities.
        </Muted>
        <Button label="Send another request" variant="secondary" onPress={startOver} style={{ alignSelf: 'stretch', marginTop: 10 }} />
      </Card>
    );
  }

  if (phase === 'submitting') {
    return (
      <Waiting title="Alerting the owner…">
        <Muted center>
          If asked, allow location so the owner knows where their car is. You can also say no and the request is still sent.
        </Muted>
      </Waiting>
    );
  }

  if (phase === 'pending') {
    return (
      <Waiting title="Waiting for the owner…">
        <Muted center>
          We&apos;ve alerted the owner that someone needs to reach them{reason ? ` about a ${reason.toLowerCase()}` : ''}. Their
          number stays private until they tap <Bold>Accept</Bold>.
        </Muted>
        <Small center style={{ marginTop: 10 }}>
          This usually takes a moment. You can leave this screen: we&apos;ll notify you when they answer.
        </Small>
        <Button label="Cancel and start over" variant="ghost" size="sm" onPress={startOver} style={{ marginTop: 16 }} />
      </Waiting>
    );
  }

  if (phase === 'error') {
    return (
      <Card style={{ gap: 12 }}>
        <Pill label="Something went wrong" tone="amber" />
        <Notice tone="red" text={err || 'Please try again.'} />
        <Button label="Try again" onPress={startOver} />
      </Card>
    );
  }

  // phase === 'reason'
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pill label="Registered tag" tone="brand" />
        {lostMode ? <Pill label="Marked lost" tone="amber" /> : null}
      </View>
      <H1 style={{ marginTop: 12 }}>Reach the car owner</H1>
      <Muted>
        {lostMode
          ? 'The owner has marked this vehicle as lost. Pick a reason and their contact is shown straight away.'
          : 'Pick a reason. The owner is alerted instantly and their number is shared only if they accept.'}
      </Muted>

      <View style={styles.reasons} accessibilityRole="radiogroup">
        {REASONS.map((r) => {
          const sel = reason === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => {
                buzz('tap');
                setReason(r.key);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={r.label}
              style={({ pressed }) => [styles.reason, sel && styles.reasonSel, pressed && { opacity: 0.8 }]}>
              <View style={[styles.reasonIco, r.urgent && { backgroundColor: C.redSoft }, sel && { backgroundColor: C.brand }]}>
                <PathIcon d={r.path} size={22} color={sel ? C.white : r.urgent ? C.red : C.brand} />
              </View>
              <Text style={[styles.reasonLbl, sel && { color: C.brandInk }]} numberOfLines={2}>
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Add a note (optional)</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="e.g. Your car is blocking gate no. 3."
        placeholderTextColor={C.placeholder}
        multiline
        maxLength={300}
        textAlignVertical="top"
        accessibilityLabel="Note for the owner"
        style={styles.note}
      />

      <Button label="Send request to owner" size="lg" disabled={!reason} onPress={submit} style={{ marginTop: 16 }} />
      <View style={styles.locNote}>
        <Icon name="pin" size={14} color={C.muted} />
        <Small style={{ flex: 1 }}>We&apos;ll ask for your location so the owner knows where their car is.</Small>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16, marginBottom: 18 },
  reason: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface2,
  },
  reasonSel: { borderColor: C.brand, backgroundColor: C.brandTint },
  reasonIco: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' },
  reasonLbl: { fontSize: 12.5, fontWeight: '700', color: C.text, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 7 },
  note: {
    backgroundColor: C.surface2,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 21,
    color: C.text,
    minHeight: 84,
  },
  locNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  lostNote: { marginTop: 16, padding: 14, borderRadius: R.md, backgroundColor: C.amberSoft },
  lostText: { fontSize: 14, lineHeight: 20, color: C.text },
  pulse: { width: 84, height: 84, borderRadius: 26, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' },
  pulseSpin: { position: 'absolute', right: -6, bottom: -6, backgroundColor: C.surface, borderRadius: 14, padding: 4 },
});
