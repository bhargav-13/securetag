"use client";

import { useFormState } from "react-dom";
import { claimLegacyTag, updateLegacyItem } from "@/app/actions";
import type { FormState } from "@/lib/forms";
import { ITEM_TYPES } from "@/lib/legacy";
import { ChoiceChips, FormShell, OptionalSection, PhoneField, Row, Section, SelectField, SubmitBar, TextArea, TextField } from "@/components/form";

export type LegacyItemValues = {
  item_name: string | null;
  item_type: string | null;
  owner_name: string | null;
  phone: string | null;
  alt_phone: string | null;
  message: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pref_contact: string | null;
};

// Common picks first, then the rest of the old app's list alphabetically.
const COMMON = ["TRAVELLUGGAGE", "SUITCASE", "BACKPACK", "HANDBAG", "WALLET", "LAPTOP", "KEYCHAIN", "CARKEYS", "MOTORCYCLEHELMET", "SCHOOLBAG", "PETCOLLAR"];
const TYPE_OPTIONS: [string, string][] = [
  ...COMMON.map((k) => [k, ITEM_TYPES[k]] as [string, string]),
  ...Object.entries(ITEM_TYPES)
    .filter(([k]) => !COMMON.includes(k) && k !== "OTHER")
    .sort((a, b) => a[1].localeCompare(b[1])),
  ["OTHER", ITEM_TYPES.OTHER],
];

/** Legacy (generic item) tag details — one form for activation and editing. */
export default function LegacyItemForm({
  mode,
  code,
  email,
  item,
  prefill,
}: {
  mode: "claim" | "edit";
  code: string;
  email: string;
  item?: LegacyItemValues;
  /** Account name/phone, used when activating a new tag. */
  prefill?: { owner_name?: string | null; phone?: string | null };
}) {
  const [state, action] = useFormState<FormState, FormData>(mode === "claim" ? claimLegacyTag : updateLegacyItem, undefined);
  const initial = item ?? { country: "India", ...prefill };

  return (
    <FormShell
      action={action}
      state={state}
      initial={initial}
      pendingLabel={mode === "claim" ? "Activating your tag" : "Saving changes"}
    >
      <input type="hidden" name="code" value={code} />

      <Section title="Your item">
        <Row>
          <TextField name="item_name" label="Item name" required placeholder="Blue American Tourister" maxLength={80} />
          <SelectField
            name="item_type"
            label="Type"
            required
            options={TYPE_OPTIONS}
            fallback={item?.item_type && ITEM_TYPES[item.item_type] ? item.item_type : mode === "edit" ? "OTHER" : "TRAVELLUGGAGE"}
          />
        </Row>
        <TextArea
          name="message"
          label="Message for the finder"
          placeholder="Reward if found! Has a red ribbon on the handle."
          hint="Shown only while the item is marked Lost."
        />
      </Section>

      <Section title="How a finder reaches you" sub="Your details stay hidden until you mark the item as Lost.">
        <Row>
          <TextField name="owner_name" label="Your name" required autoComplete="name" placeholder="Full name" maxLength={80} />
          <PhoneField name="phone" label="Phone number" required hint="10-digit Indian numbers get +91 added." />
        </Row>
        <Row>
          <PhoneField name="alt_phone" label="Second phone" autoComplete="off" />
          <TextField name="email" label="Email" readOnlyValue={email} hint="Your account email. It links this item to you." />
        </Row>
        <ChoiceChips
          name="pref_contact"
          label="When Lost, show the finder my"
          options={[
            ["PHONE", "Phone number"],
            ["EMAIL", "Email"],
          ]}
          fallback={["PHONE", "EMAIL"]}
        />
      </Section>

      <OptionalSection title="Address" sub="Private: never shown to finders. Helps support return the item." fields={["address", "city", "state"]}>
        <TextArea name="address" label="Street address" placeholder="House, street, area, PIN code" />
        <Row>
          <TextField name="city" label="City" autoComplete="address-level2" maxLength={60} />
          <TextField name="state" label="State" autoComplete="address-level1" maxLength={60} />
        </Row>
        <TextField name="country" label="Country" autoComplete="country-name" maxLength={60} />
      </OptionalSection>

      <SubmitBar
        label={mode === "claim" ? "Activate tag" : "Save changes"}
        pendingLabel={mode === "claim" ? "Activating…" : "Saving…"}
        cancelHref={mode === "edit" ? "/dashboard" : undefined}
        note={mode === "claim" ? "You can edit this and turn on Lost Mode anytime from your dashboard." : undefined}
      />
    </FormShell>
  );
}
