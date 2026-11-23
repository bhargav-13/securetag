import type { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getBearerUser, json, fail } from "@/lib/mobile";
import { LEGACY_CODE_RE } from "@/lib/legacy";

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
      await db.from("legacy_scans").insert({
        code,
        device_info: JSON.stringify({ deviceType: "Mobile", os: url.searchParams.get("os") || "Unknown", browser: "SecureTag app" }),
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        lat: hasPos ? lat : null,
        lng: hasPos ? lng : null,
        scanned_on: new Date().toISOString(),
      });

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
