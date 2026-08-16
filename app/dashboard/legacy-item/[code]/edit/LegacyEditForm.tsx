"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateLegacyItem, type FormState } from "@/app/actions";
import PendingOverlay from "@/components/PendingOverlay";

export type LegacyEditable = {
  id: string;
  item_name: string | null;
  owner_name: string | null;
  phone: string | null;
  alt_phone: string | null;
  message: string | null;
  address: string | null;
  pref_contact: string | null;
  email: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn block lg" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export default function LegacyEditForm({ item }: { item: LegacyEditable }) {
  const [state, action] = useFormState<FormState, FormData>(updateLegacyItem, undefined);
  const pref = (item.pref_contact || "").toUpperCase();

  return (
    <form action={action}>
      <PendingOverlay label="Saving changes" />
      <input type="hidden" name="code" value={item.id} />

      <div className="frow cols-2">
        <div className="field-group">
          <label htmlFor="item_name">Item name</label>
          <input id="item_name" name="item_name" defaultValue={item.item_name ?? ""} placeholder="e.g. Backpack, Wallet" />
        </div>
        <div className="field-group">
          <label htmlFor="owner_name">Your name *</label>
          <input id="owner_name" name="owner_name" required defaultValue={item.owner_name ?? ""} />
        </div>
      </div>

      <div className="frow cols-2" style={{ marginTop: 14 }}>
        <div className="field-group">
          <label htmlFor="phone">Phone number *</label>
          <input id="phone" name="phone" required inputMode="tel" defaultValue={item.phone ?? ""} />
        </div>
        <div className="field-group">
          <label htmlFor="alt_phone">Alternate phone</label>
          <input id="alt_phone" name="alt_phone" inputMode="tel" defaultValue={item.alt_phone ?? ""} placeholder="Backup number" />
        </div>
      </div>

      <div className="field-group" style={{ marginTop: 14 }}>
        <label htmlFor="pref_contact">What a finder can see (when the item is Lost)</label>
        <select id="pref_contact" name="pref_contact" defaultValue={pref || "PHONE,EMAIL"}>
          <option value="PHONE,EMAIL">Phone &amp; email</option>
          <option value="PHONE">Phone only</option>
          <option value="EMAIL">Email only</option>
        </select>
      </div>

      <div className="field-group" style={{ marginTop: 14 }}>
        <label htmlFor="message">Message / description</label>
        <textarea id="message" name="message" defaultValue={item.message ?? ""} />
      </div>

      <div className="field-group">
        <label htmlFor="address">Address / location</label>
        <input id="address" name="address" defaultValue={item.address ?? ""} placeholder="Optional" />
      </div>

      <div className="field-group">
        <label>Account email (used to link this item — read-only)</label>
        <input value={item.email ?? ""} readOnly disabled />
      </div>

      {state?.error && <p className="error">{state.error}</p>}

      <div className="mt">
        <SubmitButton />
      </div>
    </form>
  );
}
