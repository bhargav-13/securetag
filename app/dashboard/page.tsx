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

function TagCard({ t }: { t: Tag }) {
  return (
    <div className="tagcard">
      <div className="tc-top">
        <div>
          <div className="tc-title">{t.car_model || "My vehicle"}</div>
          <div className="tc-meta">{t.plate_number ? `${t.plate_number} · ` : ""}<span className="tc-code">{t.id}</span></div>
        </div>
        {t.lost_mode ? <span className="pill amber">Lost</span> : <span className="pill green">Active</span>}
      </div>
      <div className="tc-actions">
        <Link href={`/tag/${t.id}`} className="btn secondary chip-btn">View</Link>
        <Link href={`/tag/${t.id}/edit`} className="btn ghost chip-btn">Edit</Link>
        <a href={`/api/qr/${t.id}?download=1`} className="btn ghost chip-btn">QR</a>
        <form action={setLostMode}>
          <PendingOverlay label={t.lost_mode ? "Turning off Lost Mode" : "Turning on Lost Mode"} />
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="on" value={t.lost_mode ? "0" : "1"} />
          <button className={"btn chip-btn " + (t.lost_mode ? "secondary" : "")} type="submit">
            {t.lost_mode ? "End Lost" : "🚨 Lost"}
          </button>
        </form>
      </div>
    </div>
  );
}

function RequestCard({ r }: { r: ScanReq }) {
  return (
    <div className="reqcard">
      <div className="rc-head">
        <div className="rc-title"><span className="rc-dot" />{r.reason || "Contact request"}</div>
        <span className="rc-time">{new Date(r.created_at).toLocaleString()}</span>
      </div>
      {r.scanner_message && <p className="rc-msg">“{r.scanner_message}”</p>}
      {r.scanner_lat != null && r.scanner_lng != null && (
        <p className="rc-loc">
          📍 <a href={`https://maps.google.com/?q=${r.scanner_lat},${r.scanner_lng}`} target="_blank" rel="noreferrer">Scanner&apos;s location</a>
        </p>
      )}
      <div className="rc-actions">
        <form action={respondToScan}>
          <PendingOverlay label="Sharing your contact" />
          <input type="hidden" name="requestId" value={r.id} />
          <input type="hidden" name="decision" value="accepted" />
          <button className="btn accept block small" type="submit">✓ Accept &amp; share</button>
        </form>
        <form action={respondToScan}>
          <PendingOverlay label="Declining" />
          <input type="hidden" name="requestId" value={r.id} />
          <input type="hidden" name="decision" value="declined" />
          <button className="btn decline small" type="submit">Decline</button>
        </form>
      </div>
    </div>
  );
}

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
  const activeCount = tags.filter((t) => !t.lost_mode).length;
  const lostCount = tags.filter((t) => t.lost_mode).length;

  const ownerBody = (
    <>
      <RealtimeNotifier userId={user.id} />

      {pending.length > 0 && (
        <div>
          <div className="section-head">
            <h2>Contact requests <span className="pill amber">{pending.length} new</span></h2>
          </div>
          <div className="tag-grid">
            {pending.map((r) => <RequestCard key={r.id} r={r} />)}
          </div>
        </div>
      )}

      <div>
        <div className="section-head">
          <h2>My tags</h2>
          <span className="cnt">{tags.length} total</span>
        </div>
        {tags.length === 0 ? (
          <div className="empty">
            <div className="ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0l-7.18-7.18a2 2 0 0 1 0-2.83l7.18-7.17a2 2 0 0 1 1.41-.59H19a2 2 0 0 1 2 2v6.17a2 2 0 0 1-.41 1.41Z"/><circle cx="16.5" cy="7.5" r="1.5"/></svg>
            </div>
            <p className="t">No tags yet</p>
            <p>Scan the QR on your SecureTag sticker to register your vehicle and start receiving contact requests.</p>
          </div>
        ) : (
          <div className="tag-grid">
            {tags.map((t) => <TagCard key={t.id} t={t} />)}
          </div>
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
        <div className="page-head">
          <div>
            <span className="eyebrow-sm">Admin</span>
            <h1>Tag inventory</h1>
            <p className="sub">Generate, print and track every SecureTag.</p>
          </div>
          <Link href="/dashboard/users" className="btn secondary small">Manage users</Link>
        </div>

        <div className="stat-row">
          <div className="stat-tile brand"><div className="n">{allTags.length}</div><div className="l">Total tags</div></div>
          <div className="stat-tile green"><div className="n">{registered}</div><div className="l">Registered</div></div>
          <div className="stat-tile"><div className="n">{allTags.length - registered}</div><div className="l">Unregistered</div></div>
          <div className="stat-tile amber"><div className="n">{pending.length}</div><div className="l">Pending requests</div></div>
        </div>

        {tags.length > 0 && <div className="stack">{ownerBody}</div>}

        <div className="card">
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2 style={{ margin: 0 }}>Generate QR tags</h2>
          </div>
          <p className="muted" style={{ marginTop: 0 }}>Each code is a unique unregistered tag. Print it — the buyer scans it, logs in, and fills in their vehicle details.</p>
          {searchParams.created && <div className="notice mt">✅ Created {searchParams.created} new tag(s).</div>}
          <div className="mt"><GenerateForm /></div>
        </div>

        <div className="card">
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2 style={{ margin: 0 }}>All tags</h2>
            <span className="cnt">{registered} registered · {allTags.length - registered} unregistered</span>
          </div>
          {allTags.length === 0 ? <p className="muted mt">No tags yet. Generate some above.</p> : <AdminTagManager tags={allTags} />}
        </div>
      </main>
    );
  }

  /* ---------------- OWNER ---------------- */
  return (
    <main className="container md stack">
      <div className="page-head">
        <div>
          <span className="eyebrow-sm">My account</span>
          <h1>Dashboard</h1>
          <p className="sub">{user.email}</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-tile brand"><div className="n">{tags.length}</div><div className="l">My tags</div></div>
        <div className="stat-tile green"><div className="n">{activeCount}</div><div className="l">Active</div></div>
        <div className="stat-tile amber"><div className="n">{lostCount}</div><div className="l">Lost mode</div></div>
        <div className="stat-tile"><div className="n">{pending.length}</div><div className="l">Pending</div></div>
      </div>

      {ownerBody}
    </main>
  );
}
