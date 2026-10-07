"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { notifyOnScan, isEmergencyReason } from "@/lib/notify";
import { LEGACY_ALPHABET, LEGACY_CODE_RE } from "@/lib/legacy";
import { safeNext } from "@/lib/nextContext";
import { parseVehicleForm, parseLegacyForm, invalid, hasErrors, type FormState } from "@/lib/forms";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function shortCode(len = 8, alphabet = ALPHABET) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export type { FormState } from "@/lib/forms";

/* ----------------------------- AUTH ----------------------------- */

/** Supabase's auth messages, reworded for people (falls back to the original). */
function friendlyAuthError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Try again, or use \"Forgot password?\".";
  if (m.includes("not confirmed")) return "Please confirm your email first — open the link we sent to your inbox.";
  if (m.includes("already registered")) return "An account with this email already exists. Log in instead.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a minute and try again.";
  return msg;
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeNext(formData.get("next"));
  const values = { email };
  if (!email || !password) return { error: "Enter your email and password.", values };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendlyAuthError(error.message), values };
  redirect(next);
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeNext(formData.get("next"));
  const values = { email };
  if (!email || !password) return { error: "Enter your email and a password.", values };
  if (password.length < 6)
    return { fieldErrors: { password: "Use at least 6 characters." }, error: "Password is too short.", values };

  const supabase = createSupabaseServerClient();
  const origin = process.env.NEXT_PUBLIC_BASE_URL || "";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Brings them back to what they were doing (e.g. activating a tag).
    // Must be allowed under Supabase → Auth → URL Configuration; if it isn't,
    // Supabase falls back to the Site URL, which is the old behaviour.
    options: origin ? { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` } : undefined,
  });
  if (error) return { error: friendlyAuthError(error.message), values };
  if (!data.session)
    return { info: `Almost done — we sent a confirmation link to ${email}. Open it, then log in to continue.`, values };
  redirect(next);
}

/** Sends a password-reset link. Always answers the same way so it can't be
    used to find out which emails have accounts. */
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") || "").trim();
  const values = { email };
  if (!email) return { fieldErrors: { email: "Enter your email." }, error: "Enter your email.", values };

  const supabase = createSupabaseServerClient();
  const origin = process.env.NEXT_PUBLIC_BASE_URL || "";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin ? `${origin}/auth/callback?next=/reset-password` : undefined,
  });
  if (error && error.message.toLowerCase().includes("rate limit")) return { error: friendlyAuthError(error.message), values };
  return { info: `If an account exists for ${email}, a reset link is on its way. It works on this device and browser.`, values };
}

/** Sets a new password for the user signed in via the reset link. */
export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 6) return { fieldErrors: { password: "Use at least 6 characters." }, error: "Password is too short." };
  if (password !== confirm) return { fieldErrors: { confirm: "Passwords don't match." }, error: "Passwords don't match." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendlyAuthError(error.message) };
  redirect("/dashboard?password_updated=1");
}

export async function signOutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

/* ----------------------------- TAGS ----------------------------- */

export async function claimTag(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  const id = String(formData.get("id") || "").trim();
  if (!user) redirect(`/login?next=/tag/${id}`);
  if (!id) return { error: "Missing tag id." };

  const parsed = parseVehicleForm(formData);
  if (hasErrors(parsed.fieldErrors)) return invalid(parsed);

  const db = getAdminClient();
  const { data: tag } = await db.from("tags").select("id, claimed").eq("id", id).maybeSingle();
  if (!tag) return { error: "Invalid tag — this code does not exist." };
  if (tag.claimed) return { error: "This tag is already activated." };

  const { data: updated, error } = await db
    .from("tags")
    .update({ ...parsed.data, claimed: true, owner_user_id: user!.id, claimed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("claimed", false)
    .select("id");
  if (error) return { error: error.message, values: parsed.values };
  if (!updated?.length) return { error: "This tag was just activated by someone else." };

  revalidatePath(`/tag/${id}`);
  redirect(`/tag/${id}?activated=1`);
}

export async function updateTag(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  const id = String(formData.get("id") || "").trim();
  if (!user) redirect(`/login?next=/tag/${id}/edit`);
  if (!id) return { error: "Missing tag id." };

  const parsed = parseVehicleForm(formData);
  if (hasErrors(parsed.fieldErrors)) return invalid(parsed);

  const db = getAdminClient();
  const { data: tag } = await db.from("tags").select("id, owner_user_id").eq("id", id).maybeSingle();
  if (!tag) return { error: "Invalid tag." };
  if (!user!.isAdmin && tag.owner_user_id !== user!.id)
    return { error: "You are not the owner of this tag." };

  const { error } = await db.from("tags").update(parsed.data).eq("id", id);
  if (error) return { error: error.message, values: parsed.values };

  revalidatePath(`/tag/${id}`);
  revalidatePath("/dashboard");
  redirect(`/tag/${id}?saved=1`);
}

/** Owner/admin toggles Lost Mode for a tag. */
export async function setLostMode(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const id = String(formData.get("id") || "").trim();
  const on = String(formData.get("on") || "") === "1";

  const db = getAdminClient();
  const { data: tag } = await db.from("tags").select("id, owner_user_id").eq("id", id).maybeSingle();
  if (!tag) return;
  if (!user.isAdmin && tag.owner_user_id !== user.id) return;

  await db.from("tags").update({ lost_mode: on }).eq("id", id);
  revalidatePath("/dashboard");
  revalidatePath(`/tag/${id}`);
}

/* -------------------- LEGACY items (app.securetag.in /found) --------------------
   Old pre-2024 tags live in `legacy_tags` with the owner's email denormalized
   on the row (owners weren't migrated from Cognito). We authorize a logged-in
   user against a legacy item purely by VERIFIED EMAIL match: the session
   user's email must equal the row's email (case-insensitive). Email + id are
   never editable, so a user can only ever act on their own rows. */

async function assertLegacyOwner(code: string, userEmail: string) {
  const db = getAdminClient();
  const { data: row } = await db
    .from("legacy_tags")
    .select("id, email, claimed")
    .eq("id", code)
    .maybeSingle();
  if (!row || !row.claimed || !row.email) return null;
  if (row.email.trim().toLowerCase() !== userEmail.trim().toLowerCase()) return null;
  return row;
}

/** Owner toggles Lost Mode for one of their legacy items. */
export async function setLegacyLostMode(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const code = String(formData.get("code") || "").trim();
  const on = String(formData.get("on") || "") === "1";

  const row = await assertLegacyOwner(code, user.email);
  if (!row) return;

  const db = getAdminClient();
  await db.from("legacy_tags").update({ lost_mode: on }).eq("id", code);
  revalidatePath("/dashboard");
}

/** Owner edits the details on one of their legacy items. */
export async function updateLegacyItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  const code = String(formData.get("code") || "").trim();
  if (!user) redirect(`/login?next=/dashboard/legacy-item/${code}/edit`);

  const row = await assertLegacyOwner(code, user!.email);
  if (!row) return { error: "You are not the owner of this item." };

  const parsed = parseLegacyForm(formData);
  if (hasErrors(parsed.fieldErrors)) return invalid(parsed);

  const db = getAdminClient();
  const { error } = await db.from("legacy_tags").update(parsed.data).eq("id", code);
  if (error) return { error: error.message, values: parsed.values };

  revalidatePath("/dashboard");
  redirect(`/dashboard?legacy_saved=${code}`);
}

/** Owner activates a blank legacy code (the old /tags/add flow). The row is
    linked to them by their verified account email, same as migrated owners. */
export async function claimLegacyTag(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  const code = String(formData.get("code") || "").trim();
  if (!user) redirect(`/login?next=/legacy/activate/${code}`);
  if (!LEGACY_CODE_RE.test(code)) return { error: "Invalid tag code." };

  const parsed = parseLegacyForm(formData);
  if (hasErrors(parsed.fieldErrors)) return invalid(parsed);

  const db = getAdminClient();
  const { data: tag } = await db.from("legacy_tags").select("id, claimed").eq("id", code).maybeSingle();
  if (!tag) return { error: "Invalid tag — this code does not exist." };
  if (tag.claimed) return { error: "This tag is already activated." };

  const { data: updated, error } = await db
    .from("legacy_tags")
    .update({
      ...parsed.data,
      claimed: true,
      email: user!.email.trim().toLowerCase(),
      lost_mode: false,
      status_raw: "AVAILABLE",
    })
    .eq("id", code)
    .eq("claimed", false)
    .select("id");
  if (error) return { error: error.message, values: parsed.values };
  if (!updated?.length) return { error: "This tag was just activated by someone else." };

  revalidatePath("/dashboard");
  redirect(`/dashboard?legacy_activated=${code}`);
}

/** Admin: generate a batch of blank legacy codes (6-char, case-sensitive).
    Every row in a batch shares one `imported_at`, which is how batches are
    grouped in the admin panel. */
export async function generateLegacyTags(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const count = Math.min(Math.max(parseInt(String(formData.get("count") || "1"), 10) || 1, 1), 500);
  const db = getAdminClient();

  // Existing ids, compared case-insensitively so a new code can never differ
  // from an old one only by letter case (hard to tell apart when printed).
  const taken = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("legacy_tags").select("id").range(from, from + 999);
    if (error) return { error: error.message };
    data.forEach((r) => taken.add(String(r.id).toLowerCase()));
    if (data.length < 1000) break;
  }

  const batchAt = new Date().toISOString();
  const rows: { id: string; claimed: boolean; url_prefix: string; imported_at: string }[] = [];
  while (rows.length < count) {
    const id = shortCode(6, LEGACY_ALPHABET);
    if (taken.has(id.toLowerCase())) continue;
    taken.add(id.toLowerCase());
    rows.push({ id, claimed: false, url_prefix: "https://securetag.in/found", imported_at: batchAt });
  }

  const { error } = await db.from("legacy_tags").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/legacy");
  redirect(`/dashboard/legacy?batch=${encodeURIComponent(batchAt)}`);
}

/** Admin: generate a batch of new unregistered tags. */
export async function generateTags(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const count = Math.min(Math.max(parseInt(String(formData.get("count") || "1"), 10) || 1, 1), 100);
  const db = getAdminClient();
  const rows = Array.from({ length: count }, () => ({ id: shortCode(8) }));
  const { error } = await db.from("tags").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  redirect("/dashboard?created=" + count);
}

/* -------------------- SCAN REQUESTS (notify & accept) -------------------- */

export type ScanResult = {
  requestId: string;
  status: "pending" | "auto";
  contact?: {
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
  };
  error?: string;
};

/**
 * A (possibly anonymous) scanner submits a contact request.
 * Returns contact ONLY if the tag is in Lost Mode (auto-share); otherwise the
 * owner must Accept first — the scanner polls status until then.
 */
export async function createScanRequest(input: {
  tagId: string;
  reason: string;
  message?: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<ScanResult> {
  const db = getAdminClient();
  const { data: tag } = await db.from("tags").select("*").eq("id", input.tagId).maybeSingle();
  if (!tag || !tag.claimed) return { requestId: "", status: "pending", error: "Tag not registered." };

  const reason = input.reason || "Other";
  const emergency = isEmergencyReason(reason);
  // Lost Mode OR an emergency/accident → share contact immediately (no Accept).
  const immediate = Boolean(tag.lost_mode) || emergency;
  const status = immediate ? "auto" : "pending";

  const { data: inserted, error } = await db
    .from("scan_requests")
    .insert({
      tag_id: tag.id,
      owner_user_id: tag.owner_user_id,
      reason,
      scanner_message: input.message || null,
      scanner_lat: input.lat ?? null,
      scanner_lng: input.lng ?? null,
      status,
      responded_at: immediate ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error || !inserted) return { requestId: "", status: "pending", error: error?.message || "Failed." };

  // Alert the owner (always) + emergency/alt contacts (if emergency) across
  // email + WhatsApp, with the scanner's note and live location. Each channel
  // no-ops if its provider isn't configured.
  let ownerEmail: string | null = null;
  if (tag.owner_user_id) {
    const { data: profile } = await db
      .from("profiles")
      .select("email")
      .eq("id", tag.owner_user_id)
      .maybeSingle();
    ownerEmail = profile?.email ?? null;
  }
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3100";
  await notifyOnScan({
    tag,
    ownerEmail,
    reason,
    message: input.message,
    lat: input.lat,
    lng: input.lng,
    baseUrl,
  });

  // NOTE: intentionally no revalidatePath here. This action is called by the
  // (anonymous) scanner from the tag page; revalidating would trigger a router
  // refresh that remounts the scanner's RequestFlow and drops the "waiting"
  // state. The owner's dashboard picks up the new request via its own polling
  // + Realtime subscription instead.

  if (immediate) {
    return {
      requestId: inserted.id,
      status: "auto",
      contact: {
        owner_name: tag.owner_name,
        phone: tag.phone,
        car_model: tag.car_model,
        plate_number: tag.plate_number,
        message: tag.message,
        emergency_contact_name: tag.emergency_contact_name,
        emergency_contact_phone: tag.emergency_contact_phone,
        alt_phone: tag.alt_phone,
        alt_email: tag.alt_email,
        address: tag.address,
      },
    };
  }
  return { requestId: inserted.id, status: "pending" };
}

/** Scanner consents to share their location (used mainly for Lost Mode). */
export async function attachScanLocation(requestId: string, lat: number, lng: number) {
  if (!requestId) return;
  const db = getAdminClient();
  await db.from("scan_requests").update({ scanner_lat: lat, scanner_lng: lng }).eq("id", requestId);
  // No revalidatePath: this is called from the scanner's page. The owner's
  // dashboard reflects the location via its polling/Realtime refresh.
}

/** Owner accepts or declines a pending scan request. */
export async function respondToScan(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const requestId = String(formData.get("requestId") || "").trim();
  const decision = String(formData.get("decision") || "");
  if (!requestId || !["accepted", "declined"].includes(decision)) return;

  const db = getAdminClient();
  const { data: req } = await db
    .from("scan_requests")
    .select("id, owner_user_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return;
  if (!user.isAdmin && req.owner_user_id !== user.id) return;
  if (req.status !== "pending") return;

  await db
    .from("scan_requests")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", requestId);
  revalidatePath("/dashboard");
}

/* -------------------- ADMIN: user role management -------------------- */

export async function updateUserRole(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;
  const userId = String(formData.get("userId") || "").trim();
  const role = String(formData.get("role") || "");
  if (!userId || !["user", "admin"].includes(role)) return;
  if (userId === admin.id) return; // don't let an admin demote themselves by accident

  const db = getAdminClient();
  await db.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/dashboard/users");
}
