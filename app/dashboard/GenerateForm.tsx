"use client";

import { useFormState, useFormStatus } from "react-dom";
import { generateTags, type FormState } from "@/app/actions";
import PendingOverlay from "@/components/PendingOverlay";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Generating…" : "Generate codes"}
    </button>
  );
}

export default function GenerateForm() {
  const [state, action] = useFormState<FormState, FormData>(
    generateTags,
    undefined
  );
  return (
    <form action={action}>
      <PendingOverlay label="Generating codes" />
      <div className="row wrap" style={{ alignItems: "flex-end", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label htmlFor="count">How many? (1–100)</label>
          <input id="count" name="count" type="number" min={1} max={100} defaultValue={10} required />
        </div>
        <Submit />
      </div>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}
