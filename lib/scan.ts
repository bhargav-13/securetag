import { getAdminClient } from "@/lib/supabase/admin";
import { notifyOnScan, isEmergencyReason } from "@/lib/notify";
import { sendPushToUser } from "@/lib/push";

/* The scan-request flow, shared by the website's server actions and the
   mobile app's API routes. */

export type ScanContact = {
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

export type ScanResult = {
  requestId: string;
  status: "pending" | "auto";
  contact?: ScanContact;
  error?: string;
};

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
const coord = (v: unknown, max: number) =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= max ? v : null;

/**
 * A (possibly anonymous) scanner submits a contact request.
 * Returns contact ONLY if the tag is in Lost Mode or the reason is an
 * emergency (auto-share); otherwise the owner must Accept first and the
 * scanner polls /api/scan/status/<id> until then.
 */
export async function createScan(input: {
  tagId: string;
  reason: string;
  message?: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<ScanResult> {
  const db = getAdminClient();
  const { data: tag } = await db.from("tags").select("*").eq("id", clip(input.tagId, 40)).maybeSingle();
  if (!tag || !tag.claimed) return { requestId: "", status: "pending", error: "Tag not registered." };

  const reason = clip(input.reason, 60) || "Other";
  const message = clip(input.message, 500) || null;
  const lat = coord(input.lat, 90);
  const lng = coord(input.lng, 180);
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
      scanner_message: message,
      scanner_lat: lat,
      scanner_lng: lng,
      status,
      responded_at: immediate ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error || !inserted) return { requestId: "", status: "pending", error: error?.message || "Failed." };

  // Alert the owner (always) + emergency/alt contacts (if emergency) across
  // email, WhatsApp and the mobile app. Each channel no-ops if it isn't set up.
  let ownerEmail: string | null = null;
  if (tag.owner_user_id) {
    const { data: profile } = await db.from("profiles").select("email").eq("id", tag.owner_user_id).maybeSingle();
    ownerEmail = profile?.email ?? null;
  }
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3100";
  const vehicle = [tag.car_model, tag.plate_number].filter(Boolean).join(" · ");
  await Promise.allSettled([
    notifyOnScan({ tag, ownerEmail, reason, message, lat, lng, baseUrl }),
    sendPushToUser(tag.owner_user_id, {
      title: immediate ? `${reason}: contact shared` : `${reason}: someone needs to reach you`,
      body:
        (vehicle ? `${vehicle}. ` : "") +
        (message ? `"${message}"` : immediate ? "Your contact was shared automatically." : "Tap to accept or decline."),
      data: { type: "scan", requestId: inserted.id, tagId: tag.id },
    }),
  ]);

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
export async function attachLocation(requestId: string, lat: unknown, lng: unknown) {
  const la = coord(lat, 90);
  const ln = coord(lng, 180);
  if (!requestId || la == null || ln == null) return false;
  const db = getAdminClient();
  const { error } = await db.from("scan_requests").update({ scanner_lat: la, scanner_lng: ln }).eq("id", requestId);
  return !error;
}

/** Owner (or an admin) accepts or declines a pending request. */
export async function respondScan(
  user: { id: string; isAdmin: boolean },
  requestId: string,
  decision: string
): Promise<{ ok: boolean; error?: string }> {
  if (!requestId || !["accepted", "declined"].includes(decision)) return { ok: false, error: "Invalid request." };
  const db = getAdminClient();
  const { data: req } = await db
    .from("scan_requests")
    .select("id, owner_user_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { ok: false, error: "This request no longer exists." };
  if (!user.isAdmin && req.owner_user_id !== user.id) return { ok: false, error: "This request isn't yours." };
  if (req.status !== "pending") return { ok: false, error: "This request was already answered." };

  const { error } = await db
    .from("scan_requests")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "pending");
  return error ? { ok: false, error: error.message } : { ok: true };
}
