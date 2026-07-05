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

      <h3 className="mt">Emergency &amp; alternate contact</h3>
      <p className="muted small">Shown to a scanner only after you accept their request — same as your phone number.</p>

      <label htmlFor="emergency_contact_name">Emergency contact name</label>
      <input id="emergency_contact_name" name="emergency_contact_name" defaultValue={tag.emergency_contact_name ?? ""} placeholder="e.g. Spouse, parent, or friend" />

      <label htmlFor="emergency_contact_phone">Emergency contact phone</label>
      <input id="emergency_contact_phone" name="emergency_contact_phone" inputMode="tel" defaultValue={tag.emergency_contact_phone ?? ""} placeholder="e.g. +91 98765 43210" />

      <label htmlFor="alt_phone">Alternate phone</label>
      <input id="alt_phone" name="alt_phone" inputMode="tel" defaultValue={tag.alt_phone ?? ""} placeholder="Backup number, if your primary is unreachable" />

      <label htmlFor="alt_email">Alternate email</label>
      <input id="alt_email" name="alt_email" type="email" defaultValue={tag.alt_email ?? ""} placeholder="e.g. you@example.com" />

      <label htmlFor="address">Address / location</label>
      <input id="address" name="address" defaultValue={tag.address ?? ""} placeholder="Home or usual parking address" />

      {state?.error && <p className="error">{state.error}</p>}

      <div className="mt">
        <SubmitButton />
      </div>
    </form>
  );
}
