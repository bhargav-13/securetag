"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateTag, type FormState } from "@/app/actions";
import type { Tag } from "@/lib/supabase/admin";
import PendingOverlay from "@/components/PendingOverlay";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn block lg" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export default function EditForm({ tag }: { tag: Tag }) {
  const [state, action] = useFormState<FormState, FormData>(
    updateTag,
    undefined
  );

  return (
    <form action={action}>
      <PendingOverlay label="Saving changes" />
      <input type="hidden" name="id" value={tag.id} />

      <label htmlFor="owner_name">Your name *</label>
      <input id="owner_name" name="owner_name" required defaultValue={tag.owner_name ?? ""} />

      <label htmlFor="phone">Phone number *</label>
      <input id="phone" name="phone" required inputMode="tel" defaultValue={tag.phone ?? ""} />

      <label htmlFor="car_model">Car make &amp; model</label>
      <input id="car_model" name="car_model" defaultValue={tag.car_model ?? ""} />

      <label htmlFor="plate_number">Number plate</label>
      <input id="plate_number" name="plate_number" defaultValue={tag.plate_number ?? ""} />

      <label htmlFor="message">Message shown to scanners</label>
      <textarea id="message" name="message" defaultValue={tag.message ?? ""} />

      {state?.error && <p className="error">{state.error}</p>}

      <div className="mt">
        <SubmitButton />
      </div>
    </form>
  );
}
