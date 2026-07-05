import type { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

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

  const { data: tag } = await db
    .from("tags")
    .select("owner_name, phone, car_model, plate_number, message")
    .eq("id", req.tag_id)
    .maybeSingle();

  return Response.json({
    status: req.status,
    contact: tag ?? null,
  });
}
