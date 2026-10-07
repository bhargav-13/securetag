/** When login/register was reached from a tag, say which one, so people
 *  know they'll land back on it. */
export function activatingCode(next: string): string | null {
  const m = next.match(/^\/(?:tag|legacy\/activate)\/([A-Za-z0-9]{6,8})(?:[/?]|$)/);
  return m ? m[1] : null;
}

/** Only same-site paths are allowed as post-login destinations. */
export function safeNext(v: unknown): string {
  const n = String(v ?? "");
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/dashboard";
}
