/**
 * Wraps every route. Next.js remounts this on each navigation, so the
 * fade/slide animation replays — giving a smooth page transition feel.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
