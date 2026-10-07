"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { signInAction, signUpAction } from "@/app/actions";
import type { FormState } from "@/lib/forms";
import { FormShell, PasswordField, PhoneField, Row, SubmitBar, TextField } from "@/components/form";

export default function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next: string;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(
    mode === "login" ? signInAction : signUpAction,
    undefined
  );
  const other = mode === "login" ? "/register" : "/login";

  return (
    <FormShell action={formAction} state={state} pendingLabel={mode === "login" ? "Signing you in" : "Creating your account"}>
      <input type="hidden" name="next" value={next} />

      {mode === "register" && (
        <Row>
          <TextField name="full_name" label="Full name" required autoComplete="name" placeholder="Your name" maxLength={80} />
          <PhoneField name="phone" label="Mobile number" required hint="Pre-fills your tags. Indian numbers get +91." />
        </Row>
      )}
      <TextField name="email" label="Email" type="email" required autoComplete="email" placeholder="you@example.com" />
      <PasswordField
        name="password"
        label="Password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        hint={mode === "register" ? "At least 6 characters." : undefined}
      />
      {mode === "login" && (
        <p className="small" style={{ margin: "8px 0 0", textAlign: "right" }}>
          <Link href="/forgot">Forgot password?</Link>
        </p>
      )}

      <SubmitBar
        label={mode === "login" ? "Log in" : "Create account"}
        pendingLabel="Please wait…"
      />

      <p className="muted center mt">
        {mode === "login" ? "New to SecureTag?" : "Already have an account?"}{" "}
        <Link href={`${other}?next=${encodeURIComponent(next)}`}>
          {mode === "login" ? "Create an account" : "Log in"}
        </Link>
      </p>
    </FormShell>
  );
}
