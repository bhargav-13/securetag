"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client carrying the logged-in user's session
 * (via cookies set by @supabase/ssr). Used for Realtime subscriptions,
 * which respect RLS with the user's JWT.
 */
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    COOKIE_DOMAIN
      ? { cookieOptions: { domain: COOKIE_DOMAIN, path: "/", sameSite: "lax", secure: true } }
      : undefined
  );
}
