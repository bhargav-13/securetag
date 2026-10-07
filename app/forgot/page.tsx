import ShieldMark from "@/components/ShieldMark";
import { ForgotForm } from "@/components/PasswordForms";

export default function ForgotPage() {
  return (
    <main className="container">
      <div className="card">
        <div className="center" style={{ marginBottom: 8 }}>
          <ShieldMark style={{ width: 56, height: 56 }} />
          <h1 style={{ marginTop: 10 }}>Reset your password</h1>
          <p className="muted">
            Enter your account email and we&apos;ll send you a link to set a new password.
            Had a SecureTag account before 2024? Use the same email here.
          </p>
        </div>
        <ForgotForm />
      </div>
    </main>
  );
}
