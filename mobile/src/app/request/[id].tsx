import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AcceptDecline, ReasonTile, STATUS, useLostToggle, useRespond } from '@/components/cards';
import MapPreview from '@/components/MapPreview';
import { isUrgentReason, timeAgo } from '@/lib/codes';
import type { ItemScan, LegacyItem, ScanRequest, Tag } from '@/lib/types';
import { useSession } from '@/state/session';
import { Icon } from '@/ui/icons';
import { Button, Card, Empty, Fact, H1, IconTile, Loading, Muted, Notice, Pill, Plate, Screen, Small } from '@/ui/kit';
import { C, MAX_WIDTH, shadow } from '@/ui/theme';

const fullTime = (iso: string) =>
  new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/* ------------------------------ vehicle scan ------------------------------ */

function VehicleRequest({ req, tag }: { req: ScanRequest; tag?: Tag }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { busy, respond } = useRespond(req.id);
  const pending = req.status === 'pending';
  const urgent = isUrgentReason(req.reason);
  const status = STATUS[req.status] ?? { label: req.status, tone: 'brand' as const };
  const located = req.scanner_lat != null && req.scanner_lng != null;

  let outcome: { tone: 'green' | 'amber' | 'brand' | 'red'; text: string } | null = null;
  if (req.status === 'accepted')
    outcome = { tone: 'green', text: `You shared your contact${req.responded_at ? ` ${timeAgo(req.responded_at).toLowerCase()}` : ''}.` };
  else if (req.status === 'declined') outcome = { tone: 'brand', text: 'You declined. Your contact was not shared.' };
  else if (req.status === 'auto')
    outcome = urgent
      ? { tone: 'red', text: 'Reported as urgent, so your contact and emergency contact were shared right away.' }
      : { tone: 'amber', text: 'Lost Mode was on, so your contact was shared right away.' };

  return (
    <Screen
      edges="none"
      footer={
        pending ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.footerInner}>
              <AcceptDecline busy={busy} respond={respond} size="lg" />
              <Small center style={{ marginTop: 8 }}>
                They see your number only if you accept.
              </Small>
            </View>
          </View>
        ) : undefined
      }>
      <Card style={styles.headCard}>
        <ReasonTile reason={req.reason} size={64} />
        <H1 center style={{ marginTop: 14, marginBottom: 4 }}>
          {req.reason || 'Contact request'}
        </H1>
        <Muted center>{fullTime(req.created_at)}</Muted>
        <View style={{ marginTop: 12 }}>
          <Pill label={pending ? 'Waiting for your answer' : status.label} tone={status.tone} icon={pending ? 'clock' : undefined} />
        </View>
      </Card>

      {outcome ? <Notice tone={outcome.tone} icon={req.status === 'declined' ? 'x' : 'check'} text={outcome.text} /> : null}

      {req.scanner_message ? (
        <Card>
          <Small>Their note</Small>
          <Text style={styles.quote}>&ldquo;{req.scanner_message}&rdquo;</Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.vehicleRow}>
          <IconTile icon="car" size={44} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.vehicleName}>{tag?.car_model || 'Your vehicle'}</Text>
            {tag?.plate_number ? <Plate number={tag.plate_number} small /> : <Small>Tag {req.tag_id}</Small>}
          </View>
          {tag ? (
            <Button
              label="Open"
              variant="secondary"
              size="sm"
              onPress={() => router.push({ pathname: '/tag/[code]', params: { code: tag.id, kind: 'vehicle' } })}
            />
          ) : null}
        </View>
        {located ? (
          <MapPreview lat={req.scanner_lat!} lng={req.scanner_lng!} />
        ) : (
          <View style={styles.noLoc}>
            <Icon name="pin" size={15} color={C.muted} />
            <Small style={{ flex: 1 }}>The scanner didn&apos;t share a location.</Small>
          </View>
        )}
      </Card>

      {pending ? (
        <Card>
          <Small>If you accept, they will see</Small>
          <View style={{ marginTop: 2 }}>
            <Fact k="Name" v={tag?.owner_name} />
            <Fact k="Phone" v={tag?.phone} />
            <Fact k="Alternate phone" v={tag?.alt_phone} />
            <Fact k="Message" v={tag?.message} />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

/* -------------------------------- item scan -------------------------------- */

function ItemScanDetail({ scan, item }: { scan: ItemScan; item?: LegacyItem }) {
  const router = useRouter();
  const lost = useLostToggle('item', scan.code, !!item?.lost_mode);
  const located = scan.lat != null && scan.lng != null;
  const name = item?.item_name || 'Your item';
  return (
    <Screen edges="bottom">
      <Card style={styles.headCard}>
        <IconTile icon="bag" tone={item?.lost_mode ? 'amber' : 'brand'} size={64} />
        <H1 center style={{ marginTop: 14, marginBottom: 4 }}>
          {name} was scanned
        </H1>
        <Muted center>{fullTime(scan.scanned_on)}</Muted>
        <View style={{ marginTop: 12 }}>
          {item?.lost_mode ? <Pill label="Lost Mode on" tone="amber" icon="alert" /> : <Pill label="Details stayed private" tone="green" icon="lock" />}
        </View>
      </Card>

      <Notice
        tone={item?.lost_mode ? 'amber' : 'brand'}
        icon="info"
        text={
          item?.lost_mode
            ? 'The person who scanned it could see your contact details and may get in touch.'
            : 'The person who scanned it saw only that the item is secured. If it is missing, turn on Lost Mode so a finder can reach you.'
        }
      />

      <Card>
        {located ? (
          <View style={{ marginTop: -12 }}>
            <MapPreview lat={scan.lat!} lng={scan.lng!} />
          </View>
        ) : (
          <View style={[styles.noLoc, { marginTop: 0 }]}>
            <Icon name="pin" size={15} color={C.muted} />
            <Small style={{ flex: 1 }}>The scanner didn&apos;t share a location.</Small>
          </View>
        )}
        {item ? (
          <View style={{ gap: 8, marginTop: 16 }}>
            {!item.lost_mode ? (
              <Button label="Turn on Lost Mode" icon="alert" variant="amber" loading={lost.busy} onPress={lost.toggle} />
            ) : null}
            <Button
              label="Open item"
              variant="secondary"
              onPress={() => router.push({ pathname: '/tag/[code]', params: { code: item.id, kind: 'legacy' } })}
            />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

/* --------------------------------- screen --------------------------------- */

export default function RequestScreen() {
  const router = useRouter();
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const { session, account, tags, items, scans, itemScans, loading, refresh } = useSession();
  // A notification can arrive before the list has been reloaded: look once more.
  const [looked, setLooked] = useState(false);

  const scan = kind === 'item' ? undefined : scans.find((s) => s.id === id);
  const itemScan = kind === 'item' ? itemScans.find((s) => s.id === id) : undefined;
  const found = !!scan || !!itemScan;
  const userId = session?.user.id;

  useEffect(() => {
    if (found || looked || !userId) return;
    let alive = true;
    refresh().finally(() => {
      if (alive) setLooked(true);
    });
    return () => {
      alive = false;
    };
  }, [found, looked, userId, refresh]);

  if (!session) {
    return (
      <Screen edges="bottom">
        <Empty icon="lock" title="Log in to see this request" text="Scan requests are only visible to the tag's owner.">
          <Button label="Log in" onPress={() => router.push('/login')} style={styles.stretch} />
        </Empty>
      </Screen>
    );
  }
  if (scan) return <VehicleRequest req={scan} tag={tags.find((t) => t.id === scan.tag_id)} />;
  if (itemScan) return <ItemScanDetail scan={itemScan} item={items.find((t) => t.id === itemScan.code)} />;
  if ((loading && !account) || !looked) return <Loading label="Loading request" />;

  return (
    <Screen edges="bottom">
      <Empty icon="clock" title="Request not found" text="It may be an older scan that is no longer in your recent history.">
        <Button label="See all alerts" variant="secondary" onPress={() => router.navigate('/alerts')} style={styles.stretch} />
      </Empty>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headCard: { alignItems: 'center', paddingVertical: 24 },
  quote: { fontSize: 17, lineHeight: 25, color: C.text, fontStyle: 'italic', marginTop: 6 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleName: { fontSize: 16, fontWeight: '700', color: C.text },
  noLoc: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  stretch: { alignSelf: 'stretch', marginTop: 12 },
  footer: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 0,
    ...shadow,
  },
  footerInner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
});
