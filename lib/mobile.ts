import type { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SessionUser, Role } from "@/lib/auth";
import type { FormState } from "@/lib/forms";

/* Helpers for the mobile app's JSON API (/api/mobile/*).
   The app signs in with Supabase directly and sends its access token as
   `Authorization: Bearer <jwt>`; we verify it with Supabase on every call. */

export async function getBearerUser(req: NextRequest | Request): Promise<SessionUser | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  try {
    const db = getAdminClient();
    const { data, error } = await db.auth.getUser(token);
    const user = data?.user;
    if (error || !user || !user.email) return null;
    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role: Role = profile?.role === "admin" ? "admin" : "user";
    const meta = (user.user_metadata ?? {}) as { full_name?: string; phone?: string };
    return {
      id: user.id,
      email: user.email,
      role,
      isAdmin: role === "admin",
      fullName: meta.full_name || null,
      phone: meta.phone || null,
    };
  } catch {
    return null;
  }
}

const NO_STORE = { "Cache-Control": "no-store" };

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });
export const fail = (error: string, status = 400, extra?: Record<string, unknown>) =>
  json({ error, ...extra }, status);
export const unauthorized = () => fail("Please log in again.", 401);

/** Turns a validation FormState into a 422 the app can render per field. */
export const invalidResponse = (state: FormState) =>
  json({ error: state?.error || "Please fix the highlighted fields.", fieldErrors: state?.fieldErrors ?? {} }, 422);

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The form parsers in lib/forms.ts take FormData; this adapts a JSON body.
 *  Arrays become repeated keys (e.g. pref_contact checkboxes). */
export function toFormData(body: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(body)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => fd.append(k, String(x)));
    else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") fd.append(k, String(v));
  }
  return fd;
}
