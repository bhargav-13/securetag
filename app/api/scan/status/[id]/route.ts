import type { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

// Never cache this handler — the scanner polls it for a live status change.
// Without this, Next.js serves a stale "pending" forever in production and the
// scanner never sees the owner's Accept.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Scanner polls this with their request id. Contact is returned ONLY when the
 * owner has accepted (or the tag was in Lost Mode → auto). The id is an
 * unguessable uuid, so only the scanner who created it can poll it.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getAdminClient();
  const { data: req } = await db
    .from("scan_requests")
    .select("status, tag_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!req) {
    return Response.json({ status: "notfound" }, { status: 404 });
  }

  const shared = req.status === "accepted" || req.status === "auto";
  if (!shared) {
    return Response.json({ status: req.status });
  }

  // Full contact incl. emergency/alt fields. If those columns don't exist yet
  // (migration not run), fall back to the base fields so the flow still works.
  const FULL =
    "owner_name, phone, car_model, plate_number, message, emergency_contact_name, emergency_contact_phone, alt_phone, alt_email, address";
  const BASE = "owner_name, phone, car_model, plate_number, message";
  let { data: tag, error } = await db.from("tags").select(FULL).eq("id", req.tag_id).maybeSingle();
  if (error) {
    ({ data: tag } = await db.from("tags").select(BASE).eq("id", req.tag_id).maybeSingle());
  }

  return Response.json({
    status: req.status,
    contact: tag ?? null,
  });
}
