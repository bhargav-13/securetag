import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/nextContext";

/* Landing point for the email-confirmation link. Exchanges the one-time code
   for a session and continues to `next` (e.g. the tag the person was
   activating). If the exchange fails — say the link was opened on another
   device — they're sent to log in, still pointed at `next`. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  // The reset page explains an expired link itself; everything else → login.
  if (next === "/reset-password") return NextResponse.redirect(new URL(next, url.origin));
  return NextResponse.redirect(
    new URL(`/login?link=expired&next=${encodeURIComponent(next)}`, url.origin)
  );
}
