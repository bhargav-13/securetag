import { redirect } from "next/navigation";
import ShieldMark from "@/components/ShieldMark";
import AuthForm from "@/components/AuthForm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getSessionUser();
  const next = searchParams.next || "/dashboard";
  if (user) redirect(next);

  return (
    <main className="container">
      <div className="card">
        <div className="center" style={{ marginBottom: 8 }}>
          <ShieldMark className="shield" style={{ width: 56, height: 56 }} />
          <h1 style={{ marginTop: 10 }}>Welcome back</h1>
          <p className="muted">Log in to manage your SecureTags.</p>
        </div>
        <AuthForm mode="login" next={next} />
      </div>
    </main>
  );
}
