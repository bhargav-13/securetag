"use client";

import { useEffect, useRef, useState } from "react";
import ShieldMark from "@/components/ShieldMark";
import { createScanRequest, attachScanLocation, type ScanResult } from "@/app/actions";

type Contact = NonNullable<ScanResult["contact"]>;

const REASONS: { key: string; label: string; path: string }[] = [
  { key: "Parking issue", label: "Parking issue", path: "M9 17H7A5 5 0 0 1 7 7h1m3 0h6a4 4 0 0 1 0 8h-2m-9 4v-9a1 1 0 0 1 1-1h3a2.5 2.5 0 0 1 0 5H8" },
  { key: "Vehicle blocked", label: "Blocked in", path: "M5 11h14M6 11l1-5h10l1 5m-12 0v6m12-6v6M7 20h1m8 0h1" },
  { key: "Emergency", label: "Emergency", path: "M12 2 3 20h18L12 2Zm0 6v5m0 3v.5" },
  { key: "Accident", label: "Accident", path: "M12 2v4m0 12v4m10-10h-4M6 12H2m14.5-6.5-3 3m-5 5-3 3m11 0-3-3m-5-5-3-3" },
  { key: "Lights / window", label: "Lights / window", path: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2Z" },
  { key: "Lost & found", label: "Lost & found", path: "M12 21s-7-4.4-9.5-8.5C.9 9.8 2 6 5.2 6 7 6 8.3 7 9 8c.7-1 2-2 3.8-2C16 6 17.1 9.8 15.5 12.5 13 16.6 12 21 12 21Z" },
];

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function ContactCard({ contact, lostMode, requestId }: { contact: Contact; lostMode: boolean; requestId: string }) {
  const [shared, setShared] = useState(false);
  const tel = contact.phone ? `tel:${contact.phone.replace(/\s+/g, "")}` : null;

  function shareLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await attachScanLocation(requestId, pos.coords.latitude, pos.coords.longitude);
        setShared(true);
      },
      () => setShared(false)
    );
  }

  return (
    <div className="card">
      <span className="pill green">Contact shared</span>
      <h1 style={{ marginTop: 12 }}>Contact the owner</h1>
      {contact.message && <p className="muted">{contact.message}</p>}
      <div className="mt">
        <div className="field"><span className="k">Owner</span><span className="v">{contact.owner_name}</span></div>
        <div className="field"><span className="k">Phone</span><span className="v">{contact.phone}</span></div>
        {contact.car_model && <div className="field"><span className="k">Vehicle</span><span className="v">{contact.car_model}</span></div>}
        {contact.plate_number && <div className="field"><span className="k">Number plate</span><span className="v">{contact.plate_number}</span></div>}
      </div>
      {tel && <a className="call-btn" href={tel}>📞 Call {contact.owner_name}</a>}
      {lostMode && (
        <div className="lost-note" style={{ marginTop: 16 }}>
          <b>This car is marked lost.</b>{" "}
          {shared ? "Thanks — your location was shared with the owner." : "Help the owner locate it:"}
          {!shared && (
            <button type="button" className="btn small" style={{ marginTop: 10 }} onClick={shareLocation}>
              📍 Share my location
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function RequestFlow({ tagId, lostMode }: { tagId: string; lostMode: boolean }) {
  const [phase, setPhase] = useState<"reason" | "submitting" | "pending" | "accepted" | "declined" | "error">("reason");
  const [reason, setReason] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState("");
  const [contact, setContact] = useState<Contact | null>(null);
  const [err, setErr] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for owner response while pending.
  useEffect(() => {
    if (phase !== "pending" || !requestId) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/scan/status/${requestId}`, { cache: "no-store" });
        const data = await r.json();
        if (data.status === "accepted" || data.status === "auto") {
          setContact(data.contact);
          setPhase("accepted");
        } else if (data.status === "declined") {
          setPhase("declined");
        }
      } catch {
        /* keep polling */
      }
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, requestId]);

  async function submit() {
    if (!reason) return;
    setPhase("submitting");
    const res = await createScanRequest({ tagId, reason, message: message.trim() || undefined });
    if (res.error) {
      setErr(res.error);
      setPhase("error");
      return;
    }
    setRequestId(res.requestId);
    if (res.status === "auto" && res.contact) {
      setContact(res.contact);
      setPhase("accepted");
    } else {
      setPhase("pending");
    }
  }

  if (phase === "accepted" && contact) {
    return <ContactCard contact={contact} lostMode={lostMode} requestId={requestId} />;
  }

  if (phase === "declined") {
    return (
      <div className="card center stack">
        <span className="pill amber">Not shared</span>
        <h1>Owner didn&apos;t share contact</h1>
        <p className="muted">The owner chose not to share their details right now. If it&apos;s urgent, please contact local authorities.</p>
      </div>
    );
  }

  if (phase === "pending" || phase === "submitting") {
    return (
      <div className="card center">
        <div className="shield-loader" style={{ margin: "10px auto" }}>
          <div className="badge" style={{ width: 76, height: 76 }}><ShieldMark /><span className="scan" /></div>
        </div>
        <h1 style={{ marginTop: 8 }}>Waiting for the owner…</h1>
        <p className="muted">
          We&apos;ve alerted the owner that someone needs to reach them
          {reason ? ` about a ${reason.toLowerCase()}` : ""}. Their number stays
          private until they tap <b>Accept</b>. Keep this page open.
        </p>
        <p className="muted small mt">This usually takes a moment.</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="card center stack">
        <span className="pill amber">Something went wrong</span>
        <p className="error">{err || "Please try again."}</p>
      </div>
    );
  }

  // phase === "reason"
  return (
    <div className="card">
      <span className="pill brand">Registered tag</span>
      <h1 style={{ marginTop: 12 }}>Reach the car owner</h1>
      <p className="muted">
        Pick a reason. The owner is alerted instantly and their number is
        shared only if they accept.
      </p>
      <div className="reasons">
        {REASONS.map((r) => (
          <button
            key={r.key}
            type="button"
            className={"reason" + (reason === r.key ? " sel" : "")}
            onClick={() => setReason(r.key)}
            style={reason === r.key ? { borderColor: "var(--brand)", boxShadow: "0 0 0 3px rgba(78,70,220,.15)" } : undefined}
          >
            <span className="ico"><Icon path={r.path} /></span>
            <span className="lbl">{r.label}</span>
          </button>
        ))}
      </div>

      <label htmlFor="msg">Add a note (optional)</label>
      <textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Your car is blocking gate no. 3." />

      <button className="btn block lg mt" type="button" disabled={!reason} onClick={submit}>
        Send request to owner
      </button>
    </div>
  );
}
