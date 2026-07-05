"use client";

import { useState } from "react";
import type { Tag } from "@/lib/supabase/admin";
import { DownloadIcon, ArrowRightIcon } from "@/components/Icons";

export default function AdminTagManager({ tags }: { tags: Tag[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(tags.map((t) => t.id)));
  }
  function clear() {
    setSelected(new Set());
  }

  const count = selected.size;

  return (
    <form action="/api/admin/zip" method="post">
      <div className="toolbar">
        <button type="button" className="btn secondary small" onClick={selectAll}>
          Select all
        </button>
        <button type="button" className="btn ghost small" onClick={clear}>
          Clear
        </button>
        <span className="muted small">{count} selected</span>
        <button
          type="submit"
          className="btn small"
          disabled={count === 0}
          style={{ marginLeft: "auto" }}
        >
          <DownloadIcon size={16} /> Download {count > 0 ? count : ""} as ZIP
        </button>
      </div>

      <div className="qr-grid">
        {tags.map((t) => {
          const sel = selected.has(t.id);
          return (
            <div key={t.id} className={"qr-item" + (sel ? " sel" : "")}>
              <input
                className="cb"
                type="checkbox"
                name="ids"
                value={t.id}
                checked={sel}
                onChange={() => toggle(t.id)}
                aria-label={`Select ${t.id}`}
              />
              <a
                className="dl"
                href={`/api/qr/${t.id}?download=1`}
                title="Download PNG"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="pill brand">PNG</span>
              </a>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr/${t.id}`} alt={`QR ${t.id}`} loading="lazy" />
              <div className="code">{t.id}</div>
              <div style={{ marginTop: 6 }}>
                {t.claimed ? (
                  <span className="pill green">Registered</span>
                ) : (
                  <span className="pill amber">Unregistered</span>
                )}
              </div>
              {t.claimed && (
                <div className="muted small" style={{ marginTop: 4 }}>
                  {t.owner_name} · {t.phone}
                </div>
              )}
              <div style={{ marginTop: 6 }}>
                <a className="small" href={`/tag/${t.id}`} target="_blank" rel="noreferrer">
                  Open <ArrowRightIcon size={13} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </form>
  );
}
