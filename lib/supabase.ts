import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv() {
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.local.example to .env.local and fill it in."
    );
  }
}

/** Read-only client (safe, uses the public anon key). */
export function getPublicClient() {
  assertEnv();
  if (!anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  return createClient(url!, anonKey, { auth: { persistSession: false } });
}

/**
 * Admin client (service role) — SERVER ONLY.
 * Bypasses Row Level Security, used for claiming and generating tags.
 */
export function getAdminClient() {
  assertEnv();
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url!, serviceKey, { auth: { persistSession: false } });
}

export type Tag = {
  id: string;
  claimed: boolean;
  owner_name: string | null;
  phone: string | null;
  car_model: string | null;
  plate_number: string | null;
  message: string | null;
  edit_token: string | null;
  created_at: string;
  claimed_at: string | null;
};
