"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { sendEmail, scanAlertEmail } from "@/lib/email";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function shortCode(len = 8) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export type FormState = { error?: string; info?: string } | undefined;

/* ----------------------------- AUTH ----------------------------- */

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect(next);
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");
  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (!data.session) return { info: "Account created. Check your email to confirm, then log in." };
  redirect(next);
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

  const owner_name = String(formData.get("owner_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const car_model = String(formData.get("car_model") || "").trim();
  const plate_number = String(formData.get("plate_number") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!id) return { error: "Missing tag id." };
  if (!owner_name || !phone) return { error: "Name and phone number are required." };

  const db = getAdminClient();
  const { data: tag } = await db.from("tags").select("id, claimed").eq("id", id).maybeSingle();
  if (!tag) return { error: "Invalid tag — this code does not exist." };
  if (tag.claimed) return { error: "This tag is already activated." };

  const { error } = await db
    .from("tags")
    .update({
      claimed: true,
      owner_user_id: user!.id,
      owner_name,
      phone,
      car_model: car_model || null,
      plate_number: plate_number || null,
      message: message || null,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("claimed", false);
  if (error) return { error: error.message };

  revalidatePath(`/tag/${id}`);
  redirect(`/tag/${id}?activated=1`);
}

export async function updateTag(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  const id = String(formData.get("id") || "").trim();
  if (!user) redirect(`/login?next=/tag/${id}/edit`);

  const owner_name = String(formData.get("owner_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const car_model = String(formData.get("car_model") || "").trim();
  const plate_number = String(formData.get("plate_number") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!id) return { error: "Missing tag id." };
  if (!owner_name || !phone) return { error: "Name and phone number are required." };

  const db = getAdminClient();
  const { data: tag } = await db.from("tags").select("id, owner_user_id").eq("id", id).maybeSingle();
  if (!tag) return { error: "Invalid tag." };
  if (!user!.isAdmin && tag.owner_user_id !== user!.id)
    return { error: "You are not the owner of this tag." };

  const { error } = await db
    .from("tags")
    .update({
      owner_name,
      phone,
      car_model: car_model || null,
      plate_number: plate_number || null,
      message: message || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/tag/${id}`);
  redirect(`/tag/${id}`);
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

  const isLost = Boolean(tag.lost_mode);
  const status = isLost ? "auto" : "pending";

  const { data: inserted, error } = await db
    .from("scan_requests")
    .insert({
      tag_id: tag.id,
      owner_user_id: tag.owner_user_id,
      reason: input.reason || "Other",
      scanner_message: input.message || null,
      scanner_lat: input.lat ?? null,
      scanner_lng: input.lng ?? null,
      status,
      responded_at: isLost ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error || !inserted) return { requestId: "", status: "pending", error: error?.message || "Failed." };

  // Email the owner (no-op if RESEND_API_KEY unset).
  if (tag.owner_user_id) {
    const { data: profile } = await db
      .from("profiles")
      .select("email")
      .eq("id", tag.owner_user_id)
      .maybeSingle();
    if (profile?.email) {
      const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3100";
      const mail = scanAlertEmail({ tagId: tag.id, reason: input.reason || "Other", baseUrl: base });
      await sendEmail({ to: profile.email, subject: mail.subject, html: mail.html });
    }
  }

  revalidatePath("/dashboard");

  if (isLost) {
    return {
      requestId: inserted.id,
      status: "auto",
      contact: {
        owner_name: tag.owner_name,
        phone: tag.phone,
        car_model: tag.car_model,
        plate_number: tag.plate_number,
        message: tag.message,
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
  revalidatePath("/dashboard");
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
