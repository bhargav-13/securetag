"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { requestPasswordReset, updatePassword } from "@/app/actions";
import type { FormState } from "@/lib/forms";
import { FormShell, PasswordField, SubmitBar, TextField } from "@/components/form";

export function ForgotForm() {
  const [state, action] = useFormState<FormState, FormData>(requestPasswordReset, undefined);
  return (
    <FormShell action={action} state={state} pendingLabel="Sending reset link">
      <TextField name="email" label="Email" type="email" required autoComplete="email" placeholder="you@example.com" />
      <SubmitBar label="Send reset link" pendingLabel="Sending…" />
      <p className="muted center mt">
        Remembered it? <Link href="/login">Log in</Link>
      </p>
    </FormShell>
  );
}

export function ResetForm() {
  const [state, action] = useFormState<FormState, FormData>(updatePassword, undefined);
  return (
    <FormShell action={action} state={state} pendingLabel="Saving your password">
      <PasswordField name="password" label="New password" autoComplete="new-password" hint="At least 6 characters." />
      <PasswordField name="confirm" label="Confirm new password" autoComplete="new-password" />
      <SubmitBar label="Save password" pendingLabel="Saving…" />
    </FormShell>
  );
}
