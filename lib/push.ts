import { getAdminClient } from "@/lib/supabase/admin";

/* Expo push notifications for the mobile app.
   Device tokens live in the auth user's app_metadata (`expo_push_tokens`), so
   no extra table is needed and only the server can read or change them. */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;
const MAX_TOKENS = 8;

export const isExpoPushToken = (t: unknown): t is string => typeof t === "string" && TOKEN_RE.test(t);

async function readTokens(userId: string): Promise<string[]> {
  const { data } = await getAdminClient().auth.admin.getUserById(userId);
  const list = (data.user?.app_metadata as { expo_push_tokens?: unknown } | undefined)?.expo_push_tokens;
  return Array.isArray(list) ? list.filter(isExpoPushToken) : [];
}

async function writeTokens(userId: string, tokens: string[]) {
  await getAdminClient().auth.admin.updateUserById(userId, {
    app_metadata: { expo_push_tokens: tokens.slice(-MAX_TOKENS) },
  });
}

export async function addPushToken(userId: string, token: string) {
  const tokens = await readTokens(userId);
  if (tokens.includes(token)) return;
  await writeTokens(userId, [...tokens, token]);
}

export async function removePushToken(userId: string, token: string) {
  const tokens = await readTokens(userId);
  if (!tokens.includes(token)) return;
  await writeTokens(userId, tokens.filter((t) => t !== token));
}

/** Sends one notification to every device the user is signed in on.
 *  Never throws; tokens Expo reports as dead are pruned. */
export async function sendPushToUser(
  userId: string | null | undefined,
  msg: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  if (!userId) return;
  try {
    const tokens = await readTokens(userId);
    if (!tokens.length) return;
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(
        tokens.map((to) => ({ to, sound: "default", priority: "high", channelId: "scans", ...msg }))
      ),
    });
    const json = (await res.json().catch(() => null)) as
      | { data?: { status: string; details?: { error?: string } }[] }
      | null;
    const dead = tokens.filter((_, i) => json?.data?.[i]?.details?.error === "DeviceNotRegistered");
    if (dead.length) await writeTokens(userId, tokens.filter((t) => !dead.includes(t)));
  } catch (e) {
    console.error("[push] send failed", e);
  }
}
