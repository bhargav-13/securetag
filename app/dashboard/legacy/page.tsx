import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import AdminTabs from "@/components/AdminTabs";
import LegacyTagTable, { type LegacyRow } from "./LegacyTagTable";

export const dynamic = "force-dynamic";

export default async function LegacyAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/legacy");
  if (!user.isAdmin) redirect("/dashboard");

  const db = getAdminClient();
  // PostgREST caps every response at 1,000 rows regardless of .range(), so
  // page through until we've pulled them all (~1,498).
  const cols =
    "id,claimed,item_name,item_type,owner_name,email,phone,alt_phone,message,address,lost_mode,status_raw,url_prefix";
  const PAGE = 1000;
  const rows: LegacyRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("legacy_tags")
      .select(cols)
      .order("claimed", { ascending: false })
      .order("lost_mode", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) break;
    const batch = (data as LegacyRow[]) ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  const claimed = rows.filter((r) => r.claimed);
  const lost = claimed.filter((r) => r.lost_mode);

  return (
    <main className="container wide stack">
      <div className="page-head">
        <div>
          <span className="eyebrow-sm">Admin</span>
          <h1>Legacy tags</h1>
          <p className="sub">
            Pre-2024 SecureTag items served from <code>app.securetag.in/found</code>.
          </p>
        </div>
      </div>

      <AdminTabs active="legacy" />

      <div className="stat-row">
        <div className="stat-tile brand"><div className="n">{rows.length}</div><div className="l">Printed codes</div></div>
        <div className="stat-tile green"><div className="n">{claimed.length}</div><div className="l">Registered</div></div>
        <div className="stat-tile amber"><div className="n">{lost.length}</div><div className="l">In lost mode</div></div>
        <div className="stat-tile"><div className="n">{rows.length - claimed.length}</div><div className="l">Blank / claimable</div></div>
      </div>

      <div className="card">
        <div className="section-head" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>All legacy tags</h2>
          <span className="cnt">read-only · same Supabase, separate table</span>
        </div>
        {rows.length === 0 ? (
          <p className="muted mt">
            No legacy tags found. Run the importer in <code>securetag-legacy</code> first.
          </p>
        ) : (
          <LegacyTagTable rows={rows} />
        )}
      </div>
    </main>
  );
}
