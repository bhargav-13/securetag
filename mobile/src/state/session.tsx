import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { api, ApiError } from '@/lib/api';
import { buzz, getPushToken, notifyNow } from '@/lib/device';
import { supabase } from '@/lib/supabase';
import type { Account, LegacyItem, Me, ScanRequest, Tag } from '@/lib/types';

/* One provider for "who is signed in" and "their tags, items and scan
   requests". Screens read from here and call refresh() after a change. */

type Banner = { id: number; title: string; body: string } | null;

type SessionState = {
  /** false until the stored session has been read. */
  ready: boolean;
  session: Session | null;
  account: Account | null;
  tags: Tag[];
  items: LegacyItem[];
  scans: ScanRequest[];
  pending: ScanRequest[];
  /** true while the first load for a signed-in user is in flight. */
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
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

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  // Everything loaded for one user, kept with that user's id. When the user
  // changes (or signs out) it simply stops matching: no reset step needed.
  const [data, setData] = useState<{ userId: string; me: Me } | null>(null);
  const [failure, setFailure] = useState<{ userId: string; message: string } | null>(null);
  const [banner, setBanner] = useState<Banner>(null);

  const userId = session?.user.id ?? null;
  const seenScans = useRef<Set<string> | null>(null);
  const pushToken = useRef<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = useCallback((title: string, body: string) => {
    setBanner({ id: Date.now(), title, body });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 8000);
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
    async (announce: boolean) => {
      if (!userId) return;
      try {
        const me = await api.me();
        setData({ userId, me });
        setFailure(null);

        // Tell the owner about requests that arrived since the last load.
        const known = seenScans.current;
        const fresh = known ? me.scans.filter((s) => !known.has(s.id)) : [];
        seenScans.current = new Set(me.scans.map((s) => s.id));
        if (announce && fresh.length) {
          const s = fresh[0];
          const title = s.status === 'pending' ? 'Someone needs to reach you' : 'Your SecureTag was scanned';
          const body =
            (s.reason || 'Contact request') + (s.status === 'pending' ? '. Open Alerts to accept or decline.' : '. Your contact was shared.');
          showBanner(title, body);
          buzz('warning');
          notifyNow(title, body, { type: 'scan', requestId: s.id });
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
    [userId, showBanner]
  );

  const refresh = useCallback(() => load(false), [load]);

  useEffect(() => {
    seenScans.current = null;
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

    // Push alerts for when the app is closed (real builds only).
    getPushToken().then((token) => {
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
    await supabase.auth.signOut().catch(() => {});
  }, []);

  const me = data && data.userId === userId ? data.me : null;
  const error = failure && failure.userId === userId ? failure.message : null;

  const value = useMemo<SessionState>(
    () => ({
      ready,
      session,
      account: me?.user ?? null,
      tags: me?.tags ?? EMPTY,
      items: me?.legacyItems ?? EMPTY,
      scans: me?.scans ?? EMPTY,
      pending: (me?.scans ?? EMPTY).filter((s) => s.status === 'pending'),
      loading: !!userId && !me && !error,
      error,
      refresh,
      signOut,
      banner,
      dismissBanner: () => setBanner(null),
    }),
    [ready, session, userId, me, error, refresh, signOut, banner]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
