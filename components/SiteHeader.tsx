import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { signOutAction } from "@/app/actions";
import PendingOverlay from "@/components/PendingOverlay";

export default async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="site-header">
      <div className="inner">
        <Link href="/" className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/full-logo-minify.svg" alt="SecureTag" />
        </Link>
        <nav className="nav">
          {user ? (
            <>
              <Link href="/dashboard" className="btn secondary small">
                {user.isAdmin ? "Admin" : "My tags"}
              </Link>
              <form action={signOutAction}>
                <PendingOverlay label="Signing out" />
                <button className="btn ghost small" type="submit">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn ghost small">
                Log in
              </Link>
              <Link href="/register" className="btn small">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
