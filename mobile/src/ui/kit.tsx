import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icons';
import { buttonShadow, C, GRADIENT, GRADIENTS, MAX_WIDTH, R, S, shadow, type Mood } from './theme';

/* ------------------------------- layout ------------------------------- */

/** Scrollable page: brand background, safe areas, keyboard handling and an
 *  optional pull-to-refresh. Content is centred and width-capped on tablets. */
export function Screen({
  children,
  onRefresh,
  refreshing,
  edges = 'both',
  footer,
  contentStyle,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Which safe-area insets this screen pads itself ('none' under a header + tab bar). */
  edges?: 'both' | 'top' | 'bottom' | 'none';
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const top = edges === 'both' || edges === 'top' ? insets.top : 0;
  const bottom = edges === 'both' || edges === 'bottom' ? insets.bottom : 0;
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.screen, { paddingTop: top + S.lg, paddingBottom: bottom + S.xxl }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.brand} colors={[C.brand]} />
          ) : undefined
        }>
        <View style={styles.column}>{children}</View>
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

/* -------------------------------- text -------------------------------- */

type TP = { children: ReactNode; style?: StyleProp<TextStyle>; center?: boolean; numberOfLines?: number };

export const H1 = ({ children, style, center }: TP) => (
  <Text accessibilityRole="header" style={[styles.h1, center && styles.center, style]}>
    {children}
  </Text>
);
export const H2 = ({ children, style, center }: TP) => (
  <Text accessibilityRole="header" style={[styles.h2, center && styles.center, style]}>
    {children}
  </Text>
);
export const Body = ({ children, style, center, numberOfLines }: TP) => (
  <Text numberOfLines={numberOfLines} style={[styles.body, center && styles.center, style]}>
    {children}
  </Text>
);
export const Muted = ({ children, style, center, numberOfLines }: TP) => (
  <Text numberOfLines={numberOfLines} style={[styles.muted, center && styles.center, style]}>
    {children}
  </Text>
);
export const Small = ({ children, style, center, numberOfLines }: TP) => (
  <Text numberOfLines={numberOfLines} style={[styles.small, center && styles.center, style]}>
    {children}
  </Text>
);
export const Eyebrow = ({ children, style }: TP) => <Text style={[styles.eyebrow, style]}>{children}</Text>;
export const Bold = ({ children }: { children: ReactNode }) => <Text style={styles.bold}>{children}</Text>;

/* ------------------------------- buttons ------------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'white' | 'accept' | 'danger' | 'amber';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const off = disabled || loading;
  const fg =
    variant === 'primary' || variant === 'accept' || variant === 'amber'
      ? C.white
      : variant === 'danger'
        ? C.red
        : variant === 'ghost'
          ? C.brand
          : C.brandInk;
  const pad = size === 'lg' ? styles.btnLg : size === 'sm' ? styles.btnSm : styles.btnMd;
  const font = size === 'lg' ? 16 : size === 'sm' ? 13 : 15;

  const inner = (
    <View style={[styles.btnInner, pad]}>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} color={fg} />
      )}
      <Text style={[styles.btnText, { color: fg, fontSize: font }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  const flat: Record<Exclude<Variant, 'primary'>, ViewStyle> = {
    secondary: { backgroundColor: C.brandSoft },
    ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border },
    white: { backgroundColor: C.white },
    accept: { backgroundColor: C.green },
    danger: { backgroundColor: C.redSoft },
    amber: { backgroundColor: C.amber },
  };

  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && !off && buttonShadow,
        off && styles.btnOff,
        pressed && styles.pressed,
        style,
      ]}>
      {variant === 'primary' ? (
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnFill}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={[styles.btnFill, flat[variant]]}>{inner}</View>
      )}
    </Pressable>
  );
}

export function LinkText({ label, onPress, style }: { label: string; onPress: () => void; style?: StyleProp<TextStyle> }) {
  return (
    <Text accessibilityRole="link" onPress={onPress} style={[styles.link, style]} suppressHighlighting>
      {label}
    </Text>
  );
}

/* -------------------------------- pills -------------------------------- */

