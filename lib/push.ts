import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";

/* Expo push notifications for the mobile app.
   Device tokens and notification choices live in the auth user's app_metadata
   (`expo_push_tokens`, `notify_prefs`), so no extra table is needed and only
   the server can change them. */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;
const MAX_TOKENS = 8;

export const isExpoPushToken = (t: unknown): t is string => typeof t === "string" && TOKEN_RE.test(t);

/* ------------------------------ what we send ------------------------------ */

/** Every kind of notification the app can receive.
 *  - request:   someone scanned a vehicle tag and waits for Accept / Decline
 *  - emergency: Emergency / Accident scan (contact already shared)
 *  - lost:      a tag or item in Lost Mode was scanned
 *  - location:  the scanner shared where they are, after the first alert
 *  - reply:     the owner answered (sent to the person who scanned) */
export type PushKind = "request" | "emergency" | "lost" | "location" | "reply";

/** The kinds a person may switch off. Emergencies always get through. */
export const PREF_KEYS = ["request", "lost", "location", "reply", "reminder"] as const;
export type PrefKey = (typeof PREF_KEYS)[number];
export type NotifyPrefs = Record<PrefKey, boolean>;

export const DEFAULT_PREFS: NotifyPrefs = { request: true, lost: true, location: true, reply: true, reminder: true };

/** Android channel + action category for each kind (the app creates both). */
const DELIVERY: Record<PushKind, { channelId: string; categoryId?: string; sound: string | null; priority: "high" | "normal" }> = {
  request: { channelId: "requests", categoryId: "scan-request", sound: "default", priority: "high" },
  emergency: { channelId: "emergency", sound: "emergency.wav", priority: "high" },
  lost: { channelId: "lost", sound: "default", priority: "high" },
  location: { channelId: "updates", sound: null, priority: "normal" },
  reply: { channelId: "replies", sound: "default", priority: "high" },
};

export type PushMessage = { title: string; body: string; data?: Record<string, unknown> };

/* ------------------------------ stored state ------------------------------ */

type Meta = { expo_push_tokens?: unknown; notify_prefs?: unknown };

async function readMeta(userId: string): Promise<Meta> {
  const { data } = await getAdminClient().auth.admin.getUserById(userId);
  return (data.user?.app_metadata ?? {}) as Meta;
}

const tokensOf = (meta: Meta) => (Array.isArray(meta.expo_push_tokens) ? meta.expo_push_tokens.filter(isExpoPushToken) : []);

function prefsOf(meta: Meta): NotifyPrefs {
  const saved = (meta.notify_prefs && typeof meta.notify_prefs === "object" ? meta.notify_prefs : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_PREFS };
  for (const k of PREF_KEYS) if (typeof saved[k] === "boolean") out[k] = saved[k] as boolean;
  return out;
}

async function writeTokens(userId: string, tokens: string[]) {
  await getAdminClient().auth.admin.updateUserById(userId, {
    app_metadata: { expo_push_tokens: tokens.slice(-MAX_TOKENS) },
  });
}

export async function addPushToken(userId: string, token: string) {
  const tokens = tokensOf(await readMeta(userId));
  if (tokens.includes(token)) return;
  await writeTokens(userId, [...tokens, token]);
}

export async function removePushToken(userId: string, token: string) {
  const tokens = tokensOf(await readMeta(userId));
  if (!tokens.includes(token)) return;
  await writeTokens(userId, tokens.filter((t) => t !== token));
}

export async function getNotifyPrefs(userId: string): Promise<NotifyPrefs> {
  return prefsOf(await readMeta(userId));
}

/** Saves the switches the app sent; unknown keys are ignored. */
export async function setNotifyPrefs(userId: string, changes: Record<string, unknown>): Promise<NotifyPrefs> {
  const next = prefsOf(await readMeta(userId));
  for (const k of PREF_KEYS) if (typeof changes[k] === "boolean") next[k] = changes[k] as boolean;
  await getAdminClient().auth.admin.updateUserById(userId, { app_metadata: { notify_prefs: next } });
  return next;
}

/* --------------------------------- sending --------------------------------- */

/** Posts to Expo; returns the tokens Expo says no longer exist. Never throws. */
async function deliver(tokens: string[], kind: PushKind, msg: PushMessage): Promise<string[]> {
  if (!tokens.length) return [];
  const d = DELIVERY[kind];
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(
        tokens.map((to) => ({
          to,
          title: msg.title,
          body: msg.body,
          data: { ...msg.data, type: kind },
          priority: d.priority,
          channelId: d.channelId,
          ...(d.sound ? { sound: d.sound } : {}),
          ...(d.categoryId ? { categoryId: d.categoryId } : {}),
        }))
      ),
    });
    const json = (await res.json().catch(() => null)) as
      | { data?: { status: string; details?: { error?: string } }[] }
      | null;
    return tokens.filter((_, i) => json?.data?.[i]?.details?.error === "DeviceNotRegistered");
  } catch (e) {
    console.error("[push] send failed", e);
    return [];
  }
}

/** Sends one notification to every device the user is signed in on, unless
 *  they switched that kind off. Dead tokens are pruned. */
export async function sendPushToUser(userId: string | null | undefined, kind: PushKind, msg: PushMessage): Promise<void> {
  if (!userId) return;
  try {
    const meta = await readMeta(userId);
    if (kind !== "emergency" && !prefsOf(meta)[kind]) return;
    const tokens = tokensOf(meta);
    const dead = await deliver(tokens, kind, msg);
    if (dead.length) await writeTokens(userId, tokens.filter((t) => !dead.includes(t)));
  } catch (e) {
    console.error("[push] send failed", e);
  }
}

/** Sends to one device that is not tied to an account (a scanner's phone). */
export async function sendPushToToken(token: string | null | undefined, kind: PushKind, msg: PushMessage): Promise<void> {
  if (!isExpoPushToken(token)) return;
  await deliver([token], kind, msg);
}

/* ------------------- a scanner's token, kept with the request ------------------- */

/* The owner can read their own scan_requests rows, and anyone holding a push
   token can send to that phone. So the scanner's token is stored encrypted
   with a key only the server has. */

function tokenKey(): Buffer | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return secret ? createHash("sha256").update(`securetag-push:${secret}`).digest() : null;
}

export function sealToken(token: unknown): string | null {
  const key = tokenKey();
  if (!key || !isExpoPushToken(token)) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function openToken(sealed: unknown): string | null {
  const key = tokenKey();
  if (!key || typeof sealed !== "string" || !sealed) return null;
  try {
    const raw = Buffer.from(sealed, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const token = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    return isExpoPushToken(token) ? token : null;
  } catch {
    return null;
  }
}
