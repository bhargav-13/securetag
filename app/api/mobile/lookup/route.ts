import type { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getBearerUser, json, fail } from "@/lib/mobile";
import { LEGACY_CODE_RE } from "@/lib/legacy";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Resolves a scanned (or typed) code for the app's scanner, applying the same
 * privacy rules as the web pages:
 *  - vehicle tag: only its state is returned; contact needs a scan request.
 *  - legacy item: contact is returned ONLY while the owner has it marked Lost.
 * `kind` narrows the search when the QR's URL said which system it belongs to.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").trim();
  const kind = url.searchParams.get("kind");
  if (!/^[A-Za-z0-9]{4,16}$/.test(code)) return json({ kind: "notfound" });

  const user = await getBearerUser(req);
  const db = getAdminClient();

  if (kind !== "legacy") {
    // Vehicle ids are printed upper-case; accept hand-typed lower-case too.
    const ids = code === code.toUpperCase() ? [code] : [code, code.toUpperCase()];
    const { data: rows, error } = await db.from("tags").select("*").in("id", ids);
    if (error) return fail(`Could not load tag: ${error.message}`, 500);
    const tag = rows?.find((r) => r.id === code) ?? rows?.[0];
    if (tag) {
      if (!tag.claimed) return json({ kind: "vehicle", id: tag.id, state: "unregistered" });
      const isOwner = !!user && (user.id === tag.owner_user_id || user.isAdmin);
      if (isOwner) return json({ kind: "vehicle", id: tag.id, state: "owner", tag });
      return json({ kind: "vehicle", id: tag.id, state: "registered", lostMode: !!tag.lost_mode });
    }
  }

  if (kind !== "vehicle" && LEGACY_CODE_RE.test(code)) {
    const { data: item, error } = await db.from("legacy_tags").select("*").eq("id", code).maybeSingle();
    if (error) return fail(`Could not load tag: ${error.message}`, 500);
    if (item) {
      if (!item.claimed) return json({ kind: "legacy", code, state: "unregistered" });
      const mine = !!user && !!item.email && item.email.trim().toLowerCase() === user.email.trim().toLowerCase();
      if (mine) return json({ kind: "legacy", code, state: "owner", item });

      // A finder's scan: keep the audit trail the web page keeps.
      const lat = Number(url.searchParams.get("lat"));
      const lng = Number(url.searchParams.get("lng"));
      const hasPos = url.searchParams.has("lat") && Number.isFinite(lat) && Number.isFinite(lng);
      const audit = url.searchParams.get("audit") !== "0";
      // One alert per burst of scans, not one per reload.
      const recent = audit
        ? (
            await db
              .from("legacy_scans")
              .select("id", { count: "exact", head: true })
              .eq("code", code)
              .gte("scanned_on", new Date(Date.now() - 2 * 60 * 1000).toISOString())
          ).count ?? 0
        : 0;
      if (audit) await db.from("legacy_scans").insert({
        code,
        device_info: JSON.stringify({ deviceType: "Mobile", os: url.searchParams.get("os") || "Unknown", browser: "SecureTag app" }),
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        lat: hasPos ? lat : null,
        lng: hasPos ? lng : null,
        scanned_on: new Date().toISOString(),
      });

      if (audit && recent === 0) await alertItemOwner(item, hasPos);

      if (!item.lost_mode) return json({ kind: "legacy", code, state: "secured", item_name: item.item_name });
      const pref = String(item.pref_contact || "").toUpperCase();
      const showPhone = pref === "" || pref.includes("PHONE");
      const showEmail = pref === "" || pref.includes("EMAIL");
      return json({
        kind: "legacy",
        code,
        state: "lost",
        item_name: item.item_name,
        message: item.message,
        phones: (showPhone ? [item.phone, item.alt_phone] : []).filter(Boolean),
        email: showEmail ? item.email : null,
      });
    }
  }

  return json({ kind: "notfound" });
}

/** Tells the item's owner (if they use the app) that a finder scanned it. */
async function alertItemOwner(
  item: { id: string; item_name: string | null; email: string | null; lost_mode: boolean | null },
  hasLocation: boolean
) {
  const email = (item.email || "").trim();
  if (!email) return;
  try {
    const { data: owners } = await getAdminClient().from("profiles").select("id,email").ilike("email", email).limit(5);
    const owner = owners?.find((o) => (o.email || "").trim().toLowerCase() === email.toLowerCase());
    if (!owner) return;
    const name = item.item_name || "Your item";
    const where = hasLocation ? " Their location is attached." : "";
    await sendPushToUser(
      owner.id,
      "lost",
      item.lost_mode
        ? { title: `${name} was found and scanned`, body: `The finder can see your contact details.${where}`, data: { code: item.id, kind: "legacy" } }
        : {
            title: `${name} was just scanned`,
            body: `Your details stayed private. If it is missing, turn on Lost Mode.${where}`,
            data: { code: item.id, kind: "legacy" },
          }
    );
  } catch (e) {
    console.error("[push] item alert failed", e);
  }
}
