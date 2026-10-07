import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export type Role = "user" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  isAdmin: boolean;
  /** From sign-up; used to pre-fill tag forms. */
  fullName: string | null;
  phone: string | null;
};

/**
 * Returns the logged-in user with their DB role, or null.
 * Role lives in public.profiles — there is no admin credential in env.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.email) return null;

    // Role is authoritative from the DB (service role read).
    const db = getAdminClient();
    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

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

/** Throws-free guard for server actions/routes that require an admin. */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.isAdmin ? user : null;
}
