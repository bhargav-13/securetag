"use client";

/* Small form kit shared by every data-entry form (vehicle + legacy, add +
   edit, auth). Server actions return `FormState` (see lib/forms.ts); this
   kit renders per-field errors, keeps what the person typed after a failed
   submit, moves focus to the first problem, and shows a consistent submit
   bar. */

import Link from "next/link";
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/forms";
import PendingOverlay from "@/components/PendingOverlay";

type Initial = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
type Ctx = { state: FormState; initial: Initial };
const FormCtx = createContext<Ctx>({ state: undefined, initial: {} });

/** Value to pre-fill: what was just submitted (after an error), else the saved value. */
function useDefault(name: string): string {
  const { state, initial } = useContext(FormCtx);
  return state?.values?.[name] ?? str(initial[name]);
}
function useFieldError(name: string): string | undefined {
  return useContext(FormCtx).state?.fieldErrors?.[name];
}

export function FormShell({
  action,
  state,
  initial = {},
  pendingLabel,
  children,
}: {
  action: (fd: FormData) => void;
  state: FormState;
  initial?: Initial;
  pendingLabel: string;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  // Remount the fields after each response so their defaults pick up the
  // echoed `values` — survives React resetting the form after an action.
  const seen = useRef<{ s: FormState; n: number }>({ s: state, n: 0 });
  if (seen.current.s !== state) seen.current = { s: state, n: seen.current.n + 1 };

  useEffect(() => {
    if (!state || !formRef.current) return;
    const first = Object.keys(state.fieldErrors ?? {})[0];
    const el = first
      ? formRef.current.querySelector<HTMLElement>(`[name="${first}"]`)
      : formRef.current.querySelector<HTMLElement>(".form-alert");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (first) el?.focus({ preventScroll: true });
  }, [state]);

  return (
    <FormCtx.Provider value={{ state, initial }}>
      <form action={action} ref={formRef} noValidate>
        <PendingOverlay label={pendingLabel} />
        {state?.error && !state.fieldErrors && (
          <div className="form-alert error-alert" role="alert">{state.error}</div>
        )}
        {state?.fieldErrors && (
          <div className="form-alert error-alert" role="alert">
            {Object.keys(state.fieldErrors).length === 1
              ? "One field needs attention."
              : `${Object.keys(state.fieldErrors).length} fields need attention.`}
          </div>
        )}
        {state?.info && <div className="form-alert info-alert" role="status">{state.info}</div>}
        <div className="form-body" key={seen.current.n}>{children}</div>
      </form>
    </FormCtx.Provider>
  );
}

/** Label + control + hint/error, wired up for screen readers. */
function FieldFrame({
  name,
  label,
  required,
  hint,
  bare,
  children,
}: {
  name: string;
  label: ReactNode;
  required?: boolean;
  /** No required/optional marker (read-only fields). */
  bare?: boolean;
  hint?: ReactNode;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const error = useFieldError(name);
  const msgId = `${id}-msg`;
  return (
    <div className={"field-group" + (error ? " has-error" : "")}>
      <label htmlFor={id}>
        {label}
        {bare ? null : required ? <span className="req-mark" aria-hidden> *</span> : <span className="opt-mark"> (optional)</span>}
      </label>
      {children({ id, describedBy: error || hint ? msgId : undefined, invalid: !!error })}
      {error ? (
        <p className="field-error" id={msgId}>{error}</p>
      ) : hint ? (
        <p className="field-hint" id={msgId}>{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = {
  name: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  maxLength?: number;
  uppercase?: boolean;
  readOnlyValue?: string;
};

export function TextField(p: InputProps) {
  const def = useDefault(p.name);
  return (
    <FieldFrame name={p.name} label={p.label} required={p.required} hint={p.hint} bare={p.readOnlyValue !== undefined}>
      {({ id, describedBy, invalid }) =>
        p.readOnlyValue !== undefined ? (
          <input id={id} value={p.readOnlyValue} readOnly disabled aria-describedby={describedBy} />
        ) : (
          <input
            id={id}
            name={p.name}
            type={p.type ?? "text"}
            defaultValue={def}
            required={p.required}
            placeholder={p.placeholder}
            inputMode={p.inputMode}
            autoComplete={p.autoComplete}
            maxLength={p.maxLength}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={p.uppercase ? "upper" : undefined}
          />
        )
      }
    </FieldFrame>
  );
}

/** Phone input. The server normalizes to +<country><number>; 10-digit Indian
 *  numbers get +91 automatically. */
export function PhoneField(p: Omit<InputProps, "type" | "inputMode">) {
  return (
    <TextField
      {...p}
      type="tel"
      inputMode="tel"
      autoComplete={p.autoComplete ?? "tel"}
      placeholder={p.placeholder ?? "98765 43210"}
      hint={p.hint}
      maxLength={20}
    />
  );
}

export function TextArea(p: Omit<InputProps, "type" | "inputMode"> & { rows?: number }) {
  const def = useDefault(p.name);
  const [len, setLen] = useState(def.length);
  const max = p.maxLength ?? 300;
  return (
    <FieldFrame
      name={p.name}
      label={p.label}
      required={p.required}
      hint={
        <>
          {p.hint}
          <span className={"char-count" + (len > max - 20 ? " near" : "")}>{len}/{max}</span>
        </>
      }
    >
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          name={p.name}
          defaultValue={def}
          rows={p.rows ?? 3}
          placeholder={p.placeholder}
          maxLength={max}
          onChange={(e) => setLen(e.target.value.length)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
      )}
    </FieldFrame>
  );
}

export function SelectField(
  p: Omit<InputProps, "type" | "inputMode" | "placeholder"> & { options: [string, string][]; fallback?: string }
) {
  const stored = useDefault(p.name);
  const def = (stored && p.options.some(([v]) => v === stored) ? stored : p.fallback) || "";
  return (
    <FieldFrame name={p.name} label={p.label} required={p.required} hint={p.hint}>
      {({ id, describedBy, invalid }) => (
        <select id={id} name={p.name} defaultValue={def} aria-invalid={invalid || undefined} aria-describedby={describedBy}>
          {p.options.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      )}
    </FieldFrame>
  );
}

/** Multi-select shown as toggle chips (checkboxes underneath). */
export function ChoiceChips({
  name,
  label,
  hint,
  options,
  fallback,
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  options: [string, ReactNode][];
  fallback: string[];
}) {
  const raw = useDefault(name);
  const chosen = raw ? raw.toUpperCase().split(",").map((s) => s.trim()) : fallback;
  const error = useFieldError(name);
  const id = useId();
  return (
    <fieldset className={"field-group chips" + (error ? " has-error" : "")} aria-describedby={`${id}-msg`}>
      <legend>{label}</legend>
      <div className="chip-row">
        {options.map(([v, l]) => (
          <label key={v} className="chip">
            <input type="checkbox" name={name} value={v} defaultChecked={chosen.includes(v)} />
            <span>{l}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p className="field-error" id={`${id}-msg`}>{error}</p>
      ) : hint ? (
        <p className="field-hint" id={`${id}-msg`}>{hint}</p>
      ) : null}
    </fieldset>
  );
}

/** Titled group of fields. */
export function Section({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <section className="form-section">
      <h3>{title}</h3>
      {sub && <p className="form-section-sub">{sub}</p>}
      {children}
    </section>
  );
}

/** Optional group collapsed by default; opens itself when it already holds
 *  data or has an error, so nothing is ever hidden from the person. */
export function OptionalSection({
  title,
  sub,
  fields,
  children,
}: {
  title: string;
  sub?: ReactNode;
  fields: string[];
  children: ReactNode;
}) {
  const { state, initial } = useContext(FormCtx);
  const filled = fields.some((f) => (state?.values?.[f] ?? str(initial[f])).trim());
  const errored = fields.some((f) => state?.fieldErrors?.[f]);
  return (
    <details className="form-section optional" open={filled || errored}>
      <summary>
        <span className="t">{title}</span>
        {sub && <span className="form-section-sub">{sub}</span>}
      </summary>
      <div className="optional-body">{children}</div>
    </details>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="frow cols-2">{children}</div>;
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn lg" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

/** Sticky on phones so the main action is always reachable. */
export function SubmitBar({
  label,
  pendingLabel = "Saving…",
  cancelHref,
  note,
}: {
  label: string;
  pendingLabel?: string;
  cancelHref?: string;
  note?: ReactNode;
}) {
  return (
    <>
      <div className="submit-bar">
        <div className="submit-actions">
          {cancelHref && (
            <Link href={cancelHref} className="btn ghost lg">Cancel</Link>
          )}
          <SubmitButton label={label} pendingLabel={pendingLabel} />
        </div>
      </div>
      {note && <p className="muted small submit-note">{note}</p>}
    </>
  );
}

/** Password with a show/hide toggle. Never echoed back after an error. */
export function PasswordField({
  name,
  label,
  autoComplete,
  hint,
}: {
  name: string;
  label: string;
  autoComplete: string;
  hint?: ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <FieldFrame name={name} label={label} required hint={hint}>
      {({ id, describedBy, invalid }) => (
        <div className="pw-wrap">
          <input
            id={id}
            name={name}
            type={show ? "text" : "password"}
            required
            autoComplete={autoComplete}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
          />
          <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
            {show ? "Hide" : "Show"}
          </button>
        </div>
      )}
    </FieldFrame>
  );
}
