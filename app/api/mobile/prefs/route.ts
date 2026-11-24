import type { NextRequest } from "next/server";
import { getBearerUser, json, unauthorized, readBody } from "@/lib/mobile";
import { setNotifyPrefs } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Which notifications this account wants: body like `{ "location": false }`.
 *  Returns the full set of switches. Emergencies cannot be turned off. */
export async function PUT(req: NextRequest) {
  const user = await getBearerUser(req);
  if (!user) return unauthorized();
  return json({ ok: true, prefs: await setNotifyPrefs(user.id, await readBody(req)) });
}
