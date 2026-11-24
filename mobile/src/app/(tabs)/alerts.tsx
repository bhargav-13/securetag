import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HistoryRow, ItemScanRow, RequestCard } from '@/components/cards';
import type { ItemScan, ScanRequest } from '@/lib/types';
import { useSession } from '@/state/session';
import { Icon } from '@/ui/icons';
import { Button, Card, Empty, Eyebrow, H1, Muted, Notice, Pill, Screen, SectionHead, SkeletonCard } from '@/ui/kit';
import { C, R } from '@/ui/theme';

type Entry = { at: number; scan?: ScanRequest; itemScan?: ItemScan };

/** "Today", "Yesterday", "Earlier" buckets for the history list. */
function bucket(at: number, startOfToday: number): string {
  if (at >= startOfToday) return 'Today';
  if (at >= startOfToday - 86400000) return 'Yesterday';
  if (at >= startOfToday - 6 * 86400000) return 'This week';
  return 'Earlier';
}

export default function Alerts() {
  const router = useRouter();
  const { session, account, tags, items, scans, itemScans, pending, loading, error, refresh } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [startOfToday] = useState(() => new Date(new Date().toDateString()).getTime());

  if (!session) {
    return (
      <Screen edges="top">
        <Eyebrow>Alerts</Eyebrow>
        <H1 style={{ marginTop: 4 }}>Scan alerts</H1>
        <Empty
          icon="bell"
          title="Log in to see your alerts"
          text="When someone scans one of your tags, the request shows up here for you to accept or decline.">
          <Button label="Log in" onPress={() => router.push('/login')} style={{ marginTop: 12, alignSelf: 'stretch' }} />
        </Empty>
      </Screen>
    );
  }
  if (loading && !account) {
    return (
      <Screen edges="top">
        <Eyebrow>Alerts</Eyebrow>
        <H1 style={{ marginTop: 4 }}>Scan alerts</H1>
        <SkeletonCard />
        <SkeletonCard />
      </Screen>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Vehicle scans and item scans in one timeline, newest first.
  const history: Entry[] = [
    ...scans.filter((s) => s.status !== 'pending').map((s) => ({ at: new Date(s.created_at).getTime(), scan: s })),
    ...itemScans.map((s) => ({ at: new Date(s.scanned_on).getTime(), itemScan: s })),
  ].sort((a, b) => b.at - a.at);
  const groups: { title: string; entries: Entry[] }[] = [];
  for (const e of history) {
    const title = bucket(e.at, startOfToday);
    const g = groups[groups.length - 1];
    if (g && g.title === title) g.entries.push(e);
    else groups.push({ title, entries: [e] });
  }
  const tagFor = (id: string) => tags.find((t) => t.id === id);

  return (
    <Screen edges="top" onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Eyebrow>Alerts</Eyebrow>
          <H1 style={{ marginTop: 4, marginBottom: 0 }}>Scan alerts</H1>
        </View>
        <Pressable
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notification settings"
          style={styles.gear}>
          <Icon name="settings" size={20} color={C.text} />
        </Pressable>
      </View>

      {error ? <Notice tone="red" text={`${error} Pull down to try again.`} /> : null}

      <SectionHead
        title="Waiting for you"
        right={pending.length ? <Pill label={`${pending.length} new`} tone="amber" /> : undefined}
      />
      {pending.length === 0 ? (
        <Card style={styles.clear}>
          <View style={styles.clearIco}>
            <Icon name="check" size={20} color={C.green} strokeWidth={2.6} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clearTitle}>You&apos;re all caught up</Text>
            <Muted>No one is waiting on an answer right now.</Muted>
          </View>
        </Card>
      ) : (
        pending.map((r) => <RequestCard key={r.id} req={r} tag={tagFor(r.tag_id)} />)
      )}

      {history.length === 0 ? (
        <Empty
          icon="clock"
          title="No scans yet"
          text="Every time someone scans one of your tags it is listed here, with the reason and where they were."
        />
      ) : (
        groups.map((g) => (
          <View key={g.title} style={{ gap: 10 }}>
            <SectionHead title={g.title} right={`${g.entries.length} ${g.entries.length === 1 ? 'scan' : 'scans'}`} />
            <Card style={styles.listCard}>
              {g.entries.map((e, i) =>
                e.scan ? (
                  <HistoryRow key={e.scan.id} req={e.scan} tag={tagFor(e.scan.tag_id)} last={i === g.entries.length - 1} />
                ) : e.itemScan ? (
                  <ItemScanRow
                    key={`item-${e.itemScan.id}`}
                    scan={e.itemScan}
                    item={items.find((t) => t.id === e.itemScan!.code)}
                    last={i === g.entries.length - 1}
                  />
                ) : null
              )}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gear: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: R.xl },
  clearIco: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' },
  clearTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  listCard: { paddingVertical: 4, paddingHorizontal: 16, borderRadius: R.xl },
});
