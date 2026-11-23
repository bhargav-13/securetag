import type { NextRequest } from "next/server";
import { getBearerUser, json, fail, unauthorized, readBody } from "@/lib/mobile";
import { addPushToken, removePushToken, isExpoPushToken } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Register this device for scan alerts: body `{ "token": "ExponentPushToken[..]" }`. */
export async function POST(req: NextRequest) {
  const user = await getBearerUser(req);
  if (!user) return unauthorized();
  const { token } = await readBody(req);
  if (!isExpoPushToken(token)) return fail("Invalid push token.");
  await addPushToken(user.id, token);
  return json({ ok: true });
}

/** Stop alerts on this device (called on sign-out). */
export async function DELETE(req: NextRequest) {
  const user = await getBearerUser(req);
  if (!user) return unauthorized();
  const { token } = await readBody(req);
  if (!isExpoPushToken(token)) return fail("Invalid push token.");
  await removePushToken(user.id, token);
  return json({ ok: true });
}
