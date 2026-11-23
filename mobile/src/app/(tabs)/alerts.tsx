import { useRouter } from 'expo-router';
import { useState } from 'react';

import { RequestCard } from '@/components/cards';
import { useSession } from '@/state/session';
import { Button, Empty, Eyebrow, H1, Loading, Muted, Notice, Pill, Screen, SectionHead } from '@/ui/kit';

export default function Alerts() {
  const router = useRouter();
  const { session, account, tags, scans, pending, loading, error, refresh } = useSession();
  const [refreshing, setRefreshing] = useState(false);

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
  if (loading && !account) return <Loading label="Loading alerts" />;

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  const history = scans.filter((s) => s.status !== 'pending');
  const tagFor = (id: string) => tags.find((t) => t.id === id);

  return (
    <Screen edges="top" onRefresh={onRefresh} refreshing={refreshing}>
      <Eyebrow>Alerts</Eyebrow>
      <H1 style={{ marginTop: 4, marginBottom: 0 }}>Scan alerts</H1>
      <Muted>New requests appear here on their own while the app is open.</Muted>

      {error ? <Notice tone="red" text={`${error} Pull down to try again.`} /> : null}

      <SectionHead
        title="Waiting for you"
        right={pending.length ? <Pill label={`${pending.length} new`} tone="amber" /> : undefined}
      />
      {pending.length === 0 ? (
        <Empty icon="check" title="You're all caught up" text="No one is waiting on an answer right now." />
      ) : (
        pending.map((r) => <RequestCard key={r.id} req={r} tag={tagFor(r.tag_id)} />)
      )}

      {history.length > 0 ? (
        <>
          <SectionHead title="Scan history" right={`${history.length} ${history.length === 1 ? 'scan' : 'scans'}`} />
          {history.map((r) => (
            <RequestCard key={r.id} req={r} tag={tagFor(r.tag_id)} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
