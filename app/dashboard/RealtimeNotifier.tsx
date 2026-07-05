"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Live alert for the owner when someone scans one of their tags. */
export default function RealtimeNotifier({ userId }: { userId: string }) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
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
          setToast(`Someone scanned your SecureTag${reason ? ` — ${reason}` : ""}`);
          router.refresh();
          window.setTimeout(() => setToast(null), 8000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  if (!toast) return null;
  return (
    <div className="toast" role="status">
      🔔 {toast}
      <span className="toast-sub">Scroll up to respond</span>
    </div>
  );
}
