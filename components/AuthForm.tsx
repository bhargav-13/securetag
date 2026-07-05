"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signInAction, signUpAction, type FormState } from "@/app/actions";
import PendingOverlay from "@/components/PendingOverlay";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn block lg" type="submit" disabled={pending}>
      {pending ? "Please wait…" : label}
    </button>
  );
}

export default function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next: string;
}) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction] = useFormState<FormState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction}>
      <PendingOverlay label={mode === "login" ? "Signing you in" : "Creating your account"} />
      <input type="hidden" name="next" value={next} />

      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        placeholder={mode === "register" ? "At least 6 characters" : "••••••••"}
      />

      {state?.error && <p className="error">{state.error}</p>}
      {state?.info && <p className="info">{state.info}</p>}

      <div className="mt">
        <Submit label={mode === "login" ? "Log in" : "Create account"} />
      </div>

      <p className="muted center mt">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link href={`/register?next=${encodeURIComponent(next)}`}>
              Register
            </Link>
          </>
        ) : (
          <>
            Already have one?{" "}
            <Link href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
          </>
        )}
      </p>
    </form>
  );
}
