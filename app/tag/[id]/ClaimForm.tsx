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

      <div className="frow cols-2">
        <div className="field-group">
          <label htmlFor="owner_name">Your name *</label>
          <input id="owner_name" name="owner_name" required placeholder="e.g. Bhargav" />
        </div>
        <div className="field-group">
          <label htmlFor="phone">Phone number *</label>
          <input id="phone" name="phone" required inputMode="tel" placeholder="e.g. +91 98765 43210" />
        </div>
      </div>

      <div className="frow cols-2" style={{ marginTop: 14 }}>
        <div className="field-group">
          <label htmlFor="car_model">Car make &amp; model</label>
          <input id="car_model" name="car_model" placeholder="e.g. Hyundai Creta" />
        </div>
        <div className="field-group">
          <label htmlFor="plate_number">Number plate</label>
          <input id="plate_number" name="plate_number" placeholder="e.g. GJ01 AB 1234" />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="message">Message shown to scanners</label>
        <textarea id="message" name="message" placeholder="e.g. Please call if my car is blocking you. Thanks!" />
      </div>

      <div className="form-section">
        <h3>Emergency &amp; alternate contact</h3>
        <p className="form-section-sub">Shown to a scanner only after you accept their request — same as your phone number.</p>

        <div className="frow cols-2">
          <div className="field-group">
            <label htmlFor="emergency_contact_name">Emergency contact name</label>
            <input id="emergency_contact_name" name="emergency_contact_name" placeholder="e.g. Spouse or friend" />
          </div>
          <div className="field-group">
            <label htmlFor="emergency_contact_phone">Emergency contact phone</label>
            <input id="emergency_contact_phone" name="emergency_contact_phone" inputMode="tel" placeholder="e.g. +91 98765 43210" />
          </div>
        </div>

        <div className="frow cols-2" style={{ marginTop: 14 }}>
          <div className="field-group">
            <label htmlFor="alt_phone">Alternate phone</label>
            <input id="alt_phone" name="alt_phone" inputMode="tel" placeholder="Backup number" />
          </div>
          <div className="field-group">
            <label htmlFor="alt_email">Alternate email</label>
            <input id="alt_email" name="alt_email" type="email" placeholder="e.g. you@example.com" />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="address">Address / location</label>
          <input id="address" name="address" placeholder="Home or usual parking address" />
        </div>
      </div>

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
