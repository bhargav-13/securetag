import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* The mobile app's JSON API authenticates with a bearer token, never cookies,
   so it is safe to call from any origin (the Expo web preview needs this). */
const API_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/mobile/") || path.startsWith("/api/scan/status/")) {
    if (request.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: API_CORS });
    const res = NextResponse.next({ request });
    Object.entries(API_CORS).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  let response = NextResponse.next({ request });

  // Skip if Supabase isn't configured yet.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(COOKIE_DOMAIN ? { cookieOptions: { domain: COOKIE_DOMAIN, path: "/", sameSite: "lax", secure: true } } : {}),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session cookie so Server Components see a valid user.
  try {
    await supabase.auth.getUser();
  } catch {
    // Network/config issue — don't block the request.
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|api/qr).*)",
  ],
};
