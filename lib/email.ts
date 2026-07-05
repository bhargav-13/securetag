/**
 * Transactional email via Resend (https://resend.com).
 * No-ops safely if RESEND_API_KEY isn't set, so the app works without email
 * configured — set the key in production to enable owner alerts.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "SecureTag <onboarding@resend.dev>";
  if (!key) return { ok: true, skipped: true };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function scanAlertEmail(params: {
  tagId: string;
  reason: string;
  baseUrl: string;
}) {
  const url = `${params.baseUrl}/dashboard`;
  return {
    subject: `Someone scanned your SecureTag (${params.reason})`,
    html: `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#4e46dc">Someone scanned your SecureTag</h2>
        <p>A person scanned your tag <b>${params.tagId}</b> and wants to reach you.</p>
        <p><b>Reason:</b> ${params.reason}</p>
        <p>Open your dashboard to <b>Accept</b> and share your contact, or decline.</p>
        <p><a href="${url}" style="background:#4e46dc;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">Open dashboard</a></p>
        <p style="color:#6c7291;font-size:13px">Your number is never shared until you tap Accept.</p>
      </div>`,
  };
}
