import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { api, ApiError } from '@/lib/api';
import { isUrgentReason } from '@/lib/codes';
import { buzz } from '@/lib/device';
import {
  clearNotifications,
  DEFAULT_PREFS,
  getPushToken,
  notifyNow,
  prepareNotifications,
  setBadge,
  syncLostReminder,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import type { Account, ItemScan, LegacyItem, Me, NotifyKind, NotifyPrefs, ScanRequest, Tag } from '@/lib/types';

/* One provider for "who is signed in" and "their tags, items and scan
   requests". Screens read from here and call refresh() after a change. */

export type Banner = {
  id: number;
  kind: NotifyKind;
  title: string;
  body: string;
  /** What tapping the banner opens. */
  target: { id: string; item?: boolean } | null;
} | null;

type SessionState = {
  /** false until the stored session has been read. */
  ready: boolean;
  session: Session | null;
  account: Account | null;
  tags: Tag[];
  items: LegacyItem[];
  scans: ScanRequest[];
  itemScans: ItemScan[];
  pending: ScanRequest[];
  prefs: NotifyPrefs;
  /** true while the first load for a signed-in user is in flight. */
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setPref: (key: keyof NotifyPrefs, on: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  banner: Banner;
  dismissBanner: () => void;
};

const Ctx = createContext<SessionState | null>(null);

export function useSession(): SessionState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside <SessionProvider>');
  return v;
}

const POLL_MS = 15000;
const EMPTY: never[] = [];

type Event = { kind: NotifyKind; title: string; body: string; target: { id: string; item?: boolean }; data: Record<string, unknown> };

const vehicleOf = (tag: Tag | undefined) => (tag ? [tag.car_model, tag.plate_number].filter(Boolean).join(' · ') : '');

/** The same wording the website uses for the push notification. */
function scanEvent(s: ScanRequest, tag: Tag | undefined): Event {
  const vehicle = vehicleOf(tag);
  const reason = s.reason || 'Contact request';
  const note = s.scanner_message ? ` "${s.scanner_message}"` : '';
  const base = { target: { id: s.id }, data: { requestId: s.id, tagId: s.tag_id } };
  if (isUrgentReason(s.reason))
    return {
      ...base,
      kind: 'emergency',
      title: `${reason} reported: ${vehicle || 'your vehicle'}`,
      body: `Your contact and emergency contact were shared right away.${note}`,
    };
  if (s.status !== 'pending')
    return {
      ...base,
      kind: 'lost',
      title: 'Your lost vehicle was scanned',
      body: `${vehicle ? `${vehicle}. ` : ''}The finder can see your contact.${note}`,
    };
  return {
    ...base,
    kind: 'request',
    title: `${reason}: someone needs to reach you`,
    body: `${vehicle ? `${vehicle}. ` : ''}${s.scanner_message ? `"${s.scanner_message}" ` : ''}Accept to share your number, or decline.`,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  // Everything loaded for one user, kept with that user's id. When the user
  // changes (or signs out) it simply stops matching: no reset step needed.
  const [data, setData] = useState<{ userId: string; me: Me } | null>(null);
  const [failure, setFailure] = useState<{ userId: string; message: string } | null>(null);
  const [banner, setBanner] = useState<Banner>(null);

  const userId = session?.user.id ?? null;
  /** Scans already known, with whether each had a location yet. */
  const seenScans = useRef<Map<string, boolean> | null>(null);
  const seenItemScans = useRef<Set<string> | null>(null);
  const pushToken = useRef<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((e: Event, prefs: NotifyPrefs) => {
    const wanted = e.kind === 'emergency' || e.kind === 'reminder' || prefs[e.kind as keyof NotifyPrefs] !== false;
    if (!wanted) return;
    setBanner({ id: Date.now(), kind: e.kind, title: e.title, body: e.body, target: e.target });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), e.kind === 'emergency' ? 15000 : 8000);
    buzz('warning');
    // With a push token the server's notification is already on its way.
    if (!pushToken.current) notifyNow(e.kind, e.title, e.body, e.data);
  }, []);

  /* ---- session ---- */
  useEffect(() => {
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive) setSession(data.session);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* ---- data ---- */
  const load = useCallback(
    async (live: boolean) => {
      if (!userId) return;
      try {
        const me = await api.me();
        setData({ userId, me });
        setFailure(null);

        // Work out what happened since the last load.
        const prefs = me.prefs ?? DEFAULT_PREFS;
        const known = seenScans.current;
        const knownItems = seenItemScans.current;
        const events: Event[] = [];
        if (known) {
          for (const s of me.scans) {
            const tag = me.tags.find((t) => t.id === s.tag_id);
            const hasLocation = s.scanner_lat != null && s.scanner_lng != null;
            if (!known.has(s.id)) events.push(scanEvent(s, tag));
            else if (hasLocation && known.get(s.id) === false)
              events.push({
                kind: 'location',
                title: 'The scanner shared their location',
                body: `Open to see where ${vehicleOf(tag) || 'your vehicle'} is on the map.`,
                target: { id: s.id },
                data: { requestId: s.id, tagId: s.tag_id },
              });
          }
        }
        if (knownItems) {
          for (const s of me.itemScans ?? []) {
            if (knownItems.has(s.id)) continue;
            const item = me.legacyItems.find((i) => i.id === s.code);
            const name = item?.item_name || 'Your item';
            events.push({
              kind: 'lost',
              title: item?.lost_mode ? `${name} was found and scanned` : `${name} was just scanned`,
              body: item?.lost_mode
                ? 'The finder can see your contact details.'
                : 'Your details stayed private. If it is missing, turn on Lost Mode.',
              target: { id: s.id, item: true },
              data: { scanId: s.id, code: s.code, kind: 'legacy' },
            });
          }
        }
        seenScans.current = new Map(me.scans.map((s) => [s.id, s.scanner_lat != null && s.scanner_lng != null]));
        seenItemScans.current = new Set((me.itemScans ?? []).map((s) => s.id));

        // Most urgent first; one banner at a time is plenty.
        if (live && events.length) {
          const order: NotifyKind[] = ['emergency', 'request', 'lost', 'location'];
          events.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
          announce(events[0], prefs);
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          // Token no longer valid on the server: sign out cleanly.
          await supabase.auth.signOut().catch(() => {});
          return;
        }
        setFailure({ userId, message: e instanceof Error ? e.message : 'Could not load your tags.' });
      }
    },
    [userId, announce]
  );

  const refresh = useCallback(() => load(false), [load]);

  useEffect(() => {
    seenScans.current = null;
    seenItemScans.current = null;
    if (!userId) return;
    let cancelled = false;
    // load() only sets state after its network call resolves, never synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(false);

    // Live: a new scan request for this owner (RLS limits events to their rows).
    const channel = supabase
      .channel(`scan-requests-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scan_requests', filter: `owner_user_id=eq.${userId}` },
        () => {
          load(true);
        }
      )
      .subscribe();

    // Fallback so requests still show up if the live channel never connects.
    const poll = setInterval(() => {
      if (AppState.currentState === 'active') load(true);
    }, POLL_MS);
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') load(true);
    });

    // Ask once for permission, then register for alerts while the app is
    // closed (real builds only; Expo Go relies on the live alerts above).
    prepareNotifications()
      .then(() => getPushToken())
      .then((token) => {
        if (!token || cancelled) return;
        pushToken.current = token;
        api.registerPush(token).catch(() => {});
      });

    return () => {
      cancelled = true;
      clearInterval(poll);
      appSub.remove();
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const signOut = useCallback(async () => {
    const token = pushToken.current;
    pushToken.current = null;
    if (token) await api.unregisterPush(token).catch(() => {});
    await clearNotifications();
    await supabase.auth.signOut().catch(() => {});
  }, []);

  const me = data && data.userId === userId ? data.me : null;
  const error = failure && failure.userId === userId ? failure.message : null;
  const prefs = me?.prefs ?? DEFAULT_PREFS;

  /** Flips one notification switch: shown at once, rolled back if saving fails. */
  const setPref = useCallback(
    async (key: keyof NotifyPrefs, on: boolean) => {
      const apply = (next: NotifyPrefs) =>
        setData((d) => (d && d.userId === userId ? { ...d, me: { ...d.me, prefs: next } } : d));
      const before = prefs;
      apply({ ...before, [key]: on });
      try {
        const res = await api.setPrefs({ [key]: on });
        apply(res.prefs);
      } catch (e) {
        apply(before);
        throw e;
      }
    },
    [prefs, userId]
  );

  const tags = me?.tags ?? EMPTY;
  const items = me?.legacyItems ?? EMPTY;
  const scans = me?.scans ?? EMPTY;
  const pendingCount = scans.filter((s) => s.status === 'pending').length;

  // App icon badge = requests waiting for an answer.
  useEffect(() => {
    setBadge(userId ? pendingCount : 0);
  }, [userId, pendingCount]);

  // Weekly nudge while anything is still in Lost Mode.
  const lostNames = [
    ...tags.filter((t) => t.lost_mode).map((t) => t.car_model || t.plate_number || 'your vehicle'),
    ...items.filter((t) => t.lost_mode).map((t) => t.item_name || 'your item'),
  ].join('\n');
  useEffect(() => {
    if (!userId || !me) return;
    syncLostReminder(lostNames ? lostNames.split('\n') : [], prefs.reminder);
  }, [userId, me, lostNames, prefs.reminder]);

  const value = useMemo<SessionState>(
    () => ({
      ready,
      session,
      account: me?.user ?? null,
      tags,
      items,
      scans,
      itemScans: me?.itemScans ?? EMPTY,
      pending: scans.filter((s) => s.status === 'pending'),
      prefs,
      loading: !!userId && !me && !error,
      error,
      refresh,
      setPref,
      signOut,
      banner,
      dismissBanner: () => setBanner(null),
    }),
    [ready, session, userId, me, tags, items, scans, prefs, error, refresh, setPref, signOut, banner]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