type Tone = 'green' | 'amber' | 'brand' | 'red';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  green: { bg: C.greenSoft, fg: C.green },
  amber: { bg: C.amberSoft, fg: C.amber },
  brand: { bg: C.brandTint, fg: C.brandInk },
  red: { bg: C.redSoft, fg: C.red },
};

export function Pill({ label, tone = 'brand', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      {icon && <Icon name={icon} size={12} color={t.fg} strokeWidth={2.4} />}
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/** Inline status message. */
export function Notice({ text, tone = 'green', icon }: { text: string; tone?: Tone; icon?: IconName }) {
  const t = TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }]} accessibilityRole="alert">
      <Icon name={icon ?? (tone === 'green' ? 'check' : 'alert')} size={16} color={t.fg} />
      <Text style={[styles.noticeText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

/* ------------------------------ data rows ------------------------------ */

/** "Owner ........ Asha" key/value line. */
export function Fact({ k, v, onPress }: { k: string; v: string | null | undefined; onPress?: () => void }) {
  if (!v) return null;
  return (
    <View style={styles.fact}>
      <Text style={styles.factK}>{k}</Text>
      <Text style={[styles.factV, onPress && { color: C.brand }]} onPress={onPress} selectable>
        {v}
      </Text>
    </View>
  );
}

export function StatTile({ n, label, tone }: { n: number; label: string; tone?: Tone }) {
  const fg = tone ? TONES[tone].fg : C.text;
  return (
    <View style={styles.stat}>
      <Text style={[styles.statN, { color: fg }]}>{n}</Text>
      <Text style={styles.statL} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function SectionHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionHead}>
      <Text accessibilityRole="header" style={styles.h2NoMargin}>
        {title}
      </Text>
      {typeof right === 'string' ? <Text style={styles.small}>{right}</Text> : right}
    </View>
  );
}

export function Empty({ icon, title, text, children }: { icon: IconName; title: string; text: string; children?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIco}>
        <Icon name={icon} size={26} color={C.brand} />
      </View>
      <Text style={styles.emptyT}>{title}</Text>
      <Text style={[styles.muted, styles.center]}>{text}</Text>
      {children}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.loading} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={C.brand} />
      {label ? <Text style={[styles.muted, { marginTop: S.md }]}>{label}</Text> : null}
    </View>
  );
}

/** Gradient hero panel used at the top of the home and welcome screens. */
export function Hero({ children, style, mood = 'brand' }: { children: ReactNode; style?: StyleProp<ViewStyle>; mood?: Mood }) {
  return (
    <LinearGradient colors={GRADIENTS[mood]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, style]}>
      {/* Soft rings in the corner, like the website's hero. */}
      <View pointerEvents="none" style={styles.heroRingA} />
      <View pointerEvents="none" style={styles.heroRingB} />
      {children}
    </LinearGradient>
  );
}

/** Rounded square holding an icon; the anchor of most rows and cards. */
export function IconTile({
  icon,
  tone = 'brand',
  size = 44,
  children,
}: {
  icon?: IconName;
  tone?: Tone;
  size?: number;
  children?: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: tone === 'brand' ? C.brandSoft : t.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {children ?? (icon ? <Icon name={icon} size={size * 0.46} color={tone === 'brand' ? C.brand : t.fg} /> : null)}
    </View>
  );
}

/** A vehicle number, drawn like the plate itself. */
export function Plate({ number, small }: { number: string; small?: boolean }) {
  return (
    <View style={[styles.plate, small && styles.plateSm]} accessibilityLabel={`Number plate ${number}`}>
      <View style={styles.plateStripe} />
      <Text style={[styles.plateText, small && { fontSize: 12.5 }]} numberOfLines={1}>
        {number.toUpperCase()}
      </Text>
    </View>
  );
}

