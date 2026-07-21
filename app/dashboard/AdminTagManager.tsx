"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Tag } from "@/lib/supabase/admin";
import { DownloadIcon, ArrowRightIcon, QrIcon, IdCardIcon, CheckIcon, EyeIcon, XIcon } from "@/components/Icons";
import ShieldMark from "@/components/ShieldMark";

type DownloadStyle = "qr" | "card";
type PreviewState = { tagId: string; style: DownloadStyle } | null;

function PreviewModal({ preview, onClose }: { preview: NonNullable<PreviewState>; onClose: () => void }) {
  const [style, setStyle] = useState<DownloadStyle>(preview.style);
  const src = style === "card" ? `/api/tag-card/${preview.tagId}` : `/api/qr/${preview.tagId}`;
  const downloadHref = `${src}?download=1`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="preview-card" onClick={(e) => e.stopPropagation()}>
        <div className="preview-head">
          <span className="t">{preview.tagId}</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close preview">
            <XIcon size={16} />
          </button>
        </div>

        <div className="preview-toggle">
          <button type="button" className={"seg" + (style === "qr" ? " sel" : "")} onClick={() => setStyle("qr")}>
            <QrIcon size={15} /> Without design
          </button>
          <button type="button" className={"seg" + (style === "card" ? " sel" : "")} onClick={() => setStyle("card")}>
            <IdCardIcon size={15} /> With design
          </button>
        </div>

        <div className="preview-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={style} src={src} alt={`${preview.tagId} ${style}`} />
        </div>
        <div className="preview-foot">
          <a className="btn secondary block" href={downloadHref}>
            <DownloadIcon size={16} /> Download this one ({style === "card" ? "with design" : "without design"})
          </a>
        </div>
      </div>
    </div>
  );
}

function FormatModal({
  count,
  sampleId,
  onCancel,
  onConfirm,
  onPreview,
}: {
  count: number;
  sampleId: string | null;
  onCancel: () => void;
  onConfirm: (style: DownloadStyle) => void;
  onPreview: (style: DownloadStyle) => void;
}) {
  const [style, setStyle] = useState<DownloadStyle>("qr");

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Choose download format</h3>
        <p className="sub">{count} tag{count === 1 ? "" : "s"} selected</p>

        <button type="button" className={"format-opt" + (style === "qr" ? " sel" : "")} onClick={() => setStyle("qr")}>
          <span className="ico"><QrIcon size={20} /></span>
          <span>
            <span className="t">QR code only</span>
            <span className="d">Just the scannable QR, one PNG per tag. Fastest, smallest files.</span>
          </span>
        </button>

        <button type="button" className={"format-opt" + (style === "card" ? " sel" : "")} onClick={() => setStyle("card")}>
          <span className="ico"><IdCardIcon size={20} /></span>
          <span>
            <span className="t">Full card design</span>
            <span className="d">Printable SecureTag card with logo, QR and unique ID. Takes a bit longer.</span>
          </span>
        </button>

        {sampleId && (
          <button type="button" className="btn ghost block" style={{ marginTop: 14 }} onClick={() => onPreview(style)}>
            <EyeIcon size={16} /> Preview this format
          </button>
        )}

        <div className="modal-actions">
          <button type="button" className="btn secondary block" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn block" onClick={() => onConfirm(style)}>
            <DownloadIcon size={16} /> Download
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTagManager({ tags }: { tags: Tag[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [downloading, setDownloading] = useState<DownloadStyle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null);

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

  function previewTag(id: string, style: DownloadStyle) {
    setPreview({ tagId: id, style });
  }

  async function runDownload(style: DownloadStyle) {
    setModalOpen(false);
    setError(null);
    setDownloading(style);
    try {
      const fd = new FormData();
      selected.forEach((id) => fd.append("ids", id));
      fd.append("style", style);
      const res = await fetch("/api/admin/zip", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.text()) || "Download failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = style === "card" ? "securetag-cards.zip" : "securetag-qr-codes.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  }

  const count = selected.size;
  const sampleId = selected.values().next().value ?? tags[0]?.id ?? null;

  return (
    <div>
      <div className="toolbar">
        <button type="button" className="btn secondary small" onClick={selectAll}>
          Select all
        </button>
        <button type="button" className="btn ghost small" onClick={clear}>
          Clear
        </button>
        <span className="muted small">{count} selected · click a tag to select</span>
        <button
          type="button"
          className="btn small"
          disabled={count === 0 || downloading !== null}
          style={{ marginLeft: "auto" }}
          onClick={() => setModalOpen(true)}
        >
          <DownloadIcon size={16} /> Download {count > 0 ? count : ""} as ZIP
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="qr-grid">
        {tags.map((t) => {
          const sel = selected.has(t.id);
          return (
            <div
              key={t.id}
              className={"qr-item" + (sel ? " sel" : "")}
              onClick={() => toggle(t.id)}
              role="checkbox"
              aria-checked={sel}
              aria-label={`Select ${t.id}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggle(t.id);
                }
              }}
            >
              <span className="sel-badge">{sel && <CheckIcon size={14} />}</span>

              <div className="item-actions">
                <button
                  type="button"
                  className="icon-btn"
                  title="Preview"
                  onClick={(e) => {
                    e.stopPropagation();
                    previewTag(t.id, "qr");
                  }}
                >
                  <EyeIcon size={14} />
                </button>
                <a
                  className="icon-btn"
                  href={`/api/qr/${t.id}?download=1`}
                  title="Download PNG"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DownloadIcon size={14} />
                </a>
              </div>

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
                <a
                  className="small"
                  href={`/tag/${t.id}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open <ArrowRightIcon size={13} />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <FormatModal
            count={count}
            sampleId={sampleId}
            onCancel={() => setModalOpen(false)}
            onConfirm={runDownload}
            onPreview={(style) => {
              if (sampleId) previewTag(sampleId, style);
            }}
          />,
          document.body
        )}

      {preview &&
        typeof document !== "undefined" &&
        createPortal(<PreviewModal preview={preview} onClose={() => setPreview(null)} />, document.body)}

      {downloading &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="overlay" role="status">
            <div className="shield-loader">
              <div className="badge">
                <ShieldMark />
                <span className="scan" />
              </div>
              <div className="txt">
                {downloading === "card" ? "Generating card designs" : "Preparing ZIP"}
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
