import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getBearerUser, json, fail, unauthorized, readBody } from "@/lib/mobile";
import { attachLocation, respondScan } from "@/lib/scan";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Two things can happen to an existing request:
 *  - `{ "decision": "accepted" | "declined" }` — the OWNER answers (needs login).
 *  - `{ "lat": .., "lng": .. }` — the SCANNER shares their location. No login:
 *    the request id is an unguessable uuid only that scanner holds.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!UUID_RE.test(params.id)) return fail("This request no longer exists.", 404);
  const body = await readBody(req);

  if (typeof body.decision === "string") {
    const user = await getBearerUser(req);
    if (!user) return unauthorized();
    const res = await respondScan(user, params.id, body.decision);
    if (!res.ok) return fail(res.error || "Could not save your answer.", 409);
    revalidatePath("/dashboard");
    return json({ ok: true, status: body.decision });
  }

  if (typeof body.lat === "number" && typeof body.lng === "number") {
    const ok = await attachLocation(params.id, body.lat, body.lng);
    return ok ? json({ ok: true }) : fail("Could not save the location.");
  }

  return fail("Nothing to do.");
}