/** Settings-style row: icon, label, optional detail, then a chevron or control. */
export function ListRow({
  icon,
  label,
  detail,
  onPress,
  last,
  right,
  tone = 'brand',
  role = 'button',
}: {
  icon: IconName;
  label: string;
  detail?: string;
  onPress?: () => void;
  last?: boolean;
  right?: ReactNode;
  tone?: Tone;
  role?: 'button' | 'link';
}) {
  const body = (
    <>
      <IconTile icon={icon} tone={tone} size={36} />
      <View style={styles.flexFill}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevronRight" size={18} color={C.placeholder} /> : null)}
    </>
  );
  const style = [styles.listRow, !last && styles.listRowBorder];
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={label}
      style={({ pressed }) => [style, pressed && { opacity: 0.6 }]}>
      {body}
    </Pressable>
  );
}

/** Grey placeholder block that gently pulses while content loads. */
export function Skeleton({
  height = 16,
  width = '100%',
  radius = 8,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [pulse] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: '#e3e5f3', opacity: pulse }, style]} />;
}

/** Stand-in for a tag or request card. */
export function SkeletonCard() {
  return (
    <View style={styles.card} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <View style={styles.row}>
        <Skeleton height={44} width={44} radius={13} />
        <View style={[styles.flexFill, { gap: 8 }]}>
          <Skeleton height={15} width="60%" />
          <Skeleton height={12} width="40%" />
        </View>
      </View>
      <Skeleton height={38} radius={R.md} style={{ marginTop: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  screen: { paddingHorizontal: S.lg, flexGrow: 1 },
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: 14 },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: S.xl,
    ...shadow,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  center: { textAlign: 'center' },

  h1: { fontSize: 26, lineHeight: 31, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 6 },
  h2: { fontSize: 19, lineHeight: 24, fontWeight: '700', color: C.text, letterSpacing: -0.2, marginBottom: 10 },
  h2NoMargin: { fontSize: 19, lineHeight: 24, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, color: C.text },
  muted: { fontSize: 14, lineHeight: 21, color: C.muted },
  small: { fontSize: 13, lineHeight: 18, color: C.muted },
  bold: { fontWeight: '700', color: C.text },
  eyebrow: { fontSize: 12, fontWeight: '700', color: C.brand, letterSpacing: 0.8, textTransform: 'uppercase' },
  link: { color: C.brand, fontWeight: '700', fontSize: 14 },

  btn: { borderRadius: R.md, minHeight: 44 },
  btnFill: { borderRadius: R.md, overflow: 'hidden', flexGrow: 1, justifyContent: 'center' },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSm: { paddingVertical: 10, paddingHorizontal: 14 },
  btnMd: { paddingVertical: 13, paddingHorizontal: 18 },
  btnLg: { paddingVertical: 16, paddingHorizontal: 22 },
  btnText: { fontWeight: '700' },
  btnOff: { opacity: 0.55 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: R.pill,
  },
  pillText: { fontSize: 12, fontWeight: '700' },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: R.md },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600' },

  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  factK: { fontSize: 14, color: C.muted },
  factV: { fontSize: 14, fontWeight: '600', color: C.text, flexShrink: 1, textAlign: 'right' },

  stat: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statN: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statL: { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: 2 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 12 },

  empty: {
    alignItems: 'center',
    gap: 6,
    padding: S.xxl,
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: 'dashed',
    backgroundColor: C.surface2,
  },
  emptyIco: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyT: { fontSize: 16, fontWeight: '700', color: C.text },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xxl, backgroundColor: C.bg },

  hero: { borderRadius: R.xl, padding: S.xl, overflow: 'hidden', ...shadow },
  heroRingA: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -80, top: -90, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroRingB: { position: 'absolute', width: 130, height: 130, borderRadius: 65, right: -30, top: -40, backgroundColor: 'rgba(255,255,255,0.10)' },
  flexFill: { flex: 1 },

  plate: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'flex-start',
    backgroundColor: '#fffdf2',
    borderWidth: 1.5,
    borderColor: '#1f2340',
    borderRadius: 6,
    overflow: 'hidden',
  },
  plateSm: { borderWidth: 1.2, borderRadius: 5 },
  plateStripe: { width: 6, backgroundColor: '#1d4ed8' },
  plateText: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 14,
    fontWeight: '800',
    color: '#1f2340',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 8 },
  listRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  rowDetail: { fontSize: 12.5, lineHeight: 17, color: C.muted, marginTop: 1 },
});
