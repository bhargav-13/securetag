"use client";

import { useFormState, useFormStatus } from "react-dom";
import { claimTag, type FormState } from "@/app/actions";
import PendingOverlay from "@/components/PendingOverlay";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn block lg" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Activate this tag"}
    </button>
  );
}

export default function ClaimForm({ id }: { id: string }) {
  const [state, action] = useFormState<FormState, FormData>(
    claimTag,
    undefined
  );

  return (
    <form action={action}>
      <PendingOverlay label="Activating your tag" />
      <input type="hidden" name="id" value={id} />

      <label htmlFor="owner_name">Your name *</label>
      <input id="owner_name" name="owner_name" required placeholder="e.g. Bhargav" />

      <label htmlFor="phone">Phone number *</label>
      <input
        id="phone"
        name="phone"
        required
        inputMode="tel"
        placeholder="e.g. +91 98765 43210"
      />

      <label htmlFor="car_model">Car make &amp; model</label>
      <input id="car_model" name="car_model" placeholder="e.g. Hyundai Creta" />

      <label htmlFor="plate_number">Number plate</label>
      <input
        id="plate_number"
        name="plate_number"
        placeholder="e.g. GJ01 AB 1234"
      />

      <label htmlFor="message">Message shown to scanners</label>
      <textarea
        id="message"
        name="message"
        placeholder="e.g. Please call if my car is blocking you. Thanks!"
      />

      {state?.error && <p className="error">{state.error}</p>}

      <div className="mt">
        <SubmitButton />
      </div>
      <p className="muted center small" style={{ marginTop: 12 }}>
        You can edit these anytime from your dashboard.
      </p>
    </form>
  );
}
