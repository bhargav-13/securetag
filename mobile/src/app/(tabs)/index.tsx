import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ItemCard, RequestCard, TagCard } from '@/components/cards';
import { useSession } from '@/state/session';
import { Icon, ShieldMark, type IconName } from '@/ui/icons';
import { Button, Card, Empty, Eyebrow, H1, Hero, Loading, Muted, Notice, Pill, Screen, SectionHead, StatTile } from '@/ui/kit';
import { C, R } from '@/ui/theme';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'qr', title: 'Stick & scan', text: 'Put the SecureTag on your vehicle or bag and scan it once to activate.' },
  { icon: 'bell', title: 'Get alerted', text: 'When someone scans it, you get the reason and where they are.' },
  { icon: 'lock', title: 'You decide', text: 'Your number stays private until you tap Accept.' },
];

function Welcome() {
  const router = useRouter();
  return (
    <Screen edges="top">
      <Hero>
        <View style={styles.heroBadge}>
          <ShieldMark size={34} mono={C.white} />
        </View>
        <Text style={styles.heroTitle}>A smarter way to protect what matters</Text>
        <Text style={styles.heroText}>
          One scan lets people reach you about your car or lost things, without ever seeing your number unless you allow it.
        </Text>
        <Button label="Scan a tag" icon="qr" variant="white" size="lg" onPress={() => router.navigate('/scan')} style={{ marginTop: 18 }} />
      </Hero>

      <Card>
        <Eyebrow>Tag owners</Eyebrow>
        <H1 style={{ marginTop: 6 }}>Manage your tags</H1>
        <Muted>Log in to answer contact requests, switch on Lost Mode and update your details.</Muted>
        <Button label="Log in" size="lg" onPress={() => router.push('/login')} style={{ marginTop: 16 }} />
        <Button label="Create an account" variant="secondary" onPress={() => router.push('/register')} style={{ marginTop: 10 }} />
      </Card>

      <SectionHead title="How it works" />
      <Card style={{ gap: 16 }}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <View style={styles.stepIco}>
              <Icon name={s.icon} size={20} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>
                {i + 1}. {s.title}
              </Text>
              <Muted>{s.text}</Muted>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

export default function Home() {
  const router = useRouter();
  const { session, account, tags, items, pending, loading, error, refresh } = useSession();
  const [refreshing, setRefreshing] = useState(false);

  if (!session) return <Welcome />;
  if (loading && !account) return <Loading label="Loading your tags" />;

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const lostCount = tags.filter((t) => t.lost_mode).length + items.filter((t) => t.lost_mode).length;
  const firstName = (account?.fullName || '').trim().split(/\s+/)[0];
  const nothing = tags.length === 0 && items.length === 0;

  return (
    <Screen edges="top" onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Eyebrow>My account</Eyebrow>
          <H1 style={{ marginTop: 4, marginBottom: 2 }}>{firstName ? `Hi, ${firstName}` : 'Dashboard'}</H1>
          <Muted numberOfLines={1}>{account?.email ?? session.user.email}</Muted>
        </View>
        <ShieldMark size={40} />
      </View>

      {error ? <Notice tone="red" text={`${error} Pull down to try again.`} /> : null}

      <View style={styles.stats}>
        <StatTile n={tags.length + items.length} label="My tags" tone="brand" />
        <StatTile n={tags.length + items.length - lostCount} label="Active" tone="green" />
        <StatTile n={lostCount} label="Lost mode" tone="amber" />
        <StatTile n={pending.length} label="Pending" />
      </View>

      {pending.length > 0 ? (
        <>
          <SectionHead title="Contact requests" right={<Pill label={`${pending.length} new`} tone="amber" />} />
          {pending.map((r) => (
            <RequestCard key={r.id} req={r} tag={tags.find((t) => t.id === r.tag_id)} />
          ))}
        </>
      ) : null}

      <SectionHead title="My tags" right={tags.length ? `${tags.length} total` : undefined} />
      {tags.length === 0 ? (
        <Empty
          icon="tag"
          title={nothing ? 'No tags yet' : 'No vehicle tags'}
          text="Scan the QR on your SecureTag sticker to register your vehicle and start receiving contact requests.">
          <Button label="Scan my tag" icon="qr" onPress={() => router.navigate('/scan')} style={{ marginTop: 12, alignSelf: 'stretch' }} />
        </Empty>
      ) : (
        tags.map((t) => <TagCard key={t.id} tag={t} />)
      )}

      {items.length > 0 ? (
        <>
          <SectionHead title="My items" right={`${items.length} total`} />
          {items.map((t) => (
            <ItemCard key={t.id} item={t} />
          ))}
        </>
      ) : null}

      {tags.length > 0 ? (
        <Button label="Add another tag" icon="plus" variant="ghost" onPress={() => router.navigate('/scan')} style={{ marginTop: 4 }} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: { color: C.white, fontSize: 27, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5 },
  heroText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, lineHeight: 22, marginTop: 8 },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepIco: { width: 42, height: 42, borderRadius: R.md, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stats: { flexDirection: 'row', gap: 8 },
});
