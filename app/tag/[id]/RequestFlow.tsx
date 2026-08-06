"use client";

import { useEffect, useRef, useState } from "react";
import ShieldMark from "@/components/ShieldMark";
import { PhoneIcon, PinIcon } from "@/components/Icons";
import { createScanRequest, attachScanLocation, type ScanResult } from "@/app/actions";

type Contact = NonNullable<ScanResult["contact"]>;

const REASONS: { key: string; label: string; path: string }[] = [
  { key: "Parking issue", label: "Parking issue", path: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M9 17V7h4a3 3 0 0 1 0 6H9" },
  { key: "Vehicle blocked", label: "Blocked in", path: "M12 3 6 20h12L12 3z M9 12h6 M7.5 16h9" },
  { key: "Emergency", label: "Emergency", path: "M8 2.7h8L21.3 8v8L16 21.3H8L2.7 16V8L8 2.7z M12 8v4 M12 16h.01" },
  { key: "Accident", label: "Accident", path: "M4 14l1.6-5A2 2 0 0 1 7.5 7.5h9a2 2 0 0 1 1.9 1.5L20 14 M4 14h16v3a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H7.5v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3z M7.5 15h.01 M16.5 15h.01 M2 6l2 1.4 M2 9.5l2.2 .1" },
  { key: "Lights / window", label: "Lights / window", path: "M15 5a7 7 0 0 1 0 14 M15 5H7a5 5 0 0 0 0 14h8 M18.5 8.5l3-1 M18.5 12h3 M18.5 15.5l3 1" },
  { key: "Lost & found", label: "Lost & found", path: "M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z M9.5 10a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0" },
];

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function ContactCard({ contact, lostMode, requestId, reason }: { contact: Contact; lostMode: boolean; requestId: string; reason: string | null }) {
  const [shared, setShared] = useState(false);
  const tel = contact.phone ? `tel:${contact.phone.replace(/\s+/g, "")}` : null;
  const altTel = contact.alt_phone ? `tel:${contact.alt_phone.replace(/\s+/g, "")}` : null;
  const emergencyTel = contact.emergency_contact_phone
    ? `tel:${contact.emergency_contact_phone.replace(/\s+/g, "")}`
    : null;
  const dialedRef = useRef(false);

  // For emergencies/accidents the owner's own line is the wrong target — they may
  // be the person in trouble — so dial the alternate (next-of-kin) number first,
  // then the emergency contact, and only fall back to the owner's number.
  const urgent = reason === "Emergency" || reason === "Accident";
  const dialTel = urgent ? altTel ?? emergencyTel ?? tel : tel;

  // Owner approved — open the dialer immediately, no extra tap needed.
  useEffect(() => {
    if (dialTel && !dialedRef.current) {
      dialedRef.current = true;
      window.location.href = dialTel;
    }
  }, [dialTel]);

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
        {contact.address && <div className="field"><span className="k">Address</span><span className="v">{contact.address}</span></div>}
        {contact.alt_email && <div className="field"><span className="k">Email</span><span className="v">{contact.alt_email}</span></div>}
      </div>
      {tel && <a className="call-btn" href={tel}><PhoneIcon /> Call {contact.owner_name}</a>}
      {altTel && <a className="call-btn secondary" href={altTel} style={{ marginTop: 8 }}><PhoneIcon /> Call alternate number</a>}
      {emergencyTel && (
        <a className="call-btn secondary" href={emergencyTel} style={{ marginTop: 8 }}>
          <PhoneIcon /> Call emergency contact{contact.emergency_contact_name ? ` (${contact.emergency_contact_name})` : ""}
        </a>
      )}
      {lostMode && (
        <div className="lost-note" style={{ marginTop: 16 }}>
          <b>This car is marked lost.</b>{" "}
          {shared ? "Thanks — your location was shared with the owner." : "Help the owner locate it:"}
          {!shared && (
            <button type="button" className="btn small" style={{ marginTop: 10 }} onClick={shareLocation}>
              <PinIcon size={16} /> Share my location
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const pendingKey = (tagId: string) => `securetag:pending:${tagId}`;

/** Best-effort geolocation — resolves null if unavailable/denied/timeout. */
function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

export default function RequestFlow({ tagId, lostMode }: { tagId: string; lostMode: boolean }) {
  const [phase, setPhase] = useState<"reason" | "submitting" | "pending" | "accepted" | "declined" | "error">("reason");
  const [reason, setReason] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState("");
  const [contact, setContact] = useState<Contact | null>(null);
  const [err, setErr] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resume a waiting request after any refresh/remount so the scanner stays
  // on the waiting screen until the owner accepts or declines.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(pendingKey(tagId));
      if (saved) {
        setRequestId(saved);
        setPhase("pending");
      }
    } catch {
      /* sessionStorage unavailable — ignore */
    }
  }, [tagId]);

  // Poll for owner response while pending.
  useEffect(() => {
    if (phase !== "pending" || !requestId) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/scan/status/${requestId}`, { cache: "no-store" });
        const data = await r.json();
        if (data.status === "accepted" || data.status === "auto") {
          try { sessionStorage.removeItem(pendingKey(tagId)); } catch {}
          setContact(data.contact);
          setPhase("accepted");
        } else if (data.status === "declined") {
          try { sessionStorage.removeItem(pendingKey(tagId)); } catch {}
          setPhase("declined");
        } else if (data.status === "notfound") {
          // Request no longer exists — let the scanner start over.
          try { sessionStorage.removeItem(pendingKey(tagId)); } catch {}
          setPhase("reason");
        }
      } catch {
        /* keep polling */
      }
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, requestId, tagId]);

  async function submit() {
    if (!reason) return;
    setPhase("submitting");
    // Capture location so the owner's alert includes where the car is.
    const pos = await getPosition();
    const res = await createScanRequest({
      tagId,
      reason,
      message: message.trim() || undefined,
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
    });
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
      // Remember the pending request so a refresh keeps us on the waiting page.
      try { sessionStorage.setItem(pendingKey(tagId), res.requestId); } catch {}
      setPhase("pending");
    }
  }

  if (phase === "accepted" && contact) {
    return <ContactCard contact={contact} lostMode={lostMode} requestId={requestId} reason={reason} />;
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

  if (phase === "submitting") {
    return (
      <div className="card center">
        <div className="shield-loader" style={{ margin: "10px auto" }}>
          <div className="badge" style={{ width: 76, height: 76 }}><ShieldMark /><span className="scan" /></div>
        </div>
        <h1 style={{ marginTop: 8 }}>Getting your location…</h1>
        <p className="muted">
          Allow location so the owner knows where their car is, then we&apos;ll
          alert them. You can also tap <b>Block</b> — we&apos;ll still send the
          request without a location.
        </p>
      </div>
    );
  }

  if (phase === "pending") {
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
      <p className="muted small center" style={{ marginTop: 10, display: "inline-flex", gap: 6, alignItems: "center", justifyContent: "center", width: "100%" }}>
        <PinIcon size={14} /> We&apos;ll ask for your location so the owner knows where their car is.
      </p>
    </div>
  );
}
