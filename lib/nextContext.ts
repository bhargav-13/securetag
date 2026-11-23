/** When login/register was reached from a tag, say which one, so people
 *  know they'll land back on it. */
export function activatingCode(next: string): string | null {
  const m = next.match(/^\/(?:tag|legacy\/activate)\/([A-Za-z0-9]{6,8})(?:[/?]|$)/);
  return m ? m[1] : null;
}

/** Only same-site paths are allowed as post-login destinations. */
export function safeNext(v: unknown): string {
  const n = String(v ?? "");
  // Browsers strip tabs/newlines and treat "\\" as "/" when resolving URLs, so
  // "/\t/evil.com" would leave the site. Reject those outright, then confirm
  // the value still resolves to our own origin.
  if (!n.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(n)) return "/dashboard";
  try {
    const u = new URL(n, "http://securetag.internal");
    if (u.origin !== "http://securetag.internal") return "/dashboard";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/dashboard";
  }
}
