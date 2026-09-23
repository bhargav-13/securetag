"use client";

import { useFormState, useFormStatus } from "react-dom";
import { generateLegacyTags, type FormState } from "@/app/actions";
import PendingOverlay from "@/components/PendingOverlay";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Generating…" : "Generate legacy codes"}
    </button>
  );
}

export default function LegacyGenerateForm() {
  const [state, action] = useFormState<FormState, FormData>(generateLegacyTags, undefined);
  return (
    <form action={action}>
      <PendingOverlay label="Generating legacy codes" />
      <div className="row wrap" style={{ alignItems: "flex-end", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label htmlFor="legacy-count">How many? (1–500)</label>
          <input id="legacy-count" name="count" type="number" min={1} max={500} defaultValue={5} required />
        </div>
        <Submit />
      </div>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}
