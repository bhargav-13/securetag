"use client";

/* Friendly fallback when a page can't load its data (e.g. the database is
   unreachable) — so a scanner sees "try again", not "tag not found". */
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="container">
      <div className="card center stack">
        <span className="pill amber">Temporarily unavailable</span>
        <h1>Something went wrong</h1>
        <p className="muted">We couldn&apos;t load this page right now. Please try again in a minute.</p>
        <button className="btn block lg" onClick={reset}>Try again</button>
        <p className="muted small">Still stuck? support@securetag.in</p>
      </div>
    </main>
  );
}
