import { getAdminClient } from "@/lib/supabase/admin";
import { notifyOnScan, isEmergencyReason } from "@/lib/notify";
import { sendPushToUser, sendPushToToken, sealToken, openToken, type PushKind } from "@/lib/push";

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

/* `scan_requests.scanner_push_token` is an optional column (see
   supabase-notifications.sql). Until it exists the scanner simply gets no
   push when the owner answers; everything else works the same. */
let tokenColumn: boolean | null = null;
const missingColumn = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "PGRST204" || e.code === "42703" || /scanner_push_token/.test(e.message || ""));

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
  /** Expo push token of the scanner's phone, to tell them the owner's answer. */
  pushToken?: unknown;
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

  const row: Record<string, unknown> = {
    tag_id: tag.id,
    owner_user_id: tag.owner_user_id,
    reason,
    scanner_message: message,
    scanner_lat: lat,
    scanner_lng: lng,
    status,
    responded_at: immediate ? new Date().toISOString() : null,
  };
  // Only a request that waits for an answer needs the scanner's token.
  const sealed = !immediate && tokenColumn !== false ? sealToken(input.pushToken) : null;
  let { data: inserted, error } = await db
    .from("scan_requests")
    .insert(sealed ? { ...row, scanner_push_token: sealed } : row)
    .select("id")
    .single();
  if (sealed && missingColumn(error)) {
    tokenColumn = false;
    ({ data: inserted, error } = await db.from("scan_requests").insert(row).select("id").single());
  } else if (sealed && !error) tokenColumn = true;
  if (error || !inserted) return { requestId: "", status: "pending", error: error?.message || "Failed." };

  // Alert the owner (always) + emergency/alt contacts (if emergency) across
  // email, WhatsApp and the mobile app. Each channel no-ops if it isn't set up.
  let ownerEmail: string | null = null;
  if (tag.owner_user_id) {
    const { data: profile } = await db.from("profiles").select("email").eq("id", tag.owner_user_id).maybeSingle();
    ownerEmail = profile?.email ?? null;
  }
  const kind: PushKind = emergency ? "emergency" : tag.lost_mode ? "lost" : "request";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3100";
  const vehicle = [tag.car_model, tag.plate_number].filter(Boolean).join(" · ");
  await Promise.allSettled([
    notifyOnScan({ tag, ownerEmail, reason, message, lat, lng, baseUrl }),
    sendPushToUser(tag.owner_user_id, kind, {
      ...scanPushText(kind, { reason, vehicle, message, hasLocation: lat != null && lng != null }),
      data: { requestId: inserted.id, tagId: tag.id },
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

/** What the owner's phone shows for a new scan. */
export function scanPushText(
  kind: PushKind,
  s: { reason: string; vehicle: string; message: string | null; hasLocation: boolean }
): { title: string; body: string } {
  const what = s.vehicle || "your vehicle";
  const note = s.message ? ` "${s.message}"` : "";
  const where = s.hasLocation ? " Their location is attached." : "";
  if (kind === "emergency")
    return {
      title: `${s.reason} reported: ${what}`,
      body: `Your contact and emergency contact were shared right away.${note}${where}`,
    };
  if (kind === "lost")
    return {
      title: `Your lost vehicle was scanned`,
      body: `${s.vehicle ? `${s.vehicle}. ` : ""}The finder can see your contact.${note}${where}`,
    };
  return {
    title: `${s.reason}: someone needs to reach you`,
    body: `${s.vehicle ? `${s.vehicle}. ` : ""}${s.message ? `"${s.message}" ` : ""}Accept to share your number, or decline.`,
  };
}

/** Scanner consents to share their location (used mainly for Lost Mode). */
export async function attachLocation(requestId: string, lat: unknown, lng: unknown) {
  const la = coord(lat, 90);
  const ln = coord(lng, 180);
  if (!requestId || la == null || ln == null) return false;
  const db = getAdminClient();
  const { data: before } = await db
    .from("scan_requests")
    .select("owner_user_id, tag_id, scanner_lat, scanner_lng")
    .eq("id", requestId)
    .maybeSingle();
  if (!before) return false;
  const { error } = await db.from("scan_requests").update({ scanner_lat: la, scanner_lng: ln }).eq("id", requestId);
  if (error) return false;
  // Tell the owner once, the first time a location arrives.
  if (before.scanner_lat == null && before.scanner_lng == null) {
    await sendPushToUser(before.owner_user_id, "location", {
      title: "The scanner shared their location",
      body: "Open to see where your vehicle is on the map.",
      data: { requestId, tagId: before.tag_id },
    });
  }
  return true;
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
  if (error) return { ok: false, error: error.message };
  await notifyScanner(requestId, decision as "accepted" | "declined");
  return { ok: true };
}

/** Tells the scanner's phone the owner answered, if it left a token. */
async function notifyScanner(requestId: string, decision: "accepted" | "declined") {
  if (tokenColumn === false) return;
  try {
    const { data, error } = await getAdminClient()
      .from("scan_requests")
      .select("tag_id, scanner_push_token")
      .eq("id", requestId)
      .maybeSingle();
    if (missingColumn(error)) {
      tokenColumn = false;
      return;
    }
    const row = data as { tag_id: string; scanner_push_token: string | null } | null;
    const token = openToken(row?.scanner_push_token);
    if (!row || !token) return;
    await sendPushToToken(
      token,
      "reply",
      decision === "accepted"
        ? { title: "The owner shared their contact", body: "Open SecureTag to call them.", data: { requestId, tagId: row.tag_id } }
        : { title: "The owner declined", body: "They chose not to share their contact this time.", data: { requestId, tagId: row.tag_id } }
    );
    // The token has done its job; don't keep it.
    await getAdminClient().from("scan_requests").update({ scanner_push_token: null }).eq("id", requestId);
  } catch (e) {
    console.error("[push] scanner reply failed", e);
  }
}
