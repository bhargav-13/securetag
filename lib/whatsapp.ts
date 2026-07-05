/**
 * WhatsApp alerts via Meta's WhatsApp Cloud API.
 * No-ops safely when not configured (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID).
 *
 * IMPORTANT (Meta rule): you can only send free-form "text" messages inside a
 * 24-hour window after the user messages your number. For cold alerts like
 * ours, Meta requires a pre-approved TEMPLATE. So if WHATSAPP_TEMPLATE is set
 * we send that template (with the alert text as its single body parameter);
 * otherwise we fall back to a text message (works in the 24h session / testing).
 */

/** Normalise a phone number to digits with a country code (defaults to India +91). */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d; // assume India if no country code
  return d;
}

export async function sendWhatsApp(
  to: string | null | undefined,
  text: string
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TEMPLATE;
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || "en";
  const num = normalizePhone(to);

  if (!token || !phoneId || !num) return { ok: true, skipped: true };

  const endpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const payload = template
    ? {
        messaging_product: "whatsapp",
        to: num,
        type: "template",
        template: {
          name: template,
          language: { code: lang },
          components: [
            { type: "body", parameters: [{ type: "text", text }] },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: num,
        type: "text",
        text: { preview_url: true, body: text },
      };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[whatsapp] send failed", res.status, body);
      return { ok: false, error: `WhatsApp ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[whatsapp] error", e);
    return { ok: false, error: String(e) };
  }
}
