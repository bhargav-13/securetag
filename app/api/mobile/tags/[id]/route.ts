import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { getBearerUser, json, fail, unauthorized, readBody, toFormData, invalidResponse } from "@/lib/mobile";
import { parseVehicleForm, hasErrors, invalid } from "@/lib/forms";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

function refresh(id: string) {
  revalidatePath(`/tag/${id}`);
  revalidatePath("/dashboard");
}

/** Activate an unregistered tag with the signed-in user as its owner. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getBearerUser(req);
  if (!user) return unauthorized();
  const id = params.id;

  const parsed = parseVehicleForm(toFormData(await readBody(req)));
  if (hasErrors(parsed.fieldErrors)) return invalidResponse(invalid(parsed));

  const db = getAdminClient();
  const { data: tag } = await db.from("tags").select("id, claimed").eq("id", id).maybeSingle();
  if (!tag) return fail("Invalid tag. This code does not exist.", 404);
  if (tag.claimed) return fail("This tag is already activated.", 409);

  const { data: updated, error } = await db
    .from("tags")
    .update({ ...parsed.data, claimed: true, owner_user_id: user.id, claimed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("claimed", false)
    .select("*");
  if (error) return fail(error.message, 500);
  if (!updated?.length) return fail("This tag was just activated by someone else.", 409);

  refresh(id);
  return json({ ok: true, tag: updated[0] });
}

/** Owner edits the tag's details. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const user = await getBearerUser(req);
  if (!user) return unauthorized();
  const id = params.id;

  const parsed = parseVehicleForm(toFormData(await readBody(req)));
  if (hasErrors(parsed.fieldErrors)) return invalidResponse(invalid(parsed));

  const db = getAdminClient();
  const { data: tag } = await db.from("tags").select("id, owner_user_id, claimed").eq("id", id).maybeSingle();
  if (!tag || !tag.claimed) return fail("Invalid tag.", 404);
  if (!user.isAdmin && tag.owner_user_id !== user.id) return fail("You are not the owner of this tag.", 403);

  const { data: updated, error } = await db.from("tags").update(parsed.data).eq("id", id).select("*");
  if (error) return fail(error.message, 500);

  refresh(id);
  return json({ ok: true, tag: updated?.[0] ?? null });
}

/** Owner toggles Lost Mode: body `{ "on": true | false }`. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getBearerUser(req);
  if (!user) return unauthorized();
  const id = params.id;
  const body = await readBody(req);
  if (typeof body.on !== "boolean") return fail("Missing on/off value.");

  const db = getAdminClient();
  const { data: tag } = await db.from("tags").select("id, owner_user_id, claimed").eq("id", id).maybeSingle();
  if (!tag || !tag.claimed) return fail("Invalid tag.", 404);
  if (!user.isAdmin && tag.owner_user_id !== user.id) return fail("You are not the owner of this tag.", 403);

  const { error } = await db.from("tags").update({ lost_mode: body.on }).eq("id", id);
  if (error) return fail(error.message, 500);

  refresh(id);
  return json({ ok: true, lost_mode: body.on });
}
