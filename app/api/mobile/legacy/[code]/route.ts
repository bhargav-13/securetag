import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { getBearerUser, json, fail, unauthorized, readBody, toFormData, invalidResponse } from "@/lib/mobile";
import { parseLegacyForm, hasErrors, invalid } from "@/lib/forms";
import { LEGACY_CODE_RE } from "@/lib/legacy";

export const dynamic = "force-dynamic";

type Ctx = { params: { code: string } };

/* Legacy items are authorized purely by VERIFIED EMAIL match (see the note in
   app/actions.ts): the row's email must equal the signed-in user's email. */
async function ownedRow(code: string, userEmail: string) {
  if (!LEGACY_CODE_RE.test(code)) return null;
  const { data: row } = await getAdminClient().from("legacy_tags").select("*").eq("id", code).maybeSingle();
  if (!row || !row.claimed || !row.email) return null;
  return row.email.trim().toLowerCase() === userEmail.trim().toLowerCase() ? row : null;
}

/** Activate a blank legacy code for the signed-in user. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getBearerUser(req);
  if (!user) return unauthorized();
  const code = params.code;
  if (!LEGACY_CODE_RE.test(code)) return fail("Invalid tag code.", 404);

  const parsed = parseLegacyForm(toFormData(await readBody(req)));
  if (hasErrors(parsed.fieldErrors)) return invalidResponse(invalid(parsed));

  const db = getAdminClient();
  const { data: tag } = await db.from("legacy_tags").select("id, claimed").eq("id", code).maybeSingle();
  if (!tag) return fail("Invalid tag. This code does not exist.", 404);
  if (tag.claimed) return fail("This tag is already activated.", 409);

  const { data: updated, error } = await db
    .from("legacy_tags")
    .update({
      ...parsed.data,
      claimed: true,
      email: user.email.trim().toLowerCase(),
      lost_mode: false,
      status_raw: "AVAILABLE",
    })
    .eq("id", code)
    .eq("claimed", false)
    .select("id");
  if (error) return fail(error.message, 500);
  if (!updated?.length) return fail("This tag was just activated by someone else.", 409);

  revalidatePath("/dashboard");
  return json({ ok: true });
}

/** Owner edits the item's details. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const user = await getBearerUser(req);
  if (!user) return unauthorized();
  if (!(await ownedRow(params.code, user.email))) return fail("You are not the owner of this item.", 403);

  const parsed = parseLegacyForm(toFormData(await readBody(req)));
  if (hasErrors(parsed.fieldErrors)) return invalidResponse(invalid(parsed));

  const { error } = await getAdminClient().from("legacy_tags").update(parsed.data).eq("id", params.code);
  if (error) return fail(error.message, 500);

  revalidatePath("/dashboard");
  return json({ ok: true });
}

/** Owner toggles Lost Mode: body `{ "on": true | false }`. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getBearerUser(req);
  if (!user) return unauthorized();
  const body = await readBody(req);
  if (typeof body.on !== "boolean") return fail("Missing on/off value.");
  if (!(await ownedRow(params.code, user.email))) return fail("You are not the owner of this item.", 403);

  const { error } = await getAdminClient()
    .from("legacy_tags")
    .update({ lost_mode: body.on, status_raw: body.on ? "LOST" : "AVAILABLE" })
    .eq("id", params.code);
  if (error) return fail(error.message, 500);

  revalidatePath("/dashboard");
  return json({ ok: true, lost_mode: body.on });
}
