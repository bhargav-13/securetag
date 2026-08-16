"use client";

import { useMemo, useState } from "react";

export type LegacyRow = {
  id: string;
  claimed: boolean;
  item_name: string | null;
  item_type: string | null;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  alt_phone: string | null;
  message: string | null;
  address: string | null;
  lost_mode: boolean;
  status_raw: string | null;
  url_prefix: string | null;
};

type Filter = "registered" | "lost" | "blank" | "all";
const MAX_RENDER = 200;

export default function LegacyTagTable({ rows }: { rows: LegacyRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("registered");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "registered" && !r.claimed) return false;
      if (filter === "lost" && !r.lost_mode) return false;
      if (filter === "blank" && r.claimed) return false;
      if (!needle) return true;
      return [r.id, r.item_name, r.owner_name, r.email, r.phone, r.alt_phone]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });
  }, [rows, q, filter]);

  const shown = filtered.slice(0, MAX_RENDER);

  const counts = useMemo(() => {
    const claimed = rows.filter((r) => r.claimed);
    return {
      all: rows.length,
      registered: claimed.length,
      lost: claimed.filter((r) => r.lost_mode).length,
      blank: rows.length - claimed.length,
    };
  }, [rows]);

  const domainOf = (u: string | null) =>
    u?.includes("app.securetag") ? "app" : u?.includes("securetag") ? "root" : "—";

  return (
    <div>
      <div className="legacy-controls">
        <div className="legacy-filters">
          {(["registered", "lost", "blank", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={"seg" + (filter === f ? " sel" : "")}
              onClick={() => setFilter(f)}
            >
              {f[0].toUpperCase() + f.slice(1)} <span className="seg-n">{counts[f]}</span>
            </button>
          ))}
        </div>
        <input
          className="legacy-search"
          placeholder="Search code, item, owner, phone or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="legacy-count">
        {filtered.length} match{filtered.length === 1 ? "" : "es"}
        {filtered.length > MAX_RENDER && ` · showing first ${MAX_RENDER}, refine search to narrow`}
      </div>

      <div className="table-scroll">
        <table className="utable">
          <thead>
            <tr>
              <th>Code</th>
              <th>Item</th>
              <th>Owner</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Domain</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code></td>
                <td>
                  {r.item_name || <span className="muted">—</span>}
                  {r.item_type && <div className="muted small">{r.item_type}</div>}
                </td>
                <td>{r.owner_name || <span className="muted">—</span>}</td>
                <td>
                  {r.phone && <div><a href={`tel:${r.phone}`}>{r.phone}</a></div>}
                  {r.alt_phone && <div><a href={`tel:${r.alt_phone}`}>{r.alt_phone}</a></div>}
                  {r.email && <div><a href={`mailto:${r.email}`}>{r.email}</a></div>}
                  {!r.phone && !r.alt_phone && !r.email && <span className="muted">—</span>}
                </td>
                <td>
                  {!r.claimed ? (
                    <span className="pill brand">Blank</span>
                  ) : r.lost_mode ? (
                    <span className="pill amber">Lost</span>
                  ) : (
                    <span className="pill green">Secured</span>
                  )}
                </td>
                <td className="muted small">{domainOf(r.url_prefix)}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={6} className="muted">No matching tags.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
