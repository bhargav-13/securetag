import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './icons';
import { C, R, S } from './theme';

/* A small form kit: one values object, server-side field errors shown under
   each input (the website's validators stay the single source of truth). */

export type Values = Record<string, string>;

type FormCtx = {
  values: Values;
  errors: Record<string, string>;
  set: (name: string, value: string) => void;
  disabled: boolean;
};

const Ctx = createContext<FormCtx | null>(null);
const useForm = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('Form fields must be inside <Form>');
  return v;
};

export function Form({
  values,
  errors,
  onChange,
  disabled,
  children,
}: {
  values: Values;
  errors?: Record<string, string>;
  onChange: (next: Values) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const set = (name: string, value: string) => onChange({ ...values, [name]: value });
  return <Ctx.Provider value={{ values, errors: errors ?? {}, set, disabled: !!disabled }}>{children}</Ctx.Provider>;
}

function Frame({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.frame}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

type FieldProps = {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  secure?: boolean;
  uppercase?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
};

export function Field(p: FieldProps) {
  const f = useForm();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const error = f.errors[p.name];
  return (
    <Frame label={p.label} required={p.required} hint={p.hint} error={error}>
      <View>
        <TextInput
          value={f.values[p.name] ?? ''}
          onChangeText={(t) => f.set(p.name, p.uppercase ? t.toUpperCase() : t)}
          editable={!f.disabled}
          placeholder={p.placeholder}
          placeholderTextColor={C.placeholder}
          maxLength={p.maxLength}
          keyboardType={p.keyboardType}
          autoCapitalize={p.uppercase ? 'characters' : p.autoCapitalize}
          autoComplete={p.autoComplete}
          textContentType={p.textContentType}
          autoCorrect={false}
          secureTextEntry={p.secure && hidden}
          returnKeyType={p.returnKeyType}
          onSubmitEditing={p.onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={p.label}
          style={[styles.input, p.secure && styles.inputWithToggle, focused && styles.inputFocus, !!error && styles.inputError]}
        />
        {p.secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={styles.toggle}>
            <Text style={styles.toggleText}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>
    </Frame>
  );
}

export const PhoneField = (p: Omit<FieldProps, 'keyboardType'>) => (
  <Field placeholder="98765 43210" {...p} keyboardType="phone-pad" autoComplete={p.autoComplete ?? 'tel'} textContentType="telephoneNumber" />
);

export function TextArea(p: FieldProps & { max?: number }) {
  const f = useForm();
  const [focused, setFocused] = useState(false);
  const max = p.max ?? 300;
  const value = f.values[p.name] ?? '';
  const error = f.errors[p.name];
  return (
    <Frame label={p.label} required={p.required} hint={p.hint} error={error}>
      <TextInput
        value={value}
        onChangeText={(t) => f.set(p.name, t)}
        editable={!f.disabled}
        placeholder={p.placeholder}
        placeholderTextColor={C.placeholder}
        maxLength={max}
        multiline
        textAlignVertical="top"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={p.label}
        style={[styles.input, styles.textarea, focused && styles.inputFocus, !!error && styles.inputError]}
      />
      <Text style={styles.counter}>
        {value.length}/{max}
      </Text>
    </Frame>
  );
}

/** A value that can't be edited (e.g. the account email on an item). */
export function ReadOnly({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Frame label={label} hint={hint}>
      <View style={[styles.input, styles.readonly]}>
        <Text style={styles.readonlyText} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </Frame>
  );
}

/** Picker that opens a searchable-by-scroll list in a bottom sheet. */
export function Select({
  name,
  label,
  required,
  options,
}: {
  name: string;
  label: string;
  required?: boolean;
  options: [string, string][];
}) {
  const f = useForm();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const value = f.values[name] ?? '';
  const current = options.find(([v]) => v === value);
  const error = f.errors[name];
  return (
    <Frame label={label} required={required} error={error}>
      <Pressable
        onPress={() => !f.disabled && setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.[1] ?? 'not set'}`}
        style={[styles.input, styles.select, !!error && styles.inputError]}>
        <Text style={[styles.selectText, !current && { color: C.placeholder }]} numberOfLines={1}>
          {current?.[1] ?? 'Choose…'}
        </Text>
        <Icon name="chevronDown" size={18} color={C.muted} />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.md }]}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Icon name="x" size={22} color={C.muted} />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={([v]) => v}
            initialNumToRender={20}
            renderItem={({ item: [v, l] }) => (
              <Pressable
                onPress={() => {
                  f.set(name, v);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: v === value }}
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: C.brandSoft }]}>
                <Text style={[styles.optionText, v === value && { color: C.brand, fontWeight: '700' }]}>{l}</Text>
                {v === value ? <Icon name="check" size={18} color={C.brand} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </Frame>
  );
}

/** Multi-select toggle chips; the value is stored as "A,B". */
export function ChoiceChips({ name, label, options }: { name: string; label: string; options: [string, string][] }) {
  const f = useForm();
  const picked = (f.values[name] ?? '').split(',').filter(Boolean);
  const error = f.errors[name];
  const toggle = (v: string) => {
    const next = picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v];
    f.set(name, options.map(([o]) => o).filter((o) => next.includes(o)).join(','));
  };
  return (
    <Frame label={label} error={error}>
      <View style={styles.chips}>
        {options.map(([v, l]) => {
          const on = picked.includes(v);
          return (
            <Pressable
              key={v}
              onPress={() => !f.disabled && toggle(v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.chip, on && styles.chipOn]}>
              {on ? <Icon name="check" size={14} color={C.brandInk} strokeWidth={2.6} /> : null}
              <Text style={[styles.chipText, on && { color: C.brandInk }]}>{l}</Text>
            </Pressable>
          );
        })}
      </View>
    </Frame>
  );
}

/** Titled group of fields with a divider above it. */
export function Section({ title, sub, first, children }: { title: string; sub?: string; first?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.section, first && styles.sectionFirst]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

/** Collapsed "+ Add …" block for optional fields; opens itself when any of its
 *  fields already has a value or an error. */
export function OptionalSection({
  title,
  sub,
  fields,
  children,
}: {
  title: string;
  sub?: string;
  fields: string[];
  children: ReactNode;
}) {
  const f = useForm();
  const hasContent = fields.some((k) => (f.values[k] ?? '') !== '' || f.errors[k]);
  const [opened, setOpened] = useState(false);
  const open = opened || hasContent;
  if (!open) {
    return (
      <Pressable
        onPress={() => setOpened(true)}
        accessibilityRole="button"
        accessibilityLabel={`Add ${title}`}
        style={({ pressed }) => [styles.optional, pressed && { backgroundColor: C.brandSoft }]}>
        <View style={styles.optionalIco}>
          <Icon name="plus" size={16} color={C.brand} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.optionalTitle}>
            {title} <Text style={styles.optionalTag}>optional</Text>
          </Text>
          {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
        </View>
      </Pressable>
    );
  }
  return (
    <Section title={title} sub={sub}>
      {children}
    </Section>
  );
}

const styles = StyleSheet.create({
  frame: { gap: 7 },
  label: { fontSize: 13, fontWeight: '600', color: C.text },
  req: { color: C.red },
  input: {
    backgroundColor: C.surface2,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    minHeight: 48,
  },
  inputWithToggle: { paddingRight: 64 },
  inputFocus: { borderColor: C.brand2, backgroundColor: C.white },
  inputError: { borderColor: C.red },
  textarea: { minHeight: 92, lineHeight: 21 },
  counter: { fontSize: 11, color: C.muted, alignSelf: 'flex-end', marginTop: -2 },
  toggle: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  toggleText: { color: C.brand, fontWeight: '700', fontSize: 13 },
  readonly: { justifyContent: 'center', backgroundColor: C.bg },
  readonlyText: { fontSize: 15, color: C.muted },
  error: { color: C.red, fontSize: 12.5, lineHeight: 17 },
  hint: { color: C.muted, fontSize: 12, lineHeight: 16 },

  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  selectText: { fontSize: 15, color: C.text, flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(25,27,46,0.45)' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '70%',
    paddingTop: S.md,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.xl,
    paddingBottom: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.xl,
    paddingVertical: 14,
    minHeight: 48,
  },
  optionText: { fontSize: 15, color: C.text },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: R.pill,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface2,
  },
  chipOn: { borderColor: C.brand, backgroundColor: C.brandTint },
  chipText: { fontSize: 14, fontWeight: '600', color: C.muted },

  section: { marginTop: 22, paddingTop: 20, borderTopWidth: 1, borderTopColor: C.border },
  sectionFirst: { marginTop: 4, paddingTop: 0, borderTopWidth: 0 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  sectionSub: { fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 2 },
  sectionBody: { gap: 14, marginTop: 14 },

  optional: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  optionalIco: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionalTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  optionalTag: { fontSize: 11, fontWeight: '600', color: C.muted },
});
