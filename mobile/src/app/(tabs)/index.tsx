import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HistoryRow, ItemCard, RequestCard, TagCard } from '@/components/cards';
import { useSession } from '@/state/session';
import { Icon, ShieldMark, type IconName } from '@/ui/icons';
import {
  Button,
  Card,
  Empty,
  Eyebrow,
  H1,
  Hero,
  LinkText,
  Muted,
  Notice,
  Pill,
  Screen,
  SectionHead,
  Skeleton,
  SkeletonCard,
} from '@/ui/kit';
import { C, R, type Mood } from '@/ui/theme';

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

/** Greeting, with shortcuts to alerts and the account. */
function Header({ name, email, pending }: { name: string; email: string; pending: number }) {
  const router = useRouter();
  const initials =
    (name || email)
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'S';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <View style={styles.head}>
      <Pressable
        onPress={() => router.navigate('/account')}
        accessibilityRole="button"
        accessibilityLabel="Open your account"
        style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text accessibilityRole="header" style={styles.name} numberOfLines={1}>
          {name || 'Welcome back'}
        </Text>
      </View>
      <Pressable
        onPress={() => router.navigate('/alerts')}
        accessibilityRole="button"
        accessibilityLabel={pending ? `Alerts, ${pending} waiting` : 'Alerts'}
        style={styles.bell}>
        <Icon name="bell" size={21} color={C.text} />
        {pending ? (
          <View style={styles.bellDot}>
            <Text style={styles.bellDotText}>{pending > 9 ? '9+' : pending}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

/** The one-glance answer to "is everything OK?". */
function StatusHero({ total, lost, pending, scansThisWeek }: { total: number; lost: number; pending: number; scansThisWeek: number }) {
  const router = useRouter();
  let mood: Mood = 'brand';
  let icon: IconName = 'shieldCheck';
  let title = total === 1 ? 'Your tag is protected' : 'Everything is protected';
  let text = 'Your contact details stay private until you choose to share them.';
  if (total === 0) {
    icon = 'tag';
    title = 'Activate your first tag';
    text = 'Scan the QR on your SecureTag to link it to your vehicle or bag.';
  } else if (pending > 0) {
    mood = 'amber';
    icon = 'bell';
    title = pending === 1 ? 'Someone is waiting for you' : `${pending} people are waiting for you`;
    text = 'Accept to share your number, or decline. They cannot see it until you do.';
  } else if (lost > 0) {
    mood = 'amber';
    icon = 'alert';
    title = lost === 1 ? 'Lost Mode is on for 1 tag' : `Lost Mode is on for ${lost} tags`;
    text = 'Anyone who scans it sees your contact straight away. Turn it off once it is found.';
  }
  return (
    <Hero mood={mood}>
      <View style={styles.statusTop}>
        <View style={styles.statusIco}>
          <Icon name={icon} size={24} color={C.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>{title}</Text>
          <Text style={styles.statusText}>{text}</Text>
        </View>
      </View>
      {total === 0 ? (
        <Button label="Scan my tag" icon="qr" variant="white" onPress={() => router.navigate('/scan')} style={{ marginTop: 16 }} />
      ) : (
        <View style={styles.statRow}>
          <Stat n={total} label={total === 1 ? 'Tag' : 'Tags'} />
          <View style={styles.statDivider} />
          <Stat n={lost} label="In Lost Mode" />
          <View style={styles.statDivider} />
          <Stat n={scansThisWeek} label="Scans this week" />
        </View>
      )}
    </Hero>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat} accessibilityLabel={`${n} ${label}`}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statL} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function HomeSkeleton() {
  return (
    <Screen edges="top">
      <View style={styles.head}>
        <Skeleton height={46} width={46} radius={23} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton height={12} width="30%" />
          <Skeleton height={20} width="55%" />
        </View>
      </View>
      <Skeleton height={150} radius={R.xl} />
      <Skeleton height={20} width="35%" style={{ marginTop: 8 }} />
      <SkeletonCard />
      <SkeletonCard />
    </Screen>
  );
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function Home() {
  const router = useRouter();
  const { session, account, tags, items, scans, itemScans, pending, loading, error, refresh } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  // Fixed for this visit, so "this week" doesn't shift while the screen is open.
  const [weekAgo] = useState(() => Date.now() - WEEK_MS);

  if (!session) return <Welcome />;
  if (loading && !account) return <HomeSkeleton />;

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const lostCount = tags.filter((t) => t.lost_mode).length + items.filter((t) => t.lost_mode).length;
  const total = tags.length + items.length;
  const scansThisWeek =
    scans.filter((s) => new Date(s.created_at).getTime() > weekAgo).length +
    itemScans.filter((s) => new Date(s.scanned_on).getTime() > weekAgo).length;
  // Scans arrive newest first, so the first match is the latest.
  const lastScanOf = (tagId: string) => scans.find((s) => s.tag_id === tagId)?.created_at;
  const lastItemScanOf = (code: string) => itemScans.find((s) => s.code === code)?.scanned_on;
  const recent = scans.filter((s) => s.status !== 'pending').slice(0, 3);

  return (
    <Screen edges="top" onRefresh={onRefresh} refreshing={refreshing}>
      <Header name={(account?.fullName || '').trim()} email={account?.email ?? session.user.email ?? ''} pending={pending.length} />

      {error ? <Notice tone="red" text={`${error} Pull down to try again.`} /> : null}

      <StatusHero total={total} lost={lostCount} pending={pending.length} scansThisWeek={scansThisWeek} />

      {pending.length > 0 ? (
        <>
          <SectionHead title="Waiting for you" right={<Pill label={`${pending.length} new`} tone="amber" />} />
          {pending.map((r) => (
            <RequestCard key={r.id} req={r} tag={tags.find((t) => t.id === r.tag_id)} />
          ))}
        </>
      ) : null}

      {total > 0 ? (
        <SectionHead title="My vehicles" right={<LinkText label="+ Add a tag" onPress={() => router.navigate('/scan')} />} />
      ) : null}
      {tags.map((t) => (
        <TagCard key={t.id} tag={t} lastScan={lastScanOf(t.id)} />
      ))}
      {total > 0 && tags.length === 0 ? (
        <Empty icon="car" title="No vehicle tags" text="Scan the QR on a SecureTag sticker to protect your car or bike.">
          <Button label="Scan a tag" icon="qr" variant="secondary" onPress={() => router.navigate('/scan')} style={styles.emptyBtn} />
        </Empty>
      ) : null}

      {items.length > 0 ? (
        <>
          <SectionHead title="My items" right={`${items.length} ${items.length === 1 ? 'item' : 'items'}`} />
          {items.map((t) => (
            <ItemCard key={t.id} item={t} lastScan={lastItemScanOf(t.id)} />
          ))}
        </>
      ) : null}

      {recent.length > 0 ? (
        <>
          <SectionHead title="Recent scans" right={<LinkText label="See all" onPress={() => router.navigate('/alerts')} />} />
          <Card style={styles.listCard}>
            {recent.map((r, i) => (
              <HistoryRow key={r.id} req={r} tag={tags.find((t) => t.id === r.tag_id)} last={i === recent.length - 1} />
            ))}
          </Card>
        </>
      ) : null}

      {total === 0 ? (
        <>
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
        </>
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
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  greeting: { fontSize: 13, color: C.muted, fontWeight: '600' },
  name: { fontSize: 21, lineHeight: 26, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  bell: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: C.amber,
    borderWidth: 2,
    borderColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDotText: { color: C.white, fontSize: 10.5, fontWeight: '800' },

  statusTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  statusIco: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { color: C.white, fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.3 },
  statusText: { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 20, marginTop: 4 },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: R.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  statN: { color: C.white, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statL: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: '600', marginTop: 1 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.45)' },

  listCard: { paddingVertical: 4, paddingHorizontal: 16 },
  emptyBtn: { marginTop: 12, alignSelf: 'stretch' },
});
