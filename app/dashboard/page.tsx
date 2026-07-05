import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAdminClient, type Tag } from "@/lib/supabase/admin";
import { respondToScan, setLostMode } from "@/app/actions";
import AdminTagManager from "./AdminTagManager";
import GenerateForm from "./GenerateForm";
import RealtimeNotifier from "./RealtimeNotifier";
import PendingOverlay from "@/components/PendingOverlay";

export const dynamic = "force-dynamic";

type ScanReq = {
  id: string;
  tag_id: string;
  reason: string | null;
  scanner_message: string | null;
  scanner_lat: number | null;
  scanner_lng: number | null;
  status: string;
  created_at: string;
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams: { created?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");
  const db = getAdminClient();

  /* ---------------- OWNER (fetched for everyone — admins can own tags too) ---------------- */
  const [{ data: tagsData }, { data: reqData }] = await Promise.all([
    db.from("tags").select("*").eq("owner_user_id", user.id).order("claimed_at", { ascending: false }),
    db
      .from("scan_requests")
      .select("*")
      .eq("owner_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);
  const tags = (tagsData as Tag[]) ?? [];
  const pending = (reqData as ScanReq[]) ?? [];

  const ownerSection = (
    <>
      <RealtimeNotifier userId={user.id} />

      {/* Pending scan requests */}
      <div className="card">
        <h2>Contact requests {pending.length > 0 && <span className="pill amber">{pending.length} new</span>}</h2>
        {pending.length === 0 ? (
          <p className="muted">No pending requests. When someone scans your tag, it appears here live.</p>
        ) : (
          pending.map((r) => (
            <div key={r.id} className="req">
              <div className="req-head">
                <strong>{r.reason || "Contact request"}</strong>
                <span className="muted small">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              {r.scanner_message && <p className="req-msg">“{r.scanner_message}”</p>}
              {r.scanner_lat != null && r.scanner_lng != null && (
                <p className="req-msg">
                  📍 <a href={`https://maps.google.com/?q=${r.scanner_lat},${r.scanner_lng}`} target="_blank" rel="noreferrer">Scanner&apos;s location</a>
                </p>
              )}
              <div className="req-actions">
                <form action={respondToScan} style={{ flex: 1 }}>
                  <PendingOverlay label="Sharing your contact" />
                  <input type="hidden" name="requestId" value={r.id} />
                  <input type="hidden" name="decision" value="accepted" />
                  <button className="btn accept block small" type="submit">✓ Accept &amp; share contact</button>
                </form>
                <form action={respondToScan}>
                  <PendingOverlay label="Declining" />
                  <input type="hidden" name="requestId" value={r.id} />
                  <input type="hidden" name="decision" value="declined" />
                  <button className="btn decline small" type="submit">Decline</button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>

      {/* My tags */}
      <div className="card">
        <h2>My tags</h2>
        {tags.length === 0 ? (
          <p className="muted">No tags registered yet. Scan the QR on your SecureTag sticker to register your vehicle.</p>
        ) : (
          tags.map((t) => (
            <div key={t.id} className="req">
              <div className="spread">
                <div>
                  <strong>{t.car_model || "My vehicle"}</strong>
                  <div className="muted small">{t.plate_number ? t.plate_number + " · " : ""}Tag {t.id}</div>
                </div>
                {t.lost_mode ? <span className="pill amber">Lost mode ON</span> : <span className="pill green">Active</span>}
              </div>
              <div className="row wrap mt">
                <Link href={`/tag/${t.id}`} className="btn secondary small">Public page</Link>
                <Link href={`/tag/${t.id}/edit`} className="btn ghost small">Edit</Link>
                <a href={`/api/qr/${t.id}?download=1`} className="btn ghost small">QR</a>
                <form action={setLostMode}>
                  <PendingOverlay label={t.lost_mode ? "Turning off Lost Mode" : "Turning on Lost Mode"} />
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="on" value={t.lost_mode ? "0" : "1"} />
                  <button className="btn small" type="submit">{t.lost_mode ? "Turn off Lost Mode" : "🚨 Lost Mode"}</button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  /* ---------------- ADMIN ---------------- */
  if (user.isAdmin) {
    const { data } = await db.from("tags").select("*").order("created_at", { ascending: false });
    const allTags = (data as Tag[]) ?? [];
    const registered = allTags.filter((t) => t.claimed).length;

    return (
      <main className="container wide stack">
        <div className="spread">
          <div>
            <span className="pill brand">Admin</span>
            <h1 style={{ marginTop: 8 }}>Tag inventory</h1>
          </div>
          <Link href="/dashboard/users" className="btn secondary small">Manage users</Link>
        </div>

        {tags.length > 0 && <div className="stack">{ownerSection}</div>}

        <div className="card">
          <h2>Generate QR tags</h2>
          <p className="muted">Each code is a unique unregistered tag. Print it — the buyer scans it, logs in, and fills in their vehicle details.</p>
          {searchParams.created && <div className="notice mt">✅ Created {searchParams.created} new tag(s).</div>}
          <div className="mt"><GenerateForm /></div>
        </div>

        <div className="card">
          <div className="row wrap" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>All tags ({allTags.length})</h2>
            <span className="muted small">{registered} registered · {allTags.length - registered} unregistered</span>
          </div>
          {allTags.length === 0 ? <p className="muted mt">No tags yet. Generate some above.</p> : <AdminTagManager tags={allTags} />}
        </div>
      </main>
    );
  }

  /* ---------------- OWNER ---------------- */
  return (
    <main className="container stack">
      <div>
        <span className="pill brand">My account</span>
        <h1 style={{ marginTop: 8 }}>Dashboard</h1>
        <p className="muted">{user.email}</p>
      </div>

      {ownerSection}
    </main>
  );
}
