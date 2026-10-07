/* Server-side parsing + validation for the tag forms (vehicle and legacy,
   claim and edit share one parser each). Returns cleaned values ready for the
   DB plus per-field error messages the form renders next to each input. */

import { ITEM_TYPES } from "@/lib/legacy";

export type FieldErrors = Record<string, string>;

/** State returned by every form server action. `values` echoes what was
 *  submitted so the form can re-render it after a validation error. */
export type FormState =
  | {
      error?: string;
      info?: string;
      fieldErrors?: FieldErrors;
      values?: Record<string, string>;
    }
  | undefined;

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim().replace(/\s+/g, " ");
const longText = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Normalizes Indian-first phone input to E.164-ish "+<digits>".
 *  "98765 43210", "098765-43210", "919876543210" → "+919876543210".
 *  Returns null when it can't be a real number. */
export function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s\-().]/g, "");
  if (!s) return null;
  const plus = s.startsWith("+");
  const digits = s.replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  if (plus) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class Checker {
  errors: FieldErrors = {};
  required(k: string, v: string, msg: string) {
    if (!v) this.errors[k] ??= msg;
  }
  max(k: string, v: string, n: number) {
    if (v.length > n) this.errors[k] ??= `Keep this under ${n} characters.`;
  }
  phone(k: string, v: string, required: boolean): string | null {
    if (!v) {
      if (required) this.errors[k] ??= "Enter a phone number.";
      return null;
    }
    const p = normalizePhone(v);
    if (!p) this.errors[k] ??= "Enter a valid number, e.g. 98765 43210 or +44 7700 900123.";
    return p;
  }
  email(k: string, v: string) {
    if (v && !EMAIL_RE.test(v)) this.errors[k] ??= "Enter a valid email address.";
  }
}

const echo = (fd: FormData) => {
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v !== "string" || k.startsWith("$")) return;
    out[k] = out[k] ? `${out[k]},${v}` : v; // multi-value (checkboxes) → "A,B"
  });
  return out;
};

const nil = (v: string | null | undefined) => (v ? v : null);

/* ----------------------------- vehicle ----------------------------- */

export function parseVehicleForm(fd: FormData) {
  const c = new Checker();
  const owner_name = text(fd, "owner_name");
  const car_model = text(fd, "car_model");
  const plate_number = text(fd, "plate_number").toUpperCase();
  const message = longText(fd, "message");
  const emergency_contact_name = text(fd, "emergency_contact_name");
  const alt_email = text(fd, "alt_email").toLowerCase();
  const address = longText(fd, "address");

  c.required("owner_name", owner_name, "Enter your name.");
  c.max("owner_name", owner_name, 80);
  const phone = c.phone("phone", text(fd, "phone"), true);
  c.max("car_model", car_model, 80);
  c.max("plate_number", plate_number, 20);
  c.max("message", message, 300);
  c.max("emergency_contact_name", emergency_contact_name, 80);
  const emergency_contact_phone = c.phone("emergency_contact_phone", text(fd, "emergency_contact_phone"), false);
  if (emergency_contact_phone && !emergency_contact_name)
    c.errors.emergency_contact_name ??= "Add a name for this emergency number.";
  const alt_phone = c.phone("alt_phone", text(fd, "alt_phone"), false);
  c.email("alt_email", alt_email);
  c.max("address", address, 300);

  return {
    fieldErrors: c.errors,
    values: echo(fd),
    data: {
      owner_name,
      phone: phone ?? "",
      car_model: nil(car_model),
      plate_number: nil(plate_number),
      message: nil(message),
      emergency_contact_name: nil(emergency_contact_name),
      emergency_contact_phone: nil(emergency_contact_phone),
      alt_phone: nil(alt_phone),
      alt_email: nil(alt_email),
      address: nil(address),
    },
  };
}

/* ----------------------------- legacy ----------------------------- */

export function parseLegacyForm(fd: FormData) {
  const c = new Checker();
  const item_name = text(fd, "item_name");
  const item_type = text(fd, "item_type");
  const owner_name = text(fd, "owner_name");
  const message = longText(fd, "message");
  const address = longText(fd, "address");
  const city = text(fd, "city");
  const state = text(fd, "state");
  const country = text(fd, "country");
  const pref = fd
    .getAll("pref_contact")
    .map((v) => String(v).toUpperCase())
    .filter((v) => v === "PHONE" || v === "EMAIL");

  c.required("item_name", item_name, "Give your item a name, e.g. \"Blue suitcase\".");
  c.max("item_name", item_name, 80);
  if (!ITEM_TYPES[item_type]) c.errors.item_type = "Choose what the tag is attached to.";
  c.required("owner_name", owner_name, "Enter your name.");
  c.max("owner_name", owner_name, 80);
  const phone = c.phone("phone", text(fd, "phone"), true);
  const alt_phone = c.phone("alt_phone", text(fd, "alt_phone"), false);
  c.max("message", message, 300);
  c.max("address", address, 300);
  if (pref.length === 0) c.errors.pref_contact = "Choose at least one way a finder can reach you.";

  return {
    fieldErrors: c.errors,
    values: echo(fd),
    data: {
      item_name,
      item_type,
      owner_name,
      phone: phone ?? "",
      alt_phone: nil(alt_phone),
      message: nil(message),
      address: nil(address),
      city: nil(city),
      state: nil(state),
      country: nil(country),
      pref_contact: pref.join(","),
    },
  };
}

/** Shorthand for an action's validation-failure return. */
export function invalid(parsed: { fieldErrors: FieldErrors; values: Record<string, string> }): FormState {
  return {
    error: "Please fix the highlighted fields.",
    fieldErrors: parsed.fieldErrors,
    values: parsed.values,
  };
}

export const hasErrors = (e: FieldErrors) => Object.keys(e).length > 0;
