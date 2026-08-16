import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import LegacyEditForm, { type LegacyEditable } from "./LegacyEditForm";

export const dynamic = "force-dynamic";

export default async function LegacyEditPage({
  params,
}: {
  params: { code: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/dashboard/legacy-item/${params.code}/edit`);

  const db = getAdminClient();
  const { data } = await db
    .from("legacy_tags")
    .select("id,item_name,owner_name,phone,alt_phone,message,address,pref_contact,email,claimed")
    .eq("id", params.code)
    .maybeSingle();
  if (!data) notFound();

  const item = data as LegacyEditable & { claimed: boolean };
  // Authorize purely by verified email match.
  const owns =
    item.claimed &&
    !!item.email &&
    item.email.trim().toLowerCase() === user.email.trim().toLowerCase();

  return (
    <main className="container">
      <div className="card">
        <h1>Edit legacy item</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Served at <code>app.securetag.in/found/{item.id}</code>
        </p>
        {!owns ? (
          <p className="error">This item isn&apos;t linked to your account&apos;s email.</p>
        ) : (
          <LegacyEditForm item={item} />
        )}
        <p className="muted center mt">
          <Link href="/dashboard">Back to dashboard</Link>
        </p>
      </div>
    </main>
  );
}
