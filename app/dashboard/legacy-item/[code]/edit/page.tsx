import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import LegacyItemForm, { type LegacyItemValues } from "@/components/LegacyItemForm";

export const dynamic = "force-dynamic";

export default async function LegacyEditPage({
  params,
}: {
  params: { code: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/dashboard/legacy-item/${params.code}/edit`);

  const db = getAdminClient();
  const { data, error } = await db
    .from("legacy_tags")
    .select("id,item_name,item_type,owner_name,phone,alt_phone,message,address,city,state,country,pref_contact,email,claimed")
    .eq("id", params.code)
    .maybeSingle();
  if (error) throw new Error(`Could not load item: ${error.message}`);
  if (!data) notFound();

  const item = data as LegacyItemValues & { id: string; email: string | null; claimed: boolean };
  // Authorize purely by verified email match.
  const owns =
    item.claimed &&
    !!item.email &&
    item.email.trim().toLowerCase() === user.email.trim().toLowerCase();

  return (
    <main className="container">
      <p className="back-link"><Link href="/dashboard">← Back to dashboard</Link></p>
      <div className="card">
        <div className="form-head">
          <span className="pill brand">Item tag</span>
          <span className="code-chip">{item.id}</span>
        </div>
        <h1>Edit item details</h1>
        {!owns ? (
          <p className="error">This item isn&apos;t linked to your account&apos;s email.</p>
        ) : (
          <LegacyItemForm mode="edit" code={item.id} email={user.email} item={item} />
        )}
      </div>
    </main>
  );
}
