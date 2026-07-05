import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminClient, type Tag } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import EditForm from "./EditForm";

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
      <div className="card">
        <h1>Edit tag details</h1>
        {!tag.claimed ? (
          <p className="error">This tag hasn&apos;t been registered yet.</p>
        ) : !canEdit ? (
          <p className="error">You are not the owner of this tag.</p>
        ) : (
          <EditForm tag={tag} />
        )}
        <p className="muted center mt">
          <Link href={`/tag/${tag.id}`}>← Back to tag</Link>
        </p>
      </div>
    </main>
  );
}
