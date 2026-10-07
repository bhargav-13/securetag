import { redirect } from "next/navigation";
import ShieldMark from "@/components/ShieldMark";
import AuthForm from "@/components/AuthForm";
import { getSessionUser } from "@/lib/auth";
import { activatingCode, safeNext } from "@/lib/nextContext";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getSessionUser();
  const next = safeNext(searchParams.next);
  if (user) redirect(next);
  const code = activatingCode(next);

  return (
    <main className="container">
      <div className="card">
        <div className="center" style={{ marginBottom: 8 }}>
          <ShieldMark style={{ width: 56, height: 56 }} />
          <h1 style={{ marginTop: 10 }}>Create your account</h1>
          <p className="muted">
            {code ? <>Create an account to activate tag <span className="code-chip">{code}</span></> : "One account to register and manage your tags."}
          </p>
        </div>
        <AuthForm mode="register" next={next} />
      </div>
    </main>
  );
}
