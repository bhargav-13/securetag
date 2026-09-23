"use client";

import { useFormState, useFormStatus } from "react-dom";
import { claimLegacyTag, type FormState } from "@/app/actions";
import PendingOverlay from "@/components/PendingOverlay";
import { ITEM_TYPES } from "@/lib/legacy";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn block lg" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Activate this tag"}
    </button>
  );
}

export default function LegacyClaimForm({ code, email }: { code: string; email: string }) {
  const [state, action] = useFormState<FormState, FormData>(claimLegacyTag, undefined);

  return (
    <form action={action}>
      <PendingOverlay label="Activating your tag" />
      <input type="hidden" name="code" value={code} />

      <div className="frow cols-2">
        <div className="field-group">
          <label htmlFor="item_name">Item name *</label>
          <input id="item_name" name="item_name" required placeholder="e.g. American Tourister suitcase" />
        </div>
        <div className="field-group">
          <label htmlFor="item_type">Tag is on a… *</label>
          <select id="item_type" name="item_type" defaultValue="TRAVELLUGGAGE" required>
            {Object.entries(ITEM_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-group" style={{ marginTop: 14 }}>
        <label htmlFor="message">Description / message for the finder</label>
        <textarea id="message" name="message" placeholder="e.g. Blue suitcase with a red ribbon. Reward if found!" />
      </div>

      <div className="form-section">
        <h3>Contact info</h3>
        <p className="form-section-sub">Shown to a finder only while the item is marked Lost.</p>
        <div className="frow cols-2">
          <div className="field-group">
            <label htmlFor="owner_name">Your name *</label>
            <input id="owner_name" name="owner_name" required />
          </div>
          <div className="field-group">
            <label htmlFor="phone">Phone number *</label>
            <input id="phone" name="phone" required inputMode="tel" placeholder="e.g. +91 98765 43210" />
          </div>
        </div>
        <div className="frow cols-2" style={{ marginTop: 14 }}>
          <div className="field-group">
            <label htmlFor="alt_phone">Alternate phone</label>
            <input id="alt_phone" name="alt_phone" inputMode="tel" placeholder="Backup number" />
          </div>
          <div className="field-group">
            <label>Email (your account)</label>
            <input value={email} readOnly disabled />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Address</h3>
        <p className="form-section-sub">Optional. Helps a finder return the item.</p>
        <div className="field-group">
          <label htmlFor="street">Street address</label>
          <input id="street" name="street" />
        </div>
        <div className="frow cols-2" style={{ marginTop: 14 }}>
          <div className="field-group">
            <label htmlFor="city">City</label>
            <input id="city" name="city" />
          </div>
          <div className="field-group">
            <label htmlFor="state">State</label>
            <input id="state" name="state" />
          </div>
        </div>
        <div className="frow cols-2" style={{ marginTop: 14 }}>
          <div className="field-group">
            <label htmlFor="postal_code">PIN code</label>
            <input id="postal_code" name="postal_code" inputMode="numeric" />
          </div>
          <div className="field-group">
            <label htmlFor="country">Country</label>
            <input id="country" name="country" defaultValue="India" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Privacy</h3>
        <p className="form-section-sub">What a finder can see when your item is Lost.</p>
        <div className="check-row">
          <label><input type="checkbox" name="pref_contact" value="PHONE" defaultChecked /> Phone</label>
          <label><input type="checkbox" name="pref_contact" value="EMAIL" defaultChecked /> Email</label>
        </div>
      </div>

      {state?.error && <p className="error">{state.error}</p>}

      <div className="mt">
        <SubmitButton />
      </div>
      <p className="muted center small" style={{ marginTop: 12 }}>
        You can edit these and turn on Lost Mode anytime from your dashboard.
      </p>
    </form>
  );
}
