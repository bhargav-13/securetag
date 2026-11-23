import type { NextRequest } from "next/server";
import { json, fail, readBody } from "@/lib/mobile";
import { createScan } from "@/lib/scan";

export const dynamic = "force-dynamic";

/** A scanner (no account needed) asks to reach a tag's owner.
 *  Poll /api/scan/status/<requestId> for the owner's answer. */
export async function POST(req: NextRequest) {
  const body = await readBody(req);
  const tagId = String(body.tagId ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  if (!tagId || !reason) return fail("Pick a reason first.");

  const res = await createScan({
    tagId,
    reason,
    message: typeof body.message === "string" ? body.message : undefined,
    lat: typeof body.lat === "number" ? body.lat : null,
    lng: typeof body.lng === "number" ? body.lng : null,
  });
  if (res.error) return fail(res.error, 400);
  return json(res);
}
