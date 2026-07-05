import { sendEmail, scanAlertEmail, scanAlertText, type AlertContext } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import type { Tag } from "@/lib/supabase/admin";

/** True when the scan reason warrants immediately alerting emergency contacts. */
export function isEmergencyReason(reason: string): boolean {
  return /emerg|accid/i.test(reason);
}

/**
 * Fan out scan alerts across all channels.
 *  - Owner is ALWAYS alerted (email + WhatsApp) with reason, note and location.
 *  - If the reason is Accident/Emergency, the emergency + alternate contacts
 *    are alerted immediately too (no waiting for the owner to accept).
 * Every channel no-ops safely when its provider isn't configured.
 */
export async function notifyOnScan(opts: {
  tag: Tag;
  ownerEmail: string | null;
  reason: string;
  message?: string | null;
  lat?: number | null;
  lng?: number | null;
  baseUrl: string;
}): Promise<void> {
  const { tag, ownerEmail, reason, message, lat, lng, baseUrl } = opts;
  const emergency = isEmergencyReason(reason);
  const mapsUrl =
    lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  const vehicle = [tag.car_model, tag.plate_number].filter(Boolean).join(" · ") || null;

  const base: Omit<AlertContext, "role"> = {
    ownerName: tag.owner_name,
    vehicle,
    tagId: tag.id,
    reason,
    message: message ?? null,
    mapsUrl,
    dashboardUrl: `${baseUrl}/dashboard`,
    emergencyName: tag.emergency_contact_name,
  };

  const tasks: Promise<unknown>[] = [];

  // ---- Owner (always) ----
  const ownerCtx: AlertContext = { ...base, role: "owner" };
  const ownerEmails = [ownerEmail, tag.alt_email].filter(Boolean) as string[];
  if (ownerEmails.length) {
    const mail = scanAlertEmail(ownerCtx);
    tasks.push(sendEmail({ to: ownerEmails, subject: mail.subject, html: mail.html }));
  }
  tasks.push(sendWhatsApp(tag.phone, scanAlertText(ownerCtx)));

  // ---- Emergency / alternate contacts (only for accident/emergency) ----
  if (emergency) {
    const emCtx: AlertContext = { ...base, role: "emergency" };
    const emText = scanAlertText(emCtx);
    tasks.push(sendWhatsApp(tag.emergency_contact_phone, emText));
    tasks.push(sendWhatsApp(tag.alt_phone, emText));
  }

  // Fire all channels; individual failures are logged inside each sender.
  await Promise.allSettled(tasks);
}
