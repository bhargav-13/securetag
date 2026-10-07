import Link from "next/link";
import ShieldMark from "@/components/ShieldMark";
import { ResetForm } from "@/components/PasswordForms";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/* Reached from the reset email via /auth/callback, which signs the person in
   with the one-time recovery code before sending them here. */
export default async function ResetPasswordPage() {
  const user = await getSessionUser();
  return (
    <main className="container">
      <div className="card">
        <div className="center" style={{ marginBottom: 8 }}>
          <ShieldMark style={{ width: 56, height: 56 }} />
          <h1 style={{ marginTop: 10 }}>Choose a new password</h1>
          {user && <p className="muted">For {user.email}</p>}
        </div>
        {user ? (
          <ResetForm />
        ) : (
          <div className="center stack">
            <p className="muted">
              This reset link has expired or was opened on a different device or browser.
            </p>
            <Link href="/forgot" className="btn block lg">Send a new link</Link>
          </div>
        )}
      </div>
    </main>
  );
}
