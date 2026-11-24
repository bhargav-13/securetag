import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { api } from '@/lib/api';
import { itemTypeLabel, reasonInfo, timeAgo } from '@/lib/codes';
import { buzz } from '@/lib/device';
import { dismissFor } from '@/lib/notifications';
import type { ItemScan, LegacyItem, ScanRequest, Tag } from '@/lib/types';
import { useSession } from '@/state/session';
import { Icon, PathIcon } from '@/ui/icons';
import { Button, IconTile, Pill, Plate } from '@/ui/kit';
import { C, R, shadow } from '@/ui/theme';

import MapPreview from './MapPreview';

/** Confirm dialog that also works in the web preview. */
export function confirm(title: string, message: string, action: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, onPress: onYes },
  ]);
}

export function showError(message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message);
    return;
  }
  Alert.alert('Something went wrong', message);
}

/* ------------------------- Lost Mode (shared logic) ------------------------- */

export function useLostToggle(kind: 'vehicle' | 'item', id: string, lost: boolean) {
  const { refresh } = useSession();
  const [busy, setBusy] = useState(false);

  const run = async (on: boolean) => {
    setBusy(true);
    try {
      if (kind === 'vehicle') await api.setLostMode(id, on);
      else await api.setItemLostMode(id, on);
      buzz(on ? 'warning' : 'success');
      await refresh();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not change Lost Mode.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = () => {
    if (lost) return run(false);
    confirm(
      'Turn on Lost Mode?',
      kind === 'vehicle'
        ? 'Anyone who scans this tag will see your contact details straight away, without asking you first.'
        : 'Anyone who scans this tag will see your contact details until you turn Lost Mode off.',
      'Turn on',
      () => run(true)
    );
  };

  return { busy, toggle };
}

/** The Lost Mode switch at the bottom of a tag or item card. */
function LostSwitch({ on, busy, onToggle, what }: { on: boolean; busy: boolean; onToggle: () => void; what: string }) {
  return (
    <View style={styles.lostRow}>
      <View style={styles.flex}>
        <Text style={[styles.lostLabel, on && { color: C.amber }]}>Lost Mode</Text>
        <Text style={styles.lostHint} numberOfLines={1}>
          {on ? 'Your contact shows on every scan' : 'Off: your details stay private'}
        </Text>
      </View>
      {busy ? <ActivityIndicator color={C.amber} style={{ marginRight: 10 }} /> : null}
      <Switch
        value={on}
        onValueChange={onToggle}
        disabled={busy}
        trackColor={{ false: '#d5d8ea', true: '#f0b566' }}
        thumbColor={on ? C.amber : C.white}
        ios_backgroundColor="#d5d8ea"
        accessibilityLabel={`Lost Mode for ${what}`}
      />
    </View>
  );
}

/* --------------------------------- tags --------------------------------- */

export function TagCard({ tag, lastScan }: { tag: Tag; lastScan?: string }) {
  const router = useRouter();
  const lost = useLostToggle('vehicle', tag.id, tag.lost_mode);
  const open = () => router.push({ pathname: '/tag/[code]', params: { code: tag.id, kind: 'vehicle' } });
  const name = tag.car_model || 'My vehicle';
  return (
    <View style={[styles.card, tag.lost_mode && styles.lostCard]}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Open ${name} tag`} style={styles.top}>
        <IconTile icon="car" tone={tag.lost_mode ? 'amber' : 'brand'} size={48} />
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {name}
          </Text>
          {tag.plate_number ? <Plate number={tag.plate_number} small /> : null}
        </View>
        {tag.lost_mode ? <Pill label="Lost" tone="amber" icon="alert" /> : <Pill label="Active" tone="green" icon="check" />}
      </Pressable>

      <View style={styles.metaRow}>
        <Icon name="clock" size={13} color={C.muted} />
        <Text style={styles.meta} numberOfLines={1}>
          {lastScan ? `Last scanned ${timeAgo(lastScan).toLowerCase()}` : 'Not scanned yet'}
        </Text>
        <Text style={styles.code}>{tag.id}</Text>
      </View>

      <View style={styles.actions}>
        <Button label="QR & details" icon="qr" variant="secondary" size="sm" onPress={open} style={styles.grow} />
        <Button
          label="Edit"
          icon="edit"
          variant="ghost"
          size="sm"
          onPress={() => router.push({ pathname: '/tag-form', params: { id: tag.id, mode: 'edit' } })}
          style={styles.grow}
        />
      </View>
      <LostSwitch on={tag.lost_mode} busy={lost.busy} onToggle={lost.toggle} what={name} />
    </View>
  );
}

export function ItemCard({ item, lastScan }: { item: LegacyItem; lastScan?: string }) {
  const router = useRouter();
  const lost = useLostToggle('item', item.id, item.lost_mode);
  const open = () => router.push({ pathname: '/tag/[code]', params: { code: item.id, kind: 'legacy' } });
  const name = item.item_name || 'My item';
  return (
    <View style={[styles.card, item.lost_mode && styles.lostCard]}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Open ${name}`} style={styles.top}>
        <IconTile icon="bag" tone={item.lost_mode ? 'amber' : 'brand'} size={48} />
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {itemTypeLabel(item.item_type) || 'Item'}
          </Text>
        </View>
        {item.lost_mode ? <Pill label="Lost" tone="amber" icon="alert" /> : <Pill label="Secured" tone="green" icon="lock" />}
      </Pressable>

      <View style={styles.metaRow}>
        <Icon name="clock" size={13} color={C.muted} />
        <Text style={styles.meta} numberOfLines={1}>
          {lastScan ? `Last scanned ${timeAgo(lastScan).toLowerCase()}` : 'Not scanned yet'}
        </Text>
        <Text style={styles.code}>{item.id}</Text>
      </View>

      <View style={styles.actions}>
        <Button label="Details" icon="eye" variant="secondary" size="sm" onPress={open} style={styles.grow} />
        <Button
          label="Edit"
          icon="edit"
          variant="ghost"
          size="sm"
          onPress={() => router.push({ pathname: '/item-form', params: { code: item.id, mode: 'edit' } })}
          style={styles.grow}
        />
      </View>
      <LostSwitch on={item.lost_mode} busy={lost.busy} onToggle={lost.toggle} what={name} />
    </View>
  );
}

/* ------------------------------- requests ------------------------------- */

export const STATUS: Record<string, { label: string; tone: 'amber' | 'green' | 'brand' }> = {
  pending: { label: 'Waiting', tone: 'amber' },
  accepted: { label: 'Accepted', tone: 'green' },
  auto: { label: 'Auto-shared', tone: 'green' },
  declined: { label: 'Declined', tone: 'brand' },
};

/** Accept / decline, shared by the card, the detail screen and notifications. */
export function useRespond(requestId: string) {
  const { refresh } = useSession();
  const [busy, setBusy] = useState<'accepted' | 'declined' | null>(null);

  const respond = async (decision: 'accepted' | 'declined') => {
    setBusy(decision);
    try {
      await api.respond(requestId, decision);
      buzz('success');
      dismissFor(requestId);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not save your answer.');
    } finally {
      await refresh();
      setBusy(null);
    }
  };
  return { busy, respond };
}

/** Round glyph for a scan reason, coloured by urgency. */
export function ReasonTile({ reason, size = 44, muted }: { reason: string | null; size?: number; muted?: boolean }) {
  const info = reasonInfo(reason);
  const tone = info.urgent ? 'red' : muted ? 'brand' : 'amber';
  const fg = info.urgent ? C.red : muted ? C.brand : C.amber;
  return (
    <IconTile tone={tone} size={size}>
      <PathIcon d={info.path} size={size * 0.5} color={fg} />
    </IconTile>
  );
}

export function AcceptDecline({
  busy,
  respond,
  size = 'md',
}: {
  busy: 'accepted' | 'declined' | null;
  respond: (d: 'accepted' | 'declined') => void;
  size?: 'md' | 'lg';
}) {
  return (
    <View style={styles.answer}>
      <Button
        label="Accept & share"
        icon="check"
        variant="accept"
        size={size}
        loading={busy === 'accepted'}
        disabled={busy !== null}
        onPress={() => respond('accepted')}
        style={{ flex: 2 }}
        accessibilityLabel="Accept and share my contact"
      />
      <Button
        label="Decline"
        variant="danger"
        size={size}
        loading={busy === 'declined'}
        disabled={busy !== null}
        onPress={() => respond('declined')}
        style={styles.grow}
      />
    </View>
  );
}

/** A request waiting for an answer: the most important thing on screen. */
export function RequestCard({ req, tag }: { req: ScanRequest; tag?: Tag }) {
  const router = useRouter();
  const { busy, respond } = useRespond(req.id);
  const open = () => router.push({ pathname: '/request/[id]', params: { id: req.id } });
  return (
    <View style={[styles.card, styles.pendingCard]}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Open request: ${req.reason || 'Contact request'}`} style={styles.top}>
        <ReasonTile reason={req.reason} size={48} />
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={2}>
            {req.reason || 'Contact request'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[tag?.car_model, timeAgo(req.created_at)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Icon name="chevronRight" size={18} color={C.placeholder} />
      </Pressable>
      {tag?.plate_number ? (
        <View style={{ marginTop: 10 }}>
          <Plate number={tag.plate_number} small />
        </View>
      ) : null}
      {req.scanner_message ? <Text style={styles.msg}>&ldquo;{req.scanner_message}&rdquo;</Text> : null}
      {req.scanner_lat != null && req.scanner_lng != null ? <MapPreview lat={req.scanner_lat} lng={req.scanner_lng} /> : null}
      <AcceptDecline busy={busy} respond={respond} />
      <Text style={styles.reqNote}>Your number is shared only if you accept.</Text>
    </View>
  );
}

/** One line of scan history; opens the full request. */
export function HistoryRow({ req, tag, last }: { req: ScanRequest; tag?: Tag; last?: boolean }) {
  const router = useRouter();
  const status = STATUS[req.status] ?? { label: req.status, tone: 'brand' as const };
  const vehicle = tag ? tag.car_model || tag.plate_number : req.tag_id;
  const located = req.scanner_lat != null && req.scanner_lng != null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/request/[id]', params: { id: req.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${req.reason || 'Scan'}, ${status.label}, ${timeAgo(req.created_at)}`}
      style={({ pressed }) => [styles.histRow, !last && styles.histBorder, pressed && { opacity: 0.6 }]}>
      <ReasonTile reason={req.reason} size={40} muted />
      <View style={styles.titles}>
        <Text style={styles.histTitle} numberOfLines={1}>
          {req.reason || 'Contact request'}
        </Text>
        <View style={styles.histMeta}>
          {located ? <Icon name="pin" size={12} color={C.muted} /> : null}
          <Text style={styles.meta} numberOfLines={1}>
            {[vehicle, timeAgo(req.created_at)].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      <Pill label={status.label} tone={status.tone} />
    </Pressable>
  );
}

/** A finder's scan of one of the owner's items. */
export function ItemScanRow({ scan, item, last }: { scan: ItemScan; item?: LegacyItem; last?: boolean }) {
  const router = useRouter();
  const located = scan.lat != null && scan.lng != null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/request/[id]', params: { id: scan.id, kind: 'item' } })}
      accessibilityRole="button"
      accessibilityLabel={`${item?.item_name || 'Item'} scanned, ${timeAgo(scan.scanned_on)}`}
      style={({ pressed }) => [styles.histRow, !last && styles.histBorder, pressed && { opacity: 0.6 }]}>
      <IconTile icon="bag" size={40} />
      <View style={styles.titles}>
        <Text style={styles.histTitle} numberOfLines={1}>
          {item?.item_name || 'Item'} scanned
        </Text>
        <View style={styles.histMeta}>
          {located ? <Icon name="pin" size={12} color={C.muted} /> : null}
          <Text style={styles.meta} numberOfLines={1}>
            {timeAgo(scan.scanned_on)}
          </Text>
        </View>
      </View>
      <Icon name="chevronRight" size={18} color={C.placeholder} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.xl,
    padding: 16,
    ...shadow,
  },
  lostCard: { borderColor: '#f3d9ae', borderWidth: 1.5 },
  pendingCard: { borderColor: '#f3d9ae', borderWidth: 1.5 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  titles: { flex: 1, gap: 4 },
  title: { fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  meta: { fontSize: 13, color: C.muted, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  code: {
    marginLeft: 'auto',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
    color: C.brandInk,
    backgroundColor: C.brandSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  answer: { flexDirection: 'row', gap: 8, marginTop: 14 },
  grow: { flex: 1 },

  lostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    minHeight: 48,
  },
  lostLabel: { fontSize: 14.5, fontWeight: '700', color: C.text },
  lostHint: { fontSize: 12.5, color: C.muted, marginTop: 1 },

  msg: { fontSize: 14.5, lineHeight: 21, color: C.text, marginTop: 10, fontStyle: 'italic' },
  reqNote: { fontSize: 12, color: C.muted, marginTop: 8, textAlign: 'center' },

  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10 },
  histBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  histTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  histMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
