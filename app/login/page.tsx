import { redirect } from "next/navigation";
import ShieldMark from "@/components/ShieldMark";
import AuthForm from "@/components/AuthForm";
import { getSessionUser } from "@/lib/auth";
import { activatingCode, safeNext } from "@/lib/nextContext";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; link?: string };
}) {
  const user = await getSessionUser();
  const next = safeNext(searchParams.next);
  if (user) redirect(next);
  const code = activatingCode(next);

  return (
    <main className="container">
      <div className="card">
        <div className="center" style={{ marginBottom: 8 }}>
          <ShieldMark className="shield" style={{ width: 56, height: 56 }} />
          <h1 style={{ marginTop: 10 }}>Welcome back</h1>
          <p className="muted">
            {code ? <>Log in to activate tag <span className="code-chip">{code}</span></> : "Log in to manage your SecureTags."}
          </p>
        </div>
        {searchParams.link === "expired" && (
          <div className="form-alert info-alert">
            That link was already used or opened on another device. If you&apos;ve confirmed your email, just log in.
          </div>
        )}
        <AuthForm mode="login" next={next} />
      </div>
    </main>
  );
}
