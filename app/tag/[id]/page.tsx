import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClient, type Tag } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { setLostMode } from "@/app/actions";
import ClaimForm from "./ClaimForm";
import RequestFlow from "./RequestFlow";
import PendingOverlay from "@/components/PendingOverlay";
import { AlertIcon, CheckIcon } from "@/components/Icons";

export const dynamic = "force-dynamic";

async function getTag(id: string): Promise<Tag | null> {
  const db = getAdminClient();
  const { data } = await db.from("tags").select("*").eq("id", id).maybeSingle();
  return (data as Tag) ?? null;
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { activated?: string };
}) {
  const tag = await getTag(params.id);
  if (!tag) notFound();
  const user = await getSessionUser();

  /* ---------- REGISTERED ---------- */
  if (tag.claimed) {
    const isOwner = !!user && (user.id === tag.owner_user_id || user.isAdmin);

    // Owner / admin previewing their own tag → show live details + controls.
    if (isOwner) {
      return (
        <main className="container stack">
          {searchParams.activated && (
            <div className="notice"><CheckIcon size={15} /> Your tag is live. When someone scans it, you&apos;ll be asked to share your contact.</div>
          )}
          <div className="card">
            <div className="spread">
              <span className="pill green">Live tag</span>
              {tag.lost_mode && <span className="pill amber">Lost mode ON</span>}
            </div>
            <h1 style={{ marginTop: 12 }}>{tag.car_model || "Your vehicle"}</h1>
            <div className="mt">
              <div className="field"><span className="k">Owner</span><span className="v">{tag.owner_name}</span></div>
              <div className="field"><span className="k">Phone</span><span className="v">{tag.phone}</span></div>
              {tag.plate_number && <div className="field"><span className="k">Number plate</span><span className="v">{tag.plate_number}</span></div>}
            </div>

            <form action={setLostMode} className="mt">
              <PendingOverlay label={tag.lost_mode ? "Turning off Lost Mode" : "Turning on Lost Mode"} />
              <input type="hidden" name="id" value={tag.id} />
              <input type="hidden" name="on" value={tag.lost_mode ? "0" : "1"} />
              <button className={"btn block " + (tag.lost_mode ? "secondary" : "")} type="submit">
                {tag.lost_mode ? "Turn OFF Lost Mode" : <><AlertIcon size={16} /> Turn ON Lost Mode</>}
              </button>
            </form>
            <p className="muted small mt">
              In Lost Mode, anyone who scans instantly sees your contact and can share their location — no Accept needed.
            </p>

            <div className="row wrap mt">
              <Link href={`/tag/${tag.id}/edit`} className="btn secondary small">Edit details</Link>
              <Link href="/dashboard" className="btn ghost small">Dashboard</Link>
            </div>
          </div>
        </main>
      );
    }

    // Anyone else (the scanner) → consent-gated request flow.
    return (
      <main className="container stack">
        <RequestFlow tagId={tag.id} lostMode={tag.lost_mode} />
        <p className="muted center small">Powered by SecureTag · Your privacy is protected</p>
      </main>
    );
  }

  /* ---------- UNREGISTERED ---------- */
  if (!user) {
    const next = encodeURIComponent(`/tag/${tag.id}`);
    return (
      <main className="container">
        <div className="card center stack">
          <span className="pill amber">New tag</span>
          <h1>Activate this tag</h1>
          <p className="muted">This SecureTag isn&apos;t registered yet. Log in or create an account to set it up with your vehicle details.</p>
          <Link href={`/register?next=${next}`} className="btn block lg">Register &amp; activate</Link>
          <Link href={`/login?next=${next}`} className="btn secondary block">I already have an account</Link>
          <p className="muted small">Tag ID: {tag.id}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="card">
        <span className="pill amber">New tag</span>
        <h1 style={{ marginTop: 12 }}>Register this tag</h1>
        <p className="muted">Add your details. After this, anyone who scans it can request to reach you.</p>
        <ClaimForm id={tag.id} />
        <p className="muted small center mt">Tag ID: {tag.id}</p>
      </div>
    </main>
  );
}
