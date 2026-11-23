import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/lib/api';
import { itemTypeLabel, timeAgo } from '@/lib/codes';
import { buzz } from '@/lib/device';
import type { LegacyItem, ScanRequest, Tag } from '@/lib/types';
import { useSession } from '@/state/session';
import { Icon } from '@/ui/icons';
import { Button, Pill } from '@/ui/kit';
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

/* --------------------------------- tags --------------------------------- */

export function TagCard({ tag }: { tag: Tag }) {
  const router = useRouter();
  const lost = useLostToggle('vehicle', tag.id, tag.lost_mode);
  const open = () => router.push({ pathname: '/tag/[code]', params: { code: tag.id, kind: 'vehicle' } });
  return (
    <View style={styles.card}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Open ${tag.car_model || 'vehicle'} tag`} style={styles.top}>
        <View style={styles.ico}>
          <Icon name="car" size={20} color={C.brand} />
        </View>
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {tag.car_model || 'My vehicle'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {tag.plate_number ? `${tag.plate_number} · ` : ''}
            <Text style={styles.code}>{tag.id}</Text>
          </Text>
        </View>
        {tag.lost_mode ? <Pill label="Lost" tone="amber" /> : <Pill label="Active" tone="green" />}
      </Pressable>
      <View style={styles.actions}>
        <Button label="View" variant="secondary" size="sm" onPress={open} style={styles.grow} />
        <Button
          label="Edit"
          variant="ghost"
          size="sm"
          onPress={() => router.push({ pathname: '/tag-form', params: { id: tag.id, mode: 'edit' } })}
          style={styles.grow}
        />
        <Button
          label={tag.lost_mode ? 'End Lost' : 'Lost'}
          icon={tag.lost_mode ? undefined : 'alert'}
          variant={tag.lost_mode ? 'secondary' : 'amber'}
          size="sm"
          loading={lost.busy}
          onPress={lost.toggle}
          style={styles.grow}
          accessibilityLabel={tag.lost_mode ? 'Turn off Lost Mode' : 'Turn on Lost Mode'}
        />
      </View>
    </View>
  );
}

export function ItemCard({ item }: { item: LegacyItem }) {
  const router = useRouter();
  const lost = useLostToggle('item', item.id, item.lost_mode);
  const edit = () => router.push({ pathname: '/item-form', params: { code: item.id, mode: 'edit' } });
  return (
    <View style={styles.card}>
      <Pressable onPress={edit} accessibilityRole="button" accessibilityLabel={`Edit ${item.item_name || 'item'}`} style={styles.top}>
        <View style={styles.ico}>
          <Icon name="bag" size={20} color={C.brand} />
        </View>
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {item.item_name || 'My item'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            <Text style={styles.code}>{item.id}</Text>
            {item.item_type ? ` · ${itemTypeLabel(item.item_type)}` : ''}
          </Text>
        </View>
        {item.lost_mode ? <Pill label="Lost" tone="amber" /> : <Pill label="Secured" tone="green" />}
      </Pressable>
      <View style={styles.actions}>
        <Button label="Edit" variant="secondary" size="sm" onPress={edit} style={styles.grow} />
        <Button
          label={item.lost_mode ? 'End Lost' : 'Mark as lost'}
          icon={item.lost_mode ? undefined : 'alert'}
          variant={item.lost_mode ? 'secondary' : 'amber'}
          size="sm"
          loading={lost.busy}
          onPress={lost.toggle}
          style={styles.grow}
        />
      </View>
    </View>
  );
}

/* ------------------------------- requests ------------------------------- */

const STATUS: Record<string, { label: string; tone: 'amber' | 'green' | 'brand' }> = {
  pending: { label: 'Pending', tone: 'amber' },
  accepted: { label: 'Accepted', tone: 'green' },
  auto: { label: 'Auto-shared', tone: 'green' },
  declined: { label: 'Declined', tone: 'brand' },
};

/** A scan request. Pending ones get Accept / Decline; the rest are history. */
export function RequestCard({ req, tag }: { req: ScanRequest; tag?: Tag }) {
  const { refresh } = useSession();
  const [busy, setBusy] = useState<'accepted' | 'declined' | null>(null);
  const pending = req.status === 'pending';
  const status = STATUS[req.status] ?? { label: req.status, tone: 'brand' as const };
  const vehicle = tag ? [tag.car_model, tag.plate_number].filter(Boolean).join(' · ') : '';

  const respond = async (decision: 'accepted' | 'declined') => {
    setBusy(decision);
    try {
      await api.respond(req.id, decision);
      buzz('success');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not save your answer.');
    } finally {
      await refresh();
      setBusy(null);
    }
  };

  return (
    <View style={[styles.card, pending && styles.pendingCard]}>
      <View style={styles.reqHead}>
        <View style={[styles.dot, { backgroundColor: pending ? C.amber : C.brand3 }]} />
        <Text style={styles.reqTitle} numberOfLines={2}>
          {req.reason || 'Contact request'}
        </Text>
        {pending ? <Text style={styles.time}>{timeAgo(req.created_at)}</Text> : <Pill label={status.label} tone={status.tone} />}
      </View>
      {(vehicle || !pending) && (
        <Text style={styles.reqMeta} numberOfLines={1}>
          {[vehicle || req.tag_id, pending ? '' : timeAgo(req.created_at)].filter(Boolean).join(' · ')}
        </Text>
      )}
      {req.scanner_message ? <Text style={styles.msg}>&ldquo;{req.scanner_message}&rdquo;</Text> : null}
      {req.scanner_lat != null && req.scanner_lng != null ? <MapPreview lat={req.scanner_lat} lng={req.scanner_lng} /> : null}
      {pending ? (
        <>
          <View style={styles.actions}>
            <Button
              label="Accept & share"
              icon="check"
              variant="accept"
              loading={busy === 'accepted'}
              disabled={busy !== null}
              onPress={() => respond('accepted')}
              style={{ flex: 2 }}
              accessibilityLabel="Accept and share my contact"
            />
            <Button
              label="Decline"
              variant="danger"
              loading={busy === 'declined'}
              disabled={busy !== null}
              onPress={() => respond('declined')}
              style={styles.grow}
            />
          </View>
          <Text style={styles.reqNote}>Your number is shared only if you accept.</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 16,
    ...shadow,
  },
  pendingCard: { borderColor: '#f3d9ae', borderWidth: 1.5 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  ico: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '700', color: C.text },
  meta: { fontSize: 13, color: C.muted },
  code: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 12.5, color: C.brandInk },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  grow: { flex: 1 },

  reqHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  reqTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
  time: { fontSize: 12.5, color: C.muted, fontWeight: '600' },
  reqMeta: { fontSize: 13, color: C.muted, marginTop: 4, marginLeft: 18 },
  msg: { fontSize: 14.5, lineHeight: 21, color: C.text, marginTop: 10, fontStyle: 'italic' },
  reqNote: { fontSize: 12, color: C.muted, marginTop: 8, textAlign: 'center' },
});
