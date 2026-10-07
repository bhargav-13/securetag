import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminClient, type Tag } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import VehicleForm from "@/components/VehicleForm";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/tag/${params.id}/edit`);

  const db = getAdminClient();
  const { data } = await db
    .from("tags")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  const tag = (data as Tag) ?? null;
  if (!tag) notFound();

  const canEdit = user.isAdmin || tag.owner_user_id === user.id;

  return (
    <main className="container">
      <p className="back-link"><Link href={`/tag/${tag.id}`}>← Back to tag</Link></p>
      <div className="card">
        <div className="form-head">
          <span className="pill green">Live tag</span>
          <span className="code-chip">{tag.id}</span>
        </div>
        <h1>Edit tag details</h1>
        {!tag.claimed ? (
          <p className="error">This tag hasn&apos;t been registered yet.</p>
        ) : !canEdit ? (
          <p className="error">You are not the owner of this tag.</p>
        ) : (
          <VehicleForm mode="edit" tagId={tag.id} tag={tag} />
        )}
      </div>
    </main>
  );
}
