import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { updateUserRole } from "@/app/actions";
import PendingOverlay from "@/components/PendingOverlay";

export const dynamic = "force-dynamic";

type Profile = { id: string; email: string | null; role: string; created_at: string };

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/users");
  if (!user.isAdmin) redirect("/dashboard");

  const db = getAdminClient();
  const { data } = await db
    .from("profiles")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: true });
  const profiles = (data as Profile[]) ?? [];

  return (
    <main className="container wide stack">
      <div className="spread">
        <div>
          <span className="pill brand">Admin</span>
          <h1 style={{ marginTop: 8 }}>Users &amp; roles</h1>
        </div>
        <Link href="/dashboard" className="btn secondary small">← Inventory</Link>
      </div>

      <div className="card">
        <h2>All users ({profiles.length})</h2>
        <p className="muted">Promote a user to admin to give them tag-inventory and user-management access.</p>
        <div style={{ overflowX: "auto" }}>
          <table className="utable">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>{p.email}{p.id === user.id && <span className="muted small"> (you)</span>}</td>
                  <td>{p.role === "admin" ? <span className="pill brand">admin</span> : <span className="pill green">user</span>}</td>
                  <td className="muted small">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    {p.id === user.id ? (
                      <span className="muted small">—</span>
                    ) : (
                      <form action={updateUserRole}>
                        <PendingOverlay label="Updating role" />
                        <input type="hidden" name="userId" value={p.id} />
                        <input type="hidden" name="role" value={p.role === "admin" ? "user" : "admin"} />
                        <button className="btn ghost small" type="submit">
                          {p.role === "admin" ? "Demote to user" : "Make admin"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
