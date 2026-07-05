import nodemailer from "nodemailer";

/**
 * Transactional email. Two ways to configure it (pick one), both no-domain:
 *
 *  1) SMTP (recommended, free, no domain) — e.g. Gmail App Password or Brevo:
 *     SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  (+ EMAIL_FROM)
 *  2) Resend REST — RESEND_API_KEY (needs a verified domain to email anyone;
 *     test mode only reaches your own Resend address).
 *
 * If neither is set, sendEmail no-ops safely.
 */

let cachedTransport: nodemailer.Transporter | null = null;
function getSmtpTransport(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  if (!cachedTransport) {
    const port = Number(process.env.SMTP_PORT || 587);
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return cachedTransport;
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const to = (Array.isArray(opts.to) ? opts.to : [opts.to]).filter(Boolean);
  if (to.length === 0) return { ok: true, skipped: true };

  // --- 1) SMTP (Gmail / Brevo / any provider) ---
  const smtp = getSmtpTransport();
  if (smtp) {
    // Gmail rewrites From to the authenticated user, so default to SMTP_USER.
    const from =
      process.env.EMAIL_FROM || `SecureTag <${process.env.SMTP_USER}>`;
    try {
      await smtp.sendMail({ from, to: to.join(", "), subject: opts.subject, html: opts.html });
      return { ok: true };
    } catch (e) {
      console.error("[email] SMTP send failed", e);
      return { ok: false, error: String(e) };
    }
  }

  // --- 2) Resend REST ---
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const from = process.env.EMAIL_FROM || "SecureTag <onboarding@resend.dev>";
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject: opts.subject, html: opts.html }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[email] Resend send failed", res.status, body);
        return { ok: false, error: `Resend ${res.status}` };
      }
      return { ok: true };
    } catch (e) {
      console.error("[email] Resend error", e);
      return { ok: false, error: String(e) };
    }
  }

  return { ok: true, skipped: true };
}

export type AlertContext = {
  role: "owner" | "emergency";
  ownerName: string | null;
  vehicle: string | null; // "Model · PLATE"
  tagId: string;
  reason: string;
  message?: string | null;
  mapsUrl?: string | null;
  dashboardUrl: string;
  emergencyName?: string | null;
};

/** Plain-text version, reused for WhatsApp. */
export function scanAlertText(c: AlertContext): string {
  const lines: string[] = [];
  if (c.role === "emergency") {
    lines.push(`URGENT - SecureTag emergency alert`);
    lines.push(
      `Someone scanned ${c.ownerName ? `${c.ownerName}'s` : "a"} vehicle and reported: ${c.reason}.`
    );
    lines.push(`You are listed as ${c.emergencyName ? `${c.emergencyName}, ` : ""}an emergency/alternate contact.`);
  } else {
    lines.push(`SecureTag alert`);
    lines.push(`Someone scanned your SecureTag and needs to reach you.`);
    lines.push(`Reason: ${c.reason}`);
  }
  if (c.vehicle) lines.push(`Vehicle: ${c.vehicle}`);
  if (c.message) lines.push(`Their note: "${c.message}"`);
  if (c.mapsUrl) lines.push(`Location: ${c.mapsUrl}`);
  if (c.role === "owner") lines.push(`Respond: ${c.dashboardUrl}`);
  return lines.join("\n");
}

/** HTML email version. */
export function scanAlertEmail(c: AlertContext): { subject: string; html: string } {
  const emergency = c.role === "emergency" || /emerg|accid/i.test(c.reason);
  const accent = emergency ? "#dc2626" : "#4e46dc";
  const subject = emergency
    ? `URGENT - EMERGENCY: ${c.reason} - ${c.ownerName || "a SecureTag vehicle"}`
    : `Someone scanned your SecureTag (${c.reason})`;

  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#6c7291;font-size:14px;width:120px">${k}</td><td style="padding:6px 0;font-weight:600;font-size:14px">${v}</td></tr>`;

  const html = `
  <div style="font-family:system-ui,Arial,sans-serif;max-width:540px;margin:auto;padding:8px">
    <div style="background:${accent};color:#fff;border-radius:14px 14px 0 0;padding:18px 22px">
      <div style="font-size:13px;letter-spacing:.06em;opacity:.9">${emergency ? "SECURETAG EMERGENCY ALERT" : "SECURETAG ALERT"}</div>
      <div style="font-size:20px;font-weight:800;margin-top:4px">${emergency ? "Urgent — someone needs help" : "Someone scanned your SecureTag"}</div>
    </div>
    <div style="border:1px solid #e7e9f4;border-top:none;border-radius:0 0 14px 14px;padding:20px 22px">
      <p style="margin:0 0 12px;color:#191b2e;font-size:15px">
        ${c.role === "emergency"
          ? `You're listed as ${c.emergencyName ? `<b>${c.emergencyName}</b>, ` : ""}an emergency/alternate contact for ${c.ownerName ? `<b>${c.ownerName}</b>` : "this vehicle"}.`
          : `A person scanned your tag and wants to reach you.`}
      </p>
      <table style="width:100%;border-collapse:collapse">
        ${row("Reason", c.reason)}
        ${c.vehicle ? row("Vehicle", c.vehicle) : ""}
        ${row("Tag", c.tagId)}
        ${c.message ? row("Their note", `"${c.message}"`) : ""}
      </table>
      ${c.mapsUrl
        ? `<a href="${c.mapsUrl}" style="display:inline-block;margin-top:14px;background:#16a34a;color:#fff;padding:11px 18px;border-radius:10px;text-decoration:none;font-weight:700">View scan location on map</a>`
        : ""}
      ${c.role === "owner"
        ? `<div style="margin-top:12px"><a href="${c.dashboardUrl}" style="display:inline-block;background:${accent};color:#fff;padding:11px 18px;border-radius:10px;text-decoration:none;font-weight:700">Open dashboard to respond</a></div>
           <p style="color:#6c7291;font-size:13px;margin-top:14px">Your number is never shared with the scanner until you tap Accept.</p>`
        : `<p style="color:#6c7291;font-size:13px;margin-top:14px">Please reach out or head to the location if you can. This alert was sent automatically because it was flagged as an emergency.</p>`}
    </div>
  </div>`;

  return { subject, html };
}
