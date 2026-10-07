"use client";

import { useFormState } from "react-dom";
import { claimTag, updateTag } from "@/app/actions";
import type { FormState } from "@/lib/forms";
import type { Tag } from "@/lib/supabase/admin";
import { FormShell, OptionalSection, PhoneField, Row, Section, SubmitBar, TextArea, TextField } from "@/components/form";

/** Vehicle tag details — one form for activating a new tag and editing it later. */
export default function VehicleForm({
  mode,
  tagId,
  tag,
  prefill,
}: {
  mode: "claim" | "edit";
  tagId: string;
  tag?: Tag;
  /** Account name/phone, used when activating a new tag. */
  prefill?: { owner_name?: string | null; phone?: string | null };
}) {
  const [state, action] = useFormState<FormState, FormData>(mode === "claim" ? claimTag : updateTag, undefined);

  return (
    <FormShell
      action={action}
      state={state}
      initial={tag ?? prefill ?? {}}
      pendingLabel={mode === "claim" ? "Activating your tag" : "Saving changes"}
    >
      <input type="hidden" name="id" value={tagId} />

      <Section title="How to reach you" sub="Shared only after you accept a request, or straight away in Lost Mode or an emergency.">
        <Row>
          <TextField name="owner_name" label="Your name" required autoComplete="name" placeholder="Full name" maxLength={80} />
          <PhoneField name="phone" label="Phone number" required hint="10-digit Indian numbers get +91 added." />
        </Row>
      </Section>

      <Section title="Your vehicle" sub="Helps people confirm they've scanned the right car.">
        <Row>
          <TextField name="car_model" label="Make & model" placeholder="Hyundai Creta" maxLength={80} />
          <TextField
            name="plate_number"
            label="Number plate"
            placeholder="GJ01 AB 1234"
            maxLength={20}
            uppercase
            autoComplete="off"
          />
        </Row>
        <TextArea
          name="message"
          label="Message for people who scan"
          placeholder="Please call if my car is blocking you. Thanks!"
          hint="Shown on the scan page."
        />
      </Section>

      <OptionalSection
        title="Emergency contact"
        sub="Someone we can show to helpers if there's an accident."
        fields={["emergency_contact_name", "emergency_contact_phone"]}
      >
        <Row>
          <TextField name="emergency_contact_name" label="Name" placeholder="Spouse, parent or friend" maxLength={80} />
          <PhoneField name="emergency_contact_phone" label="Phone" autoComplete="off" />
        </Row>
      </OptionalSection>

      <OptionalSection
        title="Backup contact & address"
        sub="Alternate phone, email and where the car is usually parked."
        fields={["alt_phone", "alt_email", "address"]}
      >
        <Row>
          <PhoneField name="alt_phone" label="Alternate phone" autoComplete="off" />
          <TextField name="alt_email" label="Alternate email" type="email" autoComplete="email" placeholder="you@example.com" />
        </Row>
        <TextArea name="address" label="Address / usual parking" placeholder="Home or office address" />
      </OptionalSection>

      <SubmitBar
        label={mode === "claim" ? "Activate tag" : "Save changes"}
        pendingLabel={mode === "claim" ? "Activating…" : "Saving…"}
        cancelHref={mode === "edit" ? `/tag/${tagId}` : undefined}
        note={mode === "claim" ? "You can change these anytime from your dashboard." : undefined}
      />
    </FormShell>
  );
}
