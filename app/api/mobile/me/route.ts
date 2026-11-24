import type { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getBearerUser, json, fail, unauthorized, readBody } from "@/lib/mobile";
import { normalizePhone } from "@/lib/forms";
import { getNotifyPrefs } from "@/lib/push";

export const dynamic = "force-dynamic";

const LEGACY_COLS =
  "id,item_name,item_type,owner_name,phone,alt_phone,message,address,city,state,country,pref_contact,lost_mode,claimed,email";

/** Everything the owner's home screen needs, in one call. */
export async function GET(req: NextRequest) {
  const user = await getBearerUser(req);
  if (!user) return unauthorized();
  const db = getAdminClient();

  const [tags, scans, legacy, prefs] = await Promise.all([
    db.from("tags").select("*").eq("owner_user_id", user.id).order("claimed_at", { ascending: false }),
    db
      .from("scan_requests")
      .select("id,tag_id,reason,scanner_message,scanner_lat,scanner_lng,status,created_at,responded_at")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    // Legacy items are matched by the owner's VERIFIED email, case-insensitively.
    db.from("legacy_tags").select(LEGACY_COLS).ilike("email", user.email),
    getNotifyPrefs(user.id),
  ]);
  if (tags.error) return fail(`Could not load your tags: ${tags.error.message}`, 500);

  const mine = user.email.trim().toLowerCase();
  const legacyItems = (legacy.data ?? []).filter((r) => r.claimed && r.email?.trim().toLowerCase() === mine);

  // Recent scans of the owner's items (finders only; the owner's own scans
  // are never recorded).
  const codes = legacyItems.map((r) => r.id);
  const itemScans = codes.length
    ? (
        await db
          .from("legacy_scans")
          .select("id,code,lat,lng,scanned_on")
          .in("code", codes)
          .order("scanned_on", { ascending: false })
          .limit(50)
      ).data ?? []
    : [];

  return json({
    prefs,
    itemScans,
    user: { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, isAdmin: user.isAdmin },
    tags: tags.data ?? [],
    legacyItems,
    scans: scans.data ?? [],
  });
}

/** Update the account's name / phone (pre-fills the tag forms). */
export async function PATCH(req: NextRequest) {
  const user = await getBearerUser(req);
  if (!user) return unauthorized();
  const body = await readBody(req);

  const full_name = String(body.full_name ?? "").trim().replace(/\s+/g, " ");
  const rawPhone = String(body.phone ?? "").trim();
  const fieldErrors: Record<string, string> = {};
  if (!full_name) fieldErrors.full_name = "Enter your name.";
  else if (full_name.length > 80) fieldErrors.full_name = "Keep this under 80 characters.";
  const phone = rawPhone ? normalizePhone(rawPhone) : "";
  if (rawPhone && !phone) fieldErrors.phone = "Enter a valid number, e.g. 98765 43210 or +44 7700 900123.";
  if (Object.keys(fieldErrors).length) return json({ error: "Please fix the highlighted fields.", fieldErrors }, 422);

  const db = getAdminClient();
  const { error } = await db.auth.admin.updateUserById(user.id, { user_metadata: { full_name, phone: phone || null } });
  if (error) return fail(error.message, 500);
  await db.from("profiles").update({ full_name }).eq("id", user.id);
  return json({ ok: true, fullName: full_name, phone: phone || null });
}
