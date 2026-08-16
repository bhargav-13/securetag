import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client bound to the request cookies (SSR auth).
 * Use this to read the logged-in user and to sign in/up/out.
 */
// When set (prod), scope the auth cookie to the parent domain so the session
// is shared across securetag.in and app.securetag.in. Unset locally → host-only.
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(COOKIE_DOMAIN ? { cookieOptions: { domain: COOKIE_DOMAIN, path: "/", sameSite: "lax", secure: true } } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware refreshes.
          }
        },
      },
    }
  );
}
