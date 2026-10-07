import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { LEGACY_CODE_RE } from "@/lib/legacy";
import LegacyItemForm from "@/components/LegacyItemForm";

export const dynamic = "force-dynamic";

/* Activation for a blank legacy code — the old app's /activate/<code> →
   sign in / register → /tags/add flow. The legacy /found page sends blank
   codes here; the item is then linked to the owner's verified email. */
export default async function LegacyActivatePage({ params }: { params: { code: string } }) {
  const code = params.code;
  if (!LEGACY_CODE_RE.test(code)) notFound();

  const db = getAdminClient();
  const { data: tag, error } = await db
    .from("legacy_tags")
    .select("id, claimed, email")
    .eq("id", code)
    .maybeSingle();
  if (error) throw new Error(`Could not load tag: ${error.message}`);
  if (!tag) notFound();

  const user = await getSessionUser();

  if (tag.claimed) {
    const owns = !!user && !!tag.email && tag.email.trim().toLowerCase() === user.email.trim().toLowerCase();
    return (
      <main className="container">
        <div className="card center stack">
          <span className="pill green">Already active</span>
          <h1>This tag is already activated</h1>
          {owns ? (
            <Link href={`/dashboard/legacy-item/${code}/edit`} className="btn block lg">Edit this item</Link>
          ) : (
            <p className="muted">
              It&apos;s linked to another account. If you think this is a mistake, write to support@securetag.in.
            </p>
          )}
          <p className="muted small">Tag ID: {code}</p>
        </div>
      </main>
    );
  }

  if (!user) {
    const next = encodeURIComponent(`/legacy/activate/${code}`);
    return (
      <main className="container">
        <div className="card center stack">
          <span className="pill amber">New tag</span>
          <h1>Activate your new tag</h1>
          <p className="muted">
            This SecureTag isn&apos;t activated yet. Log in or create an account to link it to your item.
          </p>
          <Link href={`/register?next=${next}`} className="btn block lg">Register &amp; activate</Link>
          <Link href={`/login?next=${next}`} className="btn secondary block">I already have an account</Link>
          <p className="muted small">Tag ID: {code}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="card">
        <div className="form-head">
          <span className="pill amber">New tag</span>
          <span className="code-chip">{code}</span>
        </div>
        <h1>Activate your tag</h1>
        <p className="muted">
          Tell us what it&apos;s on. Finders only see your contact details after you mark the item as Lost.
        </p>
        <LegacyItemForm mode="claim" code={code} email={user.email} />
      </div>
    </main>
  );
}
