import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import AdminTabs from "@/components/AdminTabs";
import LegacyTagTable, { type LegacyRow } from "./LegacyTagTable";
import LegacyGenerateForm from "./LegacyGenerateForm";
import AdminTagManager from "../AdminTagManager";
import { ORIGINAL_IMPORT_DAY } from "@/lib/legacy";

export const dynamic = "force-dynamic";

type Batch = { at: string; rows: LegacyRow[] };

const fmtBatch = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default async function LegacyAdminPage({
  searchParams,
}: {
  searchParams: { batch?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/legacy");
  if (!user.isAdmin) redirect("/dashboard");

  const db = getAdminClient();
  // PostgREST caps every response at 1,000 rows regardless of .range(), so
  // page through until we've pulled them all (~1,498).
  const cols =
    "id,claimed,item_name,item_type,owner_name,email,phone,alt_phone,message,address,lost_mode,status_raw,url_prefix,imported_at";
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

  // Batches generated from this panel: every row of one batch shares its
  // imported_at; the original 2026-08-16 import is excluded.
  const byAt = new Map<string, LegacyRow[]>();
  for (const r of rows) {
    if (r.imported_at.startsWith(ORIGINAL_IMPORT_DAY)) continue;
    const key = new Date(r.imported_at).toISOString();
    byAt.set(key, [...(byAt.get(key) ?? []), r]);
  }
  const batches: Batch[] = Array.from(byAt, ([at, rs]) => ({ at, rows: rs })).sort((a, b) =>
    b.at.localeCompare(a.at)
  );
  const wanted = searchParams.batch ? new Date(searchParams.batch) : null;
  const activeAt =
    wanted && !isNaN(wanted.getTime())
      ? wanted.toISOString()
      : batches[0]?.at ?? null;
  const active = batches.find((b) => b.at === activeAt) ?? null;
  const justCreated = !!searchParams.batch && !!active;

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
        <h2 style={{ marginTop: 0 }}>Generate new legacy codes</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Creates blank 6-character codes. Each QR points to <code>securetag.in/found/&lt;code&gt;</code>;
          whoever scans a blank one is asked to sign in and activate it for their item.
        </p>
        <LegacyGenerateForm />
      </div>

      {batches.length > 0 && (
        <div className="card">
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2 style={{ margin: 0 }}>Generated batches</h2>
            <span className="cnt">{batches.length} batch{batches.length === 1 ? "" : "es"}</span>
          </div>
          {justCreated && (
            <div className="notice mt">
              Created {active!.rows.length} new code{active!.rows.length === 1 ? "" : "s"}. They&apos;re selected below: download them as a ZIP.
            </div>
          )}
          <div className="legacy-filters mt">
            {batches.map((b) => (
              <a
                key={b.at}
                href={`/dashboard/legacy?batch=${encodeURIComponent(b.at)}`}
                className={"seg" + (b.at === activeAt ? " sel" : "")}
              >
                {fmtBatch(b.at)}{" "}
                <span className="seg-n">
                  {b.rows.length} · {b.rows.filter((r) => r.claimed).length} activated
                </span>
              </a>
            ))}
          </div>
          {active && (
            <div className="mt">
              <AdminTagManager
                key={active.at}
                kind="legacy"
                tags={[...active.rows].sort((a, b) => a.id.localeCompare(b.id))}
                initialSelected={justCreated ? active.rows.map((r) => r.id) : undefined}
              />
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="section-head" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>All legacy tags</h2>
          <span className="cnt">same Supabase, separate table</span>
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
