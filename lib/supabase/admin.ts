import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* Next.js caches GET fetch() calls made on the server. Database reads must
   never come from that cache, or a tag keeps showing its old state. */
const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });
/**
 * Admin client (service role) — SERVER ONLY.
 * Bypasses Row Level Security. Used for reads/writes after we've checked
 * authorization ourselves in server actions / route handlers.
 */
export function getAdminClient() {
  if (!url)
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.local.example to .env.local."
    );
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, serviceKey, { auth: { persistSession: false }, global: { fetch: noStoreFetch } });
}

export type Tag = {
  id: string;
  claimed: boolean;
  owner_user_id: string | null;
  owner_name: string | null;
  phone: string | null;
  car_model: string | null;
  plate_number: string | null;
  message: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  alt_phone: string | null;
  alt_email: string | null;
  address: string | null;
  lost_mode: boolean;
  created_at: string;
  claimed_at: string | null;
};
