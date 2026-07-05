"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BellIcon } from "@/components/Icons";

/**
 * Live alert for the owner when someone scans one of their tags.
 * Uses Supabase Realtime for the instant toast, plus a polling fallback
 * (router.refresh) so new requests always appear even if Realtime isn't
 * enabled/authorized on the project — the owner never has to refresh by hand.
 */
export default function RealtimeNotifier({ userId }: { userId: string }) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    function showToast(reason: string) {
      setToast(`Someone scanned your SecureTag${reason ? ` — ${reason}` : ""}`);
      router.refresh();
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 8000);
    }

    async function setup() {
      // Make sure the Realtime socket authenticates with the user's JWT,
      // otherwise RLS drops the postgres_changes events (silent failure).
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;

      channel = supabase
        .channel(`scan-requests-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "scan_requests",
            filter: `owner_user_id=eq.${userId}`,
          },
          (payload) => {
            const reason = (payload.new as { reason?: string })?.reason || "";
            showToast(reason);
          }
        )
        .subscribe();
    }

    setup();

    // Fallback: refresh the server data every 10s so pending requests show up
    // even if the Realtime channel never connects.
    const poll = setInterval(() => router.refresh(), 10000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, router]);

  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <BellIcon size={18} /> {toast}
      </span>
      <span className="toast-sub">Scroll up to respond</span>
    </div>
  );
}
